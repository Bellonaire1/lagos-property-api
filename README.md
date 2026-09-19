# Lagos Property Listings API

## What This API Is

The Lagos Property Listings API is a public REST API serving realistic synthetic Lagos property-market data. It exposes agencies, agents, and properties under a versioned `/api/v1` contract.

## Technology

The application foundation uses Node.js, Express, TypeScript, PostgreSQL, Prisma, Zod, and `@faker-js/faker`, managed with npm.

## Resource Model

```text
Agency
  └── Agent
        └── Property
```

- Agency 1 -> many Agents
- Agent 1 -> many Properties
- Each Agent belongs to one Agency.
- Each Property belongs to one Agent.

## Agency Fields

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| id | UUID | Yes | Generated identifier |
| name | string | Yes | Agency name |
| slug | string | Yes | Unique URL-friendly identifier |
| email | string | Yes | Agency email address |
| phone | string | Yes | Agency phone number |
| officeArea | string | Yes | Lagos office area |
| website | string | No | Agency website |
| createdAt | datetime | Yes | Creation timestamp |
| updatedAt | datetime | Yes | Last update timestamp |

## Agent Fields

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| id | UUID | Yes | Generated identifier |
| agencyId | UUID | Yes | References `Agency.id` |
| firstName | string | Yes | Agent first name |
| lastName | string | Yes | Agent last name |
| email | string | Yes | Unique agent email address |
| phone | string | Yes | Agent phone number |
| yearsExperience | integer | Yes | Years of property-market experience |
| isVerified | boolean | Yes | Whether the agent is verified |
| createdAt | datetime | Yes | Creation timestamp |
| updatedAt | datetime | Yes | Last update timestamp |

## Property Fields

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| id | UUID | Yes | Generated identifier |
| agentId | UUID | Yes | References `Agent.id` |
| title | string | Yes | Listing title |
| description | string | Yes | Listing description |
| propertyType | enum | Yes | `apartment`, `duplex`, `detached_house`, `terrace`, or `land` |
| listingType | enum | Yes | `sale` or `rent` |
| area | string | Yes | Lagos property area |
| priceMinor | bigint | Yes | Price in minor currency units |
| currency | string | Yes | Initial value is `NGN` |
| bedrooms | integer | No | Optional because land has no bedroom count |
| bathrooms | integer | No | Optional bathroom count |
| status | enum | Yes | `available`, `under_offer`, `sold`, or `rented` |
| createdAt | datetime | Yes | Creation timestamp |
| updatedAt | datetime | Yes | Last update timestamp |

## Identifier Decision

Externally addressable records use generated UUID identifiers, not sequential integers.

Sequential integers make dataset enumeration easy. Generated identifiers make enumeration harder. Generated identifiers are not a replacement for authorization; access control and authorization will still be required.

## Planned Seed Data

The planned seed scale is:

- 200 Agencies
- 600 Agents
- 2,000 Properties

The eventual seed script must be repeatable and must not create duplicates when run twice. Generated people and examples should use indigenous Yoruba names.

## Getting Started

### Prerequisites

- Node.js 20 or newer
- npm
- PostgreSQL 14 or newer

From a fresh clone:

```bash
npm install
cp .env.example .env
```

Set `DATABASE_URL` in `.env` to the connection URL for a database named `lagos_property_api`. Do not commit `.env` or its credentials.

Apply migrations and load the controlled synthetic dataset:

```bash
npx prisma migrate deploy
npm run db:seed
```

Start the development server on port 4000:

```bash
npm run dev
```

Build and start the production JavaScript build:

```bash
npm run build
npm start
```

## API Base

Local base URL: `http://localhost:4000/api/v1`

Production base URL: `TO BE ADDED AFTER DEPLOYMENT`

The production URL is intentionally not claimed yet.

## API Implementation Status

The public API is available under `/api/v1` with cursor pagination, filtering, sorting, validation, consistent response/error envelopes, IP rate limiting, and permissive development CORS. Authentication and a consumer application are not included in this step.

## Collection Contract

All collection endpoints use cursor pagination.

- `limit` is an integer with a default of `20`; values above `100` are clamped to `100`.
- `cursor` is an opaque string returned in `meta.nextCursor`. Clients must not construct or modify cursors.
- `total` is the total number of records matching the filters, before the current cursor is applied.
- `limit` is the effective limit used for the response.
- `hasMore` indicates whether another page is available.
- `nextCursor` is the cursor for the next page, or `null` on the final page.

