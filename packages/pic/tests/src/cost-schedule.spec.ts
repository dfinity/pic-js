import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';
import {
  CanisterCyclesCostSchedule,
  PocketIc,
  SubnetStateType,
  generateRandomIdentity,
} from '../../src';
import {
  _SERVICE as TestCanister,
  idlFactory,
} from '../test-canister/declarations/test_canister.did';

const WASM_PATH = path.resolve(
  __dirname,
  '..',
  'test-canister',
  'test_canister.wasm.gz',
);

function loadWasm(): Uint8Array {
  return new Uint8Array(gunzipSync(readFileSync(WASM_PATH)));
}

const CONTROLLER = generateRandomIdentity();
const CONTROLLER_PRINCIPAL = CONTROLLER.getPrincipal();

const INITIAL_CYCLES = 1_000_000_000_000_000_000n;

describe('ApplicationSubnetConfig.costSchedule', () => {
  let wasm: Uint8Array;

  beforeAll(() => {
    wasm = loadWasm();
  });

  it('defaults to Normal when costSchedule is omitted', async () => {
    const pic = await PocketIc.create(process.env.PIC_URL, {
      application: [{ state: { type: SubnetStateType.New } }],
    });
    try {
      const canisterId = await pic.createCanister({
        sender: CONTROLLER_PRINCIPAL,
        controllers: [CONTROLLER_PRINCIPAL],
        cycles: INITIAL_CYCLES,
      });
      await pic.installCode({
        canisterId,
        wasm,
        sender: CONTROLLER_PRINCIPAL,
      });

      const actor = pic.createActor<TestCanister>(idlFactory, canisterId);
      await actor.get_time();

      const balanceBefore = await pic.getCyclesBalance(canisterId);

      await pic.advanceTime(30 * 24 * 60 * 60 * 1000);
      await pic.tick(5);
      await actor.get_time();

      const balanceAfter = await pic.getCyclesBalance(canisterId);

      expect(balanceAfter).toBeLessThan(balanceBefore);
    } finally {
      await pic.tearDown();
    }
  });

  it('accepts costSchedule: Free on an application subnet and preserves the cycles balance', async () => {
    const pic = await PocketIc.create(process.env.PIC_URL, {
      application: [
        {
          state: { type: SubnetStateType.New },
          costSchedule: CanisterCyclesCostSchedule.Free,
        },
      ],
    });
    try {
      const canisterId = await pic.createCanister({
        sender: CONTROLLER_PRINCIPAL,
        controllers: [CONTROLLER_PRINCIPAL],
        cycles: INITIAL_CYCLES,
      });
      await pic.installCode({
        canisterId,
        wasm,
        sender: CONTROLLER_PRINCIPAL,
      });

      const actor = pic.createActor<TestCanister>(idlFactory, canisterId);
      await actor.get_time();

      const balanceBefore = await pic.getCyclesBalance(canisterId);

      await pic.advanceTime(30 * 24 * 60 * 60 * 1000);
      await pic.tick(5);
      await actor.get_time();

      const balanceAfter = await pic.getCyclesBalance(canisterId);

      expect(balanceAfter).toBe(balanceBefore);
      expect(balanceAfter).toBe(INITIAL_CYCLES);
    } finally {
      await pic.tearDown();
    }
  });
});
