

/**
 * PropertyContext — owns all property data and filters.
 *
 * Fetches from Supabase when credentials are present,
 * falls back to mock data when running without credentials.
 */
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import {
  deleteProperty as deletePropertyRecord,
  fetchProperties,
  insertProperty,
  updateProperty as updatePropertyRecord,
} from '../lib/database';
import type { Property, PropertyFilters } from '../types';
import { filterMockProperties } from '../lib/propertyFilters';
import { MOCK_PROPERTIES } from '../constants/mockData';

const CACHE_KEY = '@imbafind_cached_properties';
const CACHE_TIME_KEY = '@imbafind_cached_properties_time';

function isPropertyArray(value: unknown): value is Property[] {
  return Array.isArray(value) && value.every(
    (property) =>
      property !== null &&
      typeof property === 'object' &&
      typeof property.id === 'string' &&
      typeof property.title === 'string' &&
      Array.isArray(property.amenities) &&
      Array.isArray(property.images),
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }
  return String(error);
}

async function saveCachedProperties(properties: Property[], syncedAt: string): Promise<boolean> {
  try {
    await Promise.all([
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(properties)),
      AsyncStorage.setItem(CACHE_TIME_KEY, syncedAt),
    ]);
    return true;
  } catch (e) {
    console.error('[PropertyContext] Failed to cache properties:', e);
    return false;
  }
}

interface PropertyContextValue {
  properties: Property[];
  myListings: Property[];
  loading: boolean;
  isOffline: boolean;
  hasCachedProperties: boolean;
  lastSyncedAt: string | null;
  error: string | null;
  refresh: () => Promise<void>;
  hasMoreProperties: boolean;
  loadMoreProperties: () => Promise<void>;

  filters: PropertyFilters;
  setFilters: (f: PropertyFilters) => void;
  filteredProperties: Property[];

  addProperty: (p: Omit<Property, 'id' | 'postedAt' | 'landlord'>) => Promise<void>;
  updateProperty: (
    id: string,
    updates: Partial<Omit<Property, 'id' | 'postedAt' | 'landlord'>>,
  ) => Promise<void>;
  deleteProperty: (id: string) => Promise<void>;
}

const PropertyContext = createContext<PropertyContextValue | null>(null);

