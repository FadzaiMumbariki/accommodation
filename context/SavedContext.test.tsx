import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import React, { type ReactNode } from 'react';
import { Alert } from 'react-native';

import { fetchSavedPropertyIds, saveProperty, unsaveProperty } from '../lib/database';
import { SavedProvider, useSaved } from './SavedContext';

jest.mock('../lib/database', () => ({
  fetchSavedPropertyIds: jest.fn(),
  saveProperty: jest.fn(),
  unsaveProperty: jest.fn(),
}));

jest.mock('../lib/supabase', () => ({ supabase: { mocked: true } }));

const fetchMock = fetchSavedPropertyIds as any;
const saveMock = saveProperty as any;
const unsaveMock = unsaveProperty as any;

function makeWrapper(userId: string | null) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <SavedProvider userId={userId}>{children}</SavedProvider>;
  };
}

describe('SavedContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock.mockResolvedValue([]);
    saveMock.mockResolvedValue(true);
    unsaveMock.mockResolvedValue(true);
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  it('throws when useSaved is called outside the provider', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(renderHook(() => useSaved())).rejects.toThrow(
      'useSaved must be used within SavedProvider',
    );

    consoleError.mockRestore();
  });

  it('loads saved ids for the signed-in user', async () => {
    fetchMock.mockResolvedValue(['prop-1', 'prop-2']);

    const { result } = await renderHook(() => useSaved(), {
      wrapper: makeWrapper('user-1'),
    });

    await waitFor(() => expect(result.current.savedPropertyIds).toEqual(['prop-1', 'prop-2']));
    expect(fetchMock).toHaveBeenCalledWith('user-1');
    expect(result.current.isSaved('prop-1')).toBe(true);
    expect(result.current.isSaved('prop-3')).toBe(false);
  });

  it('does not fetch when no user is signed in', async () => {
    const { result } = await renderHook(() => useSaved(), {
      wrapper: makeWrapper(null),
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.savedPropertyIds).toEqual([]);
  });

  it('keeps the local state when the server returns no saved ids', async () => {
    fetchMock.mockResolvedValue([]);

    const { result } = await renderHook(() => useSaved(), {
      wrapper: makeWrapper('user-1'),
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(result.current.savedPropertyIds).toEqual([]);
  });

  it('saves a property that was not previously saved', async () => {
    const { result } = await renderHook(() => useSaved(), {
      wrapper: makeWrapper('user-1'),
    });

    await act(async () => {
      await result.current.toggleSaved('prop-1');
    });

    expect(saveMock).toHaveBeenCalledWith('user-1', 'prop-1');
    expect(unsaveMock).not.toHaveBeenCalled();
    expect(result.current.isSaved('prop-1')).toBe(true);
  });

  it('unsaves a property that was already saved', async () => {
    fetchMock.mockResolvedValue(['prop-1']);

    const { result } = await renderHook(() => useSaved(), {
      wrapper: makeWrapper('user-1'),
    });
    await waitFor(() => expect(result.current.isSaved('prop-1')).toBe(true));

    await act(async () => {
      await result.current.toggleSaved('prop-1');
    });

    expect(unsaveMock).toHaveBeenCalledWith('user-1', 'prop-1');
    expect(result.current.isSaved('prop-1')).toBe(false);
  });

  it('rolls back and alerts when the save request reports failure', async () => {
    saveMock.mockResolvedValue(false);

    const { result } = await renderHook(() => useSaved(), {
      wrapper: makeWrapper('user-1'),
    });

    await act(async () => {
      await result.current.toggleSaved('prop-1');
    });

    expect(result.current.isSaved('prop-1')).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith(
      'Could not update saved properties',
      'Please check your connection and try again.',
    );
  });

  it('rolls back and alerts when the save request throws', async () => {
    saveMock.mockRejectedValue(new Error('network down'));
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = await renderHook(() => useSaved(), {
      wrapper: makeWrapper('user-1'),
    });

    await act(async () => {
      await result.current.toggleSaved('prop-1');
    });

    expect(result.current.isSaved('prop-1')).toBe(false);
    expect(Alert.alert).toHaveBeenCalled();

    consoleError.mockRestore();
  });
});
