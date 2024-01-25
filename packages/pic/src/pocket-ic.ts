import { Principal } from '@dfinity/principal';
import { IDL } from '@dfinity/candid';
import { optionalArray, optionalBigInt, readFileAsBytes } from './util';
import { PocketIcServer } from './pocket-ic-server';
import { PocketIcClient } from './pocket-ic-client';
import { ActorInterface, Actor, createActorClass } from './pocket-ic-actor';
import { CanisterFixture, CreateCanisterOptions } from './pocket-ic-types';
import {
  _SERVICE as ManagementCanister,
  idlFactory as ManagementCanisterIdl,
} from './candid/management-canister';

const MANAGEMENT_CANISTER_ID = Principal.fromText('aaaaa-aa');

/**
 * PocketIC is a local development environment for Internet Computer canisters.
 *
 * @category API
 *
 * @example
 * The easist way to use PocketIC is to use {@link setupCanister} convenience method:
 * ```ts
 * import { PocketIc } from '@hadronous/pic';
 * import { _SERVICE, idlFactory } from '../declarations';
 *
 * const wasmPath = resolve('..', '..', 'canister.wasm');
 *
 * const pic = await PocketIc.create();
 * const fixture = await pic.setupCanister<_SERVICE>(idlFactory, wasmPath);
 * const { actor } = fixture;
 *
 * // perform tests...
 *
 * await pic.tearDown();
 * ```
 *
 * If more control is needed, then the {@link createCanister}, {@link installCode} and
 * {@link createActor} methods can be used directly:
 * ```ts
 * import { PocketIc } from '@hadronous/pic';
 * import { _SERVICE, idlFactory } from '../declarations';
 *
 * const wasmPath = resolve('..', '..', 'canister.wasm');
 *
 * const pic = await PocketIc.create();
 *
 * const canisterId = await pic.createCanister();
 * await pic.installCode(canisterId, wasmPath);
 * const actor = pic.createActor<_SERVICE>(idlFactory, canisterId);
 *
 * // perform tests...
 *
 * await pic.tearDown();
 * ```
 */
export class PocketIc {
  private constructor(
    private readonly client: PocketIcClient,
    private readonly managementCanisterActor: Actor<ManagementCanister>,
    private readonly server?: PocketIcServer,
  ) {}

  /**
   * Starts the PocketIC server and creates a PocketIC instance.
   *
   * @returns A new PocketIC instance.
   *
   * @example
   * ```ts
   * import { PocketIc } from '@hadronous/pic';
   *
   * const pic = await PocketIc.create();
   * ```
   */
  public static async create(): Promise<PocketIc> {
    const server = await PocketIcServer.start();
    const client = await PocketIcClient.create(server.getUrl());
    const ManageCanisterActor = createActorClass<ManagementCanister>(
      ManagementCanisterIdl,
      MANAGEMENT_CANISTER_ID,
      client,
    );

    return new PocketIc(client, new ManageCanisterActor(), server);
  }

  /**
   * Creates a PocketIC instance that connects to an existing PocketIC server.
   *
   * @param url The URL of an existing PocketIC server to connect to.
   * @returns A new PocketIC instance.
   *
   * @example
   * ```ts
   * import { PocketIc } from '@hadronous/pic';
   *
   * const url = 'http://localhost:8080';
   * const pic = await PocketIc.createFromUrl(url);
   * ```
   */
  public static async createFromUrl(url: string): Promise<PocketIc> {
    const client = await PocketIcClient.create(url);
    const ManageCanisterActor = createActorClass<ManagementCanister>(
      ManagementCanisterIdl,
      MANAGEMENT_CANISTER_ID,
      client,
    );

    return new PocketIc(client, new ManageCanisterActor());
  }

