import { Principal } from '@dfinity/principal';
import { IDL } from '@dfinity/candid';
import { optional, readFileAsBytes } from './util';
import { PocketIcClient } from './pocket-ic-client';
import { ActorInterface, Actor, createActorClass } from './pocket-ic-actor';
import {
  CanisterFixture,
  CreateCanisterOptions,
  CreateInstanceOptions,
  InstallCodeOptions,
  ReinstallCodeOptions,
  SetupCanisterOptions,
  UpgradeCanisterOptions,
  SubnetTopology,
  SubnetType,
  UpdateCanisterSettingsOptions,
  StartCanisterOptions,
  StopCanisterOptions,
  QueryCallOptions,
  UpdateCallOptions,
  PendingHttpsOutcall,
  MockPendingHttpsOutcallOptions,
} from './pocket-ic-types';
import {
  MANAGEMENT_CANISTER_ID,
  decodeCreateCanisterResponse,
  encodeCreateCanisterRequest,
  encodeInstallCodeRequest,
  encodeStartCanisterRequest,
  encodeUpdateCanisterSettingsRequest,
  encodeFetchCanisterLogsRequest,
  decodeFetchCanisterLogsResponse,
} from './management-canister';
import {
  createDeferredActorClass,
  DeferredActor,
} from './pocket-ic-deferred-actor';

/**
 * This class represents the main PocketIC client.
 * It is responsible for interacting with the PocketIC server via the REST API.
 * See {@link PocketIcServer} for details on the server to use with this client.
 *
 * @category API
 *
 * @example
 * The easist way to use PocketIC is to use {@link setupCanister} convenience method:
 * ```ts
 * import { PocketIc, PocketIcServer } from '@dfinity/pic';
 * import { _SERVICE, idlFactory } from '../declarations';
 *
 * const wasmPath = resolve('..', '..', 'canister.wasm');
 *
 * const picServer = await PocketIcServer.start();
 * const pic = await PocketIc.create(picServer.getUrl());
 *
 * const fixture = await pic.setupCanister<_SERVICE>({ idlFactory, wasmPath });
 * const { actor } = fixture;
 *
 * // perform tests...
 *
 * await pic.tearDown();
 * await picServer.stop();
 * ```
 *
 * If more control is needed, then the {@link createCanister}, {@link installCode} and
 * {@link createActor} methods can be used directly:
 * ```ts
 * import { PocketIc, PocketIcServer } from '@dfinity/pic';
 * import { _SERVICE, idlFactory } from '../declarations';
 *
 * const wasm = resolve('..', '..', 'canister.wasm');
 *
 * const picServer = await PocketIcServer.start();
 * const pic = await PocketIc.create(picServer.getUrl());
 *
 * const canisterId = await pic.createCanister();
 * await pic.installCode({ canisterId, wasm });
 * const actor = pic.createActor<_SERVICE>({ idlFactory, canisterId });
 *
 * // perform tests...
 *
 * await pic.tearDown();
 * await picServer.stop();
 * ```
 */
export class PocketIc {
  private lastLogIdx: Map<string, bigint> = new Map();
  private lastLogTsMs: Map<string, number> = new Map();
  private backtraceOpen: Map<string, boolean> = new Map();

  private constructor(private readonly client: PocketIcClient) {}

