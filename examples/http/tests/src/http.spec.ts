import { resolve } from 'node:path';
import { PocketIc, SubnetStateType } from '@dfinity/pic';
import { describe, beforeEach, afterEach, it, expect, inject } from 'vitest';
import { _SERVICE } from '../../declarations/http.did';

const WASM_PATH = resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  '.dfx',
  'local',
  'canisters',
  'http',
  'http.wasm.gz',
);

describe('HTTP', () => {
  let pic: PocketIc;
  let httpGatewayPort: number;
  let canisterId: string;

  beforeEach(async () => {
    pic = await PocketIc.create(inject('PIC_URL'), {
      nns: { state: { type: SubnetStateType.New } },
      application: [{ state: { type: SubnetStateType.New } }],
    });

    const id = await pic.createCanister();
    await pic.installCode({ canisterId: id, wasm: WASM_PATH });

    httpGatewayPort = await pic.makeLive();
    canisterId = id.toString();
  });

  afterEach(async () => {
    await pic.stopLive();
    await pic.tearDown();
  });

  it('should return an index.html page', async () => {
    // Use ?canisterId= query param instead of subdomain-based routing
    // (e.g. canisterId.localhost) for cross-platform compatibility.
    // macOS does not resolve *.localhost subdomains on CI runners.
    const res = await fetch(
      `http://localhost:${httpGatewayPort}/index.html?canisterId=${canisterId}`,
    );
    const resBody = await res.text();
    expect(resBody).toContain('<h1>Hello, World!</h1>');
  });
});
