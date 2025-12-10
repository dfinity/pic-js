import { resolve } from 'path';
import { Actor, IcpFeaturesConfig, PocketIc } from '@dfinity/pic';
import { type _SERVICE, idlFactory } from '../../declarations/icp_features.did';
import { Principal } from '@icp-sdk/core/principal';

const WASM_PATH = resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  '.dfx',
  'local',
  'canisters',
  'icp_features',
  'icp_features.wasm.gz',
);

const E8S_PER_ICP = 100_000_000;

describe('ICP Features', () => {
  let pic: PocketIc;
  let actor: Actor<_SERVICE>;

  beforeEach(async () => {
    pic = await PocketIc.create(process.env.PIC_URL, {
      icpFeatures: {
        icpToken: IcpFeaturesConfig.DefaultConfig,
        // you can also enable other ICP features here
      },
    });

    const fixture = await pic.setupCanister<_SERVICE>({
      idlFactory,
      wasm: WASM_PATH,
    });
    actor = fixture.actor;
  });

  afterEach(async () => {
    await pic.tearDown();
  });

  it('ICP ledger should be available (get balance)', async () => {
    // Pocket IC sets 1B ICP as the initial balance for the anonymous principal
    const balance = await actor.get_balance(Principal.anonymous());
    expect(balance).toBe(BigInt(1_000_000_000) * BigInt(E8S_PER_ICP));
  });
});
