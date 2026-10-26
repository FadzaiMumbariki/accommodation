import { describe, expect, it } from '@jest/globals';
import type { Dispatch, SetStateAction } from 'react';
import { toggleSavedPropertyOptimistically } from './savedPropertyToggle';

describe('toggleSavedPropertyOptimistically', () => {
  it('rolls back an optimistic save when persistence returns false', async () => {
    let savedIds: string[] = [];
    const setSavedIds: Dispatch<SetStateAction<string[]>> = update => {
      savedIds = typeof update === 'function' ? update(savedIds) : update;
    };

    const succeeded = await toggleSavedPropertyOptimistically(
      'p1',
      savedIds,
      setSavedIds,
      async () => false,
    );

    expect(succeeded).toBe(false);
    expect(savedIds).toEqual([]);
  });

  it('rolls back and rethrows when persistence rejects', async () => {
    let savedIds = ['p1'];
    const setSavedIds: Dispatch<SetStateAction<string[]>> = update => {
      savedIds = typeof update === 'function' ? update(savedIds) : update;
    };

    await expect(toggleSavedPropertyOptimistically(
      'p1',
      savedIds,
      setSavedIds,
      async () => { throw new Error('network failure'); },
    )).rejects.toThrow('network failure');
    expect(savedIds).toEqual(['p1']);
  });
});
