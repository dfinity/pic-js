import http2, {
  ClientHttp2Session,
  IncomingHttpHeaders,
  OutgoingHttpHeaders,
} from 'node:http2';

const { HTTP2_HEADER_PATH, HTTP2_HEADER_METHOD } = http2.constants;

export interface Request {
  method: Method;
  path: string;
  headers?: OutgoingHttpHeaders;
  body?: Uint8Array;
}

export interface JsonGetRequest {
  path: string;
  headers?: OutgoingHttpHeaders;
}

export interface JsonPostRequest<B> {
  path: string;
  headers?: OutgoingHttpHeaders;
  body?: B;
}

export interface Response {
  status: number | undefined;
  body: string;
  headers: IncomingHttpHeaders;
}

export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

export const JSON_HEADER: OutgoingHttpHeaders = {
  'Content-Type': 'application/json',
};

export class Http2Client {
  private readonly session: ClientHttp2Session;

  constructor(baseUrl: string) {
    this.session = http2.connect(baseUrl);
  }

  public request(init: Request): Promise<Response> {
    return new Promise((resolve, reject) => {
      let req = this.session.request({
        [HTTP2_HEADER_PATH]: init.path,
        [HTTP2_HEADER_METHOD]: init.method,
        'content-length': init.body?.length ?? 0,
        ...init.headers,
      });

      req.on('error', error => {
        console.error('Erorr sending request to PocketIC server', error);
        return reject(error);
      });

      req.on('response', headers => {
        const status = headers[':status'] ?? -1;

        const contentLength = headers['content-length']
          ? Number(headers['content-length'])
          : 0;
        let buffer = Buffer.alloc(contentLength);
        let bufferLength = 0;

        req.on('data', (chunk: Buffer) => {
          chunk.copy(buffer, bufferLength);
          bufferLength += chunk.length;
        });

        req.on('end', () => {
          const body = buffer.toString('utf8');

          return resolve({
            status,
            body,
            headers,
          });
        });
      });

      if (init.body) {
        req.write(init.body, 'utf8');
      }

      req.end();
    });
  }

  public async jsonGet<R extends {}>(init: JsonGetRequest): Promise<R> {
    while (true) {
      const res = await this.request({
        method: 'GET',
        path: init.path,
        headers: { ...init.headers, ...JSON_HEADER },
      });

      const resBody = JSON.parse(res.body) as ApiResponse<R>;
      if (!resBody) {
        return resBody;
      }

      // server encountered an error
      if ('message' in resBody) {
        console.error('PocketIC server encountered an error', resBody.message);

        throw new Error(resBody.message);
      }

      // the server has started processing or is busy
      if ('state_label' in resBody) {
        console.error('PocketIC server is too busy to process the request');

        if (res.status === 202) {
          throw new Error('Server started processing');
        }

        if (res.status === 409) {
          throw new Error('Server busy');
        }

        throw new Error('Unknown state');
      }

      return resBody;
    }
  }

  public async jsonPost<B, R>(init: JsonPostRequest<B>): Promise<R> {
    const reqBody = init.body
      ? new TextEncoder().encode(JSON.stringify(init.body))
      : undefined;

    while (true) {
      const res = await this.request({
        method: 'POST',
        path: init.path,
        headers: { ...init.headers, ...JSON_HEADER },
        body: reqBody,
      });

      const resBody = JSON.parse(res.body);
      if (!resBody) {
        return resBody;
      }

      // server encountered an error
      if ('message' in resBody) {
        console.error('PocketIC server encountered an error', resBody.message);

        throw new Error(resBody.message);
      }

      // the server has started processing or is busy
      // sleep and try again
      if ('state_label' in resBody) {
        console.error('PocketIC server is too busy to process the request');

        if (res.status === 202) {
          throw new Error('Server started processing');
        }

        if (res.status === 409) {
          throw new Error('Server busy');
        }

        throw new Error('Unknown state');
      }

      return resBody;
    }
  }
}

interface StartedOrBusyApiResponse {
  state_label: string;
  op_id: string;
}

interface ErrorResponse {
  message: string;
}

type ApiResponse<R extends {}> = StartedOrBusyApiResponse | ErrorResponse | R;
