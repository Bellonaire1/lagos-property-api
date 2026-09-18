const baseUrl = (process.env.API_BASE_URL ?? process.argv[2])?.replace(/\/$/, '');

if (!baseUrl) {
  console.error('Usage: API_BASE_URL=https://example.invalid/api/v1 npm run live:smoke');
  process.exit(1);
}

type ListResponse = { data?: unknown[]; meta?: { total?: number; limit?: number; hasMore?: boolean; nextCursor?: string | null } };

async function get(path: string): Promise<{ status: number; body: ListResponse }> {
  const response = await fetch(`${baseUrl}${path}`);
  return { status: response.status, body: await response.json() as ListResponse };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main(): Promise<void> {
  const first = await get('/properties?limit=2&area=Yaba&sort=price&order=asc');
  assert(first.status === 200, `properties request returned ${first.status}`);
  assert(Array.isArray(first.body.data) && first.body.meta?.limit === 2, 'pagination response is incomplete');
  assert(typeof first.body.meta.total === 'number' && typeof first.body.meta.hasMore === 'boolean', 'pagination metadata is incomplete');
  if (first.body.meta.hasMore) {
    assert(first.body.meta.nextCursor, 'next cursor is missing');
    const next = await get(`/properties?limit=2&area=Yaba&sort=price&order=asc&cursor=${encodeURIComponent(first.body.meta.nextCursor)}`);
    assert(next.status === 200, `next page returned ${next.status}`);
  }
  console.log(`Live smoke passed: ${baseUrl}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
