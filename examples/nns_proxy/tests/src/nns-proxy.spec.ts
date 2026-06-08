import { resolve } from 'path';
import {
  Actor,
  IcpConfigFlag,
  IcpFeaturesConfig,
  PocketIc,
  SubnetStateType,
  generateRandomIdentity,
} from '@dfinity/pic';
import { _SERVICE, idlFactory } from '../../declarations/nns_proxy.did';
import { Governance } from './support/governance';

const WASM_PATH = resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  '.icp',
  'cache',
  'artifacts',
  'nns_proxy',
);

describe('NNS Proxy', () => {
  let pic: PocketIc;
  let actor: Actor<_SERVICE>;

  let governance: Governance;

  const proposerIdentity = generateRandomIdentity();
  // A large neuron that we never vote with, preventing the proposer from
  // reaching absolute majority and keeping proposals in the "Open" state.
  const ballastIdentity = generateRandomIdentity();

  beforeEach(async () => {
    // Enabling beta features to have a smoke test for that config.
    // NNS operations (neuron creation, proposals) can take >30 s on CI,
    // so use a longer processing timeout than the 30 s default.
    pic = await PocketIc.create(process.env.PIC_URL, {
      nns: { state: { type: SubnetStateType.New } },
      icpConfig: {
        betaFeatures: IcpConfigFlag.Enabled,
      },
      icpFeatures: {
        nnsGovernance: IcpFeaturesConfig.DefaultConfig,
        icpToken: IcpFeaturesConfig.DefaultConfig,
        cyclesMinting: IcpFeaturesConfig.DefaultConfig,
        registry: IcpFeaturesConfig.DefaultConfig,
      },
      processingTimeoutMs: 60_000,
    });

    const fixture = await pic.setupCanister<_SERVICE>({
      idlFactory,
      wasm: WASM_PATH,
    });
    actor = fixture.actor;

    governance = new Governance(pic);
  });

  afterEach(async () => {
    await pic.tearDown();
  });

  describe('pending proposals', () => {
    it('should create and fetch pending proposals', async () => {
      // Ballast: 100k ICP so the proposer (1k ICP) is <1% of voting power,
      // preventing absolute majority and keeping the proposal Open.
      await governance.createNeuron(ballastIdentity, 100_000);
      const neuronId = await governance.createNeuron(proposerIdentity);

      await governance.createRvmProposal(proposerIdentity, {
        neuronId: neuronId,
        title: 'Test Proposal',
        summary: 'Test Proposal Summary',
        replicaVersion: '17d483c60a09b393ad82a2091b68a242ac69c72d',
      });

      const proposals = await actor.get_pending_proposals();

      expect(proposals.length).toBe(1);
      // expect(proposals[0].title[0]).toBe('Test Proposal');
      // expect(proposals[0].summary[0]).toBe('Test Proposal Summary');
    });
  });

  describe('fetchRootKey', () => {
    it('should fetch the root key of the NNS subnet', async () => {
      const nnsSubnet = await pic.getNnsSubnet();
      if (!nnsSubnet) {
        throw new Error('NNS subnet not found');
      }

      const rootKey = await pic.getPubKey(nnsSubnet.id);
      expect(rootKey).toBeDefined();
    });
  });
});
