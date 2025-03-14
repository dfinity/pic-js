import {
  ServerBusyError,
  ServerProcessingError,
  ServerRequestTimeoutError,
  ServerResponseError,
  UnknownStateError,
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

export class JsonGetError extends Error {
  public readonly name = 'JsonGetError';
  public readonly message: string;
  public readonly response?: Response;

  constructor(message: string, response?: Response) {
    super(message);
    this.message = message;
    this.response = response;
  }
}

export class Http2Client {
  #baseUrl: string;
  #processingTimeoutMs: number;
  #retryTimes: number;

  constructor(
    baseUrl: string,
    processingTimeoutMs: number,
    retryTimes: number = 3,
  ) {
    this.#baseUrl = baseUrl;
    this.#processingTimeoutMs = processingTimeoutMs;
    this.#retryTimes = retryTimes;
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

  async #handleJsonResponse<R extends object>(
    res: Response,
    resBody: ApiResponse<R>,
  ): Promise<R> {
    if (!resBody) {
      return resBody;
    }

    // Handle server busy state first
    if (res.status === 409) {
      throw new ServerBusyError('Server busy', res);
    }

    // server encountered an error, throw and try again
    if ('message' in resBody && typeof resBody.message === 'string') {
      console.error('PocketIC server encountered an error', resBody.message);

      throw new ServerResponseError(resBody.message, res);
    }

    // the server has started processing or is busy
    if ('state_label' in resBody && typeof resBody.state_label === 'string') {
      // the server has started processing the request
      if (res.status === 202) {
        throw new ServerProcessingError('Server started processing', res);
      }

      // something weird happened, throw and try again
      throw new UnknownStateError(res);
    }

    // Throw error if the response was an error
    if (res.status >= 400) {
      throw new ServerResponseError(`${res.status} ${res.statusText}`, res);
    }

    // the request was successful, exit the loop
    return resBody as R;
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

        const resBody = (await res.json()) as ApiResponse<R>;
        return this.#handleJsonResponse(res, resBody);
      },
      {
        intervalMs: POLLING_INTERVAL_MS,
        timeoutMs: this.#processingTimeoutMs,
        retryTimes: this.#retryTimes,
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
          return await this.#handleJsonResponse(res, resBody);
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

                const stateBody = (await stateRes.json()) as ApiResponse<R>;
                return this.#handleJsonResponse(stateRes, stateBody);
              },
              {
                intervalMs: POLLING_INTERVAL_MS,
                timeoutMs: this.#processingTimeoutMs,
                retryTimes: this.#retryTimes,
              },
            );
          }
          throw error;
        }
      },
      {
        intervalMs: POLLING_INTERVAL_MS,
        timeoutMs: this.#processingTimeoutMs,
        retryTimes: this.#retryTimes,
      },
    );
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
