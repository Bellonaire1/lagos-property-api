import { AppError } from './errors.js';
import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from '../config/api.js';

type CursorValue = string | number | bigint | null;
type Cursor = { value: CursorValue; id: string };

export type PageQuery = {
  limit: number;
  cursor?: Cursor;
};

export function parsePageQuery(query: Record<string, unknown>): PageQuery {
  const limitValue = query.limit;
  const cursorValue = query.cursor;
  const limit = limitValue === undefined ? DEFAULT_PAGE_LIMIT : Number(limitValue);

  if (!Number.isInteger(limit) || limit < 1) {
    throw new AppError(400, 'INVALID_PAGINATION', 'limit must be a positive integer');
  }

  let cursor: Cursor | undefined;
  if (cursorValue !== undefined) {
    if (typeof cursorValue !== 'string') {
      throw new AppError(400, 'INVALID_CURSOR', 'cursor is malformed');
    }
    try {
      const decoded = JSON.parse(Buffer.from(cursorValue, 'base64url').toString('utf8')) as Partial<Cursor>;
      if (!decoded.id || (typeof decoded.value !== 'string' && typeof decoded.value !== 'number' && decoded.value !== null)) {
        throw new Error('invalid cursor');
      }
      cursor = { id: decoded.id, value: decoded.value };
    } catch {
      throw new AppError(400, 'INVALID_CURSOR', 'cursor is malformed');
    }
  }

  return { limit: Math.min(limit, MAX_PAGE_LIMIT), cursor };
}

export function encodeCursor(value: CursorValue, id: string): string {
  const safeValue = typeof value === 'bigint' ? value.toString() : value;
  return Buffer.from(JSON.stringify({ value: safeValue, id }), 'utf8').toString('base64url');
}

function normalizeCursorValue(value: CursorValue, kind: 'date' | 'bigint' | 'number' | 'string'): CursorValue {
  if (value === null) return null;
  if (kind === 'date') return new Date(String(value)).toISOString();
  if (kind === 'bigint') return String(value);
  if (kind === 'number') return Number(value);
  return String(value);
}

export function cursorWhere(
  cursor: Cursor | undefined,
  field: string,
  order: 'asc' | 'desc',
  kind: 'date' | 'bigint' | 'number' | 'string',
): Record<string, unknown> | undefined {
  if (!cursor) return undefined;
  const value = normalizeCursorValue(cursor.value, kind);
  const operator = order === 'asc' ? 'gt' : 'lt';
  const same = { [field]: value, id: { [operator]: cursor.id } };

  if (value === null) return { id: { [operator]: cursor.id } };
  return {
    OR: [
      { [field]: { [operator]: value } },
      same,
    ],
  };
}

export function pageMeta(total: number, limit: number, rows: Array<{ id: string }>, fieldValue: CursorValue, hasMore: boolean) {
  return {
    total,
    limit,
    hasMore,
    nextCursor: hasMore && rows.length > 0 ? encodeCursor(fieldValue, rows[rows.length - 1].id) : null,
  };
}

export function queryString(query: Record<string, unknown>, key: string): string | undefined {
  const value = query[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.length === 0) {
    throw new AppError(400, 'INVALID_QUERY', `${key} must be a non-empty value`);
  }
  return value;
}

export function parseOrder(query: Record<string, unknown>): 'asc' | 'desc' {
  const value = queryString(query, 'order') ?? 'desc';
  if (value !== 'asc' && value !== 'desc') {
    throw new AppError(400, 'INVALID_ORDER', 'order must be asc or desc');
  }
  return value;
}

export function parseBoolean(query: Record<string, unknown>, key: string): boolean | undefined {
  const value = queryString(query, key);
  if (value === undefined) return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new AppError(400, 'INVALID_QUERY', `${key} must be true or false`);
}

export function parseNonNegativeBigInt(query: Record<string, unknown>, key: string): bigint | undefined {
  const value = queryString(query, key);
  if (value === undefined || !/^\d+$/.test(value)) {
    if (value === undefined) return undefined;
    throw new AppError(400, 'INVALID_PRICE', `${key} must be a non-negative whole value`);
  }
  return BigInt(value);
}

export function parseEnum<T extends string>(query: Record<string, unknown>, key: string, values: readonly T[]): T | undefined {
  const value = queryString(query, key);
  if (value === undefined) return undefined;
  const normalized = value.toUpperCase() as T;
  if (!values.includes(normalized)) throw new AppError(400, 'INVALID_FILTER', `${key} is not supported`);
  return normalized;
}