  /**
   * A convenience method that creates a new canister,
   * installs the given WASM module to it and returns a typesafe {@link Actor}
   * that implements the Candid interface of the canister.
   * To just create a canister, see {@link createCanister}.
   * To just install code to an existing canister, see {@link installCode}.
   * To just create an Actor for an existing canister, see {@link createActor}.
   *
   * @param interfaceFactory The interface factory to use for the {@link Actor}.
   * @param wasm The WASM module to install to the canister.
   *  If a string is passed, it is treated as a path to a file.
   *  If an `ArrayBufferLike` is passed, it is treated as the WASM module itself.
   * @param createCanisterOptions Options for creating the canister, see {@link CreateCanisterOptions}.
   * @param arg Candid encoded argument to pass to the canister's init function.
   * @param sender The Principal to send the request as.
   * @returns The {@link Actor} instance.
   *
   * @see [Candid](https://internetcomputer.org/docs/current/references/candid-ref)
   * @see [Principal](https://agent-js.icp.xyz/principal/classes/Principal.html)
   *
   * @example
   * ```ts
   * import { PocketIc } from '@hadronous/pic';
   * import { _SERVICE, idlFactory } from '../declarations';
   *
   * const wasmPath = resolve('..', '..', 'canister.wasm');
   *
   * const pic = await PocketIc.create();
   * const fixture = await pic.setupCanister<_SERVICE>(idlFactory, wasmPath);
   * const { actor } = fixture;
   * ```
   */
  public async setupCanister<T = ActorInterface>(
    interfaceFactory: IDL.InterfaceFactory,
    wasm: ArrayBufferLike | string,
    createCanisterOptions: CreateCanisterOptions = {},
    arg: ArrayBufferLike = new Uint8Array(),
    sender = Principal.anonymous(),
  ): Promise<CanisterFixture<T>> {
    const canisterId = await this.createCanister(createCanisterOptions, sender);
    await this.installCode(canisterId, wasm, arg, sender);

    const actor = this.createActor<T>(interfaceFactory, canisterId);

    return { actor, canisterId };
  }

  /**
   * Creates a new canister.
   * For a more convenient way of creating a PocketIC instance,
   * creating a canister and installing code, see {@link setupCanister}.
   *
   * @param options Options for creating the canister, see {@link CreateCanisterOptions}.
   * @param sender The Principal to send the request as.
   * @returns The Principal of the newly created canister.
   *
   * @see [Principal](https://agent-js.icp.xyz/principal/classes/Principal.html)
   *
   * @example
   * ```ts
   * import { PocketIc } from '@hadronous/pic';
   *
   * const pic = await PocketIc.create();
   * const canisterId = await pic.createCanister();
   * ```
   */
  public async createCanister(
    options: CreateCanisterOptions = {},
    sender = Principal.anonymous(),
  ): Promise<Principal> {
    const cycles = options.cycles ?? 1_000_000_000_000_000_000n;

    this.managementCanisterActor.setPrincipal(sender);
    const { canister_id } =
      await this.managementCanisterActor.provisional_create_canister_with_cycles(
        {
          settings: [
            {
              controllers: optionalArray(options.controllers),
              compute_allocation: optionalBigInt(options.computeAllocation),
              memory_allocation: optionalBigInt(options.memoryAllocation),
              freezing_threshold: optionalBigInt(options.freezingThreshold),
              reserved_cycles_limit: optionalBigInt(
                options.reservedCyclesLimit,
              ),
            },
          ],
          amount: [cycles],
          sender_canister_version: [],
          specified_id: [],
        },
      );

    return canister_id;
  }

  /**
   * Installs the given WASM module to the provided canister.
   * To create a canister to install code to, see {@link createCanister}.
   * For a more convenient way of creating a PocketIC instance,
   * creating a canister and installing code, see {@link setupCanister}.
   *
   * @param canisterId The Principal of the canister to install the code to.
   * @param wasm The WASM module to install to the canister.
   *  If a string is passed, it is treated as a path to a file.
   *  If an `ArrayBufferLike` is passed, it is treated as the WASM module itself.
   * @param arg Candid encoded argument to pass to the canister's init function.
   * @param sender The Principal to send the request as.
   *
   * @see [Principal](https://agent-js.icp.xyz/principal/classes/Principal.html)
   *
   * @example
   * ```ts
   * import { Principal } from '@dfinity/principal';
   * import { PocketIc } from '@hadronous/pic';
   * import { resolve } from 'node:path';
   *
   * const canisterId = Principal.fromUint8Array(new Uint8Array([0]));
   * const wasmPath = resolve('..', '..', 'canister.wasm');
   *
   * const pic = await PocketIc.create();
   * await pic.installCode(canisterId, wasmPath);
   * ```
   */
  public async installCode(
    canisterId: Principal,
    wasm: ArrayBufferLike | string,
    arg: ArrayBufferLike = new Uint8Array(),
    sender = Principal.anonymous(),
  ): Promise<void> {
    if (typeof wasm === 'string') {
      wasm = await readFileAsBytes(wasm);
    }

    this.managementCanisterActor.setPrincipal(sender);
    await this.managementCanisterActor.install_code({
      arg: new Uint8Array(arg),
      canister_id: canisterId,
      mode: {
        install: null,
      },
      wasm_module: new Uint8Array(wasm),
      sender_canister_version: [],
    });
  }

