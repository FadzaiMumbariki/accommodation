import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';

// ─────────────────────────────────────────────────────────────────────────────
// Mock Supabase plumbing
//
// The `./supabase` mock exposes a live getter so tests can swap the client
// (or set it to null to simulate demo mode) without re-importing the module.
// Query builders record every chained call as `[table.method, args]`, and
// responses are resolved per `table.entryMethod` with optional queues.
// ─────────────────────────────────────────────────────────────────────────────

interface MockState {
  client: Record<string, any> | null;
  resolved: Record<string, Record<string, any>>;
  responses: Map<string, Array<Record<string, any>>>;
  getters: Array<[string, unknown[]]>;
  rpc: any;
  channel: any;
  removeChannel: any;
  bucket: Record<string, any>;
  subscribeHandler: ((payload: { new: unknown }) => void) | null;
  spies: { warn: any; error: any };
}

const mockState: MockState = {
  client: null,
  resolved: {},
  responses: new Map(),
  getters: [],
  rpc: jest.fn(),
  channel: jest.fn(),
  removeChannel: jest.fn(),
  bucket: {},
  subscribeHandler: null,
  spies: { warn: jest.fn(), error: jest.fn() },
};
(globalThis as Record<string, unknown>).__imbaMock = mockState;
const S = mockState;

jest.mock('./supabase', () => ({
  get supabase() {
    const state = (globalThis as Record<string, unknown>).__imbaMock as MockState | undefined;
    return state?.client ?? null;
  },
}));

jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  ImageManipulator: { manipulate: jest.fn() },
}));

jest.mock('../constants/mockData', () => ({
  MOCK_PROPERTIES: [
    {
      id: 'mock-1',
      title: 'Sunny Avondale flat',
      propertyType: 'apartment',
      price: 350,
      city: 'Harare',
      suburb: 'Avondale',
      province: 'Harare',
      bedrooms: 2,
      bathrooms: 1,
      maxOccupants: 3,
      images: [],
      amenities: ['furnished', 'water'],
      description: 'Furnished two bedroom in Avondale',
      available: true,
      availabilityStatus: 'available_now',
      verified: false,
      reviewsCount: 0,
      postedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'mock-2',
      title: 'Bulawayo townhouse',
      propertyType: 'house',
      price: 600,
      city: 'Bulawayo',
      suburb: 'Mount Pleasant',
      province: 'Bulawayo',
      bedrooms: 3,
      bathrooms: 2,
      maxOccupants: 5,
      images: [],
      amenities: ['solar'],
      description: 'Quiet three bedroom house',
      available: true,
      availabilityStatus: 'available_from_date',
      verified: false,
      reviewsCount: 0,
      postedAt: '2026-01-02T00:00:00Z',
    },
  ],
  MOCK_CONVERSATIONS: [],
  MOCK_VIEWINGS: [],
  MOCK_REQUESTS: [],
}));

import {
  rowToProperty,
  fetchProperties,
  fetchPropertyById,
  fetchLandlordProperties,
  insertProperty,
  updateProperty,
  deleteProperty,
  uploadPropertyImage,
  deleteAccountAndPropertyImages,
  insertViewing,
  fetchMyViewings,
  updateViewingStatus,
  insertRequest,
  fetchConversations,
  fetchMessages,
  sendChatMessage,
  markConversationRead,
  subscribeToMessages,
  upsertConversation,
  saveProperty,
  unsaveProperty,
  insertReport,
  savePushToken,
  fetchProfile,
  fetchVerifiableProperties,
  fetchVerifiableLandlords,
  setPropertyVerified,
  setUserVerified,
} from './database';
import { filterMockProperties } from './propertyFilters';
import { MOCK_PROPERTIES } from '../constants/mockData';

const RESOLVE_FALLBACK = { data: null, error: null, count: null };
const CHAIN_METHODS = [
  'eq', 'neq', 'gte', 'lte', 'ilike', 'in', 'is', 'or', 'not', 'contains', 'overlaps',
  'order', 'select', 'insert', 'update', 'delete', 'upsert', 'range', 'limit',
];

function anyFn(impl?: (...args: any[]) => any): any {
  return jest.fn(impl);
}

/**
 * Supabase surfaces PostgREST failures as plain objects, but the data layer
 * re-throws them, so error-path assertions need a real Error to match on.
 */
function dbError(message: string, code?: string): Error {
  const error = new Error(message) as Error & { code?: string };
  if (code) error.code = code;
  return error;
}

function makeBuilder(table: string, entryMethod: string): any {
  const responseKey = `${table}.${entryMethod}`;
  const builder: Record<string, any> = {
    then: (cb?: (v: any) => any) => {
      const queued = S.responses.get(responseKey);
      const response = (queued && queued.length > 0)
        ? queued.shift()
        : (S.resolved[responseKey] ?? S.resolved['*'] ?? RESOLVE_FALLBACK);
      return Promise.resolve(response).then(cb);
    },
    single: () => builder,
    maybeSingle: () => builder,
  };
  for (const method of CHAIN_METHODS) {
    builder[method] = (...args: unknown[]) => {
      S.getters.push([`${table}.${method}`, args]);
      return builder;
    };
  }
  return builder;
}

