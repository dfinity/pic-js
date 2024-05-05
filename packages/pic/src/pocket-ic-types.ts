import { Principal } from '@dfinity/principal';
import { ActorInterface, Actor } from './pocket-ic-actor';
import { IDL } from '@dfinity/candid';

//#region CreateInstance

/**
 * Options for creating a PocketIc instance.
 */
export interface CreateInstanceOptions {
  /**
   * Configuration options for creating an NNS subnet.
   * If no config is provided, the NNS subnet is not setup.
   */
  nns?: NnsSubnetConfig;

  /**
   * Configuration options for creating an SNS subnet.
   * If no config is provided, the SNS subnet is not setup.
   */
  sns?: SnsSubnetConfig;

  /**
   * Configuration options for creating an II subnet.
   * If no config is provided, the II subnet is not setup.
   */
  ii?: IiSubnetConfig;

  /**
   * Configuration options for creating a Fiduciary subnet.
   * If no config is provided, the Fiduciary subnet is not setup.
   */
  fiduciary?: FiduciarySubnetConfig;

  /**
   * Configuration options for creating a Bitcoin subnet.
   * If no config is provided, the Bitcoin subnet is not setup.
   */
  bitcoin?: BitcoinSubnetConfig;

  /**
   * Configuration options for creating system subnets.
   * A system subnet will be created for each configuration object provided.
   * If no config objects are provided, no system subnets are setup.
   */
  system?: SystemSubnetConfig[];

  /**
   * Configuration options for creating application subnets.
   * An application subnet will be created for each configuration object provided.
   * If no config objects are provided, no application subnets are setup.
   */
  application?: ApplicationSubnetConfig[];

  /**
   * How long the PocketIC client should wait for a response from the server.
   */
  processingTimeoutMs?: number;
}

/**
 * Common options for creating a subnet.
 */
export interface SubnetConfig<
  T extends NewSubnetStateConfig | FromPathSubnetStateConfig =
    | NewSubnetStateConfig
    | FromPathSubnetStateConfig,
> {
  /**
   * Whether to enable deterministic time slicing.
   * Defaults to `true`.
   */
  enableDeterministicTimeSlicing?: boolean;

  /**
   * Whether to enable benchmarking instruction limits.
   * Defaults to `false`.
   */
  enableBenchmarkingInstructionLimits?: boolean;

  /**
   * The state configuration for the subnet.
   */
  state: T;
}

/**
 * Options for creating an NNS subnet.
 */
export type NnsSubnetConfig = SubnetConfig<NnsSubnetStateConfig>;

/**
 * Options for an NNS subnet's state.
 */
export type NnsSubnetStateConfig =
  | NewSubnetStateConfig
  | FromPathSubnetStateConfig;

/**
 * Options for creating an SNS subnet.
 */
export type SnsSubnetConfig = SubnetConfig<SnsSubnetStateConfig>;

/**
 * Options for an SNS subnet's state.
 */
export type SnsSubnetStateConfig = NewSubnetStateConfig;

/**
 * Options for creating an II subnet.
 */
export type IiSubnetConfig = SubnetConfig<IiSubnetStateConfig>;

/**
 * Options for an II subnet's state.
 */
export type IiSubnetStateConfig = NewSubnetStateConfig;

/**
 * Options for creating a Fiduciary subnet.
 */
export type FiduciarySubnetConfig = SubnetConfig<FiduciarySubnetStateConfig>;

/**
 * Options for a Fiduciary subnet's state.
 */
export type FiduciarySubnetStateConfig = NewSubnetStateConfig;

/**
 * Options for creating a Bitcoin subnet.
 */
export type BitcoinSubnetConfig = SubnetConfig<BitcoinSubnetStateConfig>;

/**
 * Options for a Bitcoin subnet's state.
 */
export type BitcoinSubnetStateConfig = NewSubnetStateConfig;

/**
 * Options for creating a system subnet.
 */
export type SystemSubnetConfig = SubnetConfig<SystemSubnetStateConfig>;

/**
 * Options for a system subnet's state.
 */
export type SystemSubnetStateConfig = NewSubnetStateConfig;

/**
 * Options for creating an application subnet.
 */
export type ApplicationSubnetConfig =
  SubnetConfig<ApplicationSubnetStateConfig>;

/**
 * Options for an application subnet's state.
 */
export type ApplicationSubnetStateConfig = NewSubnetStateConfig;

/**
 * Options for creating a new subnet an empty state.
 */
export interface NewSubnetStateConfig {
  /**
   * The type of subnet state to initialize the subnet with.
   */
  type: SubnetStateType.New;
}

/**
 * Options for creating a subnet from an existing state on the filesystem.
 */
export interface FromPathSubnetStateConfig {
  /**
   * The type of subnet state to initialize the subnet with.
   */
  type: SubnetStateType.FromPath;

  /**
   * The path to the subnet state.
   *
   * This directory should have the following structure:
   * ```text
   *   |-- backups/
   *   |-- checkpoints/
   *   |-- diverged_checkpoints/
   *   |-- diverged_state_markers/
   *   |-- fs_tmp/
   *   |-- page_deltas/
   *   |-- tip/
   *   |-- tmp/
   *   |-- states_metadata.pbuf
   * ```
   */
  path: string;

