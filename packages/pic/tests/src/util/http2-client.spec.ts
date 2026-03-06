import { Http2Client } from '../../../src/http2-client';
import { ServerError } from '../../../src/error';

const BASE_URL = 'http://localhost:9999';
// high enough that retrying tests don't accidentally hit the poll timeout
const TIMEOUT_MS = 5_000;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function textResponse(body: string, status = 200): Response {
  return new Response(body, { status });
}

describe('Http2Client', () => {
  let client: Http2Client;
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    client = new Http2Client(BASE_URL, TIMEOUT_MS);
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  describe('jsonGet', () => {
    it('should return the parsed response on success', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ value: 42 }));

      const result = await client.jsonGet<{ value: number }>({ path: '/test' });

      expect(result).toEqual({ value: 42 });
    });

    it('should throw ServerError immediately on error response', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ message: 'SettingTimeIntoPast' }));

      const start = Date.now();
      const err = await client.jsonGet({ path: '/test' }).catch(e => e);

      expect(err).toBeInstanceOf(ServerError);
      expect(err.serverMessage).toBe('SettingTimeIntoPast');
      expect(Date.now() - start).toBeLessThan(500);
    });

    it('should retry on 409 busy response and eventually succeed', async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse({ state_label: 'busy', op_id: '1' }, 409))
        .mockResolvedValueOnce(jsonResponse({ value: 42 }));

      const result = await client.jsonGet<{ value: number }>({ path: '/test' });

      expect(result).toEqual({ value: 42 });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should throw ServerError immediately on parse failure with small body', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      fetchMock.mockResolvedValue(textResponse('not valid json'));

      const start = Date.now();
      const err = await client.jsonGet({ path: '/test' }).catch(e => e);

      expect(err).toBeInstanceOf(ServerError);
      expect(err.serverMessage).toBe('not valid json');
      expect(Date.now() - start).toBeLessThan(500);
    });

    it('should throw ServerError immediately on parse failure with large body', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      fetchMock.mockResolvedValue(textResponse('x'.repeat(10_241)));

      const start = Date.now();
      const err = await client.jsonGet({ path: '/test' }).catch(e => e);

      // large body: serverMessage is the stringify'd parse error, not the body
      expect(err).toBeInstanceOf(ServerError);
      expect(err.serverMessage).toMatch(/SyntaxError/);
      expect(Date.now() - start).toBeLessThan(500);
    });
  });

  describe('jsonPost', () => {
    it('should return the parsed response on success', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ value: 42 }));

      const result = await client.jsonPost<{ input: string }, { value: number }>({
        path: '/test',
        body: { input: 'hello' },
      });

      expect(result).toEqual({ value: 42 });
    });

    it('should retry on 409 busy response and eventually succeed', async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse({ state_label: 'busy', op_id: '1' }, 409))
        .mockResolvedValueOnce(jsonResponse({ value: 42 }));

      const result = await client.jsonPost<unknown, { value: number }>({ path: '/test' });

      expect(result).toEqual({ value: 42 });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should poll read_graph on 202 until the result is ready', async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse({ state_label: 'processing', op_id: '42' }, 202))
        // first read_graph poll: still processing
        .mockResolvedValueOnce(jsonResponse({ state_label: 'processing', op_id: '42' }))
        // second read_graph poll: done
        .mockResolvedValueOnce(jsonResponse({ value: 42 }));

      const result = await client.jsonPost<unknown, { value: number }>({ path: '/test' });

      expect(result).toEqual({ value: 42 });
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('/read_graph/processing/42'),
        expect.any(Object),
      );
    });

    it('should throw ServerError immediately when read_graph returns an error', async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse({ state_label: 'processing', op_id: '42' }, 202))
        .mockResolvedValueOnce(jsonResponse({ message: 'ProcessingFailed' }));

      const start = Date.now();
      const err = await client.jsonPost({ path: '/test' }).catch(e => e);

      expect(err).toBeInstanceOf(ServerError);
      expect(err.serverMessage).toBe('ProcessingFailed');
      expect(Date.now() - start).toBeLessThan(500);
    });
  });
});
