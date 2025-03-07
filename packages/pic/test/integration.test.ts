import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ActorMethod, PocketIc, PocketIcServer } from '../src/index.js';
import { IDL as IDLType } from '@dfinity/candid';
import { Principal } from '@dfinity/principal';
import { Identity } from '@dfinity/agent';
import { Ed25519KeyIdentity } from '@dfinity/identity';

describe('PocketIc Integration Tests', () => {
  let pic: PocketIc;
  let picServer: PocketIcServer;
  let identity: Identity;

  // Helper function to safely stop the server with timeout
  const safeStopServer = async () => {
    if (!picServer) return;

    try {
      await Promise.race([
        picServer.stop(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Server stop timeout')), 5000),
        ),
      ]);
    } catch (error) {
      console.error('Error stopping server:', error);
      // If we have a process ID, try to force kill it
      try {
        if (picServer && process.kill(process.pid, 0)) {
          process.kill(process.pid);
        }
      } catch (killError) {
        console.error('Error force killing server:', killError);
      }
    }
  };

  // Handle unexpected termination
  process.on('SIGINT', async () => {
    await safeStopServer();
    process.exit();
  });

  process.on('SIGTERM', async () => {
    await safeStopServer();
    process.exit();
  });

  beforeAll(async () => {
    picServer = await PocketIcServer.start();
    pic = await PocketIc.create(picServer.getUrl());
    const seed = new Uint8Array(32).fill(1);
    identity = await Ed25519KeyIdentity.generate(seed);
  }, 20_000);

  afterAll(async () => {
    await safeStopServer();
  }, 20_000);

  it('should create a new canister', async () => {
    const canisterId = await pic.createCanister({
      targetCanisterId: Principal.fromText('ivcos-eqaaa-aaaab-qablq-cai'),
    });
    expect(canisterId).toBeDefined();
    expect(canisterId.toText()).toBe('ivcos-eqaaa-aaaab-qablq-cai');
  });
  it('should load a canister and be able to call it', async () => {
    interface CreateTodoRequest {
      text: string;
    }
    interface CreateTodoResponse {
      id: TodoId;
    }
    interface GetTodosResponse {
      todos: Array<Todo>;
    }
    interface Todo {
      id: TodoId;
      done: boolean;
      text: string;
    }
    type TodoId = bigint;
    interface UpdateTodoRequest {
      done: [] | [boolean];
      text: [] | [string];
    }
    interface _SERVICE {
      create_todo: ActorMethod<[CreateTodoRequest], CreateTodoResponse>;
      delete_todo: ActorMethod<[TodoId], undefined>;
      get_todos: ActorMethod<[], GetTodosResponse>;
      update_todo: ActorMethod<[TodoId, UpdateTodoRequest], undefined>;
    }
    const idlFactory = () => {
      const IDL = IDLType;
      const CreateTodoRequest = IDL.Record({ text: IDL.Text });
      const TodoId = IDL.Nat64;
      const CreateTodoResponse = IDL.Record({ id: TodoId });
      const Todo = IDL.Record({
        id: TodoId,
        done: IDL.Bool,
        text: IDL.Text,
      });
      const GetTodosResponse = IDL.Record({ todos: IDL.Vec(Todo) });
      const UpdateTodoRequest = IDL.Record({
        done: IDL.Opt(IDL.Bool),
        text: IDL.Opt(IDL.Text),
      });
      return IDL.Service({
        create_todo: IDL.Func([CreateTodoRequest], [CreateTodoResponse], []),
        delete_todo: IDL.Func([TodoId], [], []),
        get_todos: IDL.Func([], [GetTodosResponse], ['query']),
        update_todo: IDL.Func([TodoId, UpdateTodoRequest], [], []),
      });
    };
    const canisterId = Principal.fromText('vasb2-4yaaa-aaaab-qadoa-cai');
    await pic.createCanister({
      targetCanisterId: canisterId,
      controllers: [identity.getPrincipal()],
    });
    await pic.installCode({
      sender: identity.getPrincipal(),
      wasm: __dirname + '/canisters/todo.wasm.gz',
      canisterId,
    });

    const actor = pic.createActor<_SERVICE>(idlFactory, canisterId);
    actor.setIdentity(identity);
    actor;
    const result = await actor.get_todos();
    expect(result).toStrictEqual({ todos: [] });
  });
}); 