  /**
   * Creates a PocketIC instance.
   *
   * @param url The URL of an existing PocketIC server to connect to.
   * @param options Options for creating the PocketIC instance see {@link CreateInstanceOptions}.
   * @returns A new PocketIC instance.
   *
   * @example
   * ```ts
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * const fixture = await pic.setupCanister<_SERVICE>({ idlFactory, wasmPath });
   * const { actor } = fixture;
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public static async create(
    url: string,
    options?: CreateInstanceOptions,
  ): Promise<PocketIc> {
    const client = await PocketIcClient.create(url, options);

    return new PocketIc(client);
  }

  /**
   * A convenience method that creates a new canister,
   * installs the given WASM module to it and returns a typesafe {@link Actor}
   * that implements the Candid interface of the canister.
   * To just create a canister, see {@link createCanister}.
   * To just install code to an existing canister, see {@link installCode}.
   * To just create an Actor for an existing canister, see {@link createActor}.
   *
   * @param options Options for setting up the canister, see {@link SetupCanisterOptions}.
   * @returns The {@link Actor} instance.
   *
   * @see [Candid](https://internetcomputer.org/docs/current/references/candid-ref)
   * @see [Principal](https://agent-js.icp.xyz/principal/classes/Principal.html)
   *
   * @example
   * ```ts
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   * import { _SERVICE, idlFactory } from '../declarations';
   *
   * const wasmPath = resolve('..', '..', 'canister.wasm');
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * const fixture = await pic.setupCanister<_SERVICE>({ idlFactory, wasmPath });
   * const { actor } = fixture;
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async setupCanister<T extends ActorInterface<T> = ActorInterface>({
    sender,
    arg,
    wasm,
    idlFactory,
    computeAllocation,
    controllers,
    cycles,
    freezingThreshold,
    memoryAllocation,
    targetCanisterId,
    targetSubnetId,
    reservedCyclesLimit,
  }: SetupCanisterOptions): Promise<CanisterFixture<T>> {
    const canisterId = await this.createCanister({
      computeAllocation,
      controllers,
      cycles,
      freezingThreshold,
      memoryAllocation,
      reservedCyclesLimit,
      targetCanisterId,
      targetSubnetId,
      sender,
    });

    await this.installCode({ canisterId, wasm, arg, sender, targetSubnetId });

    const actor = this.createActor<T>(idlFactory, canisterId);

    // Initialize log tracking for this canister
    this.initLogTracking(canisterId);

    return { actor, canisterId };
  }

  /**
   * Creates a new canister.
   * For a more convenient way of creating a PocketIC instance,
   * creating a canister and installing code, see {@link setupCanister}.
   *
   * @param options Options for creating the canister, see {@link CreateCanisterOptions}.
   * @returns The Principal of the newly created canister.
   *
   * @see [Principal](https://agent-js.icp.xyz/principal/classes/Principal.html)
   *
   * @example
   * ```ts
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * const canisterId = await pic.createCanister();
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async createCanister({
    sender = Principal.anonymous(),
    cycles = 1_000_000_000_000_000_000n,
    controllers,
    computeAllocation,
    freezingThreshold,
    memoryAllocation,
    reservedCyclesLimit,
    targetCanisterId,
    targetSubnetId,
  }: CreateCanisterOptions = {}): Promise<Principal> {
    const payload = encodeCreateCanisterRequest({
      settings: [
        {
          controllers: optional(controllers),
          compute_allocation: optional(computeAllocation),
          memory_allocation: optional(memoryAllocation),
          freezing_threshold: optional(freezingThreshold),
          reserved_cycles_limit: optional(reservedCyclesLimit),
        },
      ],
      amount: [cycles],
      specified_id: optional(targetCanisterId),
    });

    const res = await this.client.updateCall({
      canisterId: MANAGEMENT_CANISTER_ID,
      sender,
      method: 'provisional_create_canister_with_cycles',
      payload,
      effectivePrincipal: targetSubnetId
        ? {
            subnetId: targetSubnetId,
          }
        : undefined,
    });

    const canisterId = decodeCreateCanisterResponse(res.body).canister_id;

    // Initialize log tracking for this canister
    this.initLogTracking(canisterId);

    return canisterId;
  }

  /**
   * Starts the given canister.
   *
   * @param options Options for starting the canister, see {@link StartCanisterOptions}.
   *
   * @see [Principal](https://agent-js.icp.xyz/principal/classes/Principal.html)
   *
   * @example
   * ```ts
   * import { Principal } from '@dfinity/principal';
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   *
   * const canisterId = Principal.fromUint8Array(new Uint8Array([0]));
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * await pic.startCanister({ canisterId });
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async startCanister({
    canisterId,
    sender = Principal.anonymous(),
    targetSubnetId,
  }: StartCanisterOptions): Promise<void> {
    const payload = encodeStartCanisterRequest({
      canister_id: canisterId,
    });

    await this.client.updateCall({
      canisterId: MANAGEMENT_CANISTER_ID,
      sender,
      method: 'start_canister',
      payload,
      effectivePrincipal: targetSubnetId
        ? {
            subnetId: targetSubnetId,
          }
        : undefined,
    });
  }

  /**
   * Stops the given canister.
   *
   * @param options Options for stopping the canister, see {@link StopCanisterOptions}.
   *
   * @see [Principal](https://agent-js.icp.xyz/principal/classes/Principal.html)
   *
   * @example
   * ```ts
   * import { Principal } from '@dfinity/principal';
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   *
   * const canisterId = Principal.fromUint8Array(new Uint8Array([0]));
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * await pic.stopCanister({ canisterId });
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async stopCanister({
    canisterId,
    sender = Principal.anonymous(),
    targetSubnetId,
  }: StopCanisterOptions): Promise<void> {
    const payload = encodeStartCanisterRequest({
      canister_id: canisterId,
    });

    await this.client.updateCall({
      canisterId: MANAGEMENT_CANISTER_ID,
      sender,
      method: 'stop_canister',
      payload,
      effectivePrincipal: targetSubnetId
        ? {
            subnetId: targetSubnetId,
          }
        : undefined,
    });
  }

  /**
   * Installs the given WASM module to the provided canister.
   * To create a canister to install code to, see {@link createCanister}.
   * For a more convenient way of creating a PocketIC instance,
   * creating a canister and installing code, see {@link setupCanister}.
   *
   * @param options Options for installing the code, see {@link InstallCodeOptions}.
   *
   * @see [Principal](https://agent-js.icp.xyz/principal/classes/Principal.html)
   *
   * @example
   * ```ts
   * import { Principal } from '@dfinity/principal';
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   * import { resolve } from 'node:path';
   *
   * const canisterId = Principal.fromUint8Array(new Uint8Array([0]));
   * const wasm = resolve('..', '..', 'canister.wasm');
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * await pic.installCode({ canisterId, wasm });
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async installCode({
    arg = new Uint8Array(),
    sender = Principal.anonymous(),
    canisterId,
    wasm,
    targetSubnetId,
  }: InstallCodeOptions): Promise<void> {
    if (typeof wasm === 'string') {
      wasm = await readFileAsBytes(wasm);
    }

    const payload = encodeInstallCodeRequest({
      arg: new Uint8Array(arg),
      canister_id: canisterId,
      mode: {
        install: null,
      },
      wasm_module: new Uint8Array(wasm),
    });

    await this.client.updateCall({
      canisterId: MANAGEMENT_CANISTER_ID,
      sender,
      method: 'install_code',
      payload,
      effectivePrincipal: targetSubnetId
        ? {
            subnetId: targetSubnetId,
          }
        : undefined,
    });
  }

  /**
   * Reinstalls the given WASM module to the provided canister.
   * This will reset both the canister's heap and its stable memory.
   * To create a canister to upgrade, see {@link createCanister}.
   * To install the initial WASM module to a new canister, see {@link installCode}.
   *
   * @param options Options for reinstalling the code, see {@link ReinstallCodeOptions}.
   *
   * @see [Principal](https://agent-js.icp.xyz/principal/classes/Principal.html)
   *
   * @example
   * ```ts
   * import { Principal } from '@dfinity/principal';
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   * import { resolve } from 'node:path';
   *
   * const canisterId = Principal.fromUint8Array(new Uint8Array([0]));
   * const wasm = resolve('..', '..', 'canister.wasm');
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * await pic.reinstallCode({ canisterId, wasm });
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async reinstallCode({
    sender = Principal.anonymous(),
    arg = new Uint8Array(),
    canisterId,
    wasm,
  }: ReinstallCodeOptions): Promise<void> {
    if (typeof wasm === 'string') {
      wasm = await readFileAsBytes(wasm);
    }

    const payload = encodeInstallCodeRequest({
      arg: new Uint8Array(arg),
      canister_id: canisterId,
      mode: {
        reinstall: null,
      },
      wasm_module: new Uint8Array(wasm),
    });

    await this.client.updateCall({
      canisterId: MANAGEMENT_CANISTER_ID,
      sender,
      method: 'install_code',
      payload,
    });
  }

  /**
   * Upgrades the given canister with the given WASM module.
   * This will reset the canister's heap, but preserve stable memory.
   * To create a canister to upgrade to, see {@link createCanister}.
   * To install the initial WASM module to a new canister, see {@link installCode}.
   *
   * @param options Options for upgrading the canister, see {@link UpgradeCanisterOptions}.
   *
   * @see [Principal](https://agent-js.icp.xyz/principal/classes/Principal.html)
   *
   * @example
   * ```ts
   * import { Principal } from '@dfinity/principal';
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   * import { resolve } from 'node:path';
   *
   * const canisterId = Principal.fromUint8Array(new Uint8Array([0]));
   * const wasm = resolve('..', '..', 'canister.wasm');
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * await pic.upgradeCanister({ canisterId, wasm });
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async upgradeCanister({
    sender = Principal.anonymous(),
    arg = new Uint8Array(),
    canisterId,
    wasm,
  }: UpgradeCanisterOptions): Promise<void> {
    if (typeof wasm === 'string') {
      wasm = await readFileAsBytes(wasm);
    }

    const payload = encodeInstallCodeRequest({
      arg: new Uint8Array(arg),
      canister_id: canisterId,
      mode: {
        upgrade: null,
      },
      wasm_module: new Uint8Array(wasm),
    });

    await this.client.updateCall({
      canisterId: MANAGEMENT_CANISTER_ID,
      sender,
      method: 'install_code',
      payload,
    });
  }

  /**
   * Updates the settings of the given canister.
   *
   * @param options Options for updating the canister settings, see {@link UpdateCanisterSettingsOptions}.
   *
   * @see [Principal](https://agent-js.icp.xyz/principal/classes/Principal.html)
   *
   * @example
   * ```ts
   * import { Principal } from '@dfinity/principal';
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   *
   * const canisterId = Principal.fromUint8Array(new Uint8Array([0]));
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * await pic.updateCanisterSettings({
   *  canisterId,
   *  controllers: [Principal.fromUint8Array(new Uint8Array([1]))],
   * });
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async updateCanisterSettings({
    canisterId,
    computeAllocation,
    controllers,
    freezingThreshold,
    memoryAllocation,
    reservedCyclesLimit,
    sender = Principal.anonymous(),
  }: UpdateCanisterSettingsOptions): Promise<void> {
    const payload = encodeUpdateCanisterSettingsRequest({
      canister_id: canisterId,
      settings: {
        controllers: optional(controllers),
        compute_allocation: optional(computeAllocation),
        memory_allocation: optional(memoryAllocation),
        freezing_threshold: optional(freezingThreshold),
        reserved_cycles_limit: optional(reservedCyclesLimit),
      },
    });

    await this.client.updateCall({
      canisterId: MANAGEMENT_CANISTER_ID,
      sender,
      method: 'update_settings',
      payload,
    });
  }

  /**
   * Creates an {@link Actor} for the given canister.
   * An {@link Actor} is a typesafe class that implements the Candid interface of a canister.
   * To create a canister for the {@link Actor}, see {@link createCanister}.
   * For a more convenient way of creating a PocketIC instance,
   * creating a canister and installing code, see {@link setupCanister}.
   *
   * @param interfaceFactory The InterfaceFactory to use for the {@link Actor}.
   * @param canisterId The Principal of the canister to create the {@link Actor} for.
   * @typeparam T The type of the {@link Actor}. Must implement {@link ActorInterface}.
   * @returns The {@link Actor} instance.
   *
   * @see [Principal](https://agent-js.icp.xyz/principal/classes/Principal.html)
   * @see [InterfaceFactory](https://agent-js.icp.xyz/candid/modules/IDL.html#InterfaceFactory)
   *
   * @example
   * ```ts
   * import { Principal } from '@dfinity/principal';
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   * import { _SERVICE, idlFactory } from '../declarations';
   *
   * const canisterId = Principal.fromUint8Array(new Uint8Array([0]));
   * const wasm = resolve('..', '..', 'canister.wasm');
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * const canisterId = await pic.createCanister();
   * await pic.installCode({ canisterId, wasm });
   * const actor = pic.createActor<_SERVICE>({ idlFactory, canisterId });
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public createActor<T extends ActorInterface<T> = ActorInterface>(
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
   * Creates a {@link DeferredActor} for the given canister.
   * A {@link DeferredActor} is a typesafe class that implements the Candid interface of a canister.
   *
   * A {@link DeferredActor} in contrast to a normal {@link Actor} will submit the call to the PocketIc replica,
   * but the call will not be executed immediately. Instead, the calls are queued and a `Promise` is returned
   * by the {@link DeferredActor} that can be awaited to process the pending canister call.
   *
   * To create a canister for the {@link DeferredActor}, see {@link createCanister}.
   * For a more convenient way of creating a PocketIC instance,
   * creating a canister and installing code, see {@link setupCanister}.
   *
   * @param interfaceFactory The InterfaceFactory to use for the {@link DeferredActor}.
   * @param canisterId The Principal of the canister to create the {@link DeferredActor} for.
   * @typeparam T The type of the {@link DeferredActor}. Must implement {@link ActorInterface}.
   * @returns The {@link DeferredActor} instance.
   *
   * @see [Principal](https://agent-js.icp.xyz/principal/classes/Principal.html)
   * @see [InterfaceFactory](https://agent-js.icp.xyz/candid/modules/IDL.html#InterfaceFactory)
   *
   * @example
   */
  public createDeferredActor<T extends ActorInterface<T> = ActorInterface>(
    interfaceFactory: IDL.InterfaceFactory,
    canisterId: Principal,
  ): DeferredActor<T> {
    const DeferredActor = createDeferredActorClass<T>(
      interfaceFactory,
      canisterId,
      this.client,
    );

    return new DeferredActor();
  }

