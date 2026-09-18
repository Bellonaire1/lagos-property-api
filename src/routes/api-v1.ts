import { Router, type Request } from 'express';
import { ListingType, Prisma, PrismaClient, PropertyStatus, PropertyType } from '@prisma/client';
import { asyncHandler, AppError } from '../lib/errors.js';
import { serializeBigInt } from '../lib/serialization.js';
import { cursorWhere, pageMeta, parseBoolean, parseEnum, parseNonNegativeBigInt, parseOrder, parsePageQuery, queryString } from '../lib/pagination.js';
import { parseBody, parseId, propertyCreateSchema, propertyPatchSchema, validatePropertyRules, type PropertyInput } from '../lib/validation.js';

const prisma = new PrismaClient();
const router = Router();
const propertyTypes = Object.values(PropertyType);
const listingTypes = Object.values(ListingType);
const statuses = Object.values(PropertyStatus);

function query(req: Request) {
  return req.query as Record<string, unknown>;
}

function sortField(value: string | undefined, allowed: readonly string[], fallback: string): string {
  const selected = value ?? fallback;
  if (!allowed.includes(selected)) throw new AppError(400, 'INVALID_SORT', 'sort field is not supported');
  return selected;
}

function listResponse<T extends { id: string }>(response: { json: (body: unknown) => void }, rows: T[], total: number, limit: number, fieldValue: (row: T) => string | number | null | bigint, hasMore: boolean): void {
  response.json({ data: serializeBigInt(rows), meta: pageMeta(total, limit, rows, rows.length ? fieldValue(rows[rows.length - 1]) : null, hasMore) });
}

function propertyWhere(input: Record<string, unknown>): Prisma.PropertyWhereInput {
  const where: Prisma.PropertyWhereInput = {};
  const area = queryString(input, 'area');
  const agentId = queryString(input, 'agentId');
  const propertyType = parseEnum(input, 'propertyType', propertyTypes);
  const listingType = parseEnum(input, 'listingType', listingTypes);
  const status = parseEnum(input, 'status', statuses);
  const minPrice = parseNonNegativeBigInt(input, 'minPrice');
  const maxPrice = parseNonNegativeBigInt(input, 'maxPrice');
  if (area) where.area = area;
  if (agentId) where.agentId = parseId(agentId);
  if (propertyType) where.propertyType = propertyType;
  if (listingType) where.listingType = listingType;
  if (status) where.status = status;
  if (minPrice !== undefined || maxPrice !== undefined) {
    where.priceMinor = { ...(minPrice !== undefined ? { gte: minPrice } : {}), ...(maxPrice !== undefined ? { lte: maxPrice } : {}) };
    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) throw new AppError(400, 'INVALID_PRICE_RANGE', 'minPrice cannot be greater than maxPrice');
  }
  return where;
}

function agentWhere(input: Record<string, unknown>): Prisma.AgentWhereInput {
  const where: Prisma.AgentWhereInput = {};
  const agencyId = queryString(input, 'agencyId');
  const verified = parseBoolean(input, 'isVerified');
  const minimum = queryString(input, 'minYearsExperience');
  if (agencyId) where.agencyId = parseId(agencyId);
  if (verified !== undefined) where.isVerified = verified;
  if (minimum !== undefined) {
    if (!/^\d+$/.test(minimum)) throw new AppError(400, 'INVALID_QUERY', 'minYearsExperience must be a non-negative integer');
    where.yearsExperience = { gte: Number(minimum) };
  }
  return where;
}

function propertyOrder(field: string, order: 'asc' | 'desc') {
  return field === 'price' ? { priceMinor: order } : { [field]: order };
}

async function agencyExists(id: string): Promise<void> {
  if (!await prisma.agency.findUnique({ where: { id }, select: { id: true } })) throw new AppError(404, 'NOT_FOUND', 'Agency not found');
}

async function agentExists(id: string): Promise<void> {
  if (!await prisma.agent.findUnique({ where: { id }, select: { id: true } })) throw new AppError(404, 'NOT_FOUND', 'Agent not found');
}

