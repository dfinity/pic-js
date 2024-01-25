import { Principal } from '@dfinity/principal';
import { ActorInterface, Actor } from './pocket-ic-actor';

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
 * @param cycles The amount of cycles to send to the canister.
 *  Defaults to 1_000_000_000_000_000_000n.
 * @param controllers The controllers of the canister.
 *  Defaults to the sender, which defaults to the anonymous principal.
 * @param computeAllocation The compute allocation of the canister.
 * @param memoryAllocation The memory allocation of the canister.
 * @param freezingThreshold The freezing threshold of the canister.
 * @param reservedCyclesLimit The reserved cycles limit of the canister.
 *
 * @category Types
 * @see [Principal](https://agent-js.icp.xyz/principal/classes/Principal.html)
 */
export interface CreateCanisterOptions {
  cycles?: bigint;
  controllers?: Principal[];
  computeAllocation?: bigint;
  memoryAllocation?: bigint;
  freezingThreshold?: bigint;
  reservedCyclesLimit?: bigint;
}
