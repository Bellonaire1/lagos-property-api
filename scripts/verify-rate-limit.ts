const url = `http://127.0.0.1:${process.env.PORT ?? 4000}/api/v1/agencies?limit=1`;

async function main(): Promise<void> {
  let response: Response | undefined;
  for (let request = 0; request < 101; request += 1) response = await fetch(url);
  const body = await response!.json() as { error?: { code?: string; message?: string } };
  if (response!.status !== 429 || body.error?.code !== 'RATE_LIMIT_EXCEEDED' || !response!.headers.get('retry-after')) {
    throw new Error('rate limit verification failed');
  }
  console.log('Rate limit verification passed');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
