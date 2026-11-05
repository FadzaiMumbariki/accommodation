import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import React, { type ReactNode } from 'react';

import { MOCK_PROPERTIES } from '../constants/mockData';
import {
  deleteProperty as deletePropertyRecord,
  fetchProperties,
  insertProperty,
  updateProperty as updatePropertyRecord,
} from '../lib/database';
import type { Property } from '../types';
import { PropertyProvider, useProperties } from './PropertyContext';

jest.mock('../lib/supabase', () => ({
  get supabase() {
    const state = (globalThis as Record<string, unknown>).__propertyMock as
      { client: unknown } | undefined;
    return state?.client ?? null;
  },
}));

jest.mock('../lib/database', () => ({
  deleteProperty: jest.fn(),
  fetchProperties: jest.fn(),
  insertProperty: jest.fn(),
  updateProperty: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

jest.mock('../constants/mockData', () => ({
  MOCK_PROPERTIES: [
    {
      id: 'mock-1',
      title: 'Mock One',
      propertyType: 'apartment',
      price: 100,
      city: 'Harare',
      suburb: 'Avondale',
      province: 'Harare',
      bedrooms: 2,
      bathrooms: 1,
      maxOccupants: 3,
      images: [],
      amenities: [],
      description: 'Mock one',
      available: true,
      availabilityStatus: 'available_now',
      verified: false,
      reviewsCount: 0,
      postedAt: '2026-01-01T00:00:00Z',
      landlordId: 'user-1',
    },
    {
      id: 'mock-2',
      title: 'Mock Two',
      propertyType: 'house',
      price: 200,
      city: 'Bulawayo',
      suburb: 'Hillside',
      province: 'Bulawayo',
      bedrooms: 3,
      bathrooms: 2,
      maxOccupants: 5,
      images: [],
      amenities: [],
      description: 'Mock two',
      available: true,
      availabilityStatus: 'available_now',
      verified: false,
      reviewsCount: 0,
      postedAt: '2026-01-02T00:00:00Z',
      landlordId: 'other',
    },
  ],
}));

const fetchPropertiesMock = fetchProperties as any;
const insertPropertyMock = insertProperty as any;
const updatePropertyRecordMock = updatePropertyRecord as any;
const deletePropertyRecordMock = deletePropertyRecord as any;

const mockState: { client: unknown } = { client: null };
(globalThis as Record<string, unknown>).__propertyMock = mockState;

const liveProperty: Property = {
  id: 'live-1',
  title: 'Live listing',
  propertyType: 'apartment',
  price: 400,
  city: 'Harare',
  suburb: 'Borrowdale',
  province: 'Harare',
  bedrooms: 3,
  bathrooms: 2,
  maxOccupants: 4,
  images: [],
  amenities: [],
  description: 'Live listing',
  available: true,
  availabilityStatus: 'available_now',
  verified: false,
  reviewsCount: 0,
  postedAt: '2026-02-01T00:00:00Z',
  landlordId: 'user-1',
  landlord: {
    id: 'user-1',
    name: 'Test Landlord',
    phone: '+263771234567',
    verified: false,
    responseTime: 'within an hour',
  },
};

const newListingData: Omit<Property, 'id' | 'postedAt' | 'landlord'> = {
  title: 'Live listing',
  propertyType: 'apartment',
  price: 400,
  city: 'Harare',
  suburb: 'Borrowdale',
  province: 'Harare',
  bedrooms: 3,
  bathrooms: 2,
  maxOccupants: 4,
  images: [],
  amenities: [],
  description: 'Live listing',
  available: true,
  availabilityStatus: 'available_now',
  verified: false,
  reviewsCount: 0,
  landlordId: 'user-1',
};

function makeWrapper(userId: string | null, userRole: 'tenant' | 'landlord' = 'tenant') {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <PropertyProvider userId={userId} userRole={userRole}>
        {children}
      </PropertyProvider>
    );
  };
}

describe('PropertyContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState.client = null;
    fetchPropertiesMock.mockResolvedValue({ properties: [], hasMore: false });
    insertPropertyMock.mockResolvedValue(liveProperty);
    updatePropertyRecordMock.mockResolvedValue(liveProperty);
    deletePropertyRecordMock.mockResolvedValue(undefined);
  });

  it('throws when useProperties is called outside the provider', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(renderHook(() => useProperties())).rejects.toThrow(
      'useProperties must be used within PropertyProvider',
    );

    consoleError.mockRestore();
  });

  it('seeds mock listings in demo mode without fetching', async () => {
    const { result } = await renderHook(() => useProperties(), {
      wrapper: makeWrapper(null),
    });

    expect(fetchPropertiesMock).not.toHaveBeenCalled();
    expect(result.current.properties).toEqual(MOCK_PROPERTIES);
    expect(result.current.filteredProperties).toHaveLength(2);
    expect(result.current.isOffline).toBe(false);
  });

  it('adds, updates and deletes listings locally in demo mode', async () => {
    const { result } = await renderHook(() => useProperties(), {
      wrapper: makeWrapper(null),
    });

    await act(async () => {
      await result.current.addProperty(newListingData);
    });
    expect(result.current.properties[0].title).toBe('Live listing');

    await act(async () => {
      await result.current.updateProperty('mock-1', { price: 999 });
    });
    expect(result.current.properties.find((p) => p.id === 'mock-1')?.price).toBe(999);

    await act(async () => {
      await result.current.deleteProperty('mock-1');
    });
    expect(result.current.properties.find((p) => p.id === 'mock-1')).toBeUndefined();
  });

  it('exposes my listings only for signed-in landlords', async () => {
    const tenant = await renderHook(() => useProperties(), {
      wrapper: makeWrapper('user-1', 'tenant'),
    });
    expect(tenant.result.current.myListings).toEqual([]);

    const landlord = await renderHook(() => useProperties(), {
      wrapper: makeWrapper('user-1', 'landlord'),
    });
    expect(landlord.result.current.myListings.map((p) => p.id)).toEqual(['mock-1']);
  });

  it('loads live listings and exposes the sync metadata', async () => {
    mockState.client = { auth: {} };
    fetchPropertiesMock.mockResolvedValue({ properties: [liveProperty], hasMore: true });

    const { result } = await renderHook(() => useProperties(), {
      wrapper: makeWrapper(null),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetchPropertiesMock).toHaveBeenCalledWith({}, 0);
    expect(result.current.properties).toEqual([liveProperty]);
    expect(result.current.hasMoreProperties).toBe(true);
    expect(result.current.isOffline).toBe(false);
    expect(result.current.lastSyncedAt).not.toBeNull();
  });

  it('paginates with loadMoreProperties', async () => {
    mockState.client = { auth: {} };
    fetchPropertiesMock
      .mockResolvedValueOnce({ properties: [liveProperty], hasMore: true })
      .mockResolvedValueOnce({
        properties: [{ ...liveProperty, id: 'live-2', title: 'Second page' }],
        hasMore: false,
      });

    const { result } = await renderHook(() => useProperties(), {
      wrapper: makeWrapper(null),
    });
    await waitFor(() => expect(result.current.hasMoreProperties).toBe(true));

    await act(async () => {
      await result.current.loadMoreProperties();
    });

    expect(fetchPropertiesMock).toHaveBeenLastCalledWith({}, 1);
    expect(result.current.properties.map((p) => p.id)).toEqual(['live-1', 'live-2']);
    expect(result.current.hasMoreProperties).toBe(false);
  });

  it('refetches when the filters change for a live dataset', async () => {
    mockState.client = { auth: {} };
    fetchPropertiesMock.mockResolvedValue({ properties: [liveProperty], hasMore: false });

    const { result } = await renderHook(() => useProperties(), {
      wrapper: makeWrapper(null),
    });
    await waitFor(() => expect(result.current.properties).toEqual([liveProperty]));

    await act(async () => {
      result.current.setFilters({ city: 'Bulawayo' });
    });

    await waitFor(() =>
      expect(fetchPropertiesMock).toHaveBeenLastCalledWith({ city: 'Bulawayo' }, 0),
    );
    expect(result.current.filters).toEqual({ city: 'Bulawayo' });
  });

  it('falls back to mock listings and flags offline when the fetch fails', async () => {
    mockState.client = { auth: {} };
    fetchPropertiesMock.mockRejectedValue(new Error('network down'));

    const { result } = await renderHook(() => useProperties(), {
      wrapper: makeWrapper(null),
    });

    await waitFor(() => expect(result.current.isOffline).toBe(true));
    expect(result.current.error).toBe('network down');
    expect(result.current.properties).toEqual(MOCK_PROPERTIES);
  });

  it('inserts a live listing for a signed-in landlord', async () => {
    mockState.client = { auth: {} };
    fetchPropertiesMock.mockResolvedValue({ properties: [], hasMore: false });

    const { result } = await renderHook(() => useProperties(), {
      wrapper: makeWrapper('user-1', 'landlord'),
    });
    await waitFor(() => expect(fetchPropertiesMock).toHaveBeenCalled());

    await act(async () => {
      await result.current.addProperty(newListingData);
    });

    expect(insertPropertyMock).toHaveBeenCalledWith('user-1', expect.any(Object));
    expect(result.current.properties[0].id).toBe('live-1');
  });

  it('rejects publishing without a signed-in user', async () => {
    mockState.client = { auth: {} };
    fetchPropertiesMock.mockResolvedValue({ properties: [], hasMore: false });

    const { result } = await renderHook(() => useProperties(), {
      wrapper: makeWrapper(null),
    });
    await waitFor(() => expect(fetchPropertiesMock).toHaveBeenCalled());

    await expect(result.current.addProperty(newListingData)).rejects.toThrow(
      'Please sign in to publish a property.',
    );
  });

  it('updates and deletes a live listing through the data layer', async () => {
    mockState.client = { auth: {} };
    fetchPropertiesMock.mockResolvedValue({ properties: [liveProperty], hasMore: false });

    const { result } = await renderHook(() => useProperties(), {
      wrapper: makeWrapper(null),
    });
    await waitFor(() => expect(result.current.properties).toEqual([liveProperty]));

    await act(async () => {
      await result.current.updateProperty('live-1', { price: 777 });
    });
    expect(updatePropertyRecordMock).toHaveBeenCalledWith('live-1', { price: 777 });

    await act(async () => {
      await result.current.deleteProperty('live-1');
    });
    expect(deletePropertyRecordMock).toHaveBeenCalledWith('live-1');
    expect(result.current.properties).toEqual([]);
  });

  it('refresh reloads the first page', async () => {
    mockState.client = { auth: {} };
    fetchPropertiesMock.mockResolvedValue({ properties: [liveProperty], hasMore: false });

    const { result } = await renderHook(() => useProperties(), {
      wrapper: makeWrapper(null),
    });
    await waitFor(() => expect(fetchPropertiesMock).toHaveBeenCalledTimes(1));

    await act(async () => {
      await result.current.refresh();
    });

    expect(fetchPropertiesMock).toHaveBeenCalledTimes(2);
  });
});
