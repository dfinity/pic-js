import { isNil } from './is-nil';

export function optional<T>(value: T | undefined | null): [] | [T] {
  return isNil(value) ? [] : [value];
}