router.get('/agencies', asyncHandler(async (req, res) => {
  const input = query(req);
  const { limit, cursor } = parsePageQuery(input);
  const order = parseOrder(input);
  const field = sortField(queryString(input, 'sort'), ['name', 'createdAt'], 'createdAt');
  const baseWhere = { ...(queryString(input, 'officeArea') ? { officeArea: queryString(input, 'officeArea') } : {}), ...(queryString(input, 'name') ? { name: { contains: queryString(input, 'name'), mode: 'insensitive' as const } } : {}) };
  const where = { ...baseWhere, ...cursorWhere(cursor, field, order, field === 'createdAt' ? 'date' : 'string') };
  const [total, rows] = await Promise.all([
    prisma.agency.count({ where: baseWhere }),
    prisma.agency.findMany({ where, orderBy: [{ [field]: order }, { id: order }], take: limit + 1 }),
  ]);
  const page = rows.slice(0, limit);
  listResponse(res, page, total, limit, (row) => field === 'createdAt' ? row.createdAt.toISOString() : row.name, rows.length > limit);
}));

router.get('/agencies/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const agency = await prisma.agency.findUnique({ where: { id } });
  if (!agency) throw new AppError(404, 'NOT_FOUND', 'Agency not found');
  res.json({ data: serializeBigInt(agency) });
}));

router.get('/agencies/:id/agents', asyncHandler(async (req, res) => {
  const agencyId = parseId(req.params.id);
  await agencyExists(agencyId);
  const input = query(req);
  const { limit, cursor } = parsePageQuery(input);
  const order = parseOrder(input);
  const field = sortField(queryString(input, 'sort'), ['lastName', 'yearsExperience', 'createdAt'], 'createdAt');
  const minimum = queryString(input, 'yearsExperience');
  if (minimum !== undefined && (!/^\d+$/.test(minimum) || Number(minimum) < 0)) throw new AppError(400, 'INVALID_QUERY', 'yearsExperience must be a non-negative integer');
  const baseWhere = { agencyId, ...(parseBoolean(input, 'isVerified') !== undefined ? { isVerified: parseBoolean(input, 'isVerified') } : {}), ...(minimum ? { yearsExperience: { gte: Number(minimum) } } : {}) };
  const where = { ...baseWhere, ...cursorWhere(cursor, field, order, field === 'createdAt' ? 'date' : field === 'yearsExperience' ? 'number' : 'string') };
  const [total, rows] = await Promise.all([prisma.agent.count({ where: baseWhere }), prisma.agent.findMany({ where, orderBy: [{ [field]: order }, { id: order }], take: limit + 1 })]);
  const page = rows.slice(0, limit);
  listResponse(res, page, total, limit, (row) => field === 'createdAt' ? row.createdAt.toISOString() : field === 'yearsExperience' ? row.yearsExperience : row.lastName, rows.length > limit);
}));

router.get('/agents', asyncHandler(async (req, res) => {
  const input = query(req);
  const { limit, cursor } = parsePageQuery(input);
  const order = parseOrder(input);
  const field = sortField(queryString(input, 'sort'), ['lastName', 'yearsExperience', 'createdAt'], 'createdAt');
  const baseWhere = agentWhere(input);
  const where = { ...baseWhere, ...cursorWhere(cursor, field, order, field === 'createdAt' ? 'date' : field === 'yearsExperience' ? 'number' : 'string') };
  const [total, rows] = await Promise.all([prisma.agent.count({ where: baseWhere }), prisma.agent.findMany({ where, orderBy: [{ [field]: order }, { id: order }], take: limit + 1 })]);
  const page = rows.slice(0, limit);
  listResponse(res, page, total, limit, (row) => field === 'createdAt' ? row.createdAt.toISOString() : field === 'yearsExperience' ? row.yearsExperience : row.lastName, rows.length > limit);
}));

router.get('/agents/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const agent = await prisma.agent.findUnique({ where: { id } });
  if (!agent) throw new AppError(404, 'NOT_FOUND', 'Agent not found');
  res.json({ data: serializeBigInt(agent) });
}));