  /**
   * Makes a query call to the given canister.
   *
   * @param options Options for making the query call, see {@link QueryCallOptions}.
   * @returns The Candid-encoded response of the query call.
   *
   * @example
   * ```ts
   * import { Principal } from '@dfinity/principal';
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   * import { _SERVICE, idlFactory } from '../declarations';
   *
   * const wasm = resolve('..', '..', 'canister.wasm');
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * canisterId = await pic.createCanister({
   *   sender: controllerIdentity.getPrincipal(),
   * });
   * await pic.installCode({ canisterId, wasm });
   *
   * const res = await pic.queryCall({
   *  canisterId,
   *  method: 'greet',
   * });
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async queryCall({
    canisterId,
    method,
    arg = new Uint8Array(),
    sender = Principal.anonymous(),
    targetSubnetId,
  }: QueryCallOptions): Promise<ArrayBufferLike> {
    const res = await this.client.queryCall({
      canisterId,
      method,
      payload: new Uint8Array(arg),
      sender,
      effectivePrincipal: targetSubnetId
        ? {
            subnetId: targetSubnetId,
          }
        : undefined,
    });

    return res.body;
  }

  /**
   * Makes an update call to the given canister.
   *
   * @param options Options for making the update call, see {@link UpdateCallOptions}.
   * @returns The Candid-encoded response of the update call.
   *
   * @example
   * ```ts
   * import { Principal } from '@dfinity/principal';
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   * import { _SERVICE, idlFactory } from '../declarations';
   *
   * const wasm = resolve('..', '..', 'canister.wasm');
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * canisterId = await pic.createCanister({
   *   sender: controllerIdentity.getPrincipal(),
   * });
   * await pic.installCode({ canisterId, wasm });
   *
   * const res = await pic.updateCall({
   *  canisterId,
   *  method: 'greet',
   * });
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async updateCall({
    canisterId,
    method,
    arg = new Uint8Array(),
    sender = Principal.anonymous(),
    targetSubnetId,
  }: UpdateCallOptions): Promise<ArrayBufferLike> {
    const res = await this.client.updateCall({
      canisterId,
      method,
      payload: new Uint8Array(arg),
      sender,
      effectivePrincipal: targetSubnetId
        ? {
            subnetId: targetSubnetId,
          }
        : undefined,
    });

    return res.body;
  }

  /**
   * Deletes the PocketIC instance.
   *
   * @example
   * ```ts
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async tearDown(): Promise<void> {
    await this.client.deleteInstance();
  }

  /**
   * Make the IC produce and progress by one block. Accepts a parameter `times` to tick multiple times,
   * the default is `1`.
   *
   * @param times The number of new blocks to produce and progress by. Defaults to `1`.
   *
   * ```ts
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * await pic.tick();
   *
   * // or to tick multiple times
   * await pic.tick(3);
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async tick(times: number = 1): Promise<void> {
    for (let i = 0; i < times; i++) {
      await this.client.tick();
      await this.flushCanisterLogs();
    }
  }

  /**
   * Get the controllers of the specified canister.
   *
   * @param canisterId The Principal of the canister to get the controllers of.
   * @returns The controllers of the specified canister.
   *
   * @see [Principal](https://agent-js.icp.xyz/principal/classes/Principal.html)
   *
   * @example
   * ```ts
   * import { Principal } from '@dfinity/principal';
   *
   * const canisterId = Principal.fromUint8Array(new Uint8Array([0]));
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * const controllers = await pic.getControllers(canisterId);
   *
   * await pic.tearDown();
   * await picServer.stop();
   */
  public async getControllers(canisterId: Principal): Promise<Principal[]> {
    return await this.client.getControllers({ canisterId });
  }