  /**
   * Reinstalls the given WASM module to the provided canister.
   * This will reset both the canister's heap and its stable memory.
   * To create a canister to upgrade, see {@link createCanister}.
   * To install the initial WASM module to a new canister, see {@link installCode}.
   *
   * @param canisterId The Principal of the canister to reinstall code to.
   * @param wasm The WASM module to install to the canister.
   *  If a string is passed, it is treated as a path to a file.
   *  If an `ArrayBufferLike` is passed, it is treated as the WASM module itself.
   * @param arg Candid encoded argument to pass to the canister's init function.
   * @param sender The Principal to send the request as.
   *
   * @see [Principal](https://agent-js.icp.xyz/principal/classes/Principal.html)
   *
   * @example
   * ```ts
   * import { Principal } from '@dfinity/principal';
   * import { PocketIc } from '@hadronous/pic';
   * import { resolve } from 'node:path';
   *
   * const canisterId = Principal.fromUint8Array(new Uint8Array([0]));
   * const wasmPath = resolve('..', '..', 'canister.wasm');
   *
   * const pic = await PocketIc.create();
   * await pic.reinstallCode(canisterId, wasmPath);
   * ```
   */
  public async reinstallCode(
    canisterId: Principal,
    wasm: ArrayBufferLike | string,
    arg: ArrayBufferLike = new Uint8Array(),
    sender = Principal.anonymous(),
  ): Promise<void> {
    if (typeof wasm === 'string') {
      wasm = await readFileAsBytes(wasm);
    }

    this.managementCanisterActor.setPrincipal(sender);
    await this.managementCanisterActor.install_code({
      arg: new Uint8Array(arg),
      canister_id: canisterId,
      mode: {
        reinstall: null,
      },
      wasm_module: new Uint8Array(wasm),
      sender_canister_version: [],
    });
  }

  /**
   * Upgrades the given canister with the given WASM module.
   * This will reset the canister's heap, but preserve stable memory.
   * To create a canister to upgrade to, see {@link createCanister}.
   * To install the initial WASM module to a new canister, see {@link installCode}.
   *
   * @param canisterId The Principal of the canister to upgrade.
   * @param wasm The WASM module to install to the canister.
   *  If a string is passed, it is treated as a path to a file.
   *  If an `ArrayBufferLike` is passed, it is treated as the WASM module itself.
   * @param arg Candid encoded argument to pass to the canister's init function.
   * @param sender The Principal to send the request as.
   *
   * @see [Principal](https://agent-js.icp.xyz/principal/classes/Principal.html)
   *
   * @example
   * ```ts
   * import { Principal } from '@dfinity/principal';
   * import { PocketIc } from '@hadronous/pic';
   * import { resolve } from 'node:path';
   *
   * const canisterId = Principal.fromUint8Array(new Uint8Array([0]));
   * const wasmPath = resolve('..', '..', 'canister.wasm');
   *
   * const pic = await PocketIc.create();
   * await pic.upgradeCanister(canisterId, wasmPath);
   * ```
   */
  public async upgradeCanister(
    canisterId: Principal,
    wasm: ArrayBufferLike | string,
    arg: ArrayBufferLike = new Uint8Array(),
    sender = Principal.anonymous(),
    skipPreUpgrade = false,
  ): Promise<void> {
    if (typeof wasm === 'string') {
      wasm = await readFileAsBytes(wasm);
    }

    this.managementCanisterActor.setPrincipal(sender);
    await this.managementCanisterActor.install_code({
      arg: new Uint8Array(arg),
      canister_id: canisterId,
      mode: {
        upgrade: [
          {
            skip_pre_upgrade: [skipPreUpgrade],
          },
        ],
      },
      wasm_module: new Uint8Array(wasm),
      sender_canister_version: [],
    });
  }

