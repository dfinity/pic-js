import { resolve } from 'node:path';
import { Principal } from '@dfinity/principal';
import { Actor, generateRandomIdentity, PocketIc } from '@dfinity/pic';
import { Identity } from '@dfinity/agent';

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
  'clock.wasm.gz',
);

describe('Clock', () => {
  let actor: Actor<_SERVICE>;
  let pic: PocketIc;
  let canisterId: Principal;

  let controllerIdentity: Identity;
  let otherControllerIdentity: Identity;

  beforeEach(async () => {
    controllerIdentity = generateRandomIdentity();
    otherControllerIdentity = generateRandomIdentity();

    pic = await PocketIc.create(process.env.PIC_URL);
    const fixture = await pic.setupCanister<_SERVICE>({
      idlFactory,
      wasm: WASM_PATH,
      sender: controllerIdentity.getPrincipal(),
      controllers: [
        controllerIdentity.getPrincipal(),
        otherControllerIdentity.getPrincipal(),
      ],
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

  it('should assign the correct controllers', async () => {
    const controllers = await pic.getControllers(canisterId);

    expect(controllers).toContainEqual(controllerIdentity.getPrincipal());
    expect(controllers).toContainEqual(otherControllerIdentity.getPrincipal());
  });

  it('should not create any other canister', async () => {
    const otherCanisterId = Principal.fromUint8Array(new Uint8Array([0]));
    const canisterExists = await pic.getCanisterSubnetId(otherCanisterId);

    expect(canisterExists).toBeFalsy();
  });

  it('should set and get canister cycles', async () => {
    const cycles = await pic.getCyclesBalance(canisterId);

    const cyclesToAdd = BigInt(1_000_000_000);
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
