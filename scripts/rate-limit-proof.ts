const baseUrl = (process.env.API_BASE_URL ?? process.argv[2])?.replace(/\/$/, '');

if (!baseUrl) {
  console.error('Usage: API_BASE_URL=https://example.invalid/api/v1 npm run rate:proof');
  process.exit(1);
}

async function main(): Promise<void> {
  let first429: { status: number; retryAfter: string | null } | undefined;
  for (let request = 1; request <= 101; request += 1) {
    const response = await fetch(`${baseUrl}/agencies?limit=1`);
    if (response.status === 429) {
      first429 = { status: response.status, retryAfter: response.headers.get('retry-after') };
      break;
    }
  }
  if (!first429) throw new Error('No 429 response observed after 101 requests');
  console.log(`First 429 status: ${first429.status}`);
  console.log(`Retry-After: ${first429.retryAfter ?? 'missing'}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
