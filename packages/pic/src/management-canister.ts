import { IDL } from '@dfinity/candid';
import { Principal } from '@dfinity/principal';

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
  const [payload] = IDL.decode([CreateCanisterResponse], arg);

  // [TODO] - type check?
  return payload as unknown as CreateCanisterResponse;
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

const InstallCodeRequest = IDL.Record({
  arg: IDL.Vec(IDL.Nat8),
  wasm_module: IDL.Vec(IDL.Nat8),
  mode: IDL.Variant({
    reinstall: IDL.Null,
    upgrade: IDL.Null,
    install: IDL.Null,
  }),
  canister_id: IDL.Principal,
});

export interface InstallCodeRequest {
  arg: Uint8Array;
  wasm_module: Uint8Array;
  mode: { reinstall?: null; upgrade?: null; install?: null };
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
