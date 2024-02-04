import { Principal } from '@dfinity/principal';
import { ActorInterface, Actor } from './pocket-ic-actor';
import { IDL } from '@dfinity/candid';

/**
 * Options for creating a PocketIc instance.
 */
export interface CreateInstanceOptions {
  nns?: boolean;
  sns?: boolean;
  ii?: boolean;
  fiduciary?: boolean;
  bitcoin?: boolean;
  system?: number;
  application?: number;
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
 * Options for creating a canister.
 *
 * @category Types
 * @see [Principal](https://agent-js.icp.xyz/principal/classes/Principal.html)
 */
export interface CreateCanisterOptions {
  /**
   * The amount of cycles to send to the canister.
   * Defaults to 1_000_000_000_000_000_000n.
   */
  cycles?: bigint;

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
