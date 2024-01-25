export function optionalBigInt(
  value: bigint | undefined | null,
): [] | [bigint] {
  return value === undefined || value === null ? [] : [value];
}

export function optionalArray<T>(value: T[] | undefined | null): [] | [T[]] {
  return value === undefined || value === null ? [] : [value];
}
