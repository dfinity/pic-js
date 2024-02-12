import { Principal } from '@dfinity/principal';
import { IDL } from '@dfinity/candid';
import { optional, readFileAsBytes } from './util';
import { PocketIcServer } from './pocket-ic-server';
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
} from './pocket-ic-types';
import {
  MANAGEMENT_CANISTER_ID,
  decodeCreateCanisterResponse,
  encodeCreateCanisterRequest,
  encodeInstallCodeRequest,
  encodeUpdateCanisterSettingsRequest,
} from './management-canister';

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
 * const fixture = await pic.setupCanister<_SERVICE>({ idlFactory, wasmPath });
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
 * await pic.installCode({ canisterId, wasmPath });
 * const actor = pic.createActor<_SERVICE>({ idlFactory, canisterId });
 *
 * // perform tests...
 *
 * await pic.tearDown();
 * ```
 */
export class PocketIc {
  private constructor(
    private readonly client: PocketIcClient,
    private readonly server?: PocketIcServer,
  ) {}

  /**
   * Starts the PocketIC server and creates a PocketIC instance.
   *
   * @param options Options for creating the PocketIC instance see {@link CreateInstanceOptions}.
   * @returns A new PocketIC instance.
   *
   * @example
   * ```ts
   * import { PocketIc } from '@hadronous/pic';
   *
   * const pic = await PocketIc.create();
   * ```
   */
  public static async create(
    options?: CreateInstanceOptions,
  ): Promise<PocketIc> {
    const server = await PocketIcServer.start();
    const client = await PocketIcClient.create(server.getUrl(), options);

    return new PocketIc(client, server);
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
  public static async createFromUrl(
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
   * import { PocketIc } from '@hadronous/pic';
   * import { _SERVICE, idlFactory } from '../declarations';
   *
   * const wasmPath = resolve('..', '..', 'canister.wasm');
   *
   * const pic = await PocketIc.create();
   * const fixture = await pic.setupCanister<_SERVICE>({ idlFactory, wasmPath });
   * const { actor } = fixture;
   * ```
   */
  public async setupCanister<T = ActorInterface>({
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
    });

    await this.installCode({ canisterId, wasm, arg, sender, targetSubnetId });

    const actor = this.createActor<T>(idlFactory, canisterId);

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
   * import { PocketIc } from '@hadronous/pic';
   *
   * const pic = await PocketIc.create();
   * const canisterId = await pic.createCanister();
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
          controllers: controllers ?? [],
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

    return decodeCreateCanisterResponse(res.body).canister_id;
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
   * import { PocketIc } from '@hadronous/pic';
   * import { resolve } from 'node:path';
   *
   * const canisterId = Principal.fromUint8Array(new Uint8Array([0]));
   * const wasmPath = resolve('..', '..', 'canister.wasm');
   *
   * const pic = await PocketIc.create();
   * await pic.installCode({ canisterId, wasmPath });
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
   * import { PocketIc } from '@hadronous/pic';
   *
   * const canisterId = Principal.fromUint8Array(new Uint8Array([0]));
   *
   * const pic = await PocketIc.create();
   * await pic.updateCanisterSettings({
   *  canisterId,
   *  controllers: [Principal.fromUint8Array(new Uint8Array([1]))],
   * });
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
        controllers: controllers ?? [],
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
    const { millisSinceEpoch } = await this.client.getTime();

    return millisSinceEpoch;
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
    await this.client.setTime({ millisSinceEpoch: time });
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
   * const subnetId = await pic.getCanisterSubnetId(canisterId);
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
  public getTopology(): SubnetTopology[] {
    return Object.values(this.client.getTopology());
  }

  /**
   * Get the Bitcoin subnet topology for this instance's network.
   * The instance network topology is configured via the {@link create} method.
   *
   * @returns The subnet topology for the Bitcoin subnet,
   * if it exists on this instance's network.
   */
  public getBitcoinSubnet(): SubnetTopology | undefined {
    return this.getTopology().find(
      subnet => subnet.type === SubnetType.Bitcoin,
    );
  }

  /**
   * Get the Fiduciary subnet topology for this instance's network.
   * The instance network topology is configured via the {@link create} method.
   *
   * @returns The subnet topology for the Fiduciary subnet,
   * if it exists on this instance's network.
   */
  public getFiduciarySubnet(): SubnetTopology | undefined {
    return this.getTopology().find(
      subnet => subnet.type === SubnetType.Fiduciary,
    );
  }

  /**
   * Get the Internet Identity subnet topology for this instance's network.
   * The instance network topology is configured via the {@link create} method.
   *
   * @returns The subnet topology for the Internet Identity subnet,
   * if it exists on this instance's network.
   */
  public getInternetIdentitySubnet(): SubnetTopology | undefined {
    return this.getTopology().find(
      subnet => subnet.type === SubnetType.InternetIdentity,
    );
  }

  /**
   * Get the NNS subnet topology for this instance's network.
   * The instance network topology is configured via the {@link create} method.
   *
   * @returns The subnet topology for the NNS subnet,
   * if it exists on this instance's network.
   */
  public getNnsSubnet(): SubnetTopology | undefined {
    return this.getTopology().find(subnet => subnet.type === SubnetType.NNS);
  }

  /**
   * Get the SNS subnet topology for this instance's network.
   * The instance network topology is configured via the {@link create} method.
   *
   * @returns The subnet topology for the SNS subnet,
   * if it exists on this instance's network.
   */
  public getSnsSubnet(): SubnetTopology | undefined {
    return this.getTopology().find(subnet => subnet.type === SubnetType.SNS);
  }

  /**
   * Get all application subnet topologies for this instance's network.
   * The instance network topology is configured via the {@link create} method.
   *
   * @returns An array of subnet topologies for each application subnet
   * that exists on this instance's network.
   */
  public getApplicationSubnets(): SubnetTopology[] {
    return this.getTopology().filter(
      subnet => subnet.type === SubnetType.Application,
    );
  }

  /**
   * Get all system subnet topologies for this instance's network.
   * The instance network topology is configured via the {@link create} method.
   *
   * @returns An array of subnet topologies for each system subnet
   * that exists on this instance's network.
   */
  public getSystemSubnets(): SubnetTopology[] {
    return this.getTopology().filter(
      subnet => subnet.type === SubnetType.System,
    );
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
    const { blob } = await this.client.getStableMemory({ canisterId });

    return blob;
  }
}
