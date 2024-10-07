import { Principal } from '@dfinity/principal';
import {
  base64Decode,
  base64DecodePrincipal,
  base64Encode,
  base64EncodePrincipal,
  hexDecode,
  isNil,
  isNotNil,
} from './util';
import { TopologyValidationError } from './error';

//#region CreateInstance

export interface CreateInstanceRequest {
  nns?: NnsSubnetConfig;
  sns?: SnsSubnetConfig;
  ii?: IiSubnetConfig;
  fiduciary?: FiduciarySubnetConfig;
  bitcoin?: BitcoinSubnetConfig;
  system?: SystemSubnetConfig[];
  application?: ApplicationSubnetConfig[];
  verifiedApplication?: VerifiedApplicationSubnetConfig[];
  processingTimeoutMs?: number;
  nonmainnetFeatures?: boolean;
}

export interface SubnetConfig<
  T extends NewSubnetStateConfig | FromPathSubnetStateConfig =
    | NewSubnetStateConfig
    | FromPathSubnetStateConfig,
> {
  enableDeterministicTimeSlicing?: boolean;
  enableBenchmarkingInstructionLimits?: boolean;
  state: T;
}

export type NnsSubnetConfig = SubnetConfig<NnsSubnetStateConfig>;
export type NnsSubnetStateConfig =
  | NewSubnetStateConfig
  | FromPathSubnetStateConfig;

export type SnsSubnetConfig = SubnetConfig<SnsSubnetStateConfig>;
export type SnsSubnetStateConfig = NewSubnetStateConfig;

export type IiSubnetConfig = SubnetConfig<IiSubnetStateConfig>;
export type IiSubnetStateConfig = NewSubnetStateConfig;

export type FiduciarySubnetConfig = SubnetConfig<FiduciarySubnetStateConfig>;
export type FiduciarySubnetStateConfig = NewSubnetStateConfig;

export type BitcoinSubnetConfig = SubnetConfig<BitcoinSubnetStateConfig>;
export type BitcoinSubnetStateConfig = NewSubnetStateConfig;

export type SystemSubnetConfig = SubnetConfig<SystemSubnetStateConfig>;
export type SystemSubnetStateConfig = NewSubnetStateConfig;

export type ApplicationSubnetConfig =
  SubnetConfig<ApplicationSubnetStateConfig>;
export type ApplicationSubnetStateConfig = NewSubnetStateConfig;

export type VerifiedApplicationSubnetConfig =
  SubnetConfig<VerifiedApplicationSubnetStateConfig>;
export type VerifiedApplicationSubnetStateConfig = NewSubnetStateConfig;

export interface NewSubnetStateConfig {
  type: SubnetStateType.New;
}

export interface FromPathSubnetStateConfig {
  type: SubnetStateType.FromPath;
  path: string;
  subnetId: Principal;
}

export enum SubnetStateType {
  New = 'new',
  FromPath = 'fromPath',
}

export interface EncodedCreateInstanceRequest {
  subnet_config_set: EncodedCreateInstanceSubnetConfig;
  nonmainnet_features: boolean;
}

export interface EncodedCreateInstanceSubnetConfig {
  nns?: EncodedSubnetConfig;
  sns?: EncodedSubnetConfig;
  ii?: EncodedSubnetConfig;
  fiduciary?: EncodedSubnetConfig;
  bitcoin?: EncodedSubnetConfig;
  system: EncodedSubnetConfig[];
  application: EncodedSubnetConfig[];
  verified_application: EncodedSubnetConfig[];
}

export interface EncodedSubnetConfig {
  dts_flag: 'Enabled' | 'Disabled';
  instruction_config: 'Production' | 'Benchmarking';
  state_config: 'New' | { FromPath: [string, { subnet_id: string }] };
}

function encodeManySubnetConfigs<T extends SubnetConfig>(
  configs: T[] = [],
): EncodedSubnetConfig[] {
  return configs.map(encodeSubnetConfig).filter(isNotNil);
}

function encodeSubnetConfig<T extends SubnetConfig>(
  config?: T,
): EncodedSubnetConfig | undefined {
  if (isNil(config)) {
    return undefined;
  }

  switch (config.state.type) {
    default: {
      return undefined;
    }

    case SubnetStateType.New: {
      return {
        dts_flag: encodeDtsFlag(config.enableDeterministicTimeSlicing),
        instruction_config: encodeInstructionConfig(
          config.enableBenchmarkingInstructionLimits,
        ),
        state_config: 'New',
      };
    }

    case SubnetStateType.FromPath: {
      return {
        dts_flag: encodeDtsFlag(config.enableDeterministicTimeSlicing),
        instruction_config: encodeInstructionConfig(
          config.enableBenchmarkingInstructionLimits,
        ),
        state_config: {
          FromPath: [
            config.state.path,
            { subnet_id: base64EncodePrincipal(config.state.subnetId) },
          ],
        },
      };
    }
  }
}

