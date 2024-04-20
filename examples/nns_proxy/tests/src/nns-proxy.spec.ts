import { resolve } from 'path';
import { Principal } from '@dfinity/principal';
import { Actor, PocketIc, generateRandomIdentity } from '@hadronous/pic';
import { _SERVICE, idlFactory } from '../../declarations/nns_proxy.did';
import { Governance } from './support/governance';

const WASM_PATH = resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  '.dfx',
  'local',
  'canisters',
  'nns_proxy',
  'nns_proxy.wasm',
);

const NNS_SUBNET_ID =
  'adol3-eyjhm-kq6us-sybsj-ovznm-n353k-7xjja-g7q5b-rq2o7-7zphs-dqe';

const NNS_STATE_PATH = resolve(
  __dirname,
  '..',
  'state',
  'nns_state',
  'node-100',
  'state',
);

describe('NNS Proxy', () => {
  let pic: PocketIc;
  let actor: Actor<_SERVICE>;

  let governance: Governance;

  const proposerIdentity = generateRandomIdentity();

  beforeEach(async () => {
    pic = await PocketIc.create(process.env.PIC_URL, {
      nns: {
        fromPath: NNS_STATE_PATH,
        subnetId: Principal.fromText(NNS_SUBNET_ID),
      },
    });
    await pic.setTime(new Date(2024, 1, 30).getTime());
    await pic.tick();

    const fixture = await pic.setupCanister<_SERVICE>({
      idlFactory,
      wasm: WASM_PATH,
    });
    actor = fixture.actor;

    governance = new Governance(pic);
  }, 15_000);

  afterEach(async () => {
    await pic.tearDown();
  });

  describe('pending proposals', () => {
    it('should create and fetch pending proposals', async () => {
      const neuronId = await governance.createNeuron(proposerIdentity);

      await governance.createRvmProposal(proposerIdentity, {
        neuronId: neuronId,
        title: 'Test Proposal',
        summary: 'Test Proposal Summary',
        replicaVersion: 'ca82a6dff817ec66f44342007202690a93763949',
      });

      const proposals = await actor.get_pending_proposals();

      expect(proposals.length).toBe(1);
      expect(proposals[0].title[0]).toBe('Test Proposal');
      expect(proposals[0].summary[0]).toBe('Test Proposal Summary');
    });
  });

  describe('fetchRootKey', () => {
    it('should fetch the root key of the NNS subnet', async () => {
      const nnsSubnet = pic.getNnsSubnet();
      if (!nnsSubnet) {
        throw new Error('NNS subnet not found');
      }

      const rootKey = pic.getPubKey(nnsSubnet.id);
      expect(rootKey).toBeDefined();
    });
  });
});
