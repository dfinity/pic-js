import { resolve } from 'node:path';
import { Principal } from '@dfinity/principal';
import { Actor, PocketIc } from '@hadronous/pic';

import { _SERVICE, idlFactory } from '../../declarations/clock.did';

const WASM_PATH = resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  '.dfx',
  'local',
  'canisters',
  'clock',
  'clock.wasm',
);

describe('Clock', () => {
  let actor: Actor<_SERVICE>;
  let pic: PocketIc;
  let canisterId: Principal;

  beforeEach(async () => {
    pic = await PocketIc.create(process.env.PIC_URL);
    const fixture = await pic.setupCanister<_SERVICE>({
      idlFactory: idlFactory,
      wasm: WASM_PATH,
    });
    actor = fixture.actor;
    canisterId = fixture.canisterId;
  });

  afterEach(async () => {
    await pic.tearDown();
  });

  it('should create the correct canister', async () => {
    const canisterExists = await pic.getCanisterSubnetId(canisterId);

    expect(canisterExists).toBeTruthy();
  });

  it('should not create any other canister', async () => {
    const otherCanisterId = Principal.fromUint8Array(new Uint8Array([0]));
    const canisterExists = await pic.getCanisterSubnetId(otherCanisterId);

    expect(canisterExists).toBeFalsy();
  });

  it('should set and get canister cycles', async () => {
    const cycles = await pic.getCyclesBalance(canisterId);

    const cyclesToAdd = 1_000_000_000;
    const updatedCyclesBalance = await pic.addCycles(canisterId, cyclesToAdd);
    const fetchUpdatedCyclesBalance = await pic.getCyclesBalance(canisterId);

    expect(updatedCyclesBalance).toEqual(cycles + cyclesToAdd);
    expect(fetchUpdatedCyclesBalance).toEqual(updatedCyclesBalance);
  });

  it.each([1, 10, 1_000, 100_000])(
    'should return the correct time after %d second(s)',
    async timeToAdvanceS => {
      await pic.resetTime();
      await pic.tick();

      const timeToAdvanceMs = timeToAdvanceS * 1_000;

      const initialTime = await actor.get();
      await pic.advanceTime(timeToAdvanceMs);
      await pic.tick();
      const finalTime = await actor.get();

      expect(finalTime).toEqual(initialTime + BigInt(timeToAdvanceMs));
    },
  );
});
