import { resolve } from 'node:path';
import { Principal } from '@dfinity/principal';
import { Actor, PocketIc } from '@hadronous/pic';
import { IDL } from '@dfinity/candid';
import { _SERVICE, idlFactory, init } from '../../declarations/counter.did';

const WASM_PATH = resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  '.dfx',
  'local',
  'canisters',
  'counter',
  'counter.wasm',
);

describe('Counter', () => {
  let pic: PocketIc;
  let actor: Actor<_SERVICE>;
  let canisterId: Principal;

  const countInitArg = 1n;

  beforeEach(async () => {
    pic = await PocketIc.create();
    const fixture = await pic.setupCanister<_SERVICE>({
      idlFactory,
      wasm: WASM_PATH,
      arg: IDL.encode(init({ IDL }), [countInitArg]),
    });
    actor = fixture.actor;
    canisterId = fixture.canisterId;
  });

  afterEach(async () => {
    await pic.tearDown();
  });

  it(`should start at ${countInitArg}`, async () => {
    const result = await actor.get();

    expect(result).toEqual(countInitArg);
  });

  it.each([42n, 306n, 7n])('should set the counter to %d', async input => {
    await actor.set(input);
    const result = await actor.get();

    expect(result).toEqual(input);
  });

  it(`should increment from ${countInitArg}`, async () => {
    const initialCount = await actor.get();

    await actor.inc();
    const countAfterFirstInc = await actor.get();

    await actor.inc();
    const finalCount = await actor.get();

    expect(initialCount).toEqual(countInitArg);
    expect(countAfterFirstInc).toEqual(countInitArg + 1n);
    expect(finalCount).toEqual(countInitArg + 2n);
  });

  it.each([42n, 306n, 7n])('should increment from %d', async input => {
    await actor.set(input);
    const initialCount = await actor.get();

    await actor.inc();
    const countAfterFirstInc = await actor.get();

    await actor.inc();
    const finalCount = await actor.get();

    expect(initialCount).toEqual(input);
    expect(countAfterFirstInc).toEqual(input + 1n);
    expect(finalCount).toEqual(input + 2n);
  });

  it.each([42n, 306n, 7n])('should decrement from %d', async input => {
    await actor.set(input);
    const initialCount = await actor.get();

    await actor.dec();
    const countAfterFirstDec = await actor.get();

    await actor.dec();
    const finalCount = await actor.get();

    expect(initialCount).toEqual(input);
    expect(countAfterFirstDec).toEqual(input - 1n);
    expect(finalCount).toEqual(input - 2n);
  });

  it('should fail to decrement from 0', async () => {
    await actor.set(0n);
    const initialCount = await actor.get();

    expect(initialCount).toEqual(0n);
    await expect(actor.dec()).rejects.toThrow('Natural subtraction underflow');
  });

  it('should upgrade the canister', async () => {
    await actor.inc();
    const preUpgradeCount = await actor.get();

    await pic.upgradeCanister({
      canisterId,
      wasm: WASM_PATH,
      arg: IDL.encode(init({ IDL }), [countInitArg]),
    });
    const postUpgradeCount = await actor.get();

    expect(preUpgradeCount).toEqual(postUpgradeCount);
  });

  it('should reinstall the canister', async () => {
    await actor.inc();
    const preReinstallCount = await actor.get();

    await pic.reinstallCode({
      canisterId,
      wasm: WASM_PATH,
      arg: IDL.encode(init({ IDL }), [countInitArg]),
    });
    const postReinstallCount = await actor.get();

    expect(postReinstallCount).not.toEqual(preReinstallCount);
  });
});
