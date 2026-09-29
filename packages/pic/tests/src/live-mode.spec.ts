import { IDL } from '@icp-sdk/core/candid';
import { PocketIc } from '../../src';
import { getFreePort, TestFixture } from './util';

describe('makeLive', () => {
  let fixture: TestFixture;

  beforeEach(async () => {
    fixture = await TestFixture.create();
  });

  afterEach(async () => {
    await fixture.pic.stopLive();
    await fixture.tearDown();
  });

  it('should delay the rounds by the artificial delay', async () => {
    const { pic, canisterId } = fixture;
    const artificialDelayMs = 500;
    const arg = new Uint8Array(IDL.encode([IDL.Text], ['hello']));

    await pic.makeLive({ artificialDelayMs });

    // Each call is submitted after the previous one finished,
    // so it has to wait for at least one more round.
    const start = Date.now();
    for (let i = 0; i < 3; i++) {
      const call = await pic.submitCall({
        canisterId,
        method: 'print_log',
        arg,
      });
      while ((await pic.ingressStatus(call)) === null) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    expect(Date.now() - start).toBeGreaterThanOrEqual(2 * artificialDelayMs);
  });

  it('should start the HTTP gateway with the given options', async () => {
    const { pic } = fixture;
    const port = await getFreePort();

    expect(await pic.makeLive({ httpGateway: { port } })).toBe(port);

    const res = await fetch(`http://localhost:${port}/api/v2/status`);
    expect(res.status).toBe(200);
  });

  it('should return the port without options when already live', async () => {
    const { pic } = fixture;
    const port = await pic.makeLive();

    expect(await pic.makeLive()).toBe(port);
    await expect(pic.makeLive({ artificialDelayMs: 100 })).rejects.toThrow(
      'The instance is already live',
    );
  });
});

describe('makeLive with an instance HTTP gateway', () => {
  it('should reject HTTP gateway options', async () => {
    const pic = await PocketIc.create(process.env.PIC_URL, {
      httpGateway: {},
    });

    try {
      await expect(
        pic.makeLive({ httpGateway: { port: await getFreePort() } }),
      ).rejects.toThrow('The instance was created with an HTTP gateway');
    } finally {
      await pic.tearDown();
    }
  });
});
