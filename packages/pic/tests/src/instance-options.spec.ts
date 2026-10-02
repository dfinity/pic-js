import { Principal } from '@icp-sdk/core/principal';
import {
  CreateInstanceOptions,
  IcpFeaturesConfig,
  LogLevel,
  PocketIc,
  SubnetStateType,
} from '../../src';

const NEW_SUBNET = { state: { type: SubnetStateType.New } } as const;

const BITCOIN_CANISTER_ID = 'g4xu7-jiaaa-aaaan-aaaaq-cai';
const DOGECOIN_CANISTER_ID = 'gordg-fyaaa-aaaan-aaadq-cai';
const CANISTER_MIGRATION_CANISTER_ID = 'sbzkb-zqaaa-aaaaa-aaaiq-cai';
const MAINNET_NNS_SUBNET_ID =
  'tdb26-jop6k-aogll-7ltgs-eruif-6kk7m-qpktf-gdiqx-mxtrf-vb5e6-eqe';

describe('instance options', () => {
  let pic: PocketIc | undefined;

  async function create(options: CreateInstanceOptions): Promise<PocketIc> {
    pic = await PocketIc.create(process.env.PIC_URL, options);

    return pic;
  }

  afterEach(async () => {
    await pic?.stopLive();
    await pic?.tearDown();
    pic = undefined;
  });

  describe('initialTime', () => {
    it('should set the initial time from a Date or milliseconds', async () => {
      const initialTime = new Date('2030-01-02T03:04:05.000Z');

      const fromDate = await create({
        application: [NEW_SUBNET],
        initialTime,
      });
      expect(await fromDate.getTime()).toBe(initialTime.getTime());
      await fromDate.tearDown();

      const fromMillis = await create({
        application: [NEW_SUBNET],
        initialTime: initialTime.getTime(),
      });
      expect(await fromMillis.getTime()).toBe(initialTime.getTime());
    });

    it('should reject a time before the earliest supported one', async () => {
      await expect(
        create({
          application: [NEW_SUBNET],
          initialTime: new Date('2021-05-06T19:17:09.000Z'),
        }),
      ).rejects.toThrow('must be no earlier than');
    });

    it('should not be combined with autoProgress', async () => {
      await expect(
        create({
          application: [NEW_SUBNET],
          initialTime: new Date(),
          autoProgress: {},
        }),
      ).rejects.toThrow(
        'The initialTime and autoProgress options cannot be combined',
      );
    });
  });

  describe('autoProgress', () => {
    it('should create a live instance that follows the real time', async () => {
      const live = await create({
        application: [NEW_SUBNET],
        autoProgress: {},
      });

      expect(Math.abs((await live.getTime()) - Date.now())).toBeLessThan(
        10_000,
      );

      const port = await live.makeLive();
      const res = await fetch(`http://localhost:${port}/api/v2/status`);
      expect(res.status).toBe(200);
    });

    it('should reject a new artificial delay once live', async () => {
      const live = await create({
        application: [NEW_SUBNET],
        autoProgress: { artificialDelayMs: 100 },
      });

      await expect(live.makeLive({ artificialDelayMs: 200 })).rejects.toThrow(
        'The instance is already live',
      );
    });
  });

  it('should create the NNS subnet with the mainnet subnet ID', async () => {
    const instance = await create({
      nns: NEW_SUBNET,
      mainnetNnsSubnetId: true,
    });

    expect((await instance.getNnsSubnet())?.id.toText()).toBe(
      MAINNET_NNS_SUBNET_ID,
    );
  });

  it.each<LogLevel>(['critical', 'error', 'warn', 'info', 'debug', 'trace'])(
    'should accept the %s log level',
    async logLevel => {
      const instance = await create({ application: [NEW_SUBNET], logLevel });

      await instance.tick();
    },
  );

  describe('ICP features', () => {
    async function expectCanister(
      instance: PocketIc,
      canisterId: string,
      subnetId: Principal | undefined,
    ): Promise<void> {
      const id = Principal.fromText(canisterId);

      expect(await instance.canisterExists(id)).toBe(true);
      expect((await instance.getCanisterSubnetId(id))?.toText()).toBe(
        subnetId?.toText(),
      );
    }

    it('should deploy the Bitcoin canister to the Bitcoin subnet', async () => {
      const instance = await create({
        icpFeatures: { bitcoin: IcpFeaturesConfig.DefaultConfig },
      });

      const bitcoinSubnet = await instance.getBitcoinSubnet();
      await expectCanister(instance, BITCOIN_CANISTER_ID, bitcoinSubnet?.id);
    });

    it('should deploy the Dogecoin canister to the Bitcoin subnet', async () => {
      const instance = await create({
        icpFeatures: { dogecoin: IcpFeaturesConfig.DefaultConfig },
      });

      const bitcoinSubnet = await instance.getBitcoinSubnet();
      await expectCanister(instance, DOGECOIN_CANISTER_ID, bitcoinSubnet?.id);
    });

    it('should deploy the canister migration orchestrator to the NNS subnet', async () => {
      const instance = await create({
        icpFeatures: { canisterMigration: IcpFeaturesConfig.DefaultConfig },
      });

      const nnsSubnet = await instance.getNnsSubnet();
      await expectCanister(
        instance,
        CANISTER_MIGRATION_CANISTER_ID,
        nnsSubnet?.id,
      );
    });

    it.each([
      ['bitcoin', { bitcoindAddrs: ['127.0.0.1:18444'] }],
      ['dogecoin', { dogecoindAddrs: ['127.0.0.1:18445'] }],
    ] as const)(
      'should accept %s node addresses that nothing listens on yet',
      async (feature, addrs) => {
        await create({
          icpFeatures: { [feature]: IcpFeaturesConfig.DefaultConfig },
          ...addrs,
        });
      },
    );

    it('should reject bitcoind and dogecoind addresses together', async () => {
      await expect(
        create({
          icpFeatures: {
            bitcoin: IcpFeaturesConfig.DefaultConfig,
            dogecoin: IcpFeaturesConfig.DefaultConfig,
          },
          bitcoindAddrs: ['127.0.0.1:18444'],
          dogecoindAddrs: ['127.0.0.1:18445'],
        }),
      ).rejects.toThrow(
        'The bitcoindAddrs and dogecoindAddrs options cannot be combined',
      );
    });
  });
});
