import { Principal } from '@icp-sdk/core/principal';
import { ActorInterface, Actor } from './pocket-ic-actor';
import { IDL } from '@icp-sdk/core/candid';
import { CanisterInstallModeUpgradeOptions } from './management-canister';

// Needed for the docs
export { type CanisterInstallModeUpgradeOptions } from './management-canister';

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
   * Configuration options for creating verified application subnets.
   * A verified application subnet will be created for each configuration object provided.
   * If no config objects are provided, no verified application subnets are setup.
   */
  verifiedApplication?: VerifiedApplicationSubnetConfig[];

  /**
   * How long the PocketIC client should wait for a response from the server.
   */
  processingTimeoutMs?: number;

  /**
   * How many IngressStatusRounds all IC update calls should wait, till we get a timeout.
   */
  awaitIngressStatusRounds?: number;
  /**
   * Determines what non-mainnet features should be
   * enabled for the PocketIC instance.
   */
  icpConfig?: IcpConfig;

  /**
   * Determines what ICP features should be enabled for the PocketIC instance.
   */
  icpFeatures?: IcpFeatures;
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
 * Options for creating a verified application subnet.
 */
export type VerifiedApplicationSubnetConfig =
  SubnetConfig<VerifiedApplicationSubnetStateConfig>;

/**
 * Options for a verified application subnet's state.
 */
export type VerifiedApplicationSubnetStateConfig = NewSubnetStateConfig;

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
 * Flag for configuration options in `IcpConfig`.
 */
export enum IcpConfigFlag {
  Disabled = 'Disabled',
  Enabled = 'Enabled',
}

/**
 * Configures IC protocol properties.
 */
export interface IcpConfig {
  /**
   * Beta features (disabled on the ICP mainnet).
   */
  betaFeatures?: IcpConfigFlag;
  /**
   * Canister backtraces (enabled on the ICP mainnet).
   */
  canisterBacktrace?: IcpConfigFlag;
  /**
   * Limits on function name length in canister WASM (enabled on the ICP mainnet).
   */
  functionNameLengthLimits?: IcpConfigFlag;
  /**
   * Rate-limiting of canister execution (enabled on the ICP mainnet).
   * Canister execution refers to instructions and memory writes here.
   */
  canisterExecutionRateLimiting?: IcpConfigFlag;
}

/**
 * Configuration options in `IcpFeatures`.
 */
export enum IcpFeaturesConfig {
  /**
   * Default configuration of an ICP feature resembling mainnet configuration as closely as possible.
   */
  DefaultConfig = 'DefaultConfig',
}

/**
 * Specifies ICP features enabled by deploying their corresponding system canisters
 * when creating a PocketIC instance and keeping them up to date during the PocketIC instance lifetime.
 * The subnets to which the corresponding system canisters are deployed must be empty.
 * An ICP feature is enabled if its `IcpFeaturesConfig` is provided, i.e., if the corresponding field is set.
 */
