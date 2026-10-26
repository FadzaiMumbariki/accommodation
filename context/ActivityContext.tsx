/**
 * ActivityContext — viewing requests and accommodation requests.
 */
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import type {
  ViewingRequest,
  ViewingStatus,
  AccommodationRequest,
} from '../types';
import { MOCK_VIEWINGS, MOCK_REQUESTS } from '../constants/mockData';
import { supabase } from '../lib/supabase';
import {
  fetchLandlordViewings,
  fetchMyViewings,
  fetchActiveRequests,
  fetchMyRequests,
  insertViewing,
  insertRequest,
  updateRequestStatus as updateRequestStatusRecord,
  updateViewingStatus as updateViewingStatusRecord,
} from '../lib/database';
import { getNotifications } from '../lib/notifications';

interface ActivityContextValue {
  viewings: ViewingRequest[];
  addViewing: (
    v: Omit<ViewingRequest, 'id' | 'createdAt' | 'landlordId' | 'tenantId' | 'tenantName'>,
  ) => Promise<void>;
  updateViewingStatus: (id: string, status: ViewingStatus) => Promise<void>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;

  requests: AccommodationRequest[];
  addRequest: (
    r: Omit<AccommodationRequest, 'id' | 'postedAt' | 'createdAt' | 'userId' | 'userName'>,
  ) => Promise<void>;
  updateRequestStatus: (id: string, status: 'active' | 'paused' | 'closed') => Promise<void>;

  selectedPropertyId: string | null;
  setSelectedPropertyId: (id: string | null) => void;
}

const ActivityContext = createContext<ActivityContextValue | null>(null);

export function ActivityProvider({
  children,
  userId,
  userRole,
  userName,
}: {
  children: ReactNode;
  userId?: string;
  userRole: 'tenant' | 'landlord';
  userName: string;
}) {
  const [viewings, setViewings] = useState<ViewingRequest[]>(() => supabase ? [] : MOCK_VIEWINGS);
  const [requests, setRequests] = useState<AccommodationRequest[]>(() => supabase ? [] : MOCK_REQUESTS);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => Boolean(supabase && userId));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!supabase) return;
    if (!userId) {
      setViewings([]);
      setRequests([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [viewingRecords, requestRecords] = await Promise.all([
        userRole === 'landlord'
          ? fetchLandlordViewings(userId)
          : fetchMyViewings(userId),
        userRole === 'landlord'
          ? fetchActiveRequests()
          : fetchMyRequests(userId),
      ]);
      setViewings(viewingRecords);
      setRequests(requestRecords);
    } catch (fetchError) {
      console.error('[ActivityContext] Could not load activity:', fetchError);
      setError('Could not load your activity. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [userId, userRole]);

  useEffect(() => {
    // refresh() is async; its initial loading-state update trips the
    // set-state-in-effect rule, but this fetch-on-mount pattern is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const addViewing = useCallback(async (
    v: Omit<ViewingRequest, 'id' | 'createdAt' | 'landlordId' | 'tenantId' | 'tenantName'>,
  ) => {
    if (supabase) {
      if (!userId) throw new Error('Please sign in to request a viewing.');
      const record = await insertViewing(userId, v);
      setViewings(prev => [record, ...prev]);
      return;
    }
    const newV: ViewingRequest = {
      ...v,
      id: `v-${Date.now()}`,
      tenantId: userId ?? 'me',
      tenantName: userName || 'You',
      landlordId: '',
      createdAt: new Date().toISOString(),
    };
    setViewings(prev => [newV, ...prev]);
  }, [userId, userName]);

  const updateViewingStatus = useCallback(async (id: string, status: ViewingStatus) => {
    if (supabase) await updateViewingStatusRecord(id, status);
    setViewings(prev => prev.map(v => (v.id === id ? { ...v, status } : v)));
    const notifications = getNotifications();
    void notifications?.scheduleNotificationAsync({
      content: {
        title: 'Viewing request updated',
        body: `The viewing request status is now ${status}.`,
        data: { viewingId: id },
      },
      trigger: null,
    }).catch(error => {
      console.error('[ActivityContext] Could not schedule viewing notification:', error);
    });
  }, []);

  const addRequest = useCallback(async (
    r: Omit<AccommodationRequest, 'id' | 'postedAt' | 'createdAt' | 'userId' | 'userName'>,
  ) => {
    if (supabase) {
      if (!userId) throw new Error('Please sign in to post an accommodation request.');
      const newRequest = await insertRequest(userId, r);
      setRequests(prev => [newRequest, ...prev]);
      return;
    }
    const newR: AccommodationRequest = {
      ...r,
      id: `req-${Date.now()}`,
      userId: userId ?? 'me',
      userName: userName || 'You',
      postedAt: new Date().toISOString(),
    };
    setRequests(prev => [newR, ...prev]);
  }, [userId, userName]);

  const updateRequestStatus = useCallback(async (
    id: string,
    status: 'active' | 'paused' | 'closed',
  ) => {
    if (supabase) await updateRequestStatusRecord(id, status);
    setRequests(prev => prev.map(request => request.id === id ? { ...request, status } : request));
  }, []);

  return (
    <ActivityContext.Provider
      value={{
        viewings,
        addViewing,
        updateViewingStatus,
        loading,
        error,
        refresh,
        requests,
        addRequest,
        updateRequestStatus,
        selectedPropertyId,
        setSelectedPropertyId,
      }}
    >
      {children}
    </ActivityContext.Provider>
  );
}

export function useActivity(): ActivityContextValue {
  const ctx = useContext(ActivityContext);
  if (!ctx) throw new Error('useActivity must be used within ActivityProvider');
  return ctx;
}