function encodeDtsFlag(
  enableDeterministicTimeSlicing?: boolean,
): EncodedSubnetConfig['dts_flag'] {
  return enableDeterministicTimeSlicing === false ? 'Disabled' : 'Enabled';
}

function encodeInstructionConfig(
  enableBenchmarkingInstructionLimits?: boolean,
): EncodedSubnetConfig['instruction_config'] {
  return enableBenchmarkingInstructionLimits === true
    ? 'Benchmarking'
    : 'Production';
}

export function encodeCreateInstanceRequest(
  req?: CreateInstanceRequest,
): EncodedCreateInstanceRequest {
  const defaultApplicationSubnet: ApplicationSubnetConfig = {
    state: { type: SubnetStateType.New },
  };
  const defaultOptions: CreateInstanceRequest = req ?? {
    application: [defaultApplicationSubnet],
  };

  const options: EncodedCreateInstanceRequest = {
    subnet_config_set: {
      nns: encodeSubnetConfig(defaultOptions.nns),
      sns: encodeSubnetConfig(defaultOptions.sns),
      ii: encodeSubnetConfig(defaultOptions.ii),
      fiduciary: encodeSubnetConfig(defaultOptions.fiduciary),
      bitcoin: encodeSubnetConfig(defaultOptions.bitcoin),
      system: encodeManySubnetConfigs(defaultOptions.system),
      application: encodeManySubnetConfigs(
        defaultOptions.application ?? [defaultApplicationSubnet],
      ),
      verified_application: encodeManySubnetConfigs(
        defaultOptions.verifiedApplication,
      ),
    },
    nonmainnet_features: defaultOptions.nonmainnetFeatures ?? false,
  };

  if (
    (isNil(options.subnet_config_set.nns) &&
      isNil(options.subnet_config_set.sns) &&
      isNil(options.subnet_config_set.ii) &&
      isNil(options.subnet_config_set.fiduciary) &&
      isNil(options.subnet_config_set.bitcoin) &&
      options.subnet_config_set.system.length === 0 &&
      options.subnet_config_set.application.length === 0) ||
    options.subnet_config_set.system.length < 0 ||
    options.subnet_config_set.application.length < 0
  ) {
    throw new TopologyValidationError();
  }

  return options;
}

//#endregion CreateInstance

//#region GetPubKey

export interface GetPubKeyRequest {
  subnetId: Principal;
}

export interface EncodedGetPubKeyRequest {
  subnet_id: string;
}

export function encodeGetPubKeyRequest(
  req: GetPubKeyRequest,
): EncodedGetPubKeyRequest {
  return {
    subnet_id: base64EncodePrincipal(req.subnetId),
  };
}

//#endregion GetPubKey

//#region GetTopology

export type InstanceTopology = Record<string, SubnetTopology>;

export interface SubnetTopology {
  id: Principal;
  type: SubnetType;
  size: number;
  canisterRanges: Array<{
    start: Principal;
    end: Principal;
  }>;
}

export enum SubnetType {
  Application = 'Application',
  Bitcoin = 'Bitcoin',
  Fiduciary = 'Fiduciary',
  InternetIdentity = 'II',
  NNS = 'NNS',
  SNS = 'SNS',
  System = 'System',
}

export type EncodedInstanceTopology = Record<string, EncodedSubnetTopology>;

export interface EncodedSubnetTopology {
  subnet_kind: EncodedSubnetKind;
  size: number;
  canister_ranges: Array<{
    start: {
      canister_id: string;
    };
    end: {
      canister_id: string;
    };
  }>;
}

export type EncodedSubnetKind =
  | 'Application'
  | 'Bitcoin'
  | 'Fiduciary'
  | 'II'
  | 'NNS'
  | 'SNS'
  | 'System';

export function decodeInstanceTopology(
  encoded: EncodedInstanceTopology,
): InstanceTopology {
  return Object.fromEntries(
    Object.entries(encoded).map(([subnetId, subnetTopology]) => [
      subnetId,
      decodeSubnetTopology(subnetId, subnetTopology),
    ]),
  );
}

