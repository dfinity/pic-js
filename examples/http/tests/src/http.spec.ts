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

const isCI = !!process.env.CI;
const isMacOS = process.platform === 'darwin';

// macOS CI runners have mDNSResponder disabled, so *.localhost subdomains
// don't resolve. Skip until PocketIC supports ?canisterId= query param routing.
describe.skipIf(isCI && isMacOS)('HTTP', () => {
  let pic: PocketIc;
  let httpGatewayUrl: string;

  beforeEach(async () => {
    pic = await PocketIc.create(inject('PIC_URL'), {
      nns: { state: { type: SubnetStateType.New } },
      application: [{ state: { type: SubnetStateType.New } }],
    });

    const canisterId = await pic.createCanister();
    await pic.installCode({ canisterId, wasm: WASM_PATH });

    const httpGatewayPort = await pic.makeLive();
    httpGatewayUrl = `http://${canisterId}.localhost:${httpGatewayPort}`;
  });

  afterEach(async () => {
    await pic.stopLive();
    await pic.tearDown();
  });

  it('should return an index.html page', async () => {
    const res = await fetch(`${httpGatewayUrl}/index.html`);
    const resBody = await res.text();
    expect(resBody).toContain('<h1>Hello, World!</h1>');
  });
});
