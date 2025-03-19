import {
  ServerBusyError,
  ServerProcessingError,
  ServerRequestTimeoutError,
  ServerResponseError,
} from './errors';
import { isNil, poll } from './util';

export interface RequestOptions {
  method: Method;
  path: string;
  headers?: RequestHeaders;
  body?: Uint8Array;
}

export type RequestHeaders = RequestInit['headers'];

export interface JsonGetRequest {
  path: string;
  headers?: RequestHeaders;
}

export interface JsonPostRequest<B> {
  path: string;
  headers?: RequestHeaders;
  body?: B;
}

export type ResponseHeaders = ResponseInit['headers'];

export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

export const JSON_HEADER: RequestHeaders = {
  'Content-Type': 'application/json',
};

export enum HttpStatus {
  OK = 200,
  ACCEPTED = 202, // Includes 404 as well
  CONFLICT = 409,
  OTHER = -1, // Represents any other status
}

export class Http2Client {
  #baseUrl: string;
  #processingTimeoutMs: number;

  constructor(baseUrl: string, processingTimeoutMs: number) {
    this.#baseUrl = baseUrl;
    this.#processingTimeoutMs = processingTimeoutMs;
  }

  public request(init: RequestOptions): Promise<Response> {
    const timeoutAbortController = new AbortController();
    const requestAbortController = new AbortController();

    const cancelAfterTimeout = async (): Promise<never> => {
      return await new Promise((_, reject) => {
        const timeoutId = setTimeout(() => {
          requestAbortController.abort();
          reject(new ServerRequestTimeoutError());
        }, this.#processingTimeoutMs);

        timeoutAbortController.signal.addEventListener('abort', () => {
          clearTimeout(timeoutId);
          reject(new ServerRequestTimeoutError());
        });
      });
    };

    const makeRequest = async (): Promise<Response> => {
      const url = `${this.#baseUrl}${init.path}`;

      const res = await fetch(url, {
        method: init.method,
        headers: init.headers,
        body: init.body,
        signal: requestAbortController.signal,
      });
      timeoutAbortController.abort();

      return res;
    };

    return Promise.race([makeRequest(), cancelAfterTimeout()]);
  }

  #simplifyStatus(status: number): HttpStatus {
    status === HttpStatus.ACCEPTED || status === 404
      ? HttpStatus.ACCEPTED
      : Object.values(HttpStatus).includes(status)
        ? status
        : HttpStatus.OTHER;

    if (status === HttpStatus.ACCEPTED || status === 404) {
      return HttpStatus.ACCEPTED;
    }
    if (Object.values(HttpStatus).includes(status)) {
      return status as HttpStatus;
    }
    return HttpStatus.OTHER;
  }

  async #handleJsonResponse<R extends object>(res: Response): Promise<R> {
    const status = this.#simplifyStatus(res.status);

    switch (status) {
      case HttpStatus.OK: {
        try {
          const data = await res.json();
          return data as R;
        } catch (e) {
          throw new ServerResponseError(`Could not parse response: ${String(e)}`, res);
        }
      }
      case HttpStatus.ACCEPTED: {
        try {
          const result = await res.json();
          guard<StartedOrBusyApiResponse>(result);
          const { state_label, op_id } = result as StartedOrBusyApiResponse;
          console.debug(
            `Instance has started or polling: state_label=${state_label}, op_id=${op_id}`,
          );
          while (true) {
            await new Promise((resolve) =>
              setTimeout(resolve, POLLING_INTERVAL_MS),
            );

            const stateRes = await this.request({
              method: 'GET',
              path: `/read_graph/${state_label}/${op_id}`,
            });

            if (stateRes.status === 404) {
              const message = await stateRes.text();
              console.debug(`Polling has not succeeded yet: ${message}`);
              continue;
            }

            return await this.#handleJsonResponse<R>(stateRes);
          }
        } catch (e) {
          throw new ServerResponseError(`Could not parse response: ${String(e)}`, res);
        }
      }
      case HttpStatus.CONFLICT: {
        try {
          const result = await res.json();
          guard<StartedOrBusyApiResponse>(result);
          const { state_label, op_id } = result as StartedOrBusyApiResponse;
          console.debug(
            `Instance is busy: state_label=${state_label}, op_id=${op_id}`,
          );
          throw new ServerBusyError('Server busy', res);
        } catch (e) {
          throw new ServerResponseError(`Could not parse response: ${String(e)}`, res);
        }
      }
      case HttpStatus.OTHER:
      default: {
        try {
          const { message } = await res.json() as ErrorResponse;
          throw new ServerResponseError(message, res);
        } catch (e) {
          throw new ServerResponseError(`Could not parse error: ${String(e)}`, res);
        }
      }
    }
  }

  public async jsonGet<R extends object>(init: JsonGetRequest): Promise<R> {
    // poll the request until it is successful or times out
    return await poll(
      async () => {
        const res = await this.request({
          method: 'GET',
          path: init.path,
          headers: { ...init.headers, ...JSON_HEADER },
        });
        return this.#handleJsonResponse<R>(res);
      },
      {
        intervalMs: POLLING_INTERVAL_MS,
        timeoutMs: this.#processingTimeoutMs,
      },
    );
  }

  public async jsonPost<B, R extends object>(
    init: JsonPostRequest<B>,
  ): Promise<R> {
    const reqBody = init.body
      ? new TextEncoder().encode(JSON.stringify(init.body))
      : undefined;

    // poll the request until it is successful or times out
    return await poll(
      async () => {
        const res = await this.request({
          method: 'POST',
          path: init.path,
          headers: { ...init.headers, ...JSON_HEADER },
          body: reqBody,
        });

        const resBody = (await res.json()) as ApiResponse<R>;
        if (isNil(resBody)) {
          return resBody;
        }

        try {
          return await this.#handleJsonResponse<R>(res);
        } catch (error) {
          // If we get a 202 (processing) status, handle the polling for completion
          if (
            error instanceof ServerProcessingError &&
            'state_label' in resBody &&
            typeof resBody.state_label === 'string'
          ) {
            return await poll(
              async () => {
                const stateRes = await this.request({
                  method: 'GET',
                  path: `/read_graph/${resBody.state_label}/${resBody.op_id}`,
                });

                return this.#handleJsonResponse<R>(stateRes);
              },
              {
                intervalMs: POLLING_INTERVAL_MS,
                timeoutMs: this.#processingTimeoutMs,
              },
            );
          }
          throw error;
        }
      },
      {
        intervalMs: POLLING_INTERVAL_MS,
        timeoutMs: this.#processingTimeoutMs,
      },
    );
  }
}

function guard<T>(value: unknown): asserts value is T {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Value is not an object');
  }
  if (!('state_label' in value) || !('op_id' in value)) {
    throw new Error('Value does not have state_label or op_id');
  }
  if (typeof (value as any).state_label !== 'string') {
    throw new Error('state_label is not a string');
  }
  if (typeof (value as any).op_id !== 'string') {
    throw new Error('op_id is not a string');
  }
  if (typeof (value as any).message !== 'undefined') {
    throw new Error('Value has message property');
  }
  if (typeof (value as any).error !== 'undefined') {
    throw new Error('Value has error property');
  }
}

const POLLING_INTERVAL_MS = 10;

interface StartedOrBusyApiResponse {
  state_label: string;
  op_id: string;
}

interface ErrorResponse {
  message: string;
}

type ApiResponse<R extends object> =
  | StartedOrBusyApiResponse
  | ErrorResponse
  | R;
