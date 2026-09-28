import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateRandomIdentity } from '../../src';
import {
  _SERVICE as TestCanister,
  idlFactory,
} from '../test-canister/declarations/test_canister.did';
import { CONTROLLER, TestFixture } from './util';

describe('canister snapshots', () => {
  let fixture: TestFixture;
  const sender = CONTROLLER.getPrincipal();

  beforeEach(async () => {
    fixture = await TestFixture.create();
    fixture.actor.setPrincipal(sender);
  });

  afterEach(async () => {
    await fixture.tearDown();
  });

  it('should restore the state of a snapshot', async () => {
    const { pic, canisterId, actor } = fixture;
    await actor.set_value(1n);

    const snapshot = await pic.takeCanisterSnapshot({ canisterId, sender });
    await actor.set_value(2n);
    await pic.loadCanisterSnapshot({
      canisterId,
      snapshotId: snapshot.id,
      sender,
    });

    expect(await actor.get_value()).toBe(1n);
    expect(snapshot.totalSize).toBeGreaterThan(0n);
    expect(snapshot.takenAtTimestamp).toBeGreaterThan(0n);
  });

  it('should list, replace and delete snapshots', async () => {
    const { pic, canisterId } = fixture;

    const first = await pic.takeCanisterSnapshot({ canisterId, sender });
    expect(await pic.listCanisterSnapshots({ canisterId, sender })).toEqual([
      first,
    ]);

    const second = await pic.takeCanisterSnapshot({
      canisterId,
      replaceSnapshot: first.id,
      sender,
    });
    expect(await pic.listCanisterSnapshots({ canisterId, sender })).toEqual([
      second,
    ]);
    expect(second.id).not.toEqual(first.id);

    await pic.deleteCanisterSnapshot({
      canisterId,
      snapshotId: second.id,
      sender,
    });
    expect(await pic.listCanisterSnapshots({ canisterId, sender })).toEqual([]);
  });

  it('should uninstall the code after taking a snapshot', async () => {
    const { pic, canisterId, actor } = fixture;
    await actor.set_value(3n);

    const snapshot = await pic.takeCanisterSnapshot({
      canisterId,
      uninstallCode: true,
      sender,
    });
    const status = await pic.canisterStatus({ canisterId, sender });
    expect(status.moduleHash).toBeNull();

    await pic.loadCanisterSnapshot({
      canisterId,
      snapshotId: snapshot.id,
      sender,
    });
    expect(await actor.get_value()).toBe(3n);
  });

  it('should download a snapshot and upload it to another canister', async () => {
    const { pic, canisterId, actor } = fixture;
    const snapshotDir = join(await mkdtemp(join(tmpdir(), 'pic-')), 'snap');

    try {
      await actor.set_value(4n);
      const snapshot = await pic.takeCanisterSnapshot({ canisterId, sender });
      await pic.downloadCanisterSnapshot({
        canisterId,
        snapshotId: snapshot.id,
        snapshotDir,
        sender,
      });
      expect((await readdir(snapshotDir)).length).toBeGreaterThan(0);

      const otherCanisterId = await pic.createCanister({
        sender,
        controllers: [sender],
      });
      const uploadedId = await pic.uploadCanisterSnapshot({
        canisterId: otherCanisterId,
        snapshotDir,
        sender,
      });
      await pic.loadCanisterSnapshot({
        canisterId: otherCanisterId,
        snapshotId: uploadedId,
        sender,
      });

      const other = pic.createActor<TestCanister>({
        idlFactory,
        canisterId: otherCanisterId,
        sender,
      });
      expect(await other.get_value()).toBe(4n);
    } finally {
      await rm(join(snapshotDir, '..'), { recursive: true, force: true });
    }
  });

  it('should reject a sender that is not a controller', async () => {
    const { pic, canisterId } = fixture;

    await expect(
      pic.takeCanisterSnapshot({
        canisterId,
        sender: generateRandomIdentity().getPrincipal(),
      }),
    ).rejects.toThrow('can call ic00 method take_canister_snapshot');
  });
});