Request the next page by passing the returned cursor unchanged:

```text
GET /api/v1/properties?limit=20&cursor=<cursor>
```

List response envelope:

```json
{
  "data": [],
  "meta": {
    "total": 0,
    "limit": 20,
    "hasMore": false,
    "nextCursor": null
  }
}
```

## Response Format

Single-item and create responses use:

```json
{
  "data": {}
}
```

Errors use:

```json
{
  "error": {
    "code": "INVALID_QUERY",
    "message": "limit must be a positive integer"
  }
}
```

Validation errors retain that envelope and include field details:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "fields": {
        "title": ["Invalid input: expected string, received undefined"]
      }
    }
  }
}
```

## Status Codes

- `200 OK`: successful reads and property updates.
- `201 Created`: successful property creation.
- `204 No Content`: successful property deletion; the response has no JSON body.
- `400 Bad Request`: malformed UUIDs, invalid pagination, invalid cursor, unsupported sort/order, invalid enum filters, or malformed price ranges.
- `404 Not Found`: a valid but unknown record ID or unknown API route.
- `422 Unprocessable Entity`: a syntactically valid request body that violates property validation, including missing required fields, invalid property rules, or an unknown `agentId` on create.
- `429 Too Many Requests`: the IP has exceeded the public rate limit.
- `500 Internal Server Error`: an unexpected server-side failure; stack traces are not returned.

`400` is used when the request syntax or query/path value is invalid. `422` is used when a property request body is structurally understood but fails its domain validation.

## Agency Endpoints

### GET `/api/v1/agencies`

Returns a cursor-paginated list of agencies. Query parameters are `limit` (integer, default `20`, maximum effective value `100`), `cursor` (opaque string), `officeArea` (string exact match), `name` (case-insensitive contains search), `sort` (`name` or `createdAt`, default `createdAt`), and `order` (`asc` or `desc`, default `desc`).

Success: `200`. Possible errors: `400`, `429`, `500`.

```bash
curl "http://localhost:4000/api/v1/agencies?officeArea=Yaba&name=Property&sort=name&order=asc&limit=20"
```

```json
{
  "data": [{
    "id": "<agency-id>",
    "name": "Mainland Property Partners 001",
    "slug": "mainland-property-partners-001",
    "email": "contact1@example.com",
    "phone": "+234 8012345678",
    "officeArea": "Yaba",
    "website": "https://example.com",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }],
  "meta": { "total": 1, "limit": 20, "hasMore": false, "nextCursor": null }
}
```

### GET `/api/v1/agencies/:id`

Returns one agency. Path parameter `id` is a generated UUID.

Success: `200`. Possible errors: `400`, `404`, `429`, `500`.

```bash
curl "http://localhost:4000/api/v1/agencies/<agency-id>"
```

```json
{ "data": { "id": "<agency-id>", "name": "Mainland Property Partners 001", "slug": "mainland-property-partners-001", "email": "contact1@example.com", "phone": "+234 8012345678", "officeArea": "Yaba", "website": "https://example.com", "createdAt": "2026-01-01T00:00:00.000Z", "updatedAt": "2026-01-01T00:00:00.000Z" } }
```

### GET `/api/v1/agencies/:id/agents`

Returns agents belonging to an agency. Path parameter `id` is a UUID. Query parameters are `limit`, `cursor`, `isVerified` (`true` or `false`), `yearsExperience` (non-negative integer minimum), `sort` (`lastName`, `yearsExperience`, or `createdAt`, default `createdAt`), and `order` (`asc` or `desc`, default `desc`).

Success: `200`. Possible errors: `400`, `404` if the agency does not exist, `429`, `500`.

```bash
curl "http://localhost:4000/api/v1/agencies/<agency-id>/agents?isVerified=true&yearsExperience=5&sort=lastName&order=asc&limit=20"
```

```json
{ "data": [{ "id": "<agent-id>", "agencyId": "<agency-id>", "firstName": "Adesewa", "lastName": "Adeyemi", "email": "adesewa.adeyemi.1@agents.example.com", "phone": "+234 8112345678", "yearsExperience": 8, "isVerified": true, "createdAt": "2026-01-01T00:00:00.000Z", "updatedAt": "2026-01-01T00:00:00.000Z" }], "meta": { "total": 1, "limit": 20, "hasMore": false, "nextCursor": null } }
```

## Agent Endpoints

### GET `/api/v1/agents`

Returns a cursor-paginated list of agents. Query parameters are `limit`, `cursor`, `agencyId` (UUID), `isVerified` (`true` or `false`), `minYearsExperience` (non-negative integer), `sort` (`lastName`, `yearsExperience`, or `createdAt`, default `createdAt`), and `order` (`asc` or `desc`, default `desc`).

Success: `200`. Possible errors: `400`, `429`, `500`.

```bash
curl "http://localhost:4000/api/v1/agents?agencyId=<agency-id>&isVerified=true&minYearsExperience=5&sort=yearsExperience&order=desc&limit=20"
```

```json
{ "data": [{ "id": "<agent-id>", "agencyId": "<agency-id>", "firstName": "Adesewa", "lastName": "Adeyemi", "email": "adesewa.adeyemi.1@agents.example.com", "phone": "+234 8112345678", "yearsExperience": 8, "isVerified": true, "createdAt": "2026-01-01T00:00:00.000Z", "updatedAt": "2026-01-01T00:00:00.000Z" }], "meta": { "total": 1, "limit": 20, "hasMore": false, "nextCursor": null } }
```

### GET `/api/v1/agents/:id`

Returns one agent. Path parameter `id` is a generated UUID.

Success: `200`. Possible errors: `400`, `404`, `429`, `500`.

```bash
curl "http://localhost:4000/api/v1/agents/<agent-id>"
```

```json
{ "data": { "id": "<agent-id>", "agencyId": "<agency-id>", "firstName": "Adesewa", "lastName": "Adeyemi", "email": "adesewa.adeyemi.1@agents.example.com", "phone": "+234 8112345678", "yearsExperience": 8, "isVerified": true, "createdAt": "2026-01-01T00:00:00.000Z", "updatedAt": "2026-01-01T00:00:00.000Z" } }
```

### GET `/api/v1/agents/:id/properties`

Returns properties belonging to an agent. Path parameter `id` is a UUID. Query parameters are `limit`, `cursor`, `propertyType` (`APARTMENT`, `DUPLEX`, `DETACHED_HOUSE`, `TERRACE`, `LAND`), `listingType` (`SALE`, `RENT`), `status` (`AVAILABLE`, `UNDER_OFFER`, `SOLD`, `RENTED`), `area` (string exact match), `agentId` (UUID), `minPrice` and `maxPrice` (non-negative whole minor-unit values), `sort` (`priceMinor` or `createdAt`, default `createdAt`), and `order` (`asc` or `desc`, default `desc`).

Success: `200`. Possible errors: `400`, `404` if the agent does not exist, `429`, `500`.

```bash
curl "http://localhost:4000/api/v1/agents/<agent-id>/properties?propertyType=APARTMENT&listingType=SALE&status=AVAILABLE&sort=priceMinor&order=asc&limit=20"
```

```json
{ "data": [{ "id": "<property-id>", "agentId": "<agent-id>", "title": "Apartment in Yaba", "description": "A synthetic demo listing.", "propertyType": "APARTMENT", "listingType": "SALE", "area": "Yaba", "priceMinor": "18500000000", "currency": "NGN", "bedrooms": 3, "bathrooms": 3, "status": "AVAILABLE", "createdAt": "2026-01-01T00:00:00.000Z", "updatedAt": "2026-01-01T00:00:00.000Z" }], "meta": { "total": 1, "limit": 20, "hasMore": false, "nextCursor": null } }
```

## Property Endpoints

### GET `/api/v1/properties`

Returns the main cursor-paginated property collection. Query parameters are `limit`, `cursor`, `area` (string exact match), `propertyType` (`APARTMENT`, `DUPLEX`, `DETACHED_HOUSE`, `TERRACE`, `LAND`), `listingType` (`SALE`, `RENT`), `status` (`AVAILABLE`, `UNDER_OFFER`, `SOLD`, `RENTED`), `agentId` (UUID), `minPrice` and `maxPrice` (non-negative whole minor-unit values), `sort` (`price`, `createdAt`, or `bedrooms`, default `createdAt`), and `order` (`asc` or `desc`, default `desc`). `minPrice` cannot exceed `maxPrice`.

Success: `200`. Possible errors: `400`, `429`, `500`.

```bash
curl "http://localhost:4000/api/v1/properties?area=Yaba&listingType=SALE&sort=price&order=asc&limit=20"
```

```json
{ "data": [{ "id": "<property-id>", "agentId": "<agent-id>", "title": "Apartment in Yaba", "description": "A synthetic demo listing.", "propertyType": "APARTMENT", "listingType": "SALE", "area": "Yaba", "priceMinor": "18500000000", "currency": "NGN", "bedrooms": 3, "bathrooms": 3, "status": "AVAILABLE", "createdAt": "2026-01-01T00:00:00.000Z", "updatedAt": "2026-01-01T00:00:00.000Z" }], "meta": { "total": 1, "limit": 20, "hasMore": false, "nextCursor": null } }
```

### GET `/api/v1/properties/:id`

Returns one property. Path parameter `id` is a generated UUID.

Success: `200`. Possible errors: `400`, `404`, `429`, `500`.

```bash
curl "http://localhost:4000/api/v1/properties/<property-id>"
```

```json
{ "data": { "id": "<property-id>", "agentId": "<agent-id>", "title": "Apartment in Yaba", "description": "A synthetic demo listing.", "propertyType": "APARTMENT", "listingType": "SALE", "area": "Yaba", "priceMinor": "18500000000", "currency": "NGN", "bedrooms": 3, "bathrooms": 3, "status": "AVAILABLE", "createdAt": "2026-01-01T00:00:00.000Z", "updatedAt": "2026-01-01T00:00:00.000Z" } }
```

### POST `/api/v1/properties`

Creates a property. The JSON body requires `agentId` (UUID), `title`, `description`, `propertyType`, `listingType`, `area`, positive whole-value `priceMinor`, `currency` (`NGN`), and `status`. Residential properties require positive integer `bedrooms` and `bathrooms`; `LAND` always results in both fields being `null`. Clients cannot provide `id`, `createdAt`, or `updatedAt`.

Success: `201`. Possible errors: `422` for body/domain validation or an unknown agent, `429`, `500`.

```bash
curl -X POST "http://localhost:4000/api/v1/properties" \
  -H "Content-Type: application/json" \
  -d '{"agentId":"<agent-id>","title":"Apartment in Yaba","description":"A synthetic demo listing.","propertyType":"APARTMENT","listingType":"RENT","area":"Yaba","priceMinor":"1500000000","currency":"NGN","bedrooms":2,"bathrooms":2,"status":"AVAILABLE"}'
