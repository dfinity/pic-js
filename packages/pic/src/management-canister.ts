import { IDL } from '@icp-sdk/core/candid';
import { Principal } from '@icp-sdk/core/principal';
import { decodeCandid, isNil } from './util';

export const MANAGEMENT_CANISTER_ID = Principal.fromText('aaaaa-aa');

const EnvironmentVariable = IDL.Record({
  name: IDL.Text,
  value: IDL.Text,
});

export interface EnvironmentVariable {
  name: string;
  value: string;
}

const LogVisibility = IDL.Variant({
  controllers: IDL.Null,
  public: IDL.Null,
  allowed_viewers: IDL.Vec(IDL.Principal),
});

export type LogVisibility =
  | { controllers: null }
  | { public: null }
  | { allowed_viewers: Principal[] };

const SnapshotVisibility = IDL.Variant({
  controllers: IDL.Null,
  public: IDL.Null,
  allowed_viewers: IDL.Vec(IDL.Principal),
});

export type SnapshotVisibility =
  | { controllers: null }
  | { public: null }
  | { allowed_viewers: Principal[] };

export interface CanisterSettings {
  controllers: [] | [Principal[]];
  compute_allocation: [] | [bigint];
  memory_allocation: [] | [bigint];
  freezing_threshold: [] | [bigint];
  reserved_cycles_limit: [] | [bigint];
  log_visibility: [] | [LogVisibility];
  snapshot_visibility: [] | [SnapshotVisibility];
  log_memory_limit: [] | [bigint];
  wasm_memory_limit: [] | [bigint];
  wasm_memory_threshold: [] | [bigint];
  environment_variables: [] | [EnvironmentVariable[]];
}

export const CanisterSettings = IDL.Record({
  controllers: IDL.Opt(IDL.Vec(IDL.Principal)),
  compute_allocation: IDL.Opt(IDL.Nat),
  memory_allocation: IDL.Opt(IDL.Nat),
  freezing_threshold: IDL.Opt(IDL.Nat),
  reserved_cycles_limit: IDL.Opt(IDL.Nat),
  log_visibility: IDL.Opt(LogVisibility),
  snapshot_visibility: IDL.Opt(SnapshotVisibility),
  log_memory_limit: IDL.Opt(IDL.Nat),
  wasm_memory_limit: IDL.Opt(IDL.Nat),
  wasm_memory_threshold: IDL.Opt(IDL.Nat),
  environment_variables: IDL.Opt(IDL.Vec(EnvironmentVariable)),
});

export interface CreateCanisterRequest {
  settings: [] | [CanisterSettings];
  amount: [] | [bigint];
  specified_id: [] | [Principal];
}

const CreateCanisterRequest = IDL.Record({
  settings: IDL.Opt(CanisterSettings),
  amount: IDL.Opt(IDL.Nat),
  specified_id: IDL.Opt(IDL.Principal),
});

export function encodeCreateCanisterRequest(
  arg: CreateCanisterRequest,
): Uint8Array {
  return new Uint8Array(IDL.encode([CreateCanisterRequest], [arg]));
}

const CreateCanisterResponse = IDL.Record({
  canister_id: IDL.Principal,
});

export interface CreateCanisterResponse {
  canister_id: Principal;
}

export function decodeCreateCanisterResponse(
  arg: Uint8Array,
): CreateCanisterResponse {
  const payload = decodeCandid<CreateCanisterResponse>(
    [CreateCanisterResponse],
    arg,
  );

  if (isNil(payload)) {
    throw new Error('Failed to decode CreateCanisterResponse');
  }

  return payload;
}

const StartCanisterRequest = IDL.Record({
  canister_id: IDL.Principal,
});

export interface StartCanisterRequest {
  canister_id: Principal;
}

export function encodeStartCanisterRequest(
  arg: StartCanisterRequest,
): Uint8Array {
  return new Uint8Array(IDL.encode([StartCanisterRequest], [arg]));
}

const StopCanisterRequest = IDL.Record({
  canister_id: IDL.Principal,
});

export interface StopCanisterRequest {
  canister_id: Principal;
}

export function encodeStopCanisterRequest(
  arg: StopCanisterRequest,
): Uint8Array {
  return new Uint8Array(IDL.encode([StopCanisterRequest], [arg]));
}

const CanisterInstallModeUpgradeOptions = IDL.Record({
  skip_pre_upgrade: IDL.Opt(IDL.Bool),
  wasm_memory_persistence: IDL.Opt(
    IDL.Variant({
      keep: IDL.Null,
      replace: IDL.Null,
    }),
  ),
});

const CanisterInstallMode = IDL.Variant({
  install: IDL.Null,
  reinstall: IDL.Null,
  upgrade: IDL.Opt(CanisterInstallModeUpgradeOptions),
});

const InstallCodeRequest = IDL.Record({
  arg: IDL.Vec(IDL.Nat8),
  wasm_module: IDL.Vec(IDL.Nat8),
  mode: CanisterInstallMode,
  canister_id: IDL.Principal,
});

export interface CanisterInstallModeUpgradeOptions {
  skip_pre_upgrade: [] | [boolean];
  wasm_memory_persistence:
    | []
    | [
        {
          keep?: null;
          replace?: null;
        },
      ];
}

export interface CanisterInstallMode {
  reinstall?: null;
  upgrade?: [] | [CanisterInstallModeUpgradeOptions];
  install?: null;
}

export interface InstallCodeRequest {
  arg: Uint8Array;
  wasm_module: Uint8Array;
  mode: CanisterInstallMode;
  canister_id: Principal;
}

export function encodeInstallCodeRequest(arg: InstallCodeRequest): Uint8Array {
  return new Uint8Array(IDL.encode([InstallCodeRequest], [arg]));
}

