export function serializeBigInt<T>(value: T): T {
  if (typeof value === 'bigint') {
    return value.toString() as T;
  }

  if (value instanceof Date) {
    return value as T;
  }

  if (Array.isArray(value)) {
    return value.map(serializeBigInt) as T;
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, serializeBigInt(item)]),
    ) as T;
  }

  return value;
}
