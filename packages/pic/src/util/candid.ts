import { IDL } from '@dfinity/candid';
import { isNil } from './is-nil';

export function optional<T>(value: T | undefined | null): [] | [T] {
  return isNil(value) ? [] : [value];
}

export function decodeCandid<T>(
  types: IDL.Type[],
  data: ArrayBufferLike,
): T | null {
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
