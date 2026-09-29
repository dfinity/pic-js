import { IDL } from '@icp-sdk/core/candid';
import type {
  CanisterLogFilter as CanisterLogFilterIDL,
  CanisterSettings as CanisterSettingsIDL,
  LogVisibility as VisibilityIDL,
} from '../management-canister';
import type {
  CanisterLogFilter as CanisterLogFilterPIC,
  CanisterSettings as CanisterSettingsPIC,
  LogVisibility as VisibilityPIC,
} from '../pocket-ic-types';
import { isNil } from './is-nil';

export function optional<T>(value: T | undefined | null): [] | [T] {
  return isNil(value) ? [] : [value];
}

// The log, snapshot and status visibility settings share one shape.
function optVisibilityToIDL(
  visibility: VisibilityPIC | undefined,
): [] | [VisibilityIDL] {
  if (visibility === undefined) return [];
  if ('controllers' in visibility) return [{ controllers: null }];
  if ('public' in visibility) return [{ public: null }];
  return [{ allowed_viewers: visibility.allowedViewers }];
}

export function visibilityFromIDL(visibility: VisibilityIDL): VisibilityPIC {
  if ('allowed_viewers' in visibility) {
    return { allowedViewers: visibility.allowed_viewers };
  }
  if ('public' in visibility) return { public: null };
  return { controllers: null };
}

export function canisterSettingsToIDL(
  settings: CanisterSettingsPIC,
): CanisterSettingsIDL {
  return {
    controllers: optional(settings.controllers),
    compute_allocation: optional(settings.computeAllocation),
    memory_allocation: optional(settings.memoryAllocation),
    freezing_threshold: optional(settings.freezingThreshold),
    reserved_cycles_limit: optional(settings.reservedCyclesLimit),
    minimum_incoming_canister_call_cycles: optional(
      settings.minimumIncomingCanisterCallCycles,
    ),
    log_visibility: optVisibilityToIDL(settings.logVisibility),
    log_memory_limit: optional(settings.logMemoryLimit),
    snapshot_visibility: optVisibilityToIDL(settings.snapshotVisibility),
    status_visibility: optVisibilityToIDL(settings.statusVisibility),
    wasm_memory_limit: optional(settings.wasmMemoryLimit),
    wasm_memory_threshold: optional(settings.wasmMemoryThreshold),
    environment_variables: optional(settings.environmentVariables),
  };
}

export function optCanisterLogFilterToIDL(
  filter: CanisterLogFilterPIC | undefined,
): [] | [CanisterLogFilterIDL] {
  if (filter === undefined) return [];
  const range = { start: filter.start, end: filter.end };
  if (filter.type === 'byIdx') return [{ by_idx: range }];
  return [{ by_timestamp_nanos: range }];
}

export function decodeCandid<T>(types: IDL.Type[], data: Uint8Array): T | null {
  const returnValues = IDL.decode(types, data);

  switch (returnValues.length) {
    case 0:
      return null;
    case 1:
      return returnValues[0] as T;
    default:
      return returnValues as T;
  }
}
