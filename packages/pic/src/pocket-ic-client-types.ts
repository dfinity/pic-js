import { Principal } from '@dfinity/principal';
import {
  base64Decode,
  base64Encode,
  base64EncodePrincipal,
  hexDecode,
  isNil,
} from './util';
import { TopologyValidationError } from './error';

export type SubnetKind =
  | 'Application'
  | 'Bitcoin'
  | 'Fiduciary'
  | 'II'
  | 'NNS'
  | 'SNS'
  | 'System';

export interface CreateInstanceRequest {
  nns?: boolean;
  sns?: boolean;
  ii?: boolean;
  fiduciary?: boolean;
  bitcoin?: boolean;
  system?: number;
  application?: number;
}

export interface EncodedCreateInstanceRequest {
  nns: boolean;
  sns: boolean;
  ii: boolean;
  fiduciary: boolean;
  bitcoin: boolean;
  system: number;
  application: number;
  nns_subnet_state?: string;
  nns_subnet_id?: {
    subnet_id: number[];
  };
}

export function encodeCreateInstanceRequest(
  req?: CreateInstanceRequest,
): EncodedCreateInstanceRequest {
  const defaultOptions = req ?? { application: 1 };

  const options = {
    nns: defaultOptions.nns ?? false,
    sns: defaultOptions.sns ?? false,
    ii: defaultOptions.ii ?? false,
    fiduciary: defaultOptions.fiduciary ?? false,
    bitcoin: defaultOptions.bitcoin ?? false,
    system: defaultOptions.system ?? 0,
    application: defaultOptions.application ?? 0,
  };

  if (
    (!options.nns &&
      !options.sns &&
      !options.ii &&
      !options.fiduciary &&
      !options.bitcoin &&
      options.system === 0 &&
      options.application === 0) ||
    options.system < 0 ||
    options.application < 0
  ) {
    throw new TopologyValidationError();
  }

  return options;
}

export type InstanceTopology = Record<string, SubnetTopology>;

export interface SubnetTopology {
  subnetKind: SubnetKind;
  size: number;
  canisterRanges: Array<{
    start: Principal;
    end: Principal;
  }>;
}

export type EncodedInstanceTopology = Record<string, EncodedSubnetTopology>;

export interface EncodedSubnetTopology {
  subnet_kind: SubnetKind;
  size: number;
  canister_ranges: Array<{
    start: string;
    end: string;
  }>;
}

export function decodeInstanceTopology(
  encoded: EncodedInstanceTopology,
): InstanceTopology {
  return Object.fromEntries(
    Object.entries(encoded).map(([key, value]) => [
      key,
      decodeSubnetTopology(value),
    ]),
  );
}

export function decodeSubnetTopology(
  encoded: EncodedSubnetTopology,
): SubnetTopology {
  return {
    subnetKind: encoded.subnet_kind,
    size: encoded.size,
    canisterRanges: encoded.canister_ranges.map(range => ({
      start: Principal.fromText(range.start),
      end: Principal.fromText(range.end),
    })),
  };
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

export type EncodedGetSubnetIdResponse = {
  subnet_id: string;
} | null;

export function decodeGetSubnetIdResponse(
  res: EncodedGetSubnetIdResponse,
): GetSubnetIdResponse {
  const subnetId = isNil(res?.subnet_id)
    ? null
    : Principal.fromUint8Array(base64Decode(res.subnet_id));

  return { subnetId };
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
      SubnetId: Principal;
    }
  | {
      CanisterId: Principal;
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

  if ('SubnetId' in effectivePrincipal) {
    return {
      SubnetId: base64EncodePrincipal(effectivePrincipal.SubnetId),
    };
  } else {
    return {
      CanisterId: base64EncodePrincipal(effectivePrincipal.CanisterId),
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

export interface EncodedCanisterCallErrorResponse {
  Err: {
    code: string;
    description: string;
  };
}

export type EncodedCanisterCallResponse =
  | EncodedCanisterCallSuccessResponse
  | EncodedCanisterCallErrorResponse;

export function decodeCanisterCallResponse(
  res: EncodedCanisterCallResponse,
): CanisterCallResponse {
  if ('Err' in res) {
    throw new Error(res.Err.description);
  }

  return {
    body: base64Decode(res.Ok.Reply),
  };
}

//#endregion CanisterCall
