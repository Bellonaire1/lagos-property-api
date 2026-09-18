# Deployment Guide

This project is prepared for a provider-neutral Node.js web service. Deployment has not been performed and no public URL is claimed.

## Requirements

- A Node.js web-service runtime using Node.js 20 or newer
- Managed PostgreSQL
- A `DATABASE_URL` environment variable supplied by the hosting platform
- A build step that runs `npm install` and `npm run build`
- A start command of `npm start`

The application reads `PORT` from the environment and falls back to `4000` locally. It does not contain a database URL or database credentials. `.env` is ignored by Git; `.env.example` contains only a placeholder.

## Provider-Neutral Flow

1. Provision the Node web service and managed PostgreSQL database.
2. Configure `DATABASE_URL` in the service environment, pointing to a database named `lagos_property_api`.
3. Install dependencies with `npm install`.
4. Build the application with `npm run build`.
5. Apply production migrations with `npx prisma migrate deploy`.
6. Run the controlled seed with `npm run db:seed` only when the target database is intended to contain this synthetic dataset.
7. Start the service with `npm start`.
8. Verify the deployed `/api/v1/properties` endpoint, pagination metadata, filtering, and error behavior.

The production migration and seed commands must run with the hosting environment's `DATABASE_URL`; credentials must never be committed or printed.

## Health and Evidence

There is no separate health endpoint in this assessment. Use the public API smoke helper in `scripts/live-smoke.ts` against the deployed API base URL after deployment. Record the live URL and screenshots separately as described in `evidence/README.md`.