export function PropertyProvider({
  children,
  userId,
  userRole,
}: {
  children: ReactNode;
  userId?: string | null;
  userRole: 'tenant' | 'landlord';
}) {
  const [properties, setProperties] = useState<Property[]>(() => MOCK_PROPERTIES);
  const [loading, setLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [hasCachedProperties, setHasCachedProperties] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<PropertyFilters>({});
  const [page, setPage] = useState(0);
  const [hasMoreProperties, setHasMoreProperties] = useState(false);
  const cacheLoaded = useRef(false);
  const requestSequence = useRef(0);

  const loadPage = useCallback(async (
    requestedFilters: PropertyFilters,
    requestedPage: number,
    append: boolean,
    initialLoad = false,
  ) => {
    if (!supabase) return;
    const sequence = ++requestSequence.current;
    if (!initialLoad) {
      setLoading(true);
      setError(null);
    }
    let cachedProperties: Property[] | null = null;
    if (!cacheLoaded.current && requestedPage === 0 && Object.keys(requestedFilters).length === 0) {
      try {
        const [cached, cachedTime] = await Promise.all([
          AsyncStorage.getItem(CACHE_KEY),
          AsyncStorage.getItem(CACHE_TIME_KEY),
        ]);
        if (cached) {
          const parsed: unknown = JSON.parse(cached);
          if (isPropertyArray(parsed)) {
            cachedProperties = parsed;
            if (parsed.length > 0) {
              setProperties(parsed);
              setHasCachedProperties(true);
            }
          } else {
            console.error('[PropertyContext] Cached properties have an invalid shape.');
          }
        }
        if (cachedTime) setLastSyncedAt(cachedTime);
      } catch (e) {
        console.error('[PropertyContext] Failed to read cached properties:', e);
      } finally {
        cacheLoaded.current = true;
      }
    }

    try {
      const result = await fetchProperties(requestedFilters, requestedPage);
      if (sequence !== requestSequence.current) return;
      setProperties(previous => {
        if (!append) {
          if (result.properties.length === 0 && Object.keys(requestedFilters).length === 0 && requestedPage === 0) {
            return cachedProperties?.length ? cachedProperties : MOCK_PROPERTIES;
          }
          return result.properties;
        }
        const seen = new Set(previous.map(property => property.id));
        return [...previous, ...result.properties.filter(property => !seen.has(property.id))];
      });
      setPage(requestedPage);
      setHasMoreProperties(result.hasMore);
      setIsOffline(false);
      const now = new Date().toISOString();
      setLastSyncedAt(now);
      if (Object.keys(requestedFilters).length === 0 && requestedPage === 0 && result.properties.length > 0) {
        setHasCachedProperties(await saveCachedProperties(result.properties, now));
      }
    } catch (e) {
      if (sequence !== requestSequence.current) return;
      setIsOffline(true);
      setError(getErrorMessage(e));
      if (cachedProperties?.length) {
        setProperties(cachedProperties);
        setHasCachedProperties(true);
      } else {
        setProperties(MOCK_PROPERTIES);
      }
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // loadPage() is async; its initial loading-state update trips the
    // set-state-in-effect rule, but this fetch-on-mount pattern is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (supabase) void loadPage({}, 0, false, true);
  }, [loadPage]);

  const setFilters = useCallback((nextFilters: PropertyFilters) => {
    setFiltersState(nextFilters);
    if (supabase) {
      setProperties([]);
      setPage(0);
      setHasMoreProperties(false);
      void loadPage(nextFilters, 0, false);
    }
  }, [loadPage]);

  const refresh = useCallback(
    () => loadPage(filters, 0, false),
    [filters, loadPage],
  );

  const loadMoreProperties = useCallback(
    () => hasMoreProperties && !loading
      ? loadPage(filters, page + 1, true)
      : Promise.resolve(),
    [filters, hasMoreProperties, loadPage, loading, page],
  );

  const myListings = useMemo(() => {
    if (userRole !== 'landlord' || !userId) return [];
    return properties.filter(p => p.landlordId === userId || p.landlord?.id === userId);
  }, [properties, userRole, userId]);

  const filteredProperties = useMemo(() => {
    if (supabase && !isOffline && properties !== MOCK_PROPERTIES) return properties;
    return filterMockProperties(properties, filters);
  }, [properties, filters, isOffline]);

  const addProperty = useCallback(async (p: Omit<Property, 'id' | 'postedAt' | 'landlord'>) => {
    if (supabase) {
      if (!userId) throw new Error('Please sign in to publish a property.');
      const newProp = await insertProperty(userId, p);
      setProperties(prev => {
        const next = [newProp, ...prev];
        void saveCachedProperties(next, new Date().toISOString()).then(setHasCachedProperties);
        return next;
      });
      return;
    }

    const newProp: Property = {
      ...p,
      id: `prop-${Date.now()}`,
      postedAt: new Date().toISOString(),
      landlord: {
        id: userId ?? 'local',
        name: 'You',
        phone: '',
        verified: false,
        responseTime: 'Within 1 hour',
        rating: 5,
        totalListings: 1,
      },
    };
    setProperties(prev => {
      const next = [newProp, ...prev];
      void saveCachedProperties(next, new Date().toISOString())
        .then(setHasCachedProperties);
      return next;
    });
  }, [userId]);

  const updateProperty = useCallback(async (
    id: string,
    updates: Partial<Omit<Property, 'id' | 'postedAt' | 'landlord'>>,
  ) => {
    if (supabase) {
      const updated = await updatePropertyRecord(id, updates);
      setProperties(prev => {
        const next = prev.map(property => property.id === id ? updated : property);
        void saveCachedProperties(next, new Date().toISOString()).then(setHasCachedProperties);
        return next;
      });
      return;
    }
    setProperties(prev => {
      const next = prev.map(property =>
        property.id === id ? { ...property, ...updates } : property,
      );
      void saveCachedProperties(next, new Date().toISOString()).then(setHasCachedProperties);
      return next;
    });
  }, []);

  const deleteProperty = useCallback(async (id: string) => {
    if (supabase) await deletePropertyRecord(id);
    setProperties(prev => {
      const next = prev.filter(property => property.id !== id);
      void saveCachedProperties(next, new Date().toISOString()).then(setHasCachedProperties);
      return next;
    });
  }, []);

  return (
    <PropertyContext.Provider
      value={{
        properties,
        myListings,
        loading,
        isOffline,
        hasCachedProperties,
        lastSyncedAt,
        error,
        refresh,
        hasMoreProperties,
        loadMoreProperties,
        filters,
        setFilters,
        filteredProperties,
        addProperty,
        updateProperty,
        deleteProperty,
      }}
    >
      {children}
    </PropertyContext.Provider>
  );
}

export function useProperties(): PropertyContextValue {
  const ctx = useContext(PropertyContext);
  if (!ctx) throw new Error('useProperties must be used within PropertyProvider');
  return ctx;
}
