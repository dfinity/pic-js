import { isNil } from './util';

export type HeadersInit = Record<string, string>;

export interface GetOptions {
  headers?: HeadersInit;
}

export interface PostOptions<P> {
  body?: P;
  headers?: HeadersInit;
}

export const JSON_HEADER: HeadersInit = {
  'Content-Type': 'application/json',
};

export class HttpClient {
  private constructor() {}

  public static async get<R>(url: string, options?: GetOptions): Promise<R> {
    const headers = options?.headers ?? {};

    const response = await fetch(url, {
      method: 'GET',
      headers: { ...headers, ...JSON_HEADER },
    });

    handleFetchError(response);
    return (await response.json()) as R;
  }

  public static async post<P, R>(
    url: string,
    options?: PostOptions<P>,
  ): Promise<R> {
    const body = options?.body ? JSON.stringify(options.body) : null;
    const headers = options?.headers ?? {};

    const response = await fetch(url, {
      method: 'POST',
      body,
      headers: { ...headers, ...JSON_HEADER },
    });

    handleFetchError(response);
    return (await response.json()) as R;
  }
}

export function handleFetchError(response: Response): void {
  if (isNil(response.ok)) {
    console.error('Error response', response.url, response.statusText);

    throw new Error(`${response.url} ${response.statusText}`);
  }
}
