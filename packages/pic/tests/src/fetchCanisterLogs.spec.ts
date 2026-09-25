import { Principal } from '@icp-sdk/core/principal';
import { FetchCanisterLogsOptions, generateRandomIdentity } from '../../src';
import { CONTROLLER, TestFixture } from './util';

describe('fetchCanisterLogs', () => {
  let fixture: TestFixture;

  const decode = (content: Uint8Array): string =>
    new TextDecoder().decode(content);

  async function printLogs(...messages: string[]): Promise<void> {
    for (const message of messages) {
      await fixture.actor.print_log(message);
      // Give every record its own timestamp.
      await fixture.pic.advanceTime(1_000);
    }
  }

  async function fetchLogs(options: Partial<FetchCanisterLogsOptions> = {}) {
    return await fixture.pic.fetchCanisterLogs({
      canisterId: fixture.canisterId,
      sender: CONTROLLER.getPrincipal(),
      ...options,
    });
  }

  beforeEach(async () => {
    fixture = await TestFixture.create();
  });

  afterEach(async () => {
    await fixture.tearDown();
  });

  it('should fetch the log records of a canister', async () => {
    await printLogs('first', 'second');

    const logs = await fetchLogs();

    expect(logs.map(log => decode(log.content))).toEqual(['first', 'second']);
    expect(logs[1].idx).toBeGreaterThan(logs[0].idx);
    expect(logs[1].timestampNanos).toBeGreaterThan(logs[0].timestampNanos);
  });

  it('should return no log records for a canister without logs', async () => {
    expect(await fetchLogs()).toEqual([]);
  });

  it('should filter log records by index', async () => {
    await printLogs('first', 'second', 'third');
    const [, second] = await fetchLogs();

    const logs = await fetchLogs({
      filter: { type: 'byIdx', start: second.idx, end: second.idx + 1n },
    });

    expect(logs.map(log => decode(log.content))).toEqual(['second']);
  });

  it('should filter log records by timestamp', async () => {
    await printLogs('first', 'second', 'third');
    const [, second, third] = await fetchLogs();

    const logs = await fetchLogs({
      filter: {
        type: 'byTimestampNanos',
        start: second.timestampNanos,
        end: third.timestampNanos,
      },
    });

    expect(logs.map(log => decode(log.content))).toEqual(['second']);
  });

  it('should reject principals that are not allowed to read the logs', async () => {
    await printLogs('private');

    await expect(fetchLogs({ sender: Principal.anonymous() })).rejects.toThrow(
      'is not allowed to access canister logs',
    );
    await expect(
      fetchLogs({ sender: fixture.controller.getPrincipal() }),
    ).rejects.toThrow('is not allowed to access canister logs');
  });

  it('should allow anonymous reads of public logs', async () => {
    await printLogs('public');
    await fixture.pic.updateCanisterSettings({
      canisterId: fixture.canisterId,
      sender: CONTROLLER.getPrincipal(),
      logVisibility: { public: null },
    });

    const logs = await fetchLogs({ sender: Principal.anonymous() });

    expect(logs.map(log => decode(log.content))).toEqual(['public']);
  });

  it('should allow reads by allowed viewers', async () => {
    const viewer = generateRandomIdentity().getPrincipal();
    await printLogs('shared');
    await fixture.pic.updateCanisterSettings({
      canisterId: fixture.canisterId,
      sender: CONTROLLER.getPrincipal(),
      logVisibility: { allowedViewers: [viewer] },
    });

    const logs = await fetchLogs({ sender: viewer });

    expect(logs.map(log => decode(log.content))).toEqual(['shared']);
  });
});
