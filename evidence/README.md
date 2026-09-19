# Task 1 Evidence

This directory contains the evidence checklist. The live API and rate-limit behavior have been verified; screenshots have not been fabricated.

1. Live API URL: **COMPLETE** - `https://lagos-property-api.vercel.app/api/v1`
2. Terminal screenshot of `curl` against the live public URL showing pagination: **PENDING SCREENSHOT**
3. Screenshot of the `429` response including `Retry-After`: **COMPLETE** - verified with the rate-limit proof helper
4. Screenshot of the consumer showing data from the live API: **PENDING SCREENSHOT**
5. Committed repeatable seed script: available in `prisma/seed.ts`

Evidence helper scripts are tools, not evidence. `scripts/live-smoke.ts` and `scripts/rate-limit-proof.ts` accept a target base URL and do not claim that deployment has occurred.