export function decodeSubnetTopology(
  subnetId: string,
  encoded: EncodedSubnetTopology,
): SubnetTopology {
  return {
    id: Principal.fromText(subnetId),
    type: decodeSubnetKind(encoded.subnet_kind),
    size: encoded.size,
    canisterRanges: encoded.canister_ranges.map(range => ({
      start: base64DecodePrincipal(range.start.canister_id),
      end: base64DecodePrincipal(range.end.canister_id),
    })),
  };
}

export function decodeSubnetKind(kind: EncodedSubnetKind): SubnetType {
  switch (kind) {
    case 'Application':
      return SubnetType.Application;
    case 'Bitcoin':
      return SubnetType.Bitcoin;
    case 'Fiduciary':
      return SubnetType.Fiduciary;
    case 'II':
      return SubnetType.InternetIdentity;
    case 'NNS':
      return SubnetType.NNS;
    case 'SNS':
      return SubnetType.SNS;
    case 'System':
      return SubnetType.System;
    default:
      throw new Error(`Unknown subnet kind: ${kind}`);
  }
}

export interface CreateInstanceSuccessResponse {
  Created: {
    instance_id: number;
    topology: EncodedInstanceTopology;
  };
}
export interface CreateInstanceErrorResponse {
  Error: {
    message: string;
  };
}
export type CreateInstanceResponse =
  | CreateInstanceSuccessResponse
  | CreateInstanceErrorResponse;

//#endregion GetTopology

//#region GetTime

export interface GetTimeResponse {
  millisSinceEpoch: number;
}

export interface EncodedGetTimeResponse {
  nanos_since_epoch: number;
}

export function decodeGetTimeResponse(
  res: EncodedGetTimeResponse,
): GetTimeResponse {
  return {
    millisSinceEpoch: res.nanos_since_epoch / 1_000_000,
  };
}

//#endregion GetTime

//#region SetTime

export interface SetTimeRequest {
  millisSinceEpoch: number;
}

export interface EncodedSetTimeRequest {
  nanos_since_epoch: number;
}

export function encodeSetTimeRequest(
  req: SetTimeRequest,
): EncodedSetTimeRequest {
  return {
    nanos_since_epoch: req.millisSinceEpoch * 1_000_000,
  };
}

//#endregion SetTime

//#region GetCanisterSubnetId

export interface GetSubnetIdRequest {
  canisterId: Principal;
}

export interface EncodedGetSubnetIdRequest {
  canister_id: string;
}

export function encodeGetSubnetIdRequest(
  req: GetSubnetIdRequest,
): EncodedGetSubnetIdRequest {
  return {
    canister_id: base64EncodePrincipal(req.canisterId),
  };
}

export type GetSubnetIdResponse = {
  subnetId: Principal | null;
};

export type EncodedGetSubnetIdResponse =
  | {
      subnet_id: string;
    }
  | {};

export function decodeGetSubnetIdResponse(
  res: EncodedGetSubnetIdResponse,
): GetSubnetIdResponse {
  if (isNil(res)) {
    return { subnetId: null };
  }

  if ('subnet_id' in res) {
    return { subnetId: base64DecodePrincipal(res.subnet_id) };
  }

  return { subnetId: null };
}

//#endregion GetCanisterSubnetId

//#region GetCyclesBalance

export interface GetCyclesBalanceRequest {
  canisterId: Principal;
}

export interface EncodedGetCyclesBalanceRequest {
  canister_id: string;
}

export function encodeGetCyclesBalanceRequest(
  req: GetCyclesBalanceRequest,
): EncodedGetCyclesBalanceRequest {
  return {
    canister_id: base64EncodePrincipal(req.canisterId),
  };
}

export interface EncodedGetCyclesBalanceResponse {
  cycles: number;
}

export interface GetCyclesBalanceResponse {
  cycles: number;
}

export function decodeGetCyclesBalanceResponse(
  res: EncodedGetCyclesBalanceResponse,
): GetCyclesBalanceResponse {
  return {
    cycles: res.cycles,
  };
}

//#endregion GetCyclesBalance

//#region AddCycles

export interface AddCyclesRequest {
  canisterId: Principal;
  amount: number;
}

export interface EncodedAddCyclesRequest {
  canister_id: string;
  amount: number;
}

export function encodeAddCyclesRequest(
  req: AddCyclesRequest,
): EncodedAddCyclesRequest {
  return {
    canister_id: base64EncodePrincipal(req.canisterId),
    amount: req.amount,
  };
}

export interface AddCyclesResponse {
  cycles: number;
}

export interface EncodedAddCyclesResponse {
  cycles: number;
}

export function decodeAddCyclesResponse(
  res: EncodedAddCyclesResponse,
): AddCyclesResponse {
  return {
    cycles: res.cycles,
  };
}