```

```json
{ "data": { "id": "<property-id>", "agentId": "<agent-id>", "title": "Apartment in Yaba", "description": "A synthetic demo listing.", "propertyType": "APARTMENT", "listingType": "RENT", "area": "Yaba", "priceMinor": "1500000000", "currency": "NGN", "bedrooms": 2, "bathrooms": 2, "status": "AVAILABLE", "createdAt": "2026-01-01T00:00:00.000Z", "updatedAt": "2026-01-01T00:00:00.000Z" } }
```

### PATCH `/api/v1/properties/:id`

Partially updates a property. Path parameter `id` is a UUID. Any subset of the create fields except `agentId` may be supplied; `id`, `createdAt`, and `agentId` cannot be changed. Cross-field rules are checked after merging with the stored record. Changing `propertyType` to `LAND` sets `bedrooms` and `bathrooms` to `null`.

Success: `200`. Possible errors: `400`, `404`, `422`, `429`, `500`.

```bash
curl -X PATCH "http://localhost:4000/api/v1/properties/<property-id>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated Apartment in Yaba","priceMinor":"1600000000"}'
```

```json
{ "data": { "id": "<property-id>", "agentId": "<agent-id>", "title": "Updated Apartment in Yaba", "description": "A synthetic demo listing.", "propertyType": "APARTMENT", "listingType": "RENT", "area": "Yaba", "priceMinor": "1600000000", "currency": "NGN", "bedrooms": 2, "bathrooms": 2, "status": "AVAILABLE", "createdAt": "2026-01-01T00:00:00.000Z", "updatedAt": "2026-01-01T00:00:00.000Z" } }
```

### DELETE `/api/v1/properties/:id`

Deletes one property. Path parameter `id` is a UUID.

Success: `204` with no body. Possible errors: `400`, `404`, `429`, `500`.

```bash
curl -i -X DELETE "http://localhost:4000/api/v1/properties/<property-id>"
```

```text
HTTP/1.1 204 No Content
```

## Rate Limiting

Public API requests are rate-limited by IP using the centralized constants in `src/config/api.ts`: `100` requests per `60,000` milliseconds. Exceeding the limit returns `429` with the standard error envelope and a `Retry-After` header. The limiter is in-memory and is not distributed or Redis-backed.

## Price and BigInt Contract

`priceMinor` is stored as PostgreSQL `BIGINT` and represents whole minor currency units in `NGN`. JSON responses expose it as a decimal string, for example `"18500000000"`. The API deliberately avoids converting it to a JavaScript `Number`, because large integers can lose precision.

## Design Decisions

### Resources

Agency, Agent, and Property represent the useful public boundaries of the Lagos property market. Agencies group agents, agents own listings, and properties are the records consumers search and filter.

### Generated IDs

Records use generated UUIDs instead of sequential integers. Sequential integers make dataset enumeration easy; generated identifiers make enumeration harder. UUIDs are not a replacement for authentication or authorization.

### Cursor Versus Offset Pagination

Cursor pagination is used because it remains more stable when records are inserted or deleted during paging and avoids increasingly expensive large offset scans as collections grow. Offset pagination is simpler, convenient for page-number navigation, and reasonable for smaller or administrative datasets. Cursor pagination is not universally superior; it is the better fit for these public collections.

### Response Envelopes

Consistent success and error envelopes give consumers one predictable way to read list metadata, single resources, validation details, and failures across all routes.

### JSON Price Strings

`priceMinor` is a decimal JSON string because JSON numbers mapped to JavaScript `Number` can lose precision for large integer amounts. This keeps monetary values exact at the API boundary.

### Synthetic Repeatable Seed

All seed records are synthetic demo data rather than scraped or real listings. The repeatable transaction reset recreates exactly 200 Agencies, 600 Agents, and 2,000 Properties, making local verification deterministic while avoiding duplicate growth on a controlled database.

## Bad Input Examples

These examples describe the implemented behavior:

- `limit=-5` -> `400` with code `INVALID_PAGINATION`.
- `limit=5000` -> succeeds with effective `meta.limit` of `100`.
- An unknown sort field -> `400` with code `INVALID_SORT`.
- A malformed cursor -> `400` with code `INVALID_CURSOR`.
- A missing POST field -> `422` with code `VALIDATION_ERROR` and `error.details.fields`.
- A malformed UUID -> `400` with code `INVALID_ID`.
- A valid but unknown record UUID -> `404` with code `NOT_FOUND`.
- An exceeded rate limit -> `429` with code `RATE_LIMIT_EXCEEDED` and `Retry-After`.

## Database Schema

PostgreSQL and Prisma implement the three resources described above. Agency has many Agents, Agent belongs to one Agency and has many Properties, and Property belongs to one Agent. Each record uses a generated UUID primary key. Property prices are stored as whole minor currency units in PostgreSQL `BIGINT`, with `NGN` as the seeded currency.

The Prisma enums map the documented values to database enum values: `PropertyType` contains `APARTMENT`, `DUPLEX`, `DETACHED_HOUSE`, `TERRACE`, and `LAND`; `ListingType` contains `SALE` and `RENT`; and `PropertyStatus` contains `AVAILABLE`, `UNDER_OFFER`, `SOLD`, and `RENTED`.

## Initial Database Indexes

The schema indexes Agent foreign keys by `agencyId` and Property foreign keys by `agentId` for relationship lookups. Property also has indexes on `area`, `propertyType`, `listingType`, `status`, `priceMinor`, and `createdAt` to support likely filtering, sorting, and range queries. Compound indexes on `(status, createdAt)` and `(listingType, priceMinor)` support common filtered ordering and price searches. Unique Agency slugs and Agent emails are indexed by their uniqueness constraints.

## Seed Strategy

The seed script is intended for the controlled demo database. Each run generates all 200 Agencies, 600 Agents, and 2,000 Properties in application memory first, including deterministic UUIDs and in-memory foreign-key relationships. It then performs a short dependency-safe Prisma transaction with ordered deletes and bulk `createMany` inserts. This minimizes remote PostgreSQL round trips and avoids keeping an interactive transaction open across thousands of individual writes. Repeated runs produce the same row counts without hidden seed-only columns or duplicate rows; the tradeoff is that it replaces all data in the target database and should not be used against a database containing unrelated records.

All seeded listings are synthetic demo data, not scraped or real listings. The data uses curated Yoruba name pools, Lagos area data, Faker-generated descriptions, contact details, websites, and dates.