  /**
   * Get the current time of the IC in milliseconds since the Unix epoch.
   *
   * @returns The current time in milliseconds since the UNIX epoch.
   *
   * @example
   * ```ts
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * const time = await pic.getTime();
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async getTime(): Promise<number> {
    const { millisSinceEpoch } = await this.client.getTime();

    return millisSinceEpoch;
  }

  /**
   * Reset the time of the IC to the current time.
   * {@link tick} should be called after calling this method in order for query calls
   * and read state request to reflect the new time.
   *
   * Use {@link resetCertifiedTime} to set time and immediately have query calls and
   * read state requests reflect the new time.
   *
   * @example
   * ```ts
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * await pic.resetTime();
   * await pic.tick();
   *
   * const time = await pic.getTime();
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async resetTime(): Promise<void> {
    await this.setTime(Date.now());
  }

  private initLogTracking(canisterId: Principal): void {
    const key = canisterId.toText();
    if (!this.lastLogIdx.has(key)) {
      this.lastLogIdx.set(key, -1n);
      this.lastLogTsMs.set(key, 0);
    }
  }

  private async flushCanisterLogs(): Promise<void> {
    try {
      const allCanisters: Principal[] = Array.from(this.lastLogIdx.keys()).map(
        key => Principal.fromText(key),
      );
      for (const canisterId of allCanisters) {
        this.initLogTracking(canisterId);
        const key = canisterId.toText();
        const res = await this.client.queryCall({
          canisterId: MANAGEMENT_CANISTER_ID,
          method: 'fetch_canister_logs',
          payload: encodeFetchCanisterLogsRequest({ canister_id: canisterId }),
          sender: Principal.anonymous(),
        });
        const logs = decodeFetchCanisterLogsResponse(new Uint8Array(res.body));
        logs.sort((a, b) => (a.idx < b.idx ? -1 : a.idx > b.idx ? 1 : 0));
        let lastIdx = this.lastLogIdx.get(key) ?? -1n;
        let lastTs = this.lastLogTsMs.get(key) ?? 0;
        let inBacktrace = this.backtraceOpen.get(key) ?? false;
        for (const log of logs) {
          if (log.idx <= lastIdx) continue;
          const tsMs = Number(log.timestamp_nanos / 1_000_000n);
          lastIdx = log.idx;
          lastTs = tsMs;
          const content = new TextDecoder().decode(log.content);

          // Only show trap messages + their backtraces from fetched canister logs.
          if (content.includes('[TRAP]:')) {
            const short = canisterId
              .toText()
              .split('-')
              .slice(0, 2)
              .join('-');
            const redStart = '\u001b[38;2;239;68;68m';
            const reset = '\u001b[0m';
            const square = PocketIc.coloredSquare(short);

            const lines = content.replace(/\r?\n/g, '\n').split('\n').filter(l => l.length > 0);
            const first = lines[0] ?? '';
            const msg = first.split('[TRAP]:')[1]?.trim() ?? first.trim();
            const head = `☠️ ${redStart}[${square}${redStart}${short}] [TIMER TRAP]: ${msg}${reset}`;
            process.stdout.write(head.endsWith('\n') ? head : head + '\n');

            // Print any backtrace lines that are part of the same message
            const grayBar = "\u001b[38;2;107;114;128m|\u001b[0m ";
            for (let i = 1; i < lines.length; i++) {
              process.stdout.write(grayBar + PocketIc.colorLightRed(lines[i]) + '\n');
            }
          } else if (content.includes('Canister Backtrace:')) {
            const grayBar = "\u001b[38;2;107;114;128m|\u001b[0m ";
            const lines = content.replace(/\r?\n/g, '\n').split('\n').filter(l => l.length > 0);
            for (const l of lines) {
              process.stdout.write(grayBar + PocketIc.colorLightRed(l) + '\n');
            }
            const lastLine = lines[lines.length - 1]?.trim();
            inBacktrace = lastLine === '.' ? false : true;
          } else if (inBacktrace) {
            const grayBar = "\u001b[38;2;107;114;128m|\u001b[0m ";
            const line = content.trimEnd();
            if (line.length > 0) {
              process.stdout.write(grayBar + PocketIc.colorLightRed(line) + '\n');
            }
            if (line.trim() === '.' || line.length === 0) {
              inBacktrace = false;
            }
          }
        }
        this.lastLogIdx.set(key, lastIdx);
        this.lastLogTsMs.set(key, lastTs);
        this.backtraceOpen.set(key, inBacktrace);
      }
    } catch (e) {
      // Swallow errors to avoid noisy output
    }
  }

  // No generic printLogLine needed; fetched canister logs are formatted per kind.

  // Simple color helpers for trap printing
  // (no other color helpers needed here)

  // (colorRed helper unused; inline codes are used where needed)

  private static colorLightRed(s: string): string {
    const start = '\u001b[38;2;252;165;165m';
    const reset = '\u001b[0m';
    return `${start}${s}${reset}`;
  }

  private static coloredSquare(seed: string): string {
    const [r, g, b] = PocketIc.pickColor(seed);
    const start = `\u001b[38;2;${r};${g};${b}m`;
    const reset = '\u001b[0m';
    return `${start}■${reset}`;
  }

  private static __COLOR_CACHE = new Map<string, [number, number, number]>();

  private static pickColor(seed: string): [number, number, number] {
    const cached = PocketIc.__COLOR_CACHE.get(seed);
    if (cached) return cached;
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    const hue = h % 360;
    const sat = 70;
    const light = 55;
    const rgb = PocketIc.hslToRgb(hue, sat, light);
    PocketIc.__COLOR_CACHE.set(seed, rgb);
    return rgb;
  }

  private static hslToRgb(h: number, s: number, l: number): [number, number, number] {
    const ss = s / 100;
    const ll = l / 100;
    const c = (1 - Math.abs(2 * ll - 1)) * ss;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = ll - c / 2;
    let r = 0, g = 0, b = 0;
    if (0 <= h && h < 60) [r, g, b] = [c, x, 0];
    else if (60 <= h && h < 120) [r, g, b] = [x, c, 0];
    else if (120 <= h && h < 180) [r, g, b] = [0, c, x];
    else if (180 <= h && h < 240) [r, g, b] = [0, x, c];
    else if (240 <= h && h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
  }

  /**
   * Reset the time of the IC to the current time and immediately have query calls and
   * read state requests reflect the new time.
   *
   * Use {@link resetTime} to reset time without immediately reflecting the new time.
   *
   * @example
   * ```ts
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * await pic.resetCertifiedTime();
   *
   * const time = await pic.getTime();
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async resetCertifiedTime(): Promise<void> {
    await this.setCertifiedTime(Date.now());
  }

  /**
   * Set the current time of the IC.
   * {@link tick} should be called after calling this method in order for query calls
   * and read state request to reflect the new time.
   *
   * Use {@link setCertifiedTime} to set time and immediately have query calls and
   * read state requests reflect the new time.
   *
   * @param time The time to set in milliseconds since the Unix epoch.
   *
   * @example
   * ```ts
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   *
   * const pic = await PocketIc.create();
   *
   * const date = new Date();
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * await pic.setTime(date);
   * // or
   * await pic.setTime(date.getTime());
   *
   * await pic.tick();
   *
   * const time = await pic.getTime();
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async setTime(time: Date | number): Promise<void> {
    if (time instanceof Date) {
      time = time.getTime();
    }

    await this.client.setTime({ millisSinceEpoch: time });
  }

  /**
   * Set the current time of the IC and immediately have query calls and
   * read state requests reflect the new time.
   *
   * Use {@link setTime} to set time without immediately reflecting the new time.
   *
   * @param time The time to set in milliseconds since the Unix epoch.
   *
   * @example
   * ```ts
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   *
   * const pic = await PocketIc.create();
   *
   * const date = new Date();
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * await pic.setCertifiedTime(date);
   * // or
   * await pic.setCertifiedTime(date.getTime());
   *
   * const time = await pic.getTime();
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async setCertifiedTime(time: Date | number): Promise<void> {
    if (time instanceof Date) {
      time = time.getTime();
    }

    await this.client.setCertifiedTime({ millisSinceEpoch: time });
  }

  /**
   * Advance the time of the IC by the given duration in milliseconds.
   * {@link tick} should be called after calling this method in order for query calls
   * and read state requests to reflect the new time.
   *
   * Use {@link advanceCertifiedTime} to advance time and immediately have query calls and
   * read state requests reflect the new time.
   *
   * @param duration The duration to advance the time by.
   *
   * @example
   * ```ts
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * const initialTime = await pic.getTime();
   * await pic.advanceTime(1_000);
   * await pic.tick();
   *
   * const newTime = await pic.getTime();
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async advanceTime(duration: number): Promise<void> {
    const currentTime = await this.getTime();
    const newTime = currentTime + duration;
    await this.setTime(newTime);
  }

  /**
   * Advance the time of the IC by the given duration in milliseconds and
   * immediately have query calls and read state requests reflect the new time.
   *
   * Use {@link advanceTime} to advance time without immediately reflecting the new time.
   *
   * @param duration The duration to advance the time by.
   *
   * @example
   * ```ts
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * const initialTime = await pic.getTime();
   * await pic.advanceCertifiedTime(1_000);
   *
   * const newTime = await pic.getTime();
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async advanceCertifiedTime(duration: number): Promise<void> {
    const currentTime = await this.getTime();
    const newTime = currentTime + duration;
    await this.setCertifiedTime(newTime);
  }

  /**
   * Fetch the public key of the specified subnet.
   *
   * @param subnetId The Principal of the subnet to fetch the public key of.
   * @returns The public key of the specified subnet.
   *
   * @example
   * ```ts
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * const subnets = pic.getApplicationSubnets();
   * const pubKey = await pic.getPubKey(subnets[0].id);
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async getPubKey(subnetId: Principal): Promise<ArrayBufferLike> {
    return await this.client.getPubKey({ subnetId });
  }

  /**
   * Gets the subnet Id of the provided canister Id.
   *
   * @param canisterId The Principal of the canister to get the subnet Id of.
   * @returns The canister's subnet Id if the canister exists, `null` otherwise.
   *
   * @see [Principal](https://agent-js.icp.xyz/principal/classes/Principal.html)
   *
   * @example
   * ```ts
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   *
   * const canisterId = Principal.fromUint8Array(new Uint8Array([0]));
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * const subnetId = await pic.getCanisterSubnetId(canisterId);
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async getCanisterSubnetId(
    canisterId: Principal,
  ): Promise<Principal | null> {
    const { subnetId } = await this.client.getSubnetId({ canisterId });

    return subnetId;
  }

  /**
   * Get the topology of this instance's network.
   * The topology is a list of subnets, each with a type and a list of canister ID ranges
   * that can be deployed to that subnet.
   * The instance network topology is configured via the {@link create} method.
   *
   * @returns An array of subnet topologies, see {@link SubnetTopology}.
   */
  public async getTopology(): Promise<SubnetTopology[]> {
    const topology = await this.client.getTopology();

    return Object.values(topology);
  }