  /**
   * Creates an {@link Actor} for the given canister.
   * An {@link Actor} is a typesafe class that implements the Candid interface of a canister.
   * To create a canister for the Actor, see {@link createCanister}.
   * For a more convenient way of creating a PocketIC instance,
   * creating a canister and installing code, see {@link setupCanister}.
   *
   * @param interfaceFactory The InterfaceFactory to use for the {@link Actor}.
   * @param canisterId The Principal of the canister to create the Actor for.
   * @typeparam T The type of the {@link Actor}. Must implement {@link ActorInterface}.
   * @returns The {@link Actor} instance.
   *
   * @see [Principal](https://agent-js.icp.xyz/principal/classes/Principal.html)
   * @see [InterfaceFactory](https://agent-js.icp.xyz/candid/modules/IDL.html#InterfaceFactory)
   *
   * @example
   * ```ts
   * import { Principal } from '@dfinity/principal';
   * import { PocketIc } from '@hadronous/pic';
   * import { _SERVICE, idlFactory } from '../declarations';
   *
   * const canisterId = Principal.fromUint8Array(new Uint8Array([0]));
   *
   * const pic = await PocketIc.create();
   * const fixture = await pic.setupCanister<_SERVICE>(idlFactory, wasmPath);
   * const { actor } = fixture;
   * ```
   */
  public createActor<T = ActorInterface>(
    interfaceFactory: IDL.InterfaceFactory,
    canisterId: Principal,
  ): Actor<T> {
    const Actor = createActorClass<T>(
      interfaceFactory,
      canisterId,
      this.client,
    );

    return new Actor();
  }

  /**
   * Deletes the PocketIC instance and disconnects from the server.
   *
   * @example
   * ```ts
   * import { PocketIc } from '@hadronous/pic';
   *
   * const pic = await PocketIc.create();
   * await pic.tearDown();
   * ```
   */
  public async tearDown(): Promise<void> {
    await this.client.deleteInstance();
    this.server?.stop();
  }

  /**
   * Make the IC produce and progress by one block. Accepts a parameter `times` to tick multiple times,
   * the default is `1`.
   *
   * @param times The number of new blocks to produce and progress by. Defaults to `1`.
   *
   * ```ts
   * import { PocketIc } from '@hadronous/pic';
   *
   * const pic = await PocketIc.create();
   * await pic.tick();
   *
   * // or to tick multiple times
   * await pic.tick(3);
   * ```
   */
  public async tick(times: number = 1): Promise<void> {
    for (let i = 0; i < times; i++) {
      await this.client.tick();
    }
  }

  /**
   * Get the current time of the IC in milliseconds since the Unix epoch.
   *
   * @returns The current time in milliseconds since the UNIX epoch.
   *
   * @example
   * ```ts
   * import { PocketIc } from '@hadronous/pic';
   *
   * const pic = await PocketIc.create();
   *
   * const time = await pic.getTime();
   * ```
   */
  public async getTime(): Promise<number> {
    return await this.client.getTime();
  }

  /**
   * Reset the time of the IC to the current time.
   *
   * @example
   * ```ts
   * import { PocketIc } from '@hadronous/pic';
   *
   * const pic = await PocketIc.create();
   *
   * await pic.resetTime();
   * const time = await pic.getTime();
   * ```
   */
  public async resetTime(): Promise<void> {
    await this.setTime(Date.now());
  }

  /**
   * Set the current time of the IC.
   *
   * @param time The time to set in milliseconds since the Unix epoch.
   *
   * @example
   * ```ts
   * import { PocketIc } from '@hadronous/pic';
   *
   * const pic = await PocketIc.create();
   *
   * const date = new Date();
   * await pic.setTime(date.getTime());
   * const time = await pic.getTime();
   * ```
   */
  public async setTime(time: number): Promise<void> {
    await this.client.setTime(time);
  }

  /**
   * Advance the time of the IC by the given duration in milliseconds.
   *
   * @param duration The duration to advance the time by.
   *
   * @example
   * ```ts
   * import { PocketIc } from '@hadronous/pic';
   *
   * const pic = await PocketIc.create();
   *
   * const initialTime = await pic.getTime();
   * await pic.advanceTime(1_000);
   * const newTime = await pic.getTime();
   * ```
   */
  public async advanceTime(duration: number): Promise<void> {
    const currentTime = await this.getTime();
    const newTime = currentTime + duration;
    await this.setTime(newTime);
  }

