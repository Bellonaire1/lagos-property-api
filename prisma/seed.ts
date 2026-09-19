import { createHash } from 'node:crypto';
import { faker } from '@faker-js/faker';
import { ListingType, Prisma, PrismaClient, PropertyStatus, PropertyType } from '@prisma/client';

const prisma = new PrismaClient();

const firstNames = [
  'Adesewa', 'Ayomide', 'Temiloluwa', 'Oluwafemi', 'Yetunde',
  'Tolulope', 'Oluwatobi', 'Morayo', 'Damilola', 'Adebimpe',
  'Olamide', 'Abiodun', 'Aderonke', 'Oluwaseun', 'Temidayo',
];

const surnames = [
  'Adeyemi', 'Ogunleye', 'Adebayo', 'Akinyemi', 'Oladipo',
  'Adesina', 'Ogunbiyi', 'Afolayan', 'Oyekan', 'Olawale',
  'Adewale', 'Fashola', 'Ojo', 'Balogun', 'Akande',
];

const areas = [
  'Ikeja GRA', 'Lekki Phase 1', 'Ikoyi', 'Victoria Island', 'Yaba',
  'Surulere', 'Ajah', 'Magodo', 'Maryland', 'Gbagada', 'Ogudu',
  'Chevron', 'Sangotedo', 'Oniru', 'Banana Island',
];

const agencyPrefixes = ['Heritage', 'Mainland', 'Lagos', 'Coastal', 'Golden', 'Cedar', 'Prime', 'Atlantic'];
const agencySuffixes = ['Homes', 'Property Partners', 'Realty', 'Estates', 'Landmark Properties'];
const propertyTypes = [PropertyType.APARTMENT, PropertyType.DUPLEX, PropertyType.DETACHED_HOUSE, PropertyType.TERRACE, PropertyType.LAND];
const statuses = [PropertyStatus.AVAILABLE, PropertyStatus.AVAILABLE, PropertyStatus.AVAILABLE, PropertyStatus.UNDER_OFFER, PropertyStatus.SOLD, PropertyStatus.RENTED];

function pick<T>(values: readonly T[]): T {
  return faker.helpers.arrayElement(values);
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function seedUuid(kind: string, index: number): string {
  const hash = createHash('sha256').update(`lagos-property-api:${kind}:${index}`).digest('hex');
  const variant = ((Number.parseInt(hash[16], 16) & 0x03) | 0x08).toString(16);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-${variant}${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function priceInMinorUnits(listingType: ListingType, propertyType: PropertyType): bigint {
  const baseNaira = listingType === ListingType.RENT
    ? faker.number.int({ min: 2_500_000, max: 18_000_000 })
    : propertyType === PropertyType.LAND
      ? faker.number.int({ min: 25_000_000, max: 450_000_000 })
      : faker.number.int({ min: 45_000_000, max: 950_000_000 });

  return BigInt(baseNaira) * 100n;
}

function buildSeedRecords(): {
  agencies: Array<Prisma.AgencyCreateManyInput & { id: string }>;
  agents: Array<Prisma.AgentCreateManyInput & { id: string }>;
  properties: Array<Prisma.PropertyCreateManyInput & { id: string }>;
} {
  faker.seed(20260918);

  const agencies: Array<Prisma.AgencyCreateManyInput & { id: string }> = [];
  for (let index = 0; index < 200; index += 1) {
    const name = `${pick(agencyPrefixes)} ${pick(agencySuffixes)} ${String(index + 1).padStart(3, '0')}`;
    agencies.push({
      id: seedUuid('agency', index),
      name,
      slug: slugify(name),
      email: `contact${index + 1}@${slugify(name)}.example.com`,
      phone: `+234 80${faker.number.int({ min: 10000000, max: 99999999 })}`,
      officeArea: pick(areas),
      website: `https://www.${slugify(name)}.example.com`,
      createdAt: faker.date.past({ years: 4 }),
    });
  }

  const agents: Array<Prisma.AgentCreateManyInput & { id: string }> = [];
  for (let index = 0; index < 600; index += 1) {
    const firstName = pick(firstNames);
    const lastName = pick(surnames);
    agents.push({
      id: seedUuid('agent', index),
      agencyId: agencies[index % agencies.length]!.id,
      firstName,
      lastName,
      email: `${slugify(firstName)}.${slugify(lastName)}.${index + 1}@agents.example.com`,
      phone: `+234 81${faker.number.int({ min: 10000000, max: 99999999 })}`,
      yearsExperience: faker.number.int({ min: 1, max: 24 }),
      isVerified: faker.datatype.boolean({ probability: 0.78 }),
      createdAt: faker.date.past({ years: 3 }),
    });
  }

  const properties: Array<Prisma.PropertyCreateManyInput & { id: string }> = [];
  for (let index = 0; index < 2_000; index += 1) {
    const propertyType = pick(propertyTypes);
    const listingType = faker.datatype.boolean({ probability: 0.58 }) ? ListingType.SALE : ListingType.RENT;
    const area = pick(areas);
    const label = propertyType === PropertyType.LAND ? 'Residential Land' : propertyType.toLowerCase().replace('_', ' ');
    const bedrooms = propertyType === PropertyType.LAND ? null : faker.number.int({ min: 1, max: 7 });
    const bathrooms = propertyType === PropertyType.LAND ? null : faker.number.int({ min: 1, max: 6 });

    properties.push({
      id: seedUuid('property', index),
      agentId: agents[index % agents.length]!.id,
      title: `${label} in ${area}`,
      description: `${faker.lorem.sentences({ min: 2, max: 4 })} Located in ${area}, Lagos, with convenient access to established amenities and transport links.`,
      propertyType,
      listingType,
      area,
      priceMinor: priceInMinorUnits(listingType, propertyType),
      currency: 'NGN',
      bedrooms,
      bathrooms,
      status: listingType === ListingType.RENT ? pick([PropertyStatus.AVAILABLE, PropertyStatus.AVAILABLE, PropertyStatus.UNDER_OFFER, PropertyStatus.RENTED]) : pick(statuses),
      createdAt: faker.date.past({ years: 2 }),
    });
  }

  return { agencies, agents, properties };
}

async function main(): Promise<void> {
  const { agencies, agents, properties } = buildSeedRecords();

  await prisma.$transaction([
    prisma.property.deleteMany(),
    prisma.agent.deleteMany(),
    prisma.agency.deleteMany(),
    prisma.agency.createMany({ data: agencies }),
    prisma.agent.createMany({ data: agents }),
    prisma.property.createMany({ data: properties }),
  ]);

  const [agencyCount, agentCount, propertyCount] = await Promise.all([
    prisma.agency.count(),
    prisma.agent.count(),
    prisma.property.count(),
  ]);

  console.log(`Agencies: ${agencyCount}`);
  console.log(`Agents: ${agentCount}`);
  console.log(`Properties: ${propertyCount}`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
