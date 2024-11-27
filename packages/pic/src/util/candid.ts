import { IDL, JsonValue } from '@dfinity/candid';
import { isNil } from './is-nil';

export function optional<T>(value: T | undefined | null): [] | [T] {
  return isNil(value) ? [] : [value];
}

export function decodeCandid(
  types: IDL.Type[],
  data: ArrayBufferLike,
): JsonValue | null {
  const returnValues = IDL.decode(types, data);

  switch (returnValues.length) {
    case 0:
      return null;
    case 1:
      return returnValues[0];
    default:
      return returnValues;
  }
}
