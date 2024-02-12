import { Principal } from '@dfinity/principal';
import { ActorInterface, Actor } from './pocket-ic-actor';
import { IDL } from '@dfinity/candid';

/**
 * Options for creating a PocketIc instance.
 */
export interface CreateInstanceOptions {
  /**
   * Whether to setup an NNS subnet or not.
   * Default is `false`.
   */
  nns?: boolean;

  /**
   * Whether to setup an SNS subnet or not.
   * Default is `false`.
   */
  sns?: boolean;

  /**
   * Whether to setup an II subnet or not.
   * Default is `false`.
   */
  ii?: boolean;

  /**
   * Whether to setup a Fiduciary subnet or not.
   * Default is `false`.
   */
  fiduciary?: boolean;

  /**
   * Whether to setup a Bitcoin subnet or not.
   * Default is `false`.
   */
  bitcoin?: boolean;

  /**
   * The number of system subnets to setup.
   * Default is `0`.
   */
  system?: number;

  /**
   * The number of application subnets to setup.
   * Default is `1`.
   */
  application?: number;
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
