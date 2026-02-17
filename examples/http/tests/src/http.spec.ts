import { resolve } from 'node:path';
import { PocketIc, SubnetStateType } from '@dfinity/pic';
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
  let httpGatewayUrl: string;
  let httpGatewayHost: string;

  beforeEach(async () => {
    pic = await PocketIc.create(process.env.PIC_URL, {
      nns: { state: { type: SubnetStateType.New } },
      application: [{ state: { type: SubnetStateType.New } }],
    });

    const canisterId = await pic.createCanister();
    await pic.installCode({ canisterId, wasm: WASM_PATH });

    const httpGatewayPort = await pic.makeLive();
    httpGatewayUrl = `http://127.0.0.1:${httpGatewayPort}`;
    httpGatewayHost = `${canisterId}.localhost:${httpGatewayPort}`;
  });

  afterEach(async () => {
    await pic.stopLive();
    await pic.tearDown();
  });

  it('should return an index.html page', async () => {
    // Use 127.0.0.1 with an explicit Host header instead of
    // `${canisterId}.localhost` because macOS does not resolve
    // *.localhost subdomains on CI runners (mDNSResponder is disabled).
    const res = await fetch(`${httpGatewayUrl}/index.html`, {
      headers: { Host: httpGatewayHost },
    });
    const resBody = await res.text();
    expect(resBody).toContain('<h1>Hello, World!</h1>');
  });
});
