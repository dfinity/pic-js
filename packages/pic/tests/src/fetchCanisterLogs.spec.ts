import { CONTROLLER, TestFixture } from './util';

describe('fetchCanisterLogs', () => {
  let fixture: TestFixture;

  beforeEach(async () => {
    fixture = await TestFixture.create();
  });

  afterEach(async () => {
    await fixture.tearDown();
  });

  it('should fetch canister logs', async () => {
    const message = 'Hello from canister';

    await fixture.actor.print_log(message);

    const logs = await fixture.pic.fetchCanisterLogs({
      canisterId: fixture.canisterId,
      sender: CONTROLLER.getPrincipal(),
    });

    expect(logs.length).toBeGreaterThanOrEqual(1);

    const lastLog = logs[logs.length - 1];
    const logContent = new TextDecoder().decode(lastLog.content);

    expect(logContent).toBe(message);
    expect(lastLog.idx).toBeDefined();
    expect(lastLog.timestampNanos).toBeDefined();
  });

  it('should return empty logs for a canister with no logs', async () => {
    const logs = await fixture.pic.fetchCanisterLogs({
      canisterId: fixture.canisterId,
      sender: CONTROLLER.getPrincipal(),
    });

    expect(logs).toEqual([]);
  });
});