router.get('/agents/:id/properties', asyncHandler(async (req, res) => {
  const agentId = parseId(req.params.id);
  await agentExists(agentId);
  const input = query(req);
  const { limit, cursor } = parsePageQuery(input);
  const order = parseOrder(input);
  const field = sortField(queryString(input, 'sort'), ['priceMinor', 'createdAt'], 'createdAt');
  const baseWhere = { agentId, ...propertyWhere(input) };
  const where = { ...baseWhere, ...cursorWhere(cursor, field, order, field === 'priceMinor' ? 'bigint' : 'date') };
  const [total, rows] = await Promise.all([prisma.property.count({ where: baseWhere }), prisma.property.findMany({ where, orderBy: [{ [field]: order }, { id: order }], take: limit + 1 })]);
  const page = rows.slice(0, limit);
  listResponse(res, page, total, limit, (row) => field === 'priceMinor' ? row.priceMinor : row.createdAt.toISOString(), rows.length > limit);
}));

router.get('/properties', asyncHandler(async (req, res) => {
  const input = query(req);
  const { limit, cursor } = parsePageQuery(input);
  const order = parseOrder(input);
  const field = sortField(queryString(input, 'sort'), ['price', 'createdAt', 'bedrooms'], 'createdAt');
  const internalField = field === 'price' ? 'priceMinor' : field;
  const kind = internalField === 'priceMinor' ? 'bigint' : internalField === 'bedrooms' ? 'number' : 'date';
  const baseWhere = propertyWhere(input);
  const where = { ...baseWhere, ...cursorWhere(cursor, internalField, order, kind) };
  const [total, rows] = await Promise.all([prisma.property.count({ where: baseWhere }), prisma.property.findMany({ where, orderBy: [propertyOrder(field, order), { id: order }], take: limit + 1 })]);
  const page = rows.slice(0, limit);
  listResponse(res, page, total, limit, (row) => internalField === 'priceMinor' ? row.priceMinor : internalField === 'bedrooms' ? row.bedrooms : row.createdAt.toISOString(), rows.length > limit);
}));

router.get('/properties/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const property = await prisma.property.findUnique({ where: { id } });
  if (!property) throw new AppError(404, 'NOT_FOUND', 'Property not found');
  res.json({ data: serializeBigInt(property) });
}));

function propertyData(input: PropertyInput): Prisma.PropertyCreateInput {
  const { agentId, ...fields } = input;
  return { ...fields, priceMinor: BigInt(input.priceMinor), agent: { connect: { id: agentId } } } as Prisma.PropertyCreateInput;
}

router.post('/properties', asyncHandler(async (req, res) => {
  const parsed = parseBody(propertyCreateSchema, req.body);
  const input = parsed.propertyType === PropertyType.LAND ? { ...parsed, bedrooms: null, bathrooms: null } : parsed;
  validatePropertyRules(input);
  if (!await prisma.agent.findUnique({ where: { id: input.agentId }, select: { id: true } })) throw new AppError(422, 'INVALID_AGENT', 'agentId does not reference an existing Agent');
  const data = propertyData(input);
  const property = await prisma.property.create({ data });
  res.status(201).json({ data: serializeBigInt(property) });
}));

router.patch('/properties/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const existing = await prisma.property.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Property not found');
  const input = parseBody(propertyPatchSchema, req.body);
  const merged = { ...existing, ...input, propertyType: input.propertyType ?? existing.propertyType, bedrooms: input.propertyType === PropertyType.LAND ? null : input.bedrooms !== undefined ? input.bedrooms : existing.bedrooms, bathrooms: input.propertyType === PropertyType.LAND ? null : input.bathrooms !== undefined ? input.bathrooms : existing.bathrooms };
  validatePropertyRules({ propertyType: String(merged.propertyType), bedrooms: merged.bedrooms, bathrooms: merged.bathrooms });
  const data: Prisma.PropertyUpdateInput = {};
  for (const key of ['title', 'description', 'propertyType', 'listingType', 'area', 'currency', 'bedrooms', 'bathrooms', 'status'] as const) if (input[key] !== undefined) data[key] = input[key] as never;
  if (input.propertyType === PropertyType.LAND) { data.bedrooms = null; data.bathrooms = null; }
  if (input.priceMinor !== undefined) data.priceMinor = BigInt(input.priceMinor);
  const property = await prisma.property.update({ where: { id }, data });
  res.json({ data: serializeBigInt(property) });
}));

router.delete('/properties/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  try {
    await prisma.property.delete({ where: { id } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') throw new AppError(404, 'NOT_FOUND', 'Property not found');
    throw error;
  }
  res.status(204).send();
}));

export { router as apiV1Router };