function makeClient(): Record<string, any> {
  return {
    from: (table: string) => ({
      select: () => makeBuilder(table, 'select'),
      insert: (values: unknown) => makeBuilder(table, 'insert').insert(values),
      update: (values: unknown) => makeBuilder(table, 'update').update(values),
      delete: () => makeBuilder(table, 'delete'),
      upsert: (values: unknown, options: unknown) =>
        makeBuilder(table, 'upsert').upsert(values, options),
    }),
    rpc: (...args: any[]) => S.rpc(...args),
    storage: { from: () => S.bucket },
    channel: (...args: any[]) => S.channel(...args),
    removeChannel: (...args: any[]) => S.removeChannel(...args),
  };
}

/** Set the response used when a table/entry call is awaited. */
function resolve(value: any) {
  S.resolved['*'] = { ...RESOLVE_FALLBACK, ...value };
}

function resolveFor(table: string, entryMethod: string, value: any) {
  S.resolved[`${table}.${entryMethod}`] = { ...RESOLVE_FALLBACK, ...value };
}

/** Script consecutive responses for the same table/entry call. */
function queueFor(table: string, entryMethod: string, values: any[]) {
  S.responses.set(
    `${table}.${entryMethod}`,
    values.map(v => ({ ...RESOLVE_FALLBACK, ...v })),
  );
}

function chainCalls(key: string): unknown[][] {
  return S.getters.filter((entry: [string, unknown[]]) => entry[0] === key).map(e => e[1]);
}

/** Filter values, e.g. all `.eq(column, value)` pairs for a table. */
function pairsFor(key: string): unknown[] {
  return chainCalls(key).map(args => args.slice(0, 2));
}