  /**
   * Get the Bitcoin subnet topology for this instance's network.
   * The instance network topology is configured via the {@link create} method.
   *
   * @returns The subnet topology for the Bitcoin subnet,
   * if it exists on this instance's network.
   */
  public async getBitcoinSubnet(): Promise<SubnetTopology | undefined> {
    const topology = await this.getTopology();

    return topology.find(subnet => subnet.type === SubnetType.Bitcoin);
  }

  /**
   * Get the Fiduciary subnet topology for this instance's network.
   * The instance network topology is configured via the {@link create} method.
   *
   * @returns The subnet topology for the Fiduciary subnet,
   * if it exists on this instance's network.
   */
  public async getFiduciarySubnet(): Promise<SubnetTopology | undefined> {
    const topology = await this.getTopology();

    return topology.find(subnet => subnet.type === SubnetType.Fiduciary);
  }

  /**
   * Get the Internet Identity subnet topology for this instance's network.
   * The instance network topology is configured via the {@link create} method.
   *
   * @returns The subnet topology for the Internet Identity subnet,
   * if it exists on this instance's network.
   */
  public async getInternetIdentitySubnet(): Promise<
    SubnetTopology | undefined
  > {
    const topology = await this.getTopology();

    return topology.find(subnet => subnet.type === SubnetType.InternetIdentity);
  }

