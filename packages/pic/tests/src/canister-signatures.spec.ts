import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import {
  Cbor,
  HashTree,
  NodeType,
  reconstruct,
  wrapDER,
} from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import { PocketIc, SubnetStateType } from '../../src';
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

// SEQUENCE(OID 1.3.6.1.4.1.56387.1.2), the canister signature algorithm.
const CANISTER_SIG_OID = new Uint8Array([
  0x30, 0x0c, 0x06, 0x0a, 0x2b, 0x06, 0x01, 0x04, 0x01, 0x83, 0xb8, 0x43, 0x01,
  0x02,
]);

function sha256(data: Uint8Array): Uint8Array {
  return new Uint8Array(createHash('sha256').update(data).digest());
}

function labeled(label: Uint8Array | string, tree: HashTree): HashTree {
  const bytes =
    typeof label === 'string' ? new TextEncoder().encode(label) : label;

  return [NodeType.Labeled, bytes, tree] as HashTree;
}

function canisterSigPublicKey(
  canisterId: Principal,
  seed: Uint8Array,
): Uint8Array {
  const id = canisterId.toUint8Array();

  return new Uint8Array(
    wrapDER(new Uint8Array([id.length, ...id, ...seed]), CANISTER_SIG_OID),
  );
}

describe('canister signatures', () => {
  let pic: PocketIc;
  let canisterId: Principal;
  let actor: TestCanister;
  let rootKey: Uint8Array;

  const seed = new TextEncoder().encode('seed');
  const message = new TextEncoder().encode('message');

  // Signs the message as the canister: certifies a hash tree containing
  // ["sig", sha256(seed), sha256(message)] and returns the certificate with it.
  async function sign(): Promise<Uint8Array> {
    const tree = labeled(
      'sig',
      labeled(
        sha256(seed),
        labeled(sha256(message), [NodeType.Leaf, new Uint8Array()] as HashTree),
      ),
    );
    await actor.set_certified_data(await reconstruct(tree));
    const [certificate] = await actor.get_certificate();

    return new Uint8Array(Cbor.encode({ certificate, tree }));
  }

  beforeEach(async () => {
    pic = await PocketIc.create(process.env.PIC_URL, {
      nns: NEW_SUBNET,
      application: [NEW_SUBNET],
    });
    ({ canisterId, actor } = await pic.setupCanister<TestCanister>({
      idlFactory,
      wasm: WASM_PATH,
    }));

    const nnsSubnet = await pic.getNnsSubnet();
    rootKey = await pic.getPubKey(nnsSubnet!.id);
  });

  afterEach(async () => {
    await pic.tearDown();
  });

  it('should verify a valid canister signature', async () => {
    const signature = await sign();

    await pic.verifyCanisterSignature({
      message,
      signature,
      publicKey: canisterSigPublicKey(canisterId, seed),
      rootKey,
    });
  });

  it('should reject a signature for another message', async () => {
    const signature = await sign();

    await expect(
      pic.verifyCanisterSignature({
        message: new TextEncoder().encode('other message'),
        signature,
        publicKey: canisterSigPublicKey(canisterId, seed),
        rootKey,
      }),
    ).rejects.toThrow('Canister signature verification failed');
  });

  it('should reject a signature for another seed', async () => {
    const signature = await sign();

    await expect(
      pic.verifyCanisterSignature({
        message,
        signature,
        publicKey: canisterSigPublicKey(
          canisterId,
          new TextEncoder().encode('other seed'),
        ),
        rootKey,
      }),
    ).rejects.toThrow('Canister signature verification failed');
  });
});
