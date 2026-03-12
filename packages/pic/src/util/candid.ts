import { IDL } from '@icp-sdk/core/candid';
import type { LogVisibility as LogVisibilityIDL } from '../management-canister';
import type { LogVisibility as LogVisibilityPIC } from '../pocket-ic-types';
import { isNil } from './is-nil';

export function optional<T>(value: T | undefined | null): [] | [T] {
  return isNil(value) ? [] : [value];
}

export type { LogVisibilityIDL };

export function optLogVisibilityToIDL(
  lv: LogVisibilityPIC | undefined,
): [] | [LogVisibilityIDL] {
  if (lv === undefined) return [];
  if ('controllers' in lv) return [{ controllers: null }];
  if ('public' in lv) return [{ public: null }];
  return [{ allowed_viewers: lv.allowedViewers }];
}

export function logVisibilityFromIDL(lv: LogVisibilityIDL): LogVisibilityPIC {
  if ('allowed_viewers' in lv) return { allowedViewers: lv.allowed_viewers };
  if ('public' in lv) return { public: null };
  return { controllers: null };
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
