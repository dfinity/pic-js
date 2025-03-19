import { describe, it, expect } from 'vitest';
import Express from 'express';
import { Http2Client, StartedOrBusyApiResponse } from '../src/http2-client';
import { ServerBusyError, ServerResponseError } from '../src/errors';

interface MockResponse {
  status: number;
  body: string;
}

const makeFakeServer = (port: number, mockResponse: MockResponse) => {
  const app = Express();
  app.use(Express.json());

  app.get('*', (_, res) => {
    res.status(mockResponse.status).send(mockResponse.body);
  });

  app.post('*', (_, res) => {
    res.status(mockResponse.status).send(mockResponse.body);
  });

  return app.listen(port);
};

describe('PocketIc.create error handling', () => {
  it('should return a basic response', async () => {
    const fakeReplicaServer = makeFakeServer(4321, {
      status: 500,
      body: 'Internal Server Error',
    });

    const client = new Http2Client('http://localhost:4321', 1000);

    const response = await client
      .request({ method: 'GET', path: '/test', headers: {} })
      .then(res => {
        return res;
      });
    expect(response.status).toBe(500);
    const body = await response.text();
    expect(body).toBe('Internal Server Error');

    fakeReplicaServer.close();
  });

  it('should throw a ServerBusyError from `get` polling', async () => {
    const serverBusyResponse: StartedOrBusyApiResponse = {
      state_label: 'something',
      op_id: 'op_id',
    };

    const fakeReplicaServer = makeFakeServer(4322, {
      status: 409,
      body: JSON.stringify(serverBusyResponse),
    });

    const client = new Http2Client('http://localhost:4322', 1000);

    const response = await client
      .jsonGet<Record<string, unknown>>({ path: '/test', headers: {} })
      .catch(e => e);

    expect(response).toBeInstanceOf(ServerBusyError);
    expect(response.message).toBe('Server busy');
    expect(response.response?.status).toBe(409);

    fakeReplicaServer.close();
  });

  it('should throw a ServerResponseError from `get` polling when message is not provided', async () => {
    const fakeReplicaServer = makeFakeServer(4323, {
      status: 500,
      body: '{"invalid_contents": "Service Unavailable"}',
    });

    const client = new Http2Client('http://localhost:4323', 1000);
    const response = client.jsonGet<Record<string, unknown>>({
      path: '/test',
      headers: {},
    });

    await expect(response).rejects.toThrow(ServerResponseError);
    await expect(response).rejects.toThrow(
      'Server error with code 500: unexpected error',
    );

    fakeReplicaServer.close();
  });

  it('should handle POST request errors', async () => {
    const fakeReplicaServer = makeFakeServer(4324, {
      status: 500,
      body: 'Internal Server Error',
    });

    const client = new Http2Client('http://localhost:4324', 1000);
    const bodyData = { test: 'data' };
    const encodedBody = new TextEncoder().encode(JSON.stringify(bodyData));

    const response = await client
      .request({
        method: 'POST',
        path: '/test',
        headers: { 'Content-Type': 'application/json' },
        body: encodedBody,
      })
      .then(res => {
        return res;
      });
    expect(response.status).toBe(500);
    const body = await response.text();
    expect(body).toBe('Internal Server Error');

    fakeReplicaServer.close();
  });

  it('should throw a ServerBusyError from `jsonPost` polling', async () => {
    const fakeReplicaServer = makeFakeServer(4325, {
      status: 409,
      body: '{"message": "Server busy"}',
    });

    const client = new Http2Client('http://localhost:4325', 1000);

    const response = await client
      .jsonPost<{ test: string }, Record<string, unknown>>({
        path: '/test',
        headers: { 'Content-Type': 'application/json' },
        body: { test: 'data' },
      })
      .catch(e => e);

    expect(response).toBeInstanceOf(ServerBusyError);
    expect(response.message).toBe('Server busy');
    expect(response.response?.status).toBe(409);

    fakeReplicaServer.close();
  });

  it('should throw a ServerResponseError from `jsonPost` polling when message is not provided', async () => {
    const fakeReplicaServer = makeFakeServer(4326, {
      status: 500,
      body: '{"message": "Service Unavailable"}',
    });

    const client = new Http2Client('http://localhost:4326', 10);
    const response = client.jsonPost<{ test: string }, Record<string, unknown>>(
      {
        path: '/test',
        headers: { 'Content-Type': 'application/json' },
        body: { test: 'data' },
      },
    );

    await expect(response).rejects.toThrow(
      'Server error with code 500: Service Unavailable',
    );

    fakeReplicaServer.close();
  });
});
