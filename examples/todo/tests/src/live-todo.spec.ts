import { resolve } from 'node:path';
import { ActorSubclass, Actor, HttpAgent } from '@icp-sdk/core/agent';
import { PocketIc, SubnetStateType, createIdentity } from '@dfinity/pic';
import { _SERVICE, idlFactory } from '../../declarations/todo.did';

const WASM_PATH = resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  '.dfx',
  'local',
  'canisters',
  'todo',
  'todo.wasm.gz',
);

describe('Live Todo', () => {
  let pic: PocketIc;
  let agent: HttpAgent;
  let actor: ActorSubclass<_SERVICE>;

  const alice = createIdentity('superSecretAlicePassword');
  const bob = createIdentity('superSecretBobPassword');

  beforeEach(async () => {
    pic = await PocketIc.create(process.env.PIC_URL, {
      nns: { state: { type: SubnetStateType.New } },
      application: [{ state: { type: SubnetStateType.New } }],
    });

    const canisterId = await pic.createCanister();
    await pic.installCode({ canisterId, wasm: WASM_PATH });

    const httpGatewayPort = await pic.makeLive();
    const httpGatewayUrl = `http://localhost:${httpGatewayPort}`;
    agent = await HttpAgent.create({
      host: httpGatewayUrl,
      shouldFetchRootKey: true,
    });
    actor = Actor.createActor(idlFactory, { agent, canisterId });
  });

  afterEach(async () => {
    await pic.stopLive();
    await pic.tearDown();
  });

  it("should return alice's todos to alice and bob's todos to bob", async () => {
    agent.replaceIdentity(alice);
    const aliceCreateResponse = await actor.create_todo({
      text: 'Learn Rust',
    });
    const aliceAfterCreateGetResponse = await actor.get_todos();

    agent.replaceIdentity(bob);
    const bobCreateResponse = await actor.create_todo({
      text: 'Learn WebAssembly',
    });
    const bobAfterCreateGetResponse = await actor.get_todos();

    expect(aliceAfterCreateGetResponse.todos).toHaveLength(1);
    expect(aliceAfterCreateGetResponse.todos).toContainEqual({
      id: aliceCreateResponse.id,
      text: 'Learn Rust',
      done: false,
    });

    expect(bobAfterCreateGetResponse.todos).toHaveLength(1);
    expect(bobAfterCreateGetResponse.todos).toContainEqual({
      id: bobCreateResponse.id,
      text: 'Learn WebAssembly',
      done: false,
    });
  });

  it("should prevent bob from updating alice's todo", async () => {
    agent.replaceIdentity(alice);
    const aliceCreateResponse = await actor.create_todo({
      text: 'Learn Rust',
    });

    agent.replaceIdentity(bob);
    await expect(
      actor.update_todo(aliceCreateResponse.id, {
        text: ['Learn Rust and WebAssembly'],
        done: [],
      }),
    ).rejects.toThrow(
      `Caller with principal ${bob
        .getPrincipal()
        .toText()} does not own todo with id ${aliceCreateResponse.id}`,
    );
  });

  it('should prevent bob from deleting alices todo', async () => {
    agent.replaceIdentity(alice);
    const aliceCreateResponse = await actor.create_todo({
      text: 'Learn Rust',
    });

    agent.replaceIdentity(bob);
    await expect(actor.delete_todo(aliceCreateResponse.id)).rejects.toThrow(
      `Caller with principal ${bob
        .getPrincipal()
        .toText()} does not own todo with id ${aliceCreateResponse.id}`,
    );
  });
});
