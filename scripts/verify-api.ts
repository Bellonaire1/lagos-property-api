const baseUrl = `http://127.0.0.1:${process.env.PORT ?? 4000}/api/v1`;
let createdPropertyId: string | undefined;
let createdLandId: string | undefined;

type ResponseBody = { data?: any; meta?: any; error?: any };

async function request(path: string, init?: RequestInit): Promise<{ status: number; body: ResponseBody }> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  const body = response.status === 204 ? {} : await response.json() as ResponseBody;
  return { status: response.status, body };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertList(result: { status: number; body: ResponseBody }): void {
  assert(result.status === 200, `expected list 200, got ${result.status}`);
  assert(Array.isArray(result.body.data), 'list data missing');
  assert(typeof result.body.meta?.total === 'number', 'list total missing');
  assert(typeof result.body.meta?.hasMore === 'boolean', 'list hasMore missing');
  assert('nextCursor' in (result.body.meta ?? {}), 'list nextCursor missing');
}

async function main(): Promise<void> {
  const agencies = await request('/agencies?limit=2&sort=name&order=asc');
  assertList(agencies);
  assert(agencies.body.meta.limit === 2, 'agency limit mismatch');
  assert(agencies.body.meta.hasMore && agencies.body.meta.nextCursor, 'agency cursor missing');
  const nextAgencies = await request(`/agencies?limit=2&sort=name&order=asc&cursor=${encodeURIComponent(agencies.body.meta.nextCursor)}`);
  assertList(nextAgencies);
  assert(nextAgencies.body.data[0].id !== agencies.body.data[0].id, 'cursor did not advance');

  const agencyId = agencies.body.data[0].id as string;
  const agencyItem = await request(`/agencies/${agencyId}`);
  assert(agencyItem.status === 200 && agencyItem.body.data.id === agencyId, 'agency item failed');
  assertList(await request(`/agencies/${agencyId}/agents?limit=2&isVerified=true&yearsExperience=1`));
  assertList(await request(`/agencies?officeArea=Yaba&name=Property`));

  const agents = await request('/agents?limit=2&sort=lastName&order=asc');
  assertList(agents);
  const agentId = agents.body.data[0].id as string;
  const agentItem = await request(`/agents/${agentId}`);
  assert(agentItem.status === 200 && agentItem.body.data.id === agentId, 'agent item failed');
  assertList(await request(`/agents/${agentId}/properties?limit=2&sort=priceMinor&order=asc`));
  assertList(await request(`/agents?agencyId=${agencyId}&isVerified=true&minYearsExperience=1`));

  const properties = await request('/properties?limit=2&sort=price&order=asc');
  assertList(properties);
  assert(typeof properties.body.data[0].priceMinor === 'string', 'priceMinor is not serialized as string');
  const propertyId = properties.body.data[0].id as string;
  const propertyItem = await request(`/properties/${propertyId}`);
  assert(propertyItem.status === 200 && propertyItem.body.data.id === propertyId, 'property item failed');
  assertList(await request('/properties?area=Yaba&listingType=SALE&status=AVAILABLE&sort=price&order=asc&limit=3'));

  const clamped = await request('/properties?limit=5000');
  assertList(clamped);
  assert(clamped.body.meta.limit === 100, 'limit was not clamped');
  assert((await request('/properties?limit=-5')).status === 400, 'negative limit was accepted');
  assert((await request('/properties?cursor=not-a-cursor')).status === 400, 'malformed cursor was accepted');
  assert((await request('/properties?sort=unknown')).status === 400, 'unknown sort was accepted');
  assert((await request('/properties/not-a-uuid')).status === 400, 'malformed id was not handled');
  assert((await request('/properties/00000000-0000-0000-0000-000000000000')).status === 404, 'missing property was not 404');
  assert((await request('/properties?propertyType=not-an-enum')).status === 400, 'invalid enum was accepted');
  assert((await request('/properties?minPrice=-1')).status === 400, 'negative price was accepted');

  const missingField = await request('/properties', { method: 'POST', body: JSON.stringify({}) });
  assert(missingField.status === 422 && missingField.body.error?.details?.fields?.agentId, 'missing field details absent');

  try {
    const created = await request('/properties', {
      method: 'POST',
      body: JSON.stringify({
        agentId,
        title: 'Verification Apartment',
        description: 'Temporary API verification property.',
        propertyType: 'APARTMENT',
        listingType: 'RENT',
        area: 'Yaba',
        priceMinor: '1500000000',
        currency: 'NGN',
        bedrooms: 2,
        bathrooms: 2,
        status: 'AVAILABLE',
      }),
    });
    assert(created.status === 201 && created.body.data.priceMinor === '1500000000', 'property create failed');
    createdPropertyId = created.body.data.id;
    const patched = await request(`/properties/${createdPropertyId}`, { method: 'PATCH', body: JSON.stringify({ title: 'Updated Verification Apartment' }) });
    assert(patched.status === 200 && patched.body.data.title === 'Updated Verification Apartment', 'property patch failed');
    const land = await request('/properties', {
      method: 'POST',
      body: JSON.stringify({
        agentId,
        title: 'Verification Land',
        description: 'Temporary API verification land.',
        propertyType: 'LAND',
        listingType: 'SALE',
        area: 'Yaba',
        priceMinor: '2500000000',
        currency: 'NGN',
        status: 'AVAILABLE',
      }),
    });
    assert(land.status === 201 && land.body.data.bedrooms === null && land.body.data.bathrooms === null, 'LAND nullable fields failed');
    createdLandId = land.body.data.id;
    const deletedLand = await request(`/properties/${createdLandId}`, { method: 'DELETE' });
    assert(deletedLand.status === 204, 'LAND cleanup failed');
    createdLandId = undefined;
    const deleted = await request(`/properties/${createdPropertyId}`, { method: 'DELETE' });
    assert(deleted.status === 204, 'property delete failed');
    assert((await request(`/properties/${createdPropertyId}`)).status === 404, 'deleted property still exists');
    createdPropertyId = undefined;
  } finally {
    if (createdPropertyId) await request(`/properties/${createdPropertyId}`, { method: 'DELETE' });
    if (createdLandId) await request(`/properties/${createdLandId}`, { method: 'DELETE' });
  }

  const unknownRoute = await request('/not-a-resource');
  assert(unknownRoute.status === 404 && unknownRoute.body.error?.code === 'NOT_FOUND', 'unknown route failed');
  console.log('API verification passed');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