const UpdateCanisterSettingsRequest = IDL.Record({
  canister_id: IDL.Principal,
  settings: CanisterSettings,
});

export interface UpdateCanisterSettingsRequest {
  canister_id: Principal;
  settings: CanisterSettings;
}

export function encodeUpdateCanisterSettingsRequest(
  arg: UpdateCanisterSettingsRequest,
): Uint8Array {
  return new Uint8Array(IDL.encode([UpdateCanisterSettingsRequest], [arg]));
}

// Canister status types

const CanisterStatusRequest = IDL.Record({
  canister_id: IDL.Principal,
});

export interface CanisterStatusRequest {
  canister_id: Principal;
}

export function encodeCanisterStatusRequest(
  arg: CanisterStatusRequest,
): Uint8Array {
  return new Uint8Array(IDL.encode([CanisterStatusRequest], [arg]));
}

const DefiniteCanisterSettings = IDL.Record({
  controllers: IDL.Vec(IDL.Principal),
  compute_allocation: IDL.Nat,
  memory_allocation: IDL.Nat,
  freezing_threshold: IDL.Nat,
  reserved_cycles_limit: IDL.Nat,
  log_visibility: LogVisibility,
  wasm_memory_limit: IDL.Nat,
  wasm_memory_threshold: IDL.Nat,
  environment_variables: IDL.Vec(EnvironmentVariable),
});

export interface DefiniteCanisterSettings {
  controllers: Principal[];
  compute_allocation: bigint;
  memory_allocation: bigint;
  freezing_threshold: bigint;
  reserved_cycles_limit: bigint;
  log_visibility: LogVisibility;
  wasm_memory_limit: bigint;
  wasm_memory_threshold: bigint;
  environment_variables: EnvironmentVariable[];
}

const QueryStats = IDL.Record({
  num_calls_total: IDL.Nat,
  num_instructions_total: IDL.Nat,
  request_payload_bytes_total: IDL.Nat,
  response_payload_bytes_total: IDL.Nat,
});

export interface QueryStats {
  num_calls_total: bigint;
  num_instructions_total: bigint;
  request_payload_bytes_total: bigint;
  response_payload_bytes_total: bigint;
}

const CanisterStatusResponse = IDL.Record({
  status: IDL.Variant({
    running: IDL.Null,
    stopping: IDL.Null,
    stopped: IDL.Null,
  }),
  settings: DefiniteCanisterSettings,
  module_hash: IDL.Opt(IDL.Vec(IDL.Nat8)),
  memory_size: IDL.Nat,
  cycles: IDL.Nat,
  reserved_cycles: IDL.Nat,
  idle_cycles_burned_per_day: IDL.Nat,
  query_stats: QueryStats,
});

export interface CanisterStatusResponse {
  status: { running: null } | { stopping: null } | { stopped: null };
  settings: DefiniteCanisterSettings;
  module_hash: [] | [Uint8Array];
  memory_size: bigint;
  cycles: bigint;
  reserved_cycles: bigint;
  idle_cycles_burned_per_day: bigint;
  query_stats: QueryStats;
}

export function decodeCanisterStatusResponse(
  arg: Uint8Array,
): CanisterStatusResponse {
  const payload = decodeCandid<CanisterStatusResponse>(
    [CanisterStatusResponse],
    arg,
  );

  if (isNil(payload)) {
    throw new Error('Failed to decode CanisterStatusResponse');
  }

  return payload;
}

// Chunked code installation types

const ClearChunkStoreRequest = IDL.Record({
  canister_id: IDL.Principal,
});

export interface ClearChunkStoreRequest {
  canister_id: Principal;
}

export function encodeClearChunkStoreRequest(
  arg: ClearChunkStoreRequest,
): Uint8Array {
  return new Uint8Array(IDL.encode([ClearChunkStoreRequest], [arg]));
}

const UploadChunkRequest = IDL.Record({
  canister_id: IDL.Principal,
  chunk: IDL.Vec(IDL.Nat8),
});

export interface UploadChunkRequest {
  canister_id: Principal;
  chunk: Uint8Array;
}

export function encodeUploadChunkRequest(arg: UploadChunkRequest): Uint8Array {
  return new Uint8Array(IDL.encode([UploadChunkRequest], [arg]));
}

const ChunkHash = IDL.Record({
  hash: IDL.Vec(IDL.Nat8),
});

export interface ChunkHash {
  hash: Uint8Array;
}

const UploadChunkResponse = ChunkHash;

export function decodeUploadChunkResponse(arg: Uint8Array): ChunkHash {
  const payload = decodeCandid<ChunkHash>([UploadChunkResponse], arg);

  if (isNil(payload)) {
    throw new Error('Failed to decode UploadChunkResponse');
  }

  return payload;
}

const InstallChunkedCodeRequest = IDL.Record({
  mode: CanisterInstallMode,
  target_canister: IDL.Principal,
  store_canister: IDL.Opt(IDL.Principal),
  chunk_hashes_list: IDL.Vec(ChunkHash),
  wasm_module_hash: IDL.Vec(IDL.Nat8),
  arg: IDL.Vec(IDL.Nat8),
  sender_canister_version: IDL.Opt(IDL.Nat64),
});

export interface InstallChunkedCodeRequest {
  mode: CanisterInstallMode;
  target_canister: Principal;
  store_canister: [] | [Principal];
  chunk_hashes_list: ChunkHash[];
  wasm_module_hash: Uint8Array;
  arg: Uint8Array;
  sender_canister_version: [] | [bigint];
}

export function encodeInstallChunkedCodeRequest(
  arg: InstallChunkedCodeRequest,
): Uint8Array {
  return new Uint8Array(IDL.encode([InstallChunkedCodeRequest], [arg]));
}