  /**
   * Get the NNS subnet topology for this instance's network.
   * The instance network topology is configured via the {@link create} method.
   *
   * @returns The subnet topology for the NNS subnet,
   * if it exists on this instance's network.
   */
  public async getNnsSubnet(): Promise<SubnetTopology | undefined> {
    const topology = await this.getTopology();

    return topology.find(subnet => subnet.type === SubnetType.NNS);
  }

  /**
   * Get the SNS subnet topology for this instance's network.
   * The instance network topology is configured via the {@link create} method.
   *
   * @returns The subnet topology for the SNS subnet,
   * if it exists on this instance's network.
   */
  public async getSnsSubnet(): Promise<SubnetTopology | undefined> {
    const topology = await this.getTopology();

    return topology.find(subnet => subnet.type === SubnetType.SNS);
  }

  /**
   * Get all application subnet topologies for this instance's network.
   * The instance network topology is configured via the {@link create} method.
   *
   * @returns An array of subnet topologies for each application subnet
   * that exists on this instance's network.
   */
  public async getApplicationSubnets(): Promise<SubnetTopology[]> {
    const topology = await this.getTopology();

    return topology.filter(subnet => subnet.type === SubnetType.Application);
  }

  /**
   * Get all system subnet topologies for this instance's network.
   * The instance network topology is configured via the {@link create} method.
   *
   * @returns An array of subnet topologies for each system subnet
   * that exists on this instance's network.
   */
  public async getSystemSubnets(): Promise<SubnetTopology[]> {
    const topology = await this.getTopology();

    return topology.filter(subnet => subnet.type === SubnetType.System);
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
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   *
   * const canisterId = Principal.fromUint8Array(new Uint8Array([0]));
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * const cyclesBalance = await pic.getCyclesBalance(canisterId);
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async getCyclesBalance(canisterId: Principal): Promise<number> {
    const { cycles } = await this.client.getCyclesBalance({ canisterId });

    return cycles;
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
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   *
   * const canisterId = Principal.fromUint8Array(new Uint8Array([0]));
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * const newCyclesBalance = await pic.addCycles(canisterId, 10_000_000);
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async addCycles(
    canisterId: Principal,
    amount: number,
  ): Promise<number> {
    const { cycles } = await this.client.addCycles({ canisterId, amount });

    return cycles;
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
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   *
   * const canisterId = Principal.fromUint8Array(new Uint8Array([0]));
   * const stableMemory = new Uint8Array([0, 1, 2, 3, 4]);
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * await pic.setStableMemory(canisterId, stableMemory);
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async setStableMemory(
    canisterId: Principal,
    stableMemory: ArrayBufferLike,
  ): Promise<void> {
    const { blobId } = await this.client.uploadBlob({
      blob: new Uint8Array(stableMemory),
    });

    await this.client.setStableMemory({ canisterId, blobId });
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
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   *
   * const canisterId = Principal.fromUint8Array(new Uint8Array([0]));
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * const stableMemory = await pic.getStableMemory(canisterId);
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async getStableMemory(
    canisterId: Principal,
  ): Promise<ArrayBufferLike> {
    const { blob } = await this.client.getStableMemory({ canisterId });

    return blob;
  }

  /**
   * Get all pending HTTPS Outcalls across all subnets on this
   * PocketIC instance.
   *
   * @returns An array of pending HTTPS Outcalls.
   *
   * @example
   * ```ts
   * import { Principal } from '@dfinity/principal';
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   *
   * const canisterId = Principal.fromUint8Array(new Uint8Array([0]));
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * // queue the canister message that will send the HTTPS Outcall
   * const executeGoogleSearch = await deferredActor.google_search();
   *
   * // tick for two rounds to allow the canister message to be processed
   * // and for the HTTPS Outcall to be queued
   * await pic.tick(2);
   *
   * // get all queued HTTPS Outcalls
   * const pendingHttpsOutcalls = await pic.getPendingHttpsOutcalls();
   *
   * // get the first pending HTTPS Outcall
   * const pendingGoogleSearchOutcall = pendingHttpsOutcalls[0];
   *
   * // mock the HTTPS Outcall
   * await pic.mockPendingHttpsOutcall({
   *   requestId: pendingGoogleSearchOutcall.requestId,
   *   subnetId: pendingGoogleSearchOutcall.subnetId,
   *   response: {
   *     type: 'success',
   *     body: new TextEncoder().encode('Google search result'),
   *     statusCode: 200,
   *     headers: [],
   *   },
   * });
   *
   * // finish executing the message, including the HTTPS Outcall
   * const result = await executeGoogleSearch();
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async getPendingHttpsOutcalls(): Promise<PendingHttpsOutcall[]> {
    return await this.client.getPendingHttpsOutcalls();
  }

  /**
   * Mock a pending HTTPS Outcall.
   *
   * @param options Options for mocking the pending HTTPS Outcall, see {@link MockPendingHttpsOutcallOptions}.
   *
   * @example
   * ```ts
   * import { Principal } from '@dfinity/principal';
   * import { PocketIc, PocketIcServer } from '@dfinity/pic';
   *
   * const canisterId = Principal.fromUint8Array(new Uint8Array([0]));
   *
   * const picServer = await PocketIcServer.start();
   * const pic = await PocketIc.create(picServer.getUrl());
   *
   * // queue the canister message that will send the HTTPS Outcall
   * const executeGoogleSearch = await deferredActor.google_search();
   *
   * // tick for two rounds to allow the canister message to be processed
   * // and for the HTTPS Outcall to be queued
   * await pic.tick(2);
   *
   * // get all queued HTTPS Outcalls
   * const pendingHttpsOutcalls = await pic.getPendingHttpsOutcalls();
   *
   * // get the first pending HTTPS Outcall
   * const pendingGoogleSearchOutcall = pendingHttpsOutcalls[0];
   *
   * // mock the HTTPS Outcall
   * await pic.mockPendingHttpsOutcall({
   *   requestId: pendingGoogleSearchOutcall.requestId,
   *   subnetId: pendingGoogleSearchOutcall.subnetId,
   *   response: {
   *     type: 'success',
   *     body: new TextEncoder().encode('Google search result'),
   *     statusCode: 200,
   *     headers: [],
   *   },
   * });
   *
   * // finish executing the message, including the HTTPS Outcall
   * const result = await executeGoogleSearch();
   *
   * await pic.tearDown();
   * await picServer.stop();
   * ```
   */
  public async mockPendingHttpsOutcall({
    requestId,
    response,
    subnetId,
    additionalResponses = [],
  }: MockPendingHttpsOutcallOptions): Promise<void> {
    return await this.client.mockPendingHttpsOutcall({
      requestId,
      response,
      subnetId,
      additionalResponses,
    });
  }
}
