import type { Dispatch, SetStateAction } from 'react';

export async function toggleSavedPropertyOptimistically(
  propertyId: string,
  currentIds: string[],
  setIds: Dispatch<SetStateAction<string[]>>,
  persist: (wasSaved: boolean) => Promise<boolean>,
): Promise<boolean> {
  const wasSaved = currentIds.includes(propertyId);
  setIds(previous => wasSaved
    ? previous.filter(id => id !== propertyId)
    : [...previous, propertyId]);

  const rollback = () => setIds(previous => wasSaved
    ? previous.includes(propertyId) ? previous : [...previous, propertyId]
    : previous.filter(id => id !== propertyId));

  try {
    const succeeded = await persist(wasSaved);
    if (!succeeded) rollback();
    return succeeded;
  } catch (error) {
    rollback();
    throw error;
  }
}