  /**
   * Fetch the root key of the IC.
   *
   * @returns The root key of the IC.
   *
   * @example
   * ```ts
   * import { PocketIc } from '@hadronous/pic';
   *
   * const pic = await PocketIc.create();
   * const rootKey = await pic.fetchRootKey();
   */
  public async fetchRootKey(): Promise<ArrayBufferLike> {
    return await this.client.fetchRootKey();
  }

  /**
   * Checks if the provided canister exists.
   *
   * @param canisterId The Principal of the canister to check.
   * @returns `true` if the canister exists, `false` otherwise.
   *
   * @see [Principal](https://agent-js.icp.xyz/principal/classes/Principal.html)
   *
   * @example
   * ```ts
   * import { PocketIc } from '@hadronous/pic';
   *
   * const canisterId = Principal.fromUint8Array(new Uint8Array([0]));
   *
   * const pic = await PocketIc.create();
   * const canisterExists = await pic.checkCanisterExists(canisterId);
   * ```
   */
  public async checkCanisterExists(canisterId: Principal): Promise<boolean> {
    return await this.client.checkCanisterExists(canisterId);
  }

  /**
   * Gets the current cycle balance of the specified canister.
   *
   * @param canisterId The Principal of the canister to check.
   * @returns The current cycles balance of the canister.
   *
   * @see [Principal](https://agent-js.icp.xyz/principal/classes/Principal.html)
   *
   * @example
   * ```ts
   * import { Principal } from '@dfinity/principal';
   * import { PocketIc } from '@hadronous/pic';
   *
   * const canisterId = Principal.fromUint8Array(new Uint8Array([0]));
   *
   * const pic = await PocketIc.create();
   * const cyclesBalance = await pic.getCyclesBalance(canisterId);
   * ```
   */
  public async getCyclesBalance(canisterId: Principal): Promise<number> {
    return await this.client.getCyclesBalance(canisterId);
  }

  /**
   * Add cycles to the specified canister.
   *
   * @param canisterId The Principal of the canister to add cycles to.
   * @param amount The amount of cycles to add.
   * @returns The new cycle balance of the canister.
   *
   * @see [Principal](https://agent-js.icp.xyz/principal/classes/Principal.html)
   *
   * @example
   * ```ts
   * import { Principal } from '@dfinity/principal';
   * import { PocketIc } from '@hadronous/pic';
   *
   * const canisterId = Principal.fromUint8Array(new Uint8Array([0]));
   *
   * const pic = await PocketIc.create();
   * const newCyclesBalance = await pic.addCycles(canisterId, 10_000_000);
   * ```
   */
  public async addCycles(
    canisterId: Principal,
    amount: number,
  ): Promise<number> {
    return await this.client.addCycles(canisterId, amount);
  }

  /**
   * Set the stable memory of a given canister.
   *
   * @param canisterId The Principal of the canister to set the stable memory of.
   * @param stableMemory A blob containing the stable memory to set.
   *
   * @see [Principal](https://agent-js.icp.xyz/principal/classes/Principal.html)
   *
   * @example
   * ```ts
   * import { Principal } from '@dfinity/principal';
   * import { PocketIc } from '@hadronous/pic';
   *
   * const canisterId = Principal.fromUint8Array(new Uint8Array([0]));
   * const stableMemory = new Uint8Array([0, 1, 2, 3, 4]);
   *
   * const pic = await PocketIc.create();
   * await pic.setStableMemory(canisterId, stableMemory);
   * ```
   */
  public async setStableMemory(
    canisterId: Principal,
    stableMemory: ArrayBufferLike,
  ): Promise<void> {
    const blobId = await this.client.uploadBlob(new Uint8Array(stableMemory));

    await this.client.setStableMemory(canisterId, blobId);
  }

  /**
   * Get the stable memory of a given canister.
   *
   * @param canisterId The Principal of the canister to get the stable memory of.
   * @returns A blob containing the canister's stable memory.
   *
   * @see [Principal](https://agent-js.icp.xyz/principal/classes/Principal.html)
   *
   * @example
   * ```ts
   * import { Principal } from '@dfinity/principal';
   * import { PocketIc } from '@hadronous/pic';
   *
   * const canisterId = Principal.fromUint8Array(new Uint8Array([0]));
   *
   * const pic = await PocketIc.create();
   * const stableMemory = await pic.getStableMemory(canisterId);
   * ```
   */
  public async getStableMemory(
    canisterId: Principal,
  ): Promise<ArrayBufferLike> {
    return await this.client.getStableMemory(canisterId);
  }
}
