import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';
import { IDL } from '@icp-sdk/core/candid';
import { PocketIc, SubnetStateType, generateRandomIdentity } from '../../src';
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

describe('senderInfo', () => {
  let wasm: Uint8Array;

  beforeAll(() => {
    wasm = loadWasm();
  });

  it('accepts senderInfo on query and update calls', async () => {
    const pic = await PocketIc.create(process.env.PIC_URL, {
      application: [{ state: { type: SubnetStateType.New } }],
    });
    try {
      const canisterId = await pic.createCanister({
        sender: CONTROLLER_PRINCIPAL,
        controllers: [CONTROLLER_PRINCIPAL],
      });
      await pic.installCode({
        canisterId,
        wasm,
        sender: CONTROLLER_PRINCIPAL,
      });

      const senderInfo = {
        info: new Uint8Array([1, 2, 3, 4]),
        // The signer must be a valid canister id; the target canister is one.
        signer: canisterId,
      };

      const arg = new Uint8Array(IDL.encode([], []));

      const queryRes = await pic.queryCall({
        canisterId,
        method: 'get_time',
        arg,
        senderInfo,
      });
      expect(IDL.decode([IDL.Int], queryRes)[0]).toBeGreaterThan(0n);

      const updateRes = await pic.updateCall({
        canisterId,
        method: 'get_time',
        arg,
        senderInfo,
      });
      expect(IDL.decode([IDL.Int], updateRes)[0]).toBeGreaterThan(0n);
    } finally {
      await pic.tearDown();
    }
  });
});
