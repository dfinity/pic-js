export function isNil(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

export function isNotNil<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}