//#endregion AddCycles

//#region UploadBlob

export interface UploadBlobRequest {
  blob: Uint8Array;
}

export type EncodedUploadBlobRequest = Uint8Array;

export function encodeUploadBlobRequest(
  req: UploadBlobRequest,
): EncodedUploadBlobRequest {
  return req.blob;
}

export interface UploadBlobResponse {
  blobId: Uint8Array;
}

export type EncodedUploadBlobResponse = string;

export function decodeUploadBlobResponse(
  res: EncodedUploadBlobResponse,
): UploadBlobResponse {
  return {
    blobId: new Uint8Array(hexDecode(res)),
  };
}

//#endregion UploadBlob

//#region SetStableMemory

export interface SetStableMemoryRequest {
  canisterId: Principal;
  blobId: Uint8Array;
}

export interface EncodedSetStableMemoryRequest {
  canister_id: string;
  blob_id: string;
}

export function encodeSetStableMemoryRequest(
  req: SetStableMemoryRequest,
): EncodedSetStableMemoryRequest {
  return {
    canister_id: base64EncodePrincipal(req.canisterId),
    blob_id: base64Encode(req.blobId),
  };
}

//#endregion SetStableMemory

//#region GetStableMemory

export interface GetStableMemoryRequest {
  canisterId: Principal;
}

export interface EncodedGetStableMemoryRequest {
  canister_id: string;
}

export function encodeGetStableMemoryRequest(
  req: GetStableMemoryRequest,
): EncodedGetStableMemoryRequest {
  return {
    canister_id: base64EncodePrincipal(req.canisterId),
  };
}

export interface GetStableMemoryResponse {
  blob: Uint8Array;
}

export interface EncodedGetStableMemoryResponse {
  blob: string;
}

export function decodeGetStableMemoryResponse(
  res: EncodedGetStableMemoryResponse,
): GetStableMemoryResponse {
  return {
    blob: base64Decode(res.blob),
  };
}

//#endregion GetStableMemory

//#region CanisterCall

export interface CanisterCallRequest {
  sender: Principal;
  canisterId: Principal;
  method: string;
  payload: Uint8Array;
  effectivePrincipal?: EffectivePrincipal;
}

export type EffectivePrincipal =
  | {
      subnetId: Principal;
    }
  | {
      canisterId: Principal;
    };

export interface EncodedCanisterCallRequest {
  sender: string;
  canister_id: string;
  method: string;
  payload: string;
  effective_principal?: EncodedEffectivePrincipal;
}

export type EncodedEffectivePrincipal =
  | {
      SubnetId: string;
    }
  | {
      CanisterId: string;
    }
  | 'None';

export function encodeEffectivePrincipal(
  effectivePrincipal?: EffectivePrincipal,
): EncodedEffectivePrincipal {
  if (isNil(effectivePrincipal)) {
    return 'None';
  }

  if ('subnetId' in effectivePrincipal) {
    return {
      SubnetId: base64EncodePrincipal(effectivePrincipal.subnetId),
    };
  } else {
    return {
      CanisterId: base64EncodePrincipal(effectivePrincipal.canisterId),
    };
  }
}

export function encodeCanisterCallRequest(
  req: CanisterCallRequest,
): EncodedCanisterCallRequest {
  return {
    sender: base64EncodePrincipal(req.sender),
    canister_id: base64EncodePrincipal(req.canisterId),
    method: req.method,
    payload: base64Encode(req.payload),
    effective_principal: encodeEffectivePrincipal(req.effectivePrincipal),
  };
}

export interface CanisterCallResponse {
  body: Uint8Array;
}

export interface EncodedCanisterCallSuccessResponse {
  Ok: {
    Reply: string;
  };
}

export interface EncodedCanisterCallRejectResponse {
  Ok: {
    Reject: string;
  };
}

export interface EncodedCanisterCallErrorResponse {
  Err: {
    code: string;
    description: string;
  };
}

export type EncodedCanisterCallResponse =
  | EncodedCanisterCallSuccessResponse
  | EncodedCanisterCallRejectResponse
  | EncodedCanisterCallErrorResponse;

export function decodeCanisterCallResponse(
  res: EncodedCanisterCallResponse,
): CanisterCallResponse {
  if ('Err' in res) {
    throw new Error(res.Err.description);
  }

  if ('Reject' in res.Ok) {
    throw new Error(res.Ok.Reject);
  }

  return {
    body: base64Decode(res.Ok.Reply),
  };
}

//#endregion CanisterCall