export interface IcpFeatures {
  /**
   * Deploys the NNS registry canister and keeps its content in sync with registry used internally by PocketIC.
   * Note. The registry used internally by PocketIC is not updated after changing the registry stored in the registry canister
   * (e.g., after executing an NNS proposal mutating the registry).
   */
  registry?: IcpFeaturesConfig;
  /**
   * Deploys the NNS cycles minting canister, sets ICP/XDR conversion rate, and keeps its subnet lists in sync with PocketIC topology.
   * If enabled, the default timestamp of a PocketIC instance is set to 10 May 2021 10:00:01 AM CEST
   * (the smallest value that is strictly larger than the default timestamp hard-coded in the CMC state).
   */
  cyclesMinting?: IcpFeaturesConfig;
  /**
   * Deploys the ICP ledger and index canisters and initializes the ICP account of the anonymous principal with 1,000,000,000 ICP.
   */
  icpToken?: IcpFeaturesConfig;
  /**
   * Deploys the cycles ledger and index canisters.
   */
  cyclesToken?: IcpFeaturesConfig;
  /**
   * Deploys the NNS governance and root canisters and sets up an initial NNS neuron with 1 ICP stake.
   * The initial NNS neuron is controlled by the principal `hpikg-6exdt-jn33w-ndty3-fc7jc-tl2lr-buih3-cs3y7-tftkp-sfp62-gqe`.
   */
  nnsGovernance?: IcpFeaturesConfig;
  /**
   * Deploys the SNS-W and aggregator canisters, sets up the SNS subnet list in the SNS-W canister according to PocketIC topology,
   * and uploads the SNS canister WASMs to the SNS-W canister.
   */
  sns?: IcpFeaturesConfig;
  /**
   * Deploys the Internet Identity canister.
   */
  ii?: IcpFeaturesConfig;
  /**
   * Currently not supported.
   */
  nnsUi?: never;
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

//#region SetupCanister

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
   * If an `Uint8Array` is passed, it is treated as the WASM module itself.
   */
  wasm: Uint8Array | string;