  /**
   * The subnet ID to setup the subnet on.
   *
   * The value can be obtained, e.g., via the following command for an NNS subnet:
   * ```bash
   * ic-regedit snapshot <path-to-ic_registry_local_store> | jq -r ".nns_subnet_id"
   * ```
   */
  subnetId: Principal;
}

/**
 * The type of state to initialize a subnet with.
 */
export enum SubnetStateType {
  /**
   * Create a new subnet with an empty state.
   */
  New = 'new',

  /**
   * Load existing subnet state from the given path.
   * The path must be on a filesystem accessible by the PocketIC server.
   */
  FromPath = 'fromPath',
}

/**
 * The topology of a subnet.
 */
export interface SubnetTopology {
  /**
   * The subnet ID.
   */
  id: Principal;

  /**
   * The subnet type. See {@link SubnetType}.
   */
  type: SubnetType;

  /**
   * The number of nodes in the subnet.
   */
  size: number;

  /**
   * The range of canister IDs that can be deployed to the subnet.
   */
  canisterRanges: Array<{
    start: Principal;
    end: Principal;
  }>;
}

/**
 * The type of a subnet.
 */
export enum SubnetType {
  /**
   * The subnet is an application subnet.
   */
  Application = 'Application',

  /**
   * The subnet is a Bitcoin subnet.
   */
  Bitcoin = 'Bitcoin',

  /**
   * The subnet is a Fiduciary subnet.
   */
  Fiduciary = 'Fiduciary',

  /**
   * The subnet is an Internet Identity subnet.
   */
  InternetIdentity = 'II',

  /**
   * The subnet is a NNS subnet.
   */
  NNS = 'NNS',

  /**
   * The subnet is an SNS subnet.
   */
  SNS = 'SNS',

  /**
   * The subnet is a system subnet.
   */
  System = 'System',
}

//#endregion CreateInstance

/**
 * Options for setting up a canister.
 */
export interface SetupCanisterOptions extends CreateCanisterOptions {
  /**
   * The interface factory to use for the {@link Actor}.
   */
  idlFactory: IDL.InterfaceFactory;

  /**
   * The WASM module to install to the canister.
   * If a string is passed, it is treated as a path to a file.
   * If an `ArrayBufferLike` is passed, it is treated as the WASM module itself.
   */
  wasm: ArrayBufferLike | string;

  /**
   * Candid encoded argument to pass to the canister's init function.
   * Defaults to an empty ArrayBuffer.
   */
  arg?: ArrayBufferLike;

  /**
   * The principal to setup the canister as.
   * Defaults to the anonymous principal.
   */
  sender?: Principal;
}

/**
 * A canister testing fixture for PocketIC that provides essential testing primitives
 * such as an {@link Actor} and CanisterId.
 *
 * @category Types
 * @see [Principal](https://agent-js.icp.xyz/principal/classes/Principal.html)
 */
export interface CanisterFixture<T = ActorInterface> {
  /**
   * The {@link Actor} instance.
   */
  actor: Actor<T>;

  /**
   * The Principal of the canister.
   */
  canisterId: Principal;
}

/**
 * Canister settings.
 *
 * @category Types
 * @see [Principal](https://agent-js.icp.xyz/principal/classes/Principal.html)
 */
export interface CanisterSettings {
  /**
   * The controllers of the canister.
   * Defaults to the sender, which defaults to the anonymous principal.
   */
  controllers?: Principal[];

  /**
   * The compute allocation of the canister.
   */
  computeAllocation?: bigint;

  /**
   * The memory allocation of the canister.
   */
  memoryAllocation?: bigint;

  /**
   * The freezing threshold of the canister.
   */
  freezingThreshold?: bigint;

  /**
   * The reserved cycles limit of the canister.
   */
  reservedCyclesLimit?: bigint;
}

/**
 * Options for creating a canister.
 *
 * @category Types
 * @see [Principal](https://agent-js.icp.xyz/principal/classes/Principal.html)
 */
export interface CreateCanisterOptions extends CanisterSettings {
  /**
   * The amount of cycles to send to the canister.
   * Defaults to 1_000_000_000_000_000_000n.
   */
  cycles?: bigint;

  /**
   * The principal to create the canister as.
   * Defaults to the anonymous principal.
   */
  sender?: Principal;

  /**
   * The Id of the subnet to create the canister on.
   */
  targetSubnetId?: Principal;

  /**
   * The Id of the canister to create.
   * Can only be used on Bitcoin, Fiduciary, II, SNS and NNS subnets.
   */
  targetCanisterId?: Principal;
}

/**
 * Options for stopping a given canister.
 *
 * @category Types
 * @see [Principal](https://agent-js.icp.xyz/principal/classes/Principal.html)
 */
export interface StartCanisterOptions {
  /**
   * The Principal of the canister to start.
   */
  canisterId: Principal;

  /**
   * The Principal to send the request as.
   * Defaults to the anonymous principal.
   */
  sender?: Principal;

