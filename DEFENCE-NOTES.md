# Task 1 Defence Notes

## 1. Cursor Pagination

Cursor pagination is stable when records are inserted or deleted during paging and avoids increasingly large offset scans. Offset pagination is simpler and better for page-number navigation or smaller administrative datasets.

## 2. Final Cursor Page

The final page returns `hasMore: false` and `nextCursor: null`. The consumer hides its Next Page control and does not send another request.

## 3. Rate Limit Configuration

The limit is centralized in `src/config/api.ts` as 100 requests per 60 seconds. Central configuration keeps policy consistent, makes it easy to review or change, and prevents route handlers from containing duplicated magic values. The limiter is keyed by IP and returns `429` with `Retry-After`.

## 4. Adding a Property Field

Add the field to the Prisma schema and migration, then add it to the relevant Zod input schema only if clients should write it. Add it to the serializer/response shape and documentation as an optional response field so existing v1 clients that ignore unknown fields continue to work. A breaking change would require a new API version.

## 5. JSON Price Strings

`priceMinor` is PostgreSQL `BIGINT`. It is exposed as a decimal JSON string because JavaScript `Number` can lose precision for large integer values.

## 6. Remote Seed Failure

The original seed kept a long interactive transaction open while making thousands of individual database round trips. That worked locally because network latency was low, but remote Neon connections add network latency and can close a transaction that remains open too long.

The fix generates all records in memory with their UUIDs and relationships, then uses ordered deletes and bulk `createMany` insertion in a short transaction. The production seed was run twice successfully, with final counts of 200 Agencies, 600 Agents, and 2,000 Properties on each run.
