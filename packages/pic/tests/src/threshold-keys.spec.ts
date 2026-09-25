import { resolve } from 'node:path';
import {
  CreateInstanceOptions,
  PocketIc,
  SubnetStateType,
  SubnetType,
} from '../../src';
import {
  _SERVICE as TestCanister,
  idlFactory,
} from '../test-canister/declarations/test_canister.did';

const WASM_PATH = resolve(
  __dirname,
  '..',
  'test-canister',
  'test_canister.wasm.gz',
);

const NEW_SUBNET = { state: { type: SubnetStateType.New } } as const;

describe('threshold keys', () => {
  let pic: PocketIc;

  async function setup(options: CreateInstanceOptions): Promise<TestCanister> {
    pic = await PocketIc.create(process.env.PIC_URL, {
      application: [NEW_SUBNET],
      ...options,
    });
    const { actor } = await pic.setupCanister<TestCanister>({
      idlFactory,
      wasm: WASM_PATH,
    });

    return actor;
  }

  afterEach(async () => {
    await pic.tearDown();
  });

  it('should provide test_key_1 on the test threshold keys subnet', async () => {
    const actor = await setup({ testThresholdKeys: NEW_SUBNET });

    expect(await actor.ecdsa_public_key_size('test_key_1')).toEqual({
      ok: 33n,
    });
    expect(await actor.schnorr_public_key_size('test_key_1')).toEqual({
      ok: 32n,
    });
    expect(await actor.vetkd_public_key_size('test_key_1')).toEqual({
      ok: 96n,
    });
  });

  it('should not provide test_key_1 without the test threshold keys subnet', async () => {
    const actor = await setup({ fiduciary: NEW_SUBNET });

    const result = await actor.ecdsa_public_key_size('test_key_1');

    expect(result).toEqual({
      err: expect.stringContaining('Requested unknown threshold key'),
    });
  });

  it('should provide key_1 on the fiduciary subnet', async () => {
    const actor = await setup({ fiduciary: NEW_SUBNET });

    expect(await actor.ecdsa_public_key_size('key_1')).toEqual({ ok: 33n });
    expect(await actor.schnorr_public_key_size('key_1')).toEqual({ ok: 32n });
  });

  it('should report the test threshold keys subnet in the topology', async () => {
    await setup({ testThresholdKeys: NEW_SUBNET });

    const subnet = await pic.getTestThresholdKeysSubnet();

    expect(subnet?.type).toBe(SubnetType.TestThresholdKeys);
  });
});
