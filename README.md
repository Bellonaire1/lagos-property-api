# Lagos Property Listings API

## What This API Is

The Lagos Property Listings API is a planned public REST API serving realistic Lagos property-market data. This step defines the resource model and data design before application implementation.

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

## API Work Still To Come

Later steps will implement:

- full endpoint and curl documentation
- production seed operations beyond the controlled demo seed
- public deployment
- minimal external consumer

The controlled repeatable demo seed and API core are implemented. The remaining work above is not implemented yet.

## API Implementation Status

The public API is available under `/api/v1` with cursor pagination, filtering, sorting, validation, consistent response/error envelopes, IP rate limiting, and permissive development CORS. Property `priceMinor` is serialized as a decimal string in JSON so PostgreSQL `BIGINT` precision is preserved; it is never silently converted to a JavaScript number. Authentication is intentionally not included in this assessment step.

## Database Schema

PostgreSQL and Prisma implement the three resources described above. Agency has many Agents, Agent belongs to one Agency and has many Properties, and Property belongs to one Agent. Each record uses a generated UUID primary key. Property prices are stored as whole minor currency units in PostgreSQL `BIGINT`, with `NGN` as the seeded currency.

The Prisma enums map the documented values to database enum values: `PropertyType` contains `APARTMENT`, `DUPLEX`, `DETACHED_HOUSE`, `TERRACE`, and `LAND`; `ListingType` contains `SALE` and `RENT`; and `PropertyStatus` contains `AVAILABLE`, `UNDER_OFFER`, `SOLD`, and `RENTED`.

## Initial Database Indexes

The schema indexes Agent foreign keys by `agencyId` and Property foreign keys by `agentId` for relationship lookups. Property also has indexes on `area`, `propertyType`, `listingType`, `status`, `priceMinor`, and `createdAt` to support likely filtering, sorting, and range queries. Compound indexes on `(status, createdAt)` and `(listingType, priceMinor)` support common filtered ordering and price searches. Unique Agency slugs and Agent emails are indexed by their uniqueness constraints.

## Seed Strategy

The seed script is intended for the controlled demo database. Each run deletes Properties, then Agents, then Agencies inside a transaction before recreating exactly 200 Agencies, 600 Agents, and 2,000 Properties. This dependency-safe reset makes repeated runs produce the same row counts without hidden seed-only columns or duplicate rows; the tradeoff is that it replaces all data in the target database and should not be used against a database containing unrelated records.

All seeded listings are synthetic demo data, not scraped or real listings. The data uses curated Yoruba name pools, Lagos area data, Faker-generated descriptions, contact details, websites, and dates.
