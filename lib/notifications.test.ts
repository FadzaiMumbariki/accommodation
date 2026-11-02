import { afterEach, describe, expect, it, jest } from '@jest/globals';

// `lib/notifications.ts` reads `Constants.executionEnvironment` at module load
// and lazily requires `expo-notifications`, so each case loads a fresh copy of
// the module under a different mock environment.

type LoadedNotifications = typeof import('./notifications');

async function loadWith(
  options: { environment: 'storeClient' | 'bare'; platform?: string; notifications?: 'ok' | 'missing' },
): Promise<{ mod: LoadedNotifications; getNotifications: () => unknown }> {
  let mod!: LoadedNotifications;
  await jest.isolateModulesAsync(async () => {
    jest.resetModules();
    jest.unmock('expo-constants');
    jest.unmock('react-native');
    jest.unmock('expo-notifications');
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: { executionEnvironment: options.environment },
      ExecutionEnvironment: { StoreClient: 'storeClient', Bare: 'bare' },
    }));
    jest.doMock('react-native', () => ({ Platform: { OS: options.platform ?? 'ios' } }));
    if (options.notifications === 'missing') {
      jest.doMock('expo-notifications', () => {
        throw new Error('expo-notifications is unavailable');
      });
    } else {
      jest.doMock('expo-notifications', () => ({ __esModule: true, default: { marker: true } }));
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('./notifications') as LoadedNotifications;
  });
  return { mod, getNotifications: mod.getNotifications as () => unknown };
}

describe('notifications availability', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reports Expo Go and never loads the notifications module there', async () => {
    const { mod, getNotifications } = await loadWith({ environment: 'storeClient' });
    expect(mod.isExpoGo).toBe(true);
    expect(getNotifications()).toBeNull();
  });

  it('returns null on web', async () => {
    const { mod, getNotifications } = await loadWith({ environment: 'bare', platform: 'web' });
    expect(mod.isExpoGo).toBe(false);
    expect(getNotifications()).toBeNull();
  });

  it('returns the module when running natively outside Expo Go', async () => {
    const { mod, getNotifications } = await loadWith({ environment: 'bare', platform: 'ios' });
    expect(getNotifications()).not.toBeNull();
  });

  it('returns null and warns when expo-notifications cannot be resolved', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { getNotifications } = await loadWith({ environment: 'bare', notifications: 'missing' });
    expect(getNotifications()).toBeNull();
    expect(warn).toHaveBeenCalled();
  });
});