/** First argument of the first recorded call, i.e. insert/update payloads. */
function payloadFor(key: string): any {
  const calls = chainCalls(key);
  return calls.length > 0 ? calls[0][0] : undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// Row fixtures
// ─────────────────────────────────────────────────────────────────────────────

function propertyRow(overrides: Record<string, unknown> = {}): any {
  return {
    id: 'property-1',
    landlord_id: 'landlord-1',
    title: 'Central apartment',
    property_type: 'apartment',
    price: '450',
    deposit: null,
    city: 'Harare',
    suburb: 'Avondale',
    province: 'Harare Province',
    address: null,
    bedrooms: 2,
    bathrooms: 1,
    max_occupants: 4,
    images: ['https://example.com/photo.jpg'],
    amenities: ['water'],
    description: null,
    available: true,
    availability_status: 'available_now',
    available_from_date: null,
    verified: false,
    rating: null,
    reviews_count: null,
    lat: null,
    lng: null,
    created_at: '2026-01-01T00:00:00Z',
    profiles: { full_name: 'Landlord One', avatar_url: null, phone: '+263771234567' },
    ...overrides,
  };
}

function viewingRow(overrides: Record<string, unknown> = {}): any {
  return {
    id: 'viewing-1',
    property_id: 'property-1',
    tenant_id: 'tenant-1',
    landlord_id: 'landlord-1',
    viewing_date: '2027-06-01',
    viewing_time: '10:00:00',
    attendees: 2,
    message: 'Please confirm',
    status: 'pending',
    created_at: '2026-01-01T00:00:00Z',
    properties: {
      title: 'Central apartment',
      images: ['https://example.com/photo.jpg'],
      city: 'Harare',
      suburb: 'Avondale',
      price: 450,
    },
    tenant: { full_name: 'Tenant One', phone: '+263770000000' },
    ...overrides,
  };
}

function messageRow(overrides: Record<string, unknown> = {}): any {
  return {
    id: 'msg-1',
    conversation_id: 'conv-1',
    sender_id: 'tenant-1',
    text: 'Is this available?',
    created_at: '2026-01-01T00:00:00Z',
    read: false,
    type: 'text',
    ...overrides,
  };
}

function conversationRow(overrides: Record<string, unknown> = {}): any {
  return {
    id: 'conv-1',
    tenant_id: 'tenant-1',
    landlord_id: 'landlord-1',
    property_id: 'property-1',
    last_message: 'Is this available?',
    last_message_at: '2026-01-01T00:00:00Z',
    tenant_unread: 0,
    landlord_unread: 2,
    created_at: '2026-01-01T00:00:00Z',
    tenant: { full_name: 'Tenant One', avatar_url: null, phone: null },
    landlord: { full_name: 'Landlord One', avatar_url: null, phone: null },
    properties: { title: 'Central apartment' },
    ...overrides,
  };
}

function requestRow(overrides: Record<string, unknown> = {}): any {
  return {
    id: 'req-1',
    user_id: 'tenant-1',
    property_type: 'apartment',
    bedrooms: '2',
    number_of_people: 3,
    city: 'Harare',
    suburb: null,
    province: 'Harare',
    min_budget: '200',
    max_budget: '500',
    move_in_date: '2027-01-01',
    furnished: 'furnished',
    amenities: ['water'],
    additional_notes: null,
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    user: null,
    ...overrides,
  };
}

function propertyInput(): any {
  const { id, postedAt, landlord, ...rest } =
    MOCK_PROPERTIES[0] as unknown as Record<string, unknown>;
  void id; void postedAt; void landlord;
  return rest;
}

function viewingInput(): any {
  return { propertyId: 'property-1', date: '2027-06-01', time: '10:00 AM', attendees: 2, message: 'Hi' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  S.rpc = anyFn().mockResolvedValue({ data: null, error: null });
  S.channel = anyFn();
  S.removeChannel = anyFn();
  S.bucket = {
    list: anyFn().mockResolvedValue({ data: [{ name: 'photo.jpg' }], error: null }),
    remove: anyFn().mockResolvedValue({ data: null, error: null }),
    upload: anyFn().mockResolvedValue({ data: null, error: null }),
    getPublicUrl: anyFn().mockReturnValue({ data: { publicUrl: 'https://cdn.example.com/photo.jpg' } }),
  };
  const chain: Record<string, any> = {
    on: (_event: string, _cfg: unknown, cb: (payload: { new: unknown }) => void) => {
      S.subscribeHandler = cb;
      return chain;
    },
    subscribe: anyFn(),
  };
  S.channel.mockReturnValue(chain);
  S.subscribeHandler = null;
  S.client = makeClient();
  S.resolved = { '*': { ...RESOLVE_FALLBACK } };
  S.responses = new Map();
  S.getters = [];
  S.spies = {
    warn: jest.spyOn(console, 'warn').mockImplementation(() => {}) as any,
    error: jest.spyOn(console, 'error').mockImplementation(() => {}) as any,
  };
});

afterEach(() => {
  S.spies.warn.mockRestore();
  S.spies.error.mockRestore();
});

// ─────────────────────────────────────────────────────────────────────────────
// Row mapping
// ─────────────────────────────────────────────────────────────────────────────

describe('rowToProperty', () => {
  it('maps database values without inventing landlord metrics', () => {
    const property = rowToProperty(propertyRow());

    expect(property.price).toBe(450);
    expect(property.rating).toBeUndefined();
    expect(property.landlord).toEqual({
      id: 'landlord-1',
      name: 'Landlord One',
      avatar: undefined,
      phone: '+263771234567',
      verified: false,
    });
    expect(property.landlord.responseTime).toBeUndefined();
    expect(property.landlord.rating).toBeUndefined();
    expect(property.landlord.totalListings).toBeUndefined();
  });

  it('maps string coordinates to numbers when present', () => {
    const property = rowToProperty(propertyRow({ lat: '-17.83', lng: '31.05' }));
    expect(property.coordinates).toEqual({ lat: -17.83, lng: 31.05 });
  });

  it('falls back to empty arrays and defaults for nullable columns', () => {
    const property = rowToProperty(propertyRow({ images: null, amenities: null, description: null }));
    expect(property.images).toEqual([]);
    expect(property.amenities).toEqual([]);
    expect(property.description).toBe('');
    expect(property.landlord.name).toBe('Landlord One');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Successful read paths
// ─────────────────────────────────────────────────────────────────────────────

describe('fetchProperties (success)', () => {
  it('maps rows and reports pagination from count', async () => {
    resolve({ data: [propertyRow()], count: 25 });
    const page = await fetchProperties();
    expect(page.properties).toHaveLength(1);
    expect(page.properties[0].id).toBe('property-1');
    expect(page.hasMore).toBe(true);
  });

  it('assumes a full page means more results when count is missing', async () => {
    const rows = Array.from({ length: 20 }, (_, i) => propertyRow({ id: `p-${i}` }));
    resolve({ data: rows, count: null });
    const page = await fetchProperties();
    expect(page.hasMore).toBe(true);
  });

  it('stops paging on a partial page', async () => {
    resolve({ data: [propertyRow()], count: null });
    const page = await fetchProperties();
    expect(page.hasMore).toBe(false);
  });

  it('paginates using the page offset', async () => {
    resolve({ data: [], count: 0 });
    await fetchProperties(undefined, 2);
    expect(pairsFor('properties.range')[0]).toEqual([40, 59]);
  });
});

describe('single and list reads', () => {
  it('fetchPropertyById returns a mapped property', async () => {
    resolve({ data: propertyRow() });
    const property = await fetchPropertyById('property-1');
    expect(property?.title).toBe('Central apartment');
  });

  it('fetchPropertyById returns null on error', async () => {
    resolve({ error: dbError('not found') });
    expect(await fetchPropertyById('missing')).toBeNull();
  });

  it('fetchLandlordProperties maps every row', async () => {
    resolve({ data: [propertyRow(), propertyRow({ id: 'property-2' })] });
    expect(await fetchLandlordProperties('landlord-1')).toHaveLength(2);
  });

  it('fetchLandlordProperties returns empty on error', async () => {
    resolve({ error: dbError('rls denied') });
    expect(await fetchLandlordProperties('landlord-1')).toEqual([]);
  });

  it('fetchMyViewings maps viewing rows and formats times', async () => {
    resolve({ data: [viewingRow()] });
    const viewings = await fetchMyViewings('tenant-1');
    expect(viewings[0].propertyTitle).toBe('Central apartment');
    expect(viewings[0].propertyLocation).toBe('Avondale, Harare');
    expect(viewings[0].time).toBe('10:00 AM');
    expect(viewings[0].numberOfPeople).toBe(2);
  });

  it('fetchMessages returns chronological messages', async () => {
    resolve({ data: [messageRow({ id: 'new' }), messageRow({ id: 'old', text: 'older' })] });
    const page = await fetchMessages('conv-1');
    expect(page.messages.map((m: any) => m.id)).toEqual(['old', 'new']);
    expect(page.hasMore).toBe(false);
  });

  it('fetchConversations reports the counterpart and unread count per viewer', async () => {
    resolve({ data: [conversationRow()] });
    const asTenant = await fetchConversations('tenant-1');
    expect(asTenant[0].participantName).toBe('Landlord One');
    expect(asTenant[0].unreadCount).toBe(0);

    const asLandlord = await fetchConversations('landlord-1');
    expect(asLandlord[0].participantName).toBe('Tenant One');
    expect(asLandlord[0].unreadCount).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Successful write paths
// ─────────────────────────────────────────────────────────────────────────────

describe('write paths', () => {
  it('insertProperty sends the listing once and returns the saved row', async () => {
    resolve({ data: propertyRow() });
    const saved = await insertProperty('landlord-1', propertyInput());
    expect(saved.id).toBe('property-1');
    expect(chainCalls('properties.insert')).toHaveLength(1);
    expect(payloadFor('properties.insert')).toMatchObject({
      landlord_id: 'landlord-1',
      title: 'Sunny Avondale flat',
      availability_status: 'available_now',
    });
  });

  it('insertProperty throws when the insert returns no row', async () => {
    resolve({ data: null, error: null });
    await expect(insertProperty('landlord-1', propertyInput())).rejects.toThrow(/could not be saved/i);
  });

  it('updateProperty only sends provided fields and maps coordinates', async () => {
    resolve({ data: propertyRow({ title: 'Updated' }) });
    const updated = await updateProperty('property-1', {
      title: 'Updated',
      coordinates: { lat: -17.8, lng: 31.0 },
    });
    expect(updated.title).toBe('Updated');
    const payload = payloadFor('properties.update');
    expect(Object.keys(payload).sort()).toEqual(['lat', 'lng', 'title']);
    expect(payload).toMatchObject({ title: 'Updated', lat: -17.8, lng: 31.0 });
  });

  it('deleteProperty issues a delete filtered by id', async () => {
    await deleteProperty('property-1');
    expect(pairsFor('properties.eq')).toContainEqual(['id', 'property-1']);
  });

  it('deleteProperty throws on error', async () => {
    resolve({ error: dbError('foreign key violation') });
    await expect(deleteProperty('property-1')).rejects.toThrow(/foreign key violation/);
  });

  it('saveProperty and unsaveProperty report success from error state', async () => {
    resolve({ error: null });
    await expect(saveProperty('user-1', 'property-1')).resolves.toBe(true);
    await expect(unsaveProperty('user-1', 'property-1')).resolves.toBe(true);
    expect(payloadFor('saved_properties.insert')).toEqual({
      user_id: 'user-1',
      property_id: 'property-1',
    });

    resolve({ error: dbError('duplicate') });
    await expect(saveProperty('user-1', 'property-1')).resolves.toBe(false);
    await expect(unsaveProperty('user-1', 'property-1')).resolves.toBe(false);
  });

  it('sendChatMessage calls the rpc and maps the returned row', async () => {
    S.rpc.mockResolvedValue({ data: [messageRow()] });
    const message = await sendChatMessage('conv-1', 'Is this available?');
    expect(S.rpc).toHaveBeenCalledWith('send_chat_message', {
      p_conversation_id: 'conv-1',
      p_text: 'Is this available?',
    });
    expect(message).toMatchObject({ id: 'msg-1', text: 'Is this available?', type: 'text' });
  });

  it('sendChatMessage rejects when the rpc returns no row', async () => {
    S.rpc.mockResolvedValue({ data: [] });
    await expect(sendChatMessage('conv-1', 'hello')).rejects.toThrow(/could not be sent/i);
  });

  it('markConversationRead marks others\u2019 messages and resets the tenant unread column', async () => {
    await markConversationRead('conv-1', 'tenant-1', 'tenant');
    expect(payloadFor('messages.update')).toEqual({ read: true });
    expect(pairsFor('messages.neq')).toContainEqual(['sender_id', 'tenant-1']);
    expect(payloadFor('conversations.update')).toEqual({ tenant_unread: 0 });
  });

  it('markConversationRead resets the landlord column for landlords', async () => {
    await markConversationRead('conv-1', 'landlord-1', 'landlord');
    expect(payloadFor('conversations.update')).toEqual({ landlord_unread: 0 });
  });

  it('upsertConversation creates then loads the conversation', async () => {
    queueFor('conversations', 'upsert', [{ error: null }]);
    queueFor('conversations', 'select', [{ data: conversationRow() }]);
    const conversation = await upsertConversation('tenant-1', 'tenant', 'landlord-1', 'property-1');
    expect(payloadFor('conversations.upsert')).toEqual({
      tenant_id: 'tenant-1',
      landlord_id: 'landlord-1',
      property_id: 'property-1',
    });
    expect(conversation.participantName).toBe('Landlord One');
    expect(conversation.unreadCount).toBe(0);
  });

  it('updateViewingStatus updates the status for the given id', async () => {
    await updateViewingStatus('viewing-1', 'confirmed');
    expect(payloadFor('viewing_requests.update')).toEqual({ status: 'confirmed' });
    expect(pairsFor('viewing_requests.eq')).toContainEqual(['id', 'viewing-1']);
  });

  it('insertRequest stores a normalized request row', async () => {
    resolve({ data: requestRow() });
    const created = await insertRequest('tenant-1', {
      city: 'Harare',
      province: 'Harare',
      propertyType: 'apartment',
      bedrooms: 2,
      numberOfPeople: 3,
      minBudget: 200,
      maxBudget: 500,
      moveInDate: '2027-01-01',
      furnished: true,
      amenities: ['water'],
      status: 'active',
    } as any);
    expect(payloadFor('accommodation_requests.insert')).toMatchObject({
      user_id: 'tenant-1',
      bedrooms: '2',
      furnished: 'furnished',
      additional_notes: null,
    });
    expect(created.bedrooms).toBe(2);
    expect(created.furnished).toBe('furnished');
    expect(created.userName).toBe('Tenant');
  });

  it('insertRequest rejects a malformed move-in date', async () => {
    await expect(insertRequest('tenant-1', { moveInDate: '01/2027/01' } as any))
      .rejects.toThrow(/YYYY-MM-DD/);
  });

  it('insertReport trims details and writes the row', async () => {
    await insertReport({
      reporterId: 'user-1',
      propertyId: 'property-1',
      reason: 'scam',
      details: '  fake photos  ',
    });
    expect(payloadFor('reports.insert')).toMatchObject({
      reporter_id: 'user-1',
      property_id: 'property-1',
      reported_user_id: null,
      reason: 'scam',
      details: 'fake photos',
    });
  });

  it('insertReport rejects a report with no target', async () => {
    await expect(insertReport({ reporterId: 'user-1', reason: 'scam' })).rejects.toThrow(/reason/i);
  });

  it('savePushToken updates the profile and requires a returned row', async () => {
    resolveFor('profiles', 'update', { data: { id: 'user-1' } });
    await savePushToken('user-1', 'ExponentPushToken[xxx]');
    expect(payloadFor('profiles.update')).toEqual({ push_token: 'ExponentPushToken[xxx]' });

    resolveFor('profiles', 'update', { data: null });
    await expect(savePushToken('user-1', 'token')).rejects.toThrow(/notification token/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Admin verification queue
// ─────────────────────────────────────────────────────────────────────────────

describe('admin verifications', () => {
  it('maps the is_admin flag from the profile row', async () => {
    resolveFor('profiles', 'select', {
      data: {
        id: 'user-1',
        full_name: 'Fadzai',
        phone: null,
        avatar_url: null,
        role: 'landlord',
        verified: true,
        is_admin: true,
        created_at: '2026-01-01T00:00:00Z',
      },
    });
    const profile = await fetchProfile('user-1');
    expect(profile?.isAdmin).toBe(true);
    expect(profile?.role).toBe('landlord');
  });

  it('defaults isAdmin to false when the column is absent', async () => {
    resolveFor('profiles', 'select', {
      data: {
        id: 'user-2',
        full_name: 'Tenant',
        phone: null,
        avatar_url: null,
        role: 'tenant',
        verified: false,
        is_admin: false,
        created_at: '2026-01-01T00:00:00Z',
      },
    });
    const profile = await fetchProfile('user-2');
    expect(profile?.isAdmin).toBe(false);
  });

  it('fetchVerifiableProperties flattens the landlord join', async () => {
    resolveFor('properties', 'select', {
      data: [
        {
          id: 'prop-1',
          title: 'Flat',
          city: 'Harare',
          suburb: 'Avondale',
          images: ['https://img/1.jpg'],
          verified: false,
          created_at: '2026-01-01T00:00:00Z',
          landlord: { full_name: 'Tendai', phone: '0771' },
        },
      ],
    });
    const rows = await fetchVerifiableProperties();
    expect(rows[0]).toMatchObject({
      id: 'prop-1',
      imageUrl: 'https://img/1.jpg',
      verified: false,
      landlordName: 'Tendai',
      landlordPhone: '0771',
    });
  });

  it('fetchVerifiableLandlords maps landlord profiles', async () => {
    resolveFor('profiles', 'select', {
      data: [
        {
          id: 'land-1',
          full_name: 'Tendai',
          email: 'tendai@example.com',
          phone: '0771',
          avatar_url: null,
          verified: false,
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
    });
    const rows = await fetchVerifiableLandlords();
    expect(rows[0]).toMatchObject({
      id: 'land-1',
      fullName: 'Tendai',
      email: 'tendai@example.com',
      verified: false,
    });
  });

  it('setPropertyVerified calls the admin rpc', async () => {
    await setPropertyVerified('prop-1', true);
    expect(S.rpc).toHaveBeenCalledWith('admin_set_property_verified', {
      p_property_id: 'prop-1',
      p_verified: true,
    });
  });

  it('setUserVerified surfaces rpc errors', async () => {
    S.rpc.mockResolvedValueOnce({ data: null, error: { message: 'Only ImbaFind admins can verify landlords.' } });
    await expect(setUserVerified('user-9', true)).rejects.toThrow(/admins/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Storage paths
// ─────────────────────────────────────────────────────────────────────────────

describe('storage paths', () => {
  it('uploadPropertyImage resizes, uploads and returns the public URL', async () => {
    const saveAsync = anyFn().mockResolvedValue({ uri: 'file://compressed' });
    const ctx = {
      width: 2000,
      reset: anyFn(),
      resize: anyFn(),
      renderAsync: anyFn(),
    };
    ctx.reset.mockReturnValue(ctx);
    ctx.resize.mockReturnValue(ctx);
    ctx.renderAsync
      .mockResolvedValueOnce({ width: 2000 })
      .mockResolvedValueOnce({ width: 1600, saveAsync });
    const manipulatorModule = jest.requireMock('expo-image-manipulator') as {
      ImageManipulator: { manipulate: any };
    };
    manipulatorModule.ImageManipulator.manipulate = anyFn().mockReturnValue(ctx);

    const g = globalThis as Record<string, any>;
    const originalFetch = g.fetch;
    g.fetch = anyFn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    });

    try {
      const url = await uploadPropertyImage('user-1', 'file://original.jpg');
      expect(ctx.resize).toHaveBeenCalledWith({ width: 1600 });
      expect(url).toBe('https://cdn.example.com/photo.jpg');
      expect(S.bucket.upload).toHaveBeenCalledWith(
        expect.stringMatching(/^user-1\/[0-9a-f-]+\.jpg$/),
        expect.anything(),
        { contentType: 'image/jpeg', upsert: false },
      );
    } finally {
      g.fetch = originalFetch;
    }
  });

  it('uploadPropertyImage skips resizing for small images', async () => {
    const saveAsync = anyFn().mockResolvedValue({ uri: 'file://compressed' });
    const ctx = { width: 800, reset: anyFn(), resize: anyFn(), renderAsync: anyFn() };
    ctx.renderAsync.mockResolvedValue({ width: 800, saveAsync });
    const manipulatorModule = jest.requireMock('expo-image-manipulator') as {
      ImageManipulator: { manipulate: any };
    };
    manipulatorModule.ImageManipulator.manipulate = anyFn().mockReturnValue(ctx);
    const g = globalThis as Record<string, any>;
    const originalFetch = g.fetch;
    g.fetch = anyFn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)),
    });

    try {
      await uploadPropertyImage('user-1', 'file://small.jpg');
      expect(ctx.resize).not.toHaveBeenCalled();
    } finally {
      g.fetch = originalFetch;
    }
  });

  it('deleteAccountAndPropertyImages removes photos then calls the rpc', async () => {
    await deleteAccountAndPropertyImages('user-1');
    expect(S.bucket.remove).toHaveBeenCalledWith(['user-1/photo.jpg']);
    expect(S.rpc).toHaveBeenCalledWith('delete_my_account');
  });

  it('deleteAccountAndPropertyImages surfaces storage list errors', async () => {
    S.bucket.list.mockResolvedValue({ data: null, error: dbError('bucket locked') });
    await expect(deleteAccountAndPropertyImages('user-1')).rejects.toThrow(/bucket locked/);
  });

  it('deleteAccountAndPropertyImages surfaces account deletion errors', async () => {
    S.rpc.mockResolvedValue({ error: dbError('deletion failed') });
    await expect(deleteAccountAndPropertyImages('user-1')).rejects.toThrow(/deletion failed/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Realtime subscriptions
// ─────────────────────────────────────────────────────────────────────────────

describe('subscribeToMessages', () => {
  it('maps valid realtime rows and ignores malformed ones', () => {
    const onMessage = anyFn();
    subscribeToMessages(['conv-1'], onMessage);

    S.subscribeHandler!({ new: messageRow() });
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'msg-1', text: 'Is this available?' }),
    );

    S.subscribeHandler!({ new: { id: 42 } });
    expect(onMessage).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes by removing the channel', () => {
    const unsubscribe = subscribeToMessages(['conv-1'], anyFn());
    unsubscribe();
    expect(S.removeChannel).toHaveBeenCalled();
  });

  it('returns a no-op unsubscribe when there are no conversations', () => {
    const unsubscribe = subscribeToMessages([], anyFn());
    expect(S.channel).not.toHaveBeenCalled();
    expect(() => unsubscribe()).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Offline fallback contract (mockData)
// ─────────────────────────────────────────────────────────────────────────────

describe('offline fallback when Supabase is unavailable or failing', () => {
  it('fetchProperties returns an empty page without a client (mock fallback signal)', async () => {
    S.client = null;
    const page = await fetchProperties({ city: 'Harare' });
    expect(page).toEqual({ properties: [], hasMore: false });
    // The context layer treats this signal as \u201cuse mock data\u201d; the local
    // filter must still yield usable results from MOCK_PROPERTIES.
    const fallback = filterMockProperties(MOCK_PROPERTIES, { city: 'Harare' });
    expect(fallback.map(p => p.id)).toEqual(['mock-1']);
  });

  it('fetchProperties swallows query errors instead of throwing', async () => {
    resolve({ error: dbError('connection reset') });
    const page = await fetchProperties();
    expect(page.properties).toEqual([]);
    expect(page.hasMore).toBe(false);
    expect(S.spies.warn).toHaveBeenCalledWith('[fetchProperties]', 'connection reset');
  });

  it('read-only helpers degrade to empty results without a client', async () => {
    S.client = null;
    await expect(fetchPropertyById('x')).resolves.toBeNull();
    await expect(fetchLandlordProperties('x')).resolves.toEqual([]);
    await expect(fetchMyViewings('x')).resolves.toEqual([]);
    await expect(fetchMessages('x')).resolves.toEqual({ messages: [], hasMore: false });
    await expect(saveProperty('u', 'p')).resolves.toBe(false);
    await expect(unsaveProperty('u', 'p')).resolves.toBe(false);
  });

  it('write helpers surface a clear connection error without a client', async () => {
    S.client = null;
    await expect(insertProperty('x', propertyInput())).rejects.toThrow(/Supabase connection/);
    await expect(insertViewing('tenant-1', viewingInput())).rejects.toThrow(/Supabase connection/);
    await expect(insertReport({ reporterId: 'x', propertyId: 'p', reason: 'scam' }))
      .rejects.toThrow(/Supabase connection/);
    await expect(uploadPropertyImage('x', 'file://a.jpg')).rejects.toThrow(/Supabase connection/);
  });

  it('local mock filtering honors budget, bedrooms and furnished flags together', () => {
    const results = filterMockProperties(MOCK_PROPERTIES, {
      budgetMax: 500,
      bedrooms: 2,
      furnished: 'furnished',
    });
    expect(results.map(p => p.id)).toEqual(['mock-1']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Property filter query builder
// ─────────────────────────────────────────────────────────────────────────────

describe('fetchProperties filter builder', () => {
  it('translates structured filters into supabase query calls', async () => {
    await fetchProperties({
      city: 'Harare',
      propertyType: 'apartment',
      budgetMax: 500,
      bedrooms: 2,
      availableNowOnly: true,
      furnished: 'furnished',
      selectedAmenities: ['water'],
    });
    expect(pairsFor('properties.eq')).toEqual(expect.arrayContaining([
      ['available', true],
      ['property_type', 'apartment'],
      ['availability_status', 'available_now'],
    ]));
    expect(pairsFor('properties.ilike')).toContainEqual(['city', 'Harare']);
    expect(pairsFor('properties.lte')).toContainEqual(['price', 500]);
    expect(pairsFor('properties.gte')).toEqual(expect.arrayContaining([
      ['bedrooms', 2],
    ]));
    expect(chainCalls('properties.contains').map(args => args[1]))
      .toEqual(expect.arrayContaining([['furnished'], ['water']]));
  });

  it('applies budgetMin and bathrooms as lower bounds', async () => {
    await fetchProperties({ budgetMin: 150, bathrooms: 1 });
    expect(pairsFor('properties.gte')).toEqual(expect.arrayContaining([
      ['price', 150],
      ['bathrooms', 1],
    ]));
  });

  it('ignores the \u201cany\u201d property type', async () => {
    await fetchProperties({ propertyType: 'any' });
    expect(pairsFor('properties.eq')).not.toContainEqual(['property_type', 'any']);
  });

  it('keeps or-condition search text free of injection characters', async () => {
    await fetchProperties({ search: 'avon\'dale"%x' });
    const orCall = chainCalls('properties.or')[0];
    expect(orCall).toBeDefined();
    const clause = String(orCall[0]);
    // Double quotes are stripped and the apostrophe survives as a legal
    // literal, while the injected percent sign is neutralized into whitespace
    // so it cannot act as a Postgres wildcard.
    expect(clause).not.toContain('"');
    expect(clause).toContain('avon\'dale');
    expect(clause).toMatch(/%avon'dale\s+x%/);
  });

  it('requests unfurnished via a not-contains on the amenities array', async () => {
    await fetchProperties({ furnished: 'unfurnished' });
    expect(chainCalls('properties.not')[0]).toEqual(['amenities', 'cs', '{"furnished"}']);
  });

  it('falls back to the legacy amenities list when none are selected', async () => {
    await fetchProperties({ amenities: ['solar'] });
    expect(chainCalls('properties.contains')[0]?.[1]).toEqual(['solar']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Viewing conflict protection
// ─────────────────────────────────────────────────────────────────────────────

describe('insertViewing conflict protection', () => {
  it('converts 12-hour times to SQL and inserts when no conflict exists', async () => {
    queueFor('viewing_requests', 'select', [{ data: null }]);
    queueFor('viewing_requests', 'insert', [{ data: viewingRow() }]);
    const created = await insertViewing('tenant-1', viewingInput());
    expect(created.id).toBe('viewing-1');
    expect(pairsFor('viewing_requests.eq')).toContainEqual(['viewing_time', '10:00:00']);
    expect(payloadFor('viewing_requests.insert')).toMatchObject({
      viewing_time: '10:00:00',
      attendees: 2,
      tenant_id: 'tenant-1',
    });
  });

  it('only treats pending or confirmed slots as conflicts', async () => {
    queueFor('viewing_requests', 'select', [{ data: null }]);
    queueFor('viewing_requests', 'insert', [{ data: viewingRow() }]);
    await insertViewing('tenant-1', viewingInput());
    expect(pairsFor('viewing_requests.in')).toContainEqual([
      'status',
      ['pending', 'confirmed'],
    ]);
  });

  it('rejects when a conflicting slot already exists', async () => {
    queueFor('viewing_requests', 'select', [{ data: { id: 'existing' } }]);
    await expect(insertViewing('tenant-1', viewingInput())).rejects.toThrow(/already requested/i);
    // The insert must never be attempted.
    expect(S.getters.some(([key]: [string, unknown[]]) => key === 'viewing_requests.insert')).toBe(false);
  });

  it('maps a unique-violation race to the friendly conflict error', async () => {
    queueFor('viewing_requests', 'select', [{ data: null }]);
    queueFor('viewing_requests', 'insert', [{ error: dbError('duplicate key', '23505') }]);
    await expect(insertViewing('tenant-1', viewingInput())).rejects.toThrow(/already requested/i);
  });

  it('surfaces conflict-check failures', async () => {
    queueFor('viewing_requests', 'select', [{ error: dbError('permission denied') }]);
    await expect(insertViewing('tenant-1', viewingInput())).rejects.toThrow(/permission denied/);
  });

  it('rejects invalid viewing dates and times before querying', async () => {
    await expect(insertViewing('tenant-1', { ...viewingInput(), date: '06-2027-01' }))
      .rejects.toThrow(/valid viewing date/i);
    await expect(insertViewing('tenant-1', { ...viewingInput(), time: '25:00' }))
      .rejects.toThrow(/valid viewing time/i);
    await expect(insertViewing('tenant-1', { ...viewingInput(), time: 'garbage' }))
      .rejects.toThrow(/valid viewing time/i);
    expect(S.getters).toHaveLength(0);
  });

  it('normalizes pm and midnight times for the conflict check', async () => {
    queueFor('viewing_requests', 'select', [{ data: null }]);
    queueFor('viewing_requests', 'insert', [{ data: viewingRow({ viewing_time: '13:15:00' }) }]);
    const afternoon = await insertViewing('tenant-1', { ...viewingInput(), time: '1:15 PM' });
    expect(pairsFor('viewing_requests.eq')).toContainEqual(['viewing_time', '13:15:00']);
    expect(afternoon.time).toBe('01:15 PM');

    queueFor('viewing_requests', 'select', [{ data: null }]);
    queueFor('viewing_requests', 'insert', [{ data: viewingRow({ viewing_time: '00:30:00' }) }]);
    const midnight = await insertViewing('tenant-1', { ...viewingInput(), time: '12:30 AM' });
    expect(midnight.time).toBe('12:30 AM');

    queueFor('viewing_requests', 'select', [{ data: null }]);
    queueFor('viewing_requests', 'insert', [{ data: viewingRow({ viewing_time: '12:00:00' }) }]);
    const noon = await insertViewing('tenant-1', { ...viewingInput(), time: '12:00 PM' });
    expect(noon.time).toBe('12:00 PM');
  });

  it('accepts 24-hour times', async () => {
    queueFor('viewing_requests', 'select', [{ data: null }]);
    queueFor('viewing_requests', 'insert', [{ data: viewingRow() }]);
    await insertViewing('tenant-1', { ...viewingInput(), time: '14:30' });
    expect(pairsFor('viewing_requests.eq')).toContainEqual(['viewing_time', '14:30:00']);
  });

  it('refuses past viewing slots', async () => {
    await expect(insertViewing('tenant-1', { ...viewingInput(), date: '2020-01-01' }))
      .rejects.toThrow(/in the future/i);
  });

  it('rejects unuploaded local file URIs on the property write paths', async () => {
    await expect(insertProperty('landlord-1', { ...propertyInput(), images: ['file:///cache.jpg'] }))
      .rejects.toThrow(/finish uploading/i);
    await expect(updateProperty('property-1', { images: ['content://cache.jpg'] }))
      .rejects.toThrow(/finish uploading/i);
  });
});
