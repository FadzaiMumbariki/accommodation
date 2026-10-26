import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from '@jest/globals';

/**
 * Tests for the console.error -> Sentry bridge.
 *
 * The module has a module-level `installed` guard and mutates the global
 * `console.error`, so each case loads a fresh copy via `jest.resetModules()`
 * and restores the original console afterwards.
 */

const mockCaptureException = jest.fn();
const mockCaptureMessage = jest.fn();

jest.mock('@sentry/react-native', () => ({
  captureException: mockCaptureException,
  captureMessage: mockCaptureMessage,
}));

function loadInstaller(): () => void {
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { installErrorReporting } = require('./errorReporting') as {
    installErrorReporting: () => void;
  };
  return installErrorReporting;
}

const originalConsoleError = console.error;
let consoleSpy: ReturnType<typeof jest.fn>;

beforeEach(() => {
  jest.clearAllMocks();
  consoleSpy = jest.fn();
  console.error = consoleSpy as unknown as typeof console.error;
});

afterEach(() => {
  console.error = originalConsoleError;
  delete process.env.EXPO_PUBLIC_SENTRY_ENABLED;
});

describe('installErrorReporting', () => {
  it('is a no-op when Sentry is disabled', () => {
    process.env.EXPO_PUBLIC_SENTRY_ENABLED = 'false';
    loadInstaller()();
    console.error('[Scope] ignored', new Error('nope'));

    expect(mockCaptureException).not.toHaveBeenCalled();
    expect(mockCaptureMessage).not.toHaveBeenCalled();
  });

  it('forwards caught Error objects while preserving console output', () => {
    process.env.EXPO_PUBLIC_SENTRY_ENABLED = 'true';
    loadInstaller()();
    const err = new Error('upload failed');
    console.error('[ProfileEdit] Avatar upload failed:', err);

    expect(consoleSpy).toHaveBeenCalledWith(
      '[ProfileEdit] Avatar upload failed:',
      err,
    );
    expect(mockCaptureException).toHaveBeenCalledWith(err, {
      extra: { context: ['[ProfileEdit] Avatar upload failed:'] },
    });
    expect(mockCaptureMessage).not.toHaveBeenCalled();
  });

  it('reports string-only logs via captureMessage', () => {
    process.env.EXPO_PUBLIC_SENTRY_ENABLED = 'true';
    loadInstaller()();
    console.error('[Scope] something went wrong');

    expect(mockCaptureMessage).toHaveBeenCalledWith(
      '[Scope] something went wrong',
      'error',
    );
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it('only wraps console.error once', () => {
    process.env.EXPO_PUBLIC_SENTRY_ENABLED = 'true';
    const install = loadInstaller();
    install();
    const wrapped = console.error;
    install();

    expect(console.error).toBe(wrapped);
    console.error('dup', new Error('x'));
    expect(mockCaptureException).toHaveBeenCalledTimes(1);
  });
});