  /**
   * Candid encoded argument to pass to the canister's init function.
   * Defaults to an empty Uint8Array.
   */
  arg?: Uint8Array;

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
 * @see [Principal](https://js.icp.build/core/latest/libs/principal/api/classes/principal/)
 */
export interface CanisterFixture<T extends ActorInterface<T> = ActorInterface> {
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
 * @see [Principal](https://js.icp.build/core/latest/libs/principal/api/classes/principal/)
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
 * @see [Principal](https://js.icp.build/core/latest/libs/principal/api/classes/principal/)
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

//#engregion SetupCanister

//#region CanisterLifecycle

/**
 * Options for starting a given canister.
 *
 * @category Types
 * @see [Principal](https://js.icp.build/core/latest/libs/principal/api/classes/principal/)
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
 * @see [Principal](https://js.icp.build/core/latest/libs/principal/api/classes/principal/)
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
 * @see [Principal](https://js.icp.build/core/latest/libs/principal/api/classes/principal/)
 */
export interface InstallCodeOptions {
  /**
   * The Principal of the canister to install the code to.
   */
  canisterId: Principal;

  /**
   * The WASM module to install to the canister.
   * If a string is passed, it is treated as a path to a file.
   * If an `Uint8Array` is passed, it is treated as the WASM module itself.
   */
  wasm: Uint8Array | string;

  /**
   * Candid encoded argument to pass to the canister's init function.
   * Defaults to an empty Uint8Array.
   */
  arg?: Uint8Array;

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
 * @see [Principal](https://js.icp.build/core/latest/libs/principal/api/classes/principal/)
 */
export interface ReinstallCodeOptions {
  /**
   * The Principal of the canister to reinstall code to.
   */
  canisterId: Principal;

  /**
   * The WASM module to install to the canister.
   * If a string is passed, it is treated as a path to a file.
   * If an `Uint8Array` is passed, it is treated as the WASM module itself.
   */
  wasm: Uint8Array | string;

  /**
   * Candid encoded argument to pass to the canister's init function.
   */
  arg?: Uint8Array;

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
 * @see [Principal](https://js.icp.build/core/latest/libs/principal/api/classes/principal/)
 */
export interface UpgradeCanisterOptions {
  /**
   * The Principal of the canister to upgrade.
   */
  canisterId: Principal;

  /**
   * The WASM module to install to the canister.
   * If a string is passed, it is treated as a path to a file.
   * If an `Uint8Array` is passed, it is treated as the WASM module itself.
   */
  wasm: Uint8Array | string;

  /**
   * Candid encoded argument to pass to the canister's init function.
   */
  arg?: Uint8Array;

  /**
   * The Principal to send the request as.
   * Defaults to the anonymous principal.
   */
  sender?: Principal;

  /**
   * The options to pass to the management canister's upgrade variant in the install code request.
   */
  upgradeModeOptions?: CanisterInstallModeUpgradeOptions;
}

/**
 * Options for updating the settings of a given canister.
 *
 * @category Types
 * @see [Principal](https://js.icp.build/core/latest/libs/principal/api/classes/principal/)
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

//#endregion CanisterLifecycle

//#region CanisterCall

/**
 * Options for making a query call to a given canister.
 *
 * @category Types
 * @see [Principal](https://js.icp.build/core/latest/libs/principal/api/classes/principal/)
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
   * Defaults to an empty Uint8Array.
   */
  arg?: Uint8Array;

  /**
   * The ID of the subnet that the canister resides on.
   */
  targetSubnetId?: Principal;
}

/**
 * Options for making an update call to a given canister.
 *
 * @category Types
 * @see [Principal](https://js.icp.build/core/latest/libs/principal/api/classes/principal/)
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
   * Defaults to an empty Uint8Array.
   */
  arg?: Uint8Array;

  /**
   * The ID of the subnet that the canister resides on.
   */
  targetSubnetId?: Principal;
}

//#endregion CanisterCall

//#region HTTPS Outcalls

/**
 * A pending HTTPS outcall.
 */
export interface PendingHttpsOutcall {
  /**
   * The subnet ID to that the HTTPS Outcall is being sent from.
   */
  subnetId: Principal;

  /**
   * The HTTPS Outcall request Id. Use this Id when setting a mock response
   * for this request.
   */
  requestId: number;

  /**
   * The HTTP method used for this request.
   */
  httpMethod: CanisterHttpMethod;

  /**
   * The target URL of the pending request.
   */
  url: string;

  /**
   * The headers of the pending request.
   */
  headers: CanisterHttpHeader[];

  /**
   * The body of the pending request.
   */
  body: Uint8Array;

  /**
   * The maximum number of bytes expected in the response body that was set
   * by the canister making the request.
   */
  maxResponseBytes?: number;
}

/**
 * The HTTP method used for an HTTPS outcall.
 */
export enum CanisterHttpMethod {
  /**
   * A GET request.
   */
  GET = 'GET',

  /**
   * A POST request.
   */
  POST = 'POST',

  /**
   * A HEAD request.
   */
  HEAD = 'HEAD',
}

/**
 * An HTTP header for an HTTPS outcall.
 */
export type CanisterHttpHeader = [string, string];

/**
 * Options for mocking a response to a pending HTTPS outcall.
 */
export interface MockPendingHttpsOutcallOptions {
  /**
   * The subnet ID to that the HTTPS Outcall is being sent from.
   */
  subnetId: Principal;

  /**
   * The HTTPS Outcall request Id to mock a response for.
   */
  requestId: number;

  /**
   * The response to mock for the pending HTTPS outcall.
   */
  response: HttpsOutcallResponseMock;

  /**
   * Additional responses to mock for the pending HTTPS outcall.
   *
   * If non-empty, the total number of responses (one plus the number of additional responses)
   * must be equal to the size of the subnet on which the canister making the HTTP outcall is deployed.
   */
  additionalResponses?: HttpsOutcallResponseMock[];
}

/**
 * An HTTPS Outcall response mock.
 */
export type HttpsOutcallResponseMock =
  | HttpsOutcallSuccessResponse
  | HttpsOutcallRejectResponse;

export interface HttpsOutcallSuccessResponse {
  /**
   * The type of the response, either `'success'` or `'response'`.
   */
  type: 'success';

  /**
   * The status code of the response.
   */
  statusCode: number;

  /**
   * The headers of the response.
   */
  headers: CanisterHttpHeader[];

  /**
   * The body of the response.
   */
  body: Uint8Array;
}

export interface HttpsOutcallRejectResponse {
  /**
   * The type of the response, either `'reject'` or `'response'`.
   */
  type: 'reject';

  /**
   * The status code of the response.
   */
  statusCode: number;

  /**
   * The message of the response.
   */
  message: string;
}

//#endregion HTTPS Outcalls
