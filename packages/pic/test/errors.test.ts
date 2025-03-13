import { describe, it, expect, vi } from 'vitest';
import { PocketIc } from '../src';
import Express from 'express';
import { Http2Client, JsonGetError } from '../src/http2-client';

const makeFakeServer = (port: number, response: Express.Response) => {
  const app = Express();
  app.get('*', (req, res) => {
    res.status(response.status).send(response.body);
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
        console.log(res);
        return res;
      });
    expect(response.status).toBe(500);
    const body = await response.text();
    expect(body).toBe('Internal Server Error');

    fakeReplicaServer.close();
  });
  it('should throw an error from `get` polling', async () => {
    const fakeReplicaServer = makeFakeServer(4321, {
      status: 409,
      body: '{"message": "Server busy"}',
    });

    const client = new Http2Client('http://localhost:4321', 1000);

    const response = await client
      .jsonGet({ path: '/test', headers: {} })
      .catch(e => {
        console.log(e);
        return e;
      });
    expect(response.message).toBe('Server busy');
    fakeReplicaServer.close();
  });
  it('should throw an error from `get` polling when message is not provided', async () => {
    const fakeReplicaServer = makeFakeServer(5432, {
      status: 500,
      body: '{"res": "Service Unavailable"}',
    });

    const client = new Http2Client('http://localhost:5432', 1000);
    let response = client.jsonGet({ path: '/test', headers: {} });

    await expect(response).rejects.toThrow('Error: 500 Internal Server Error');
    fakeReplicaServer.close();
  });
});
