import { resolve } from 'node:path';
import { Principal } from '@dfinity/principal';
// import { Ed25519KeyIdentity } from '@dfinity/identity';
import type { _SERVICE } from '../../declarations/todo.did.js';
import { PocketIc } from '@dfinity/pic/src';
// import type { Actor } from '@dfinity/pic/src/pocket-ic-actor.js';
import { ApplicationSubnetConfig, SubnetStateType } from '@dfinity/pic/src';
import { IDL } from '@dfinity/candid';

export const idlFactory = () => {
  const CreateTodoRequest = IDL.Record({ 'text' : IDL.Text });
  const TodoId = IDL.Nat64;
  const CreateTodoResponse = IDL.Record({ 'id' : TodoId });
  const Todo = IDL.Record({
    'id' : TodoId,
    'done' : IDL.Bool,
    'text' : IDL.Text,
  });
  const GetTodosResponse = IDL.Record({ 'todos' : IDL.Vec(Todo) });
  const UpdateTodoRequest = IDL.Record({
    'done' : IDL.Opt(IDL.Bool),
    'text' : IDL.Opt(IDL.Text),
  });
  return IDL.Service({
    'create_todo' : IDL.Func([CreateTodoRequest], [CreateTodoResponse], []),
    'delete_todo' : IDL.Func([TodoId], [], []),
    'get_todos' : IDL.Func([], [GetTodosResponse], ['query']),
    'update_todo' : IDL.Func([TodoId, UpdateTodoRequest], [], []),
  });
};

const WASM_PATH = resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  '.dfx',
  'local',
  'canisters',
  'todo_proxy',
  'todo_proxy.wasm.gz',
);

const TODO_SUBNET_ID =
  'rrhyh-okzis-kojrp-2nulh-f64wb-7wihe-izt5z-glopl-cba6b-6yv2j-4ae';

const TODO_STATE_PATH = resolve(
  __dirname,
  '..',
  'state',
  'todo_state',
  'node-100',
  'state',
);

describe('Todo Proxy', () => {
  let pic: PocketIc;
  // let actor: Actor<_SERVICE>;

  // const userIdentity = Ed25519KeyIdentity.generate();

  beforeEach(async () => {
    const applicationConfig: ApplicationSubnetConfig = {
      state: {
        type: SubnetStateType.FromPath,
        path: TODO_STATE_PATH,
        subnetId: Principal.fromText(TODO_SUBNET_ID),
      }
    }

    pic = await PocketIc.create(process.env.PIC_URL, {
      application: [applicationConfig]
    });

    console.log('url', process.env.PIC_URL);
    await pic.setTime(new Date(2024, 10, 7).getTime());
    await pic.tick();

  });

  afterEach(async () => {
    await pic.tearDown();
  });

  it('should be able to access todos from the restored state', async () => {
    WASM_PATH;
    pic;

    // const fixture = await pic.setupCanister<_SERVICE>({
    //   idlFactory: idlFactory as any, // Type assertion to bypass the type mismatch
    //   wasm: WASM_PATH,
    // });
    // actor = fixture.actor;
    // const todos = await actor.get_todos();
    // expect(todos.todos.length).toBeGreaterThan(0);
  });
}); 
