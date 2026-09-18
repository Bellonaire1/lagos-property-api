# Lagos Property Listings API

## What This API Is

The Lagos Property Listings API is a planned public REST API serving realistic Lagos property-market data. This step defines the resource model and data design before application implementation.

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

- versioned `/api/v1` routes
- pagination
- filtering
- sorting
- consistent response/error envelopes
- request validation
- rate limiting
- repeatable seed script
- public deployment
- minimal external consumer

These capabilities are not implemented in this design-only step.