  /**
   * The ID of the subnet that the canister resides on.
   */
  targetSubnetId?: Principal;
}

/**
 * Options for stopping a given canister.
 *
 * @category Types
 * @see [Principal](https://agent-js.icp.xyz/principal/classes/Principal.html)
 */
export interface StopCanisterOptions {
  /**
   * The Principal of the canister to stop.
   */
  canisterId: Principal;

  /**
   * The Principal to send the request as.
   * Defaults to the anonymous principal.
   */
  sender?: Principal;

  /**
   * The ID of the subnet that the canister resides on.
   */
  targetSubnetId?: Principal;
}

/**
 * Options for installing a WASM module to a given canister.
 *
 * @category Types
 * @see [Principal](https://agent-js.icp.xyz/principal/classes/Principal.html)
 */
export interface InstallCodeOptions {
  /**
   * The Principal of the canister to install the code to.
   */
  canisterId: Principal;

  /**
   * The WASM module to install to the canister.
   * If a string is passed, it is treated as a path to a file.
   * If an `ArrayBufferLike` is passed, it is treated as the WASM module itself.
   */
  wasm: ArrayBufferLike | string;

  /**
   * Candid encoded argument to pass to the canister's init function.
   * Defaults to an empty ArrayBuffer.
   */
  arg?: ArrayBufferLike;

  /**
   * The principal to install the code as.
   * Defaults to the anonymous principal.
   */
  sender?: Principal;

  /**
   * The ID of the subnet that the canister resides on.
   */
  targetSubnetId?: Principal;
}

/**
 * Options for reinstalling a WASM module to a given canister.
 * This will reset both the canister's heap and its stable memory.
 *
 * @category Types
 * @see [Principal](https://agent-js.icp.xyz/principal/classes/Principal.html)
 */
export interface ReinstallCodeOptions {
  /**
   * The Principal of the canister to reinstall code to.
   */
  canisterId: Principal;

  /**
   * The WASM module to install to the canister.
   * If a string is passed, it is treated as a path to a file.
   * If an `ArrayBufferLike` is passed, it is treated as the WASM module itself.
   */
  wasm: ArrayBufferLike | string;

  /**
   * Candid encoded argument to pass to the canister's init function.
   */
  arg?: ArrayBufferLike;

  /**
   * The Principal to send the request as.
   * Defaults to the anonymous principal.
   */
  sender?: Principal;
}

/**
 * Options for upgrading a given canister with a WASM module.
 * This will reset the canister's heap, but preserve stable memory.
 *
 * @category Types
 * @see [Principal](https://agent-js.icp.xyz/principal/classes/Principal.html)
 */
export interface UpgradeCanisterOptions {
  /**
   * The Principal of the canister to upgrade.
   */
  canisterId: Principal;

  /**
   * The WASM module to install to the canister.
   * If a string is passed, it is treated as a path to a file.
   * If an `ArrayBufferLike` is passed, it is treated as the WASM module itself.
   */
  wasm: ArrayBufferLike | string;

  /**
   * Candid encoded argument to pass to the canister's init function.
   */
  arg?: ArrayBufferLike;

  /**
   * The Principal to send the request as.
   * Defaults to the anonymous principal.
   */
  sender?: Principal;
}

/**
 * Options for updating the settings of a given canister.
 *
 * @category Types
 * @see [Principal](https://agent-js.icp.xyz/principal/classes/Principal.html)
 */
export interface UpdateCanisterSettingsOptions
  extends Partial<CanisterSettings> {
  /**
   * The Principal of the canister to update the settings for.
   */
  canisterId: Principal;

  /**
   * The Principal to send the request as.
   * Defaults to the anonymous principal.
   */
  sender?: Principal;
}

/**
 * Options for making a query call to a given canister.
 *
 * @category Types
 * @see [Principal](https://agent-js.icp.xyz/principal/classes/Principal.html)
 */
export interface QueryCallOptions {
  /**
   * The Principal to send the request as.
   * Defaults to the anonymous principal.
   */
  sender?: Principal;

  /**
   * The Principal of the canister to query.
   */
  canisterId: Principal;

  /**
   * The method to call on the canister.
   */
  method: string;

  /**
   * A Candid encoded argument to pass to the canister's method.
   * Defaults to an empty ArrayBuffer.
   */
  arg?: ArrayBufferLike;

  /**
   * The ID of the subnet that the canister resides on.
   */
  targetSubnetId?: Principal;
}

/**
 * Options for making an update call to a given canister.
 *
 * @category Types
 * @see [Principal](https://agent-js.icp.xyz/principal/classes/Principal.html)
 */

export interface UpdateCallOptions {
  /**
   * The Principal to send the request as.
   * Defaults to the anonymous principal.
   */
  sender?: Principal;

  /**
   * The Principal of the canister to update.
   */
  canisterId: Principal;

  /**
   * The method to call on the canister.
   */
  method: string;

  /**
   * A Candid encoded argument to pass to the canister's method.
   * Defaults to an empty ArrayBuffer.
   */
  arg?: ArrayBufferLike;

  /**
   * The ID of the subnet that the canister resides on.
   */
  targetSubnetId?: Principal;
}
