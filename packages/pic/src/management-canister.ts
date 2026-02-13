import { IDL } from '@icp-sdk/core/candid';
import { Principal } from '@icp-sdk/core/principal';
import { decodeCandid, isNil } from './util';

export const MANAGEMENT_CANISTER_ID = Principal.fromText('aaaaa-aa');

export interface CanisterSettings {
  controllers: [] | [Principal[]];
  compute_allocation: [] | [bigint];
  memory_allocation: [] | [bigint];
  freezing_threshold: [] | [bigint];
  reserved_cycles_limit: [] | [bigint];
}

export const CanisterSettings = IDL.Record({
  controllers: IDL.Opt(IDL.Vec(IDL.Principal)),
  compute_allocation: IDL.Opt(IDL.Nat),
  memory_allocation: IDL.Opt(IDL.Nat),
  freezing_threshold: IDL.Opt(IDL.Nat),
  reserved_cycles_limit: IDL.Opt(IDL.Nat),
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

const CanisterLogRecord = IDL.Record({
  idx: IDL.Nat64,
  timestamp_nanos: IDL.Nat64,
  content: IDL.Vec(IDL.Nat8),
});

export interface CanisterLogRecord {
  idx: bigint;
  timestamp_nanos: bigint;
  content: Uint8Array;
}

const FetchCanisterLogsRequest = IDL.Record({
  canister_id: IDL.Principal,
});

export interface FetchCanisterLogsRequest {
  canister_id: Principal;
}

export function encodeFetchCanisterLogsRequest(
  arg: FetchCanisterLogsRequest,
): Uint8Array {
  return new Uint8Array(IDL.encode([FetchCanisterLogsRequest], [arg]));
}

const FetchCanisterLogsResponse = IDL.Record({
  canister_log_records: IDL.Vec(CanisterLogRecord),
});

export interface FetchCanisterLogsResponse {
  canister_log_records: CanisterLogRecord[];
}

export function decodeFetchCanisterLogsResponse(
  arg: Uint8Array,
): FetchCanisterLogsResponse {
  const payload = decodeCandid<FetchCanisterLogsResponse>(
    [FetchCanisterLogsResponse],
    arg,
  );

  if (isNil(payload)) {
    throw new Error('Failed to decode FetchCanisterLogsResponse');
  }

  return payload;
}
