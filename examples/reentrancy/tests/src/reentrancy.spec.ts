import { resolve } from 'node:path';
import { Principal } from '@icp-sdk/core/principal';
import {
  Actor,
  DeferredActor,
  generateRandomIdentity,
  PocketIc,
} from '@dfinity/pic';

import { _SERVICE, idlFactory } from '../../declarations/reentrancy.did';

const WASM_PATH = resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  '.icp',
  'cache',
  'artifacts',
  'reentrancy',
);

describe('Reentrancy', () => {
  let pic: PocketIc;
  let actor: Actor<_SERVICE>;
  let deferredActor: DeferredActor<_SERVICE>;
  const user = generateRandomIdentity().getPrincipal();

  beforeEach(async () => {
    pic = await PocketIc.create(process.env.PIC_URL);
    let canisterId: Principal;
    ({ actor, canisterId } = await pic.setupCanister<_SERVICE>({
      idlFactory,
      wasm: WASM_PATH,
    }));
    actor.setPrincipal(user);
    deferredActor = pic.createDeferredActor<_SERVICE>({
      idlFactory,
      canisterId,
      sender: user,
    });

    await actor.deposit(100n);
  });

  afterEach(async () => {
    await pic.tearDown();
  });

  it('pays out twice when two withdrawals interleave', async () => {
    // Submit both withdrawals before executing either of them.
    const executeFirst = await deferredActor.withdraw_vulnerable(100n);
    const executeSecond = await deferredActor.withdraw_vulnerable(100n);

    const results = await Promise.allSettled([executeFirst(), executeSecond()]);

    // Both passed the balance check before either deducted the amount, so both
    // transfers went out. One then deducted the amount and the other trapped.
    expect(results).toContainEqual({
      status: 'fulfilled',
      value: { ok: null },
    });
    expect(results).toContainEqual({
      status: 'rejected',
      reason: expect.objectContaining({
        message: expect.stringContaining('Natural subtraction underflow'),
      }),
    });
    expect(await actor.paid_out()).toBe(200n);
  });

  it('pays out once when the balance is deducted before the await', async () => {
    const executeFirst = await deferredActor.withdraw_fixed(100n);
    const executeSecond = await deferredActor.withdraw_fixed(100n);

    const results = await Promise.all([executeFirst(), executeSecond()]);

    expect(results).toContainEqual({ ok: null });
    expect(results).toContainEqual({ err: { InsufficientFunds: null } });
    expect(await actor.balance()).toBe(0n);
    expect(await actor.paid_out()).toBe(100n);
  });

  it('misses the bug when the withdrawals are made one after another', async () => {
    // A regular actor executes each call before the next one is made.
    expect(await actor.withdraw_vulnerable(100n)).toEqual({ ok: null });
    expect(await actor.withdraw_vulnerable(100n)).toEqual({
      err: { InsufficientFunds: null },
    });
    expect(await actor.paid_out()).toBe(100n);
  });
});
