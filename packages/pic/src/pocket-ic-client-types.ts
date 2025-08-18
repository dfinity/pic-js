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
  state_config: 'New' | { FromPath: string };
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
      throw new Error(`Unknown subnet state type: ${config.state}`);
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
          FromPath: config.state.path,
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

export interface EncodedGetTopologyResponse {
  subnet_configs: Record<string, EncodedSubnetTopology>;
  default_effective_canister_id: {
    canister_id: string;
  };
}

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

export function decodeGetTopologyResponse(
  encoded: EncodedGetTopologyResponse,
): InstanceTopology {
  return Object.fromEntries(
    Object.entries(encoded.subnet_configs).map(([subnetId, subnetTopology]) => [
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
    topology: EncodedGetTopologyResponse;
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

//#region GetControllers

export interface GetControllersRequest {
  canisterId: Principal;
}

export interface EncodedGetControllersRequest {
  canister_id: string;
}

export function encodeGetControllersRequest(
  req: GetControllersRequest,
): EncodedGetControllersRequest {
  return {
    canister_id: base64EncodePrincipal(req.canisterId),
  };
}

export type GetControllersResponse = Principal[];

export type EncodedGetControllersResponse = {
  principal_id: string;
}[];

export function decodeGetControllersResponse(
  res: EncodedGetControllersResponse,
): GetControllersResponse {
  return res.map(({ principal_id }) => base64DecodePrincipal(principal_id));
}

//#endregion GetControllers

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

//#region FetchCanisterLogs

export interface FetchCanisterLogsRequest {
  canisterId: Principal;
}

export interface EncodedFetchCanisterLogsRequest {
  canister_id: string;
}

export type CanisterLog = {
  idx: bigint;
  timestampNanos: bigint;
  content: Uint8Array;
};

export interface EncodedCanisterLog {
  idx: string | number; // nat64 may be decimal string or number
  timestamp_nanos: string | number; // nat64 may be decimal string or number
  content: string; // base64
}

export type EncodedFetchCanisterLogsResponse =
  | { canister_log_records: EncodedCanisterLog[] }
  | EncodedCanisterLog[];

export function encodeFetchCanisterLogsRequest(
  req: FetchCanisterLogsRequest,
): EncodedFetchCanisterLogsRequest {
  return {
    canister_id: base64EncodePrincipal(req.canisterId),
  };
}

export function decodeFetchCanisterLogsResponse(
  res: EncodedFetchCanisterLogsResponse,
): CanisterLog[] {
  const arr = Array.isArray(res)
    ? res
    : (res as { canister_log_records: EncodedCanisterLog[] }).canister_log_records ?? [];
  return arr.map(l => ({
    idx: typeof l.idx === 'number' ? BigInt(l.idx) : BigInt(l.idx),
    timestampNanos:
      typeof l.timestamp_nanos === 'number'
        ? BigInt(l.timestamp_nanos)
        : BigInt(l.timestamp_nanos),
    content: base64Decode(l.content),
  }));
}

//#endregion FetchCanisterLogs

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

//#region GetPendingHttpsOutcalls

export interface GetPendingHttpsOutcallsResponse {
  subnetId: Principal;
  requestId: number;
  httpMethod: CanisterHttpMethod;
  url: string;
  headers: CanisterHttpHeader[];
  body: Uint8Array;
  maxResponseBytes?: number;
}

export enum CanisterHttpMethod {
  GET = 'GET',
  POST = 'POST',
  HEAD = 'HEAD',
}

export type CanisterHttpHeader = [string, string];

export interface EncodedGetPendingHttpsOutcallsResponse {
  subnet_id: {
    subnet_id: string;
  };
  request_id: number;
  http_method: EncodedCanisterHttpMethod;
  url: string;
  headers: EncodedCanisterHttpHeader[];
  body: string;
  max_response_bytes?: number;
}

export enum EncodedCanisterHttpMethod {
  GET = 'GET',
  POST = 'POST',
  HEAD = 'HEAD',
}

export interface EncodedCanisterHttpHeader {
  name: string;
  value: string;
}

export function decodeGetPendingHttpsOutcallsResponse(
  res: EncodedGetPendingHttpsOutcallsResponse[],
): GetPendingHttpsOutcallsResponse[] {
  return res.map(decodeHttpOutcall);
}

function decodeHttpOutcall(
  res: EncodedGetPendingHttpsOutcallsResponse,
): GetPendingHttpsOutcallsResponse {
  return {
    subnetId: base64DecodePrincipal(res.subnet_id.subnet_id),
    requestId: res.request_id,
    httpMethod: decodeCanisterHttpMethod(res.http_method),
    url: res.url,
    headers: res.headers.map(decodeHttpHeader),
    body: base64Decode(res.body),
    maxResponseBytes: res.max_response_bytes,
  };
}

function decodeCanisterHttpMethod(
  method: EncodedCanisterHttpMethod,
): CanisterHttpMethod {
  switch (method) {
    default:
      throw new Error(`Unknown canister HTTP method: ${method}`);
    case EncodedCanisterHttpMethod.GET:
      return CanisterHttpMethod.GET;
    case EncodedCanisterHttpMethod.POST:
      return CanisterHttpMethod.POST;
    case EncodedCanisterHttpMethod.HEAD:
      return CanisterHttpMethod.HEAD;
  }
}

function decodeHttpHeader(
  header: EncodedCanisterHttpHeader,
): CanisterHttpHeader {
  return [header.name, header.value];
}

//#endregion GetPendingHttpsOutcalls

//#region MockPendingHttpsOutcall

export interface MockPendingHttpsOutcallRequest {
  subnetId: Principal;
  requestId: number;
  response: HttpsOutcallResponseMock;
  additionalResponses: HttpsOutcallResponseMock[];
}

export type HttpsOutcallResponseMock =
  | HttpsOutcallSuccessResponseMock
  | HttpsOutcallRejectResponseMock;

export interface HttpsOutcallSuccessResponseMock {
  type: 'success';
  statusCode: number;
  headers: CanisterHttpHeader[];
  body: Uint8Array;
}

export interface HttpsOutcallRejectResponseMock {
  type: 'reject';
  statusCode: number;
  message: string;
}

export interface EncodedMockPendingHttpsOutcallRequest {
  subnet_id: {
    subnet_id: string;
  };
  request_id: number;
  response: EncodedHttpsOutcallResponseMock;
  additional_responses: EncodedHttpsOutcallResponseMock[];
}

export type EncodedHttpsOutcallResponseMock =
  | EncodedHttpsOutcallSuccessResponseMock
  | EncodedHttpsOutcallRejectResponseMock;

export interface EncodedHttpsOutcallSuccessResponseMock {
  CanisterHttpReply: {
    status: number;
    headers: EncodedCanisterHttpHeader[];
    body: string;
  };
}

export interface EncodedHttpsOutcallRejectResponseMock {
  CanisterHttpReject: {
    reject_code: number;
    message: string;
  };
}

export function encodeMockPendingHttpsOutcallRequest(
  req: MockPendingHttpsOutcallRequest,
): EncodedMockPendingHttpsOutcallRequest {
  return {
    subnet_id: {
      subnet_id: base64EncodePrincipal(req.subnetId),
    },
    request_id: req.requestId,
    response: encodeHttpsOutcallResponse(req.response),
    additional_responses: req.additionalResponses.map(
      encodeHttpsOutcallResponse,
    ),
  };
}

function encodeHttpsOutcallResponse(
  res: HttpsOutcallResponseMock,
): EncodedHttpsOutcallResponseMock {
  switch (res.type) {
    default:
      throw new Error(`Unknown response type: ${res}`);

    case 'success': {
      return {
        CanisterHttpReply: {
          status: res.statusCode,
          headers: res.headers.map(encodeHttpHeader),
          body: base64Encode(res.body),
        },
      };
    }

    case 'reject': {
      return {
        CanisterHttpReject: {
          reject_code: res.statusCode,
          message: res.message,
        },
      };
    }
  }
}

function encodeHttpHeader(
  header: CanisterHttpHeader,
): EncodedCanisterHttpHeader {
  return {
    name: header[0],
    value: header[1],
  };
}

//#endregion MockPendingHttpsOutcall

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
  effectivePrincipal?: EffectivePrincipal | null,
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

export function decodeEffectivePrincipal(
  effectivePrincipal: EncodedEffectivePrincipal,
): EffectivePrincipal | null {
  if (effectivePrincipal === 'None') {
    return null;
  } else if ('SubnetId' in effectivePrincipal) {
    return {
      subnetId: base64DecodePrincipal(effectivePrincipal.SubnetId),
    };
  } else {
    return {
      canisterId: base64DecodePrincipal(effectivePrincipal.CanisterId),
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

export type EncodedCanisterCallResult<T> =
  | { Ok: T }
  | { Err: EncodedCanisterCallRejectResponse };

export interface EncodedCanisterCallRejectResponse {
  reject_code: number;
  reject_message: string;
  error_code: number;
  certified: boolean;
}

export interface CanisterCallResponse {
  body: Uint8Array;
}

export type EncodedCanisterCallResponse = EncodedCanisterCallResult<string>;

export function decodeCanisterCallResponse(
  res: EncodedCanisterCallResponse,
): CanisterCallResponse {
  const okRes = decodeResultResponse<string>(res);

  return {
    body: base64Decode(okRes),
  };
}

function decodeResultResponse<T>(res: EncodedCanisterCallResult<T>): T {
  if ('Err' in res) {
    const baseMessage = `Canister call failed: ${res.Err.reject_message}. Reject code: ${res.Err.reject_code}. Error code: ${res.Err.error_code}. Certified: ${res.Err.certified}`;
    const pretty = formatTrapMessageIfAny(baseMessage);
    throw new Error(pretty ?? baseMessage);
  }

  return res.Ok;
}

// Detects trap messages of the form:
// "Canister call failed: Error from Canister <principal>: Canister called `ic0.trap` with message: '<msg>' ..."
// and replaces the first line with a compact, colored version like:
// "💀 \x1b[38;2;239;68;68m[lxzze-o7777] call trap: <msg>\x1b[0m"
function formatTrapMessageIfAny(message: string): string | null {
  const lines = message.split(/\r?\n/);
  if (lines.length === 0) return null;

  const first = lines[0];
  const m = /^Canister call failed: Error from Canister\s+([^:]+):\s+Canister called `ic0\.trap` with message: '([^']*)'/.exec(first);
  if (!m) return null;

  const fullId = m[1];
  const trapMsg = m[2];
  const shortId = shortenPrincipal(fullId);
  const bug = '🐞';
  const redStart = '\u001b[38;2;239;68;68m';
  const reset = '\u001b[0m';
  const sq = coloredSquare(shortId);
  const replaced = `${bug} ${redStart}[${sq}${redStart}${shortId}] [CALL TRAP]: ${trapMsg}${reset}`;
  lines[0] = replaced;

  // Remove guidance/footer line(s)
  const filtered: string[] = [];
  for (const line of lines) {
    if (/^Consider gracefully handling failures/i.test(line)) {
      continue; // drop guidance block
    }
    filtered.push(line);
  }

  // Colorize backtrace section in light red and prefix each line with a gray bar
  let inBacktrace = false;
  for (let i = 0; i < filtered.length; i++) {
    const line = filtered[i];
    if (line.trim() === 'Canister Backtrace:') {
      inBacktrace = true;
      const grayBar = "\u001b[38;2;107;114;128m|\u001b[0m ";
      filtered[i] = grayBar + colorLightRed(line);
      continue;
    }
    if (inBacktrace) {
      // Stop at empty line or if another header-like guidance appears
      if (line.trim() === '' || /^Consider /i.test(line)) {
        inBacktrace = false;
      } else {
        const grayBar = "\u001b[38;2;107;114;128m|\u001b[0m ";
        filtered[i] = grayBar + colorLightRed(line);
      }
    }
  }

  return filtered.join('\n');
}

function shortenPrincipal(p: string): string {
  return p.split('-').slice(0, 2).join('-');
}

// (colorRed unused; inline codes are used where needed)

function coloredSquare(seed: string): string {
  const [r, g, b] = pickColor(seed);
  const start = `\u001b[38;2;${r};${g};${b}m`;
  const reset = '\u001b[0m';
  return `${start}■${reset}`;
}

function pickColor(seed: string): [number, number, number] {
  const cached = __PIC_COLOR_CACHE__.get(seed);
  if (cached) return cached;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  const sat = 70;
  const light = 55;
  const rgb = hslToRgb(hue, sat, light);
  __PIC_COLOR_CACHE__.set(seed, rgb);
  return rgb;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
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

function colorLightRed(s: string): string {
  // Tailwind red-300 approx: rgb(252,165,165)
  const start = '\u001b[38;2;252;165;165m';
  const reset = '\u001b[0m';
  return `${start}${s}${reset}`;
}

//#endregion CanisterCall

//#region SubmitCanisterCall

export type SubmitCanisterCallRequest = CanisterCallRequest;

export type EncodedSubmitCanisterCallRequest = EncodedCanisterCallRequest;

export function encodeSubmitCanisterCallRequest(
  req: SubmitCanisterCallRequest,
): EncodedSubmitCanisterCallRequest {
  return encodeCanisterCallRequest(req);
}

export interface SubmitCanisterCallResponse {
  effectivePrincipal: EffectivePrincipal | null;
  messageId: Uint8Array;
}

export interface EncodedCanisterCallId {
  effective_principal: EncodedEffectivePrincipal;
  message_id: Uint8Array;
}

export type EncodedSubmitCanisterCallResponse =
  EncodedCanisterCallResult<EncodedCanisterCallId>;

export function decodeSubmitCanisterCallResponse(
  res: EncodedSubmitCanisterCallResponse,
): SubmitCanisterCallResponse {
  const okRes = decodeResultResponse<EncodedCanisterCallId>(res);

  return {
    effectivePrincipal: decodeEffectivePrincipal(okRes.effective_principal),
    messageId: okRes.message_id,
  };
}

//#endregion SubmitCanisterCall

//#region IngressStatus

export interface IngressStatusRequest {
  messageId: EncodedCanisterCallId;
  caller?: Principal;
}

export interface EncodedIngressStatusRequest {
  raw_message_id: EncodedCanisterCallId;
  raw_caller?: string;
}

export function encodeIngressStatusRequest(
  req: IngressStatusRequest,
): EncodedIngressStatusRequest {
  return {
    raw_message_id: req.messageId,
    raw_caller: req.caller ? base64EncodePrincipal(req.caller) : undefined,
  };
}

export type IngressStatusResponse = CanisterCallResponse;

export type EncodedIngressStatusResponse = EncodedCanisterCallResponse | {};

export function decodeIngressStatusResponse(
  res: EncodedIngressStatusResponse,
): IngressStatusResponse | null {
  if (isNil(res)) {
    return null;
  }

  if ('Ok' in res || 'Err' in res) {
    return decodeCanisterCallResponse(res);
  }

  throw new Error(`Unexpected ingress status response ${res}`);
}

//#endregion IngressStatus

//#region AwaitCanisterCall

export type AwaitCanisterCallRequest = SubmitCanisterCallResponse;

export type EncodedAwaitCanisterCallRequest = EncodedCanisterCallId;

export function encodeAwaitCanisterCallRequest(
  req: AwaitCanisterCallRequest,
): EncodedAwaitCanisterCallRequest {
  return {
    effective_principal: encodeEffectivePrincipal(req.effectivePrincipal),
    message_id: req.messageId,
  };
}
const __PIC_COLOR_CACHE__: Map<string, [number, number, number]> = new Map();

export type AwaitCanisterCallResponse = CanisterCallResponse;

//#endregion AwaitCanisterCall
