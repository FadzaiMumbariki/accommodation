import * as Sentry from '@sentry/react-native';

/**
 * Forwards caught errors that are reported via `console.error` to Sentry.
 *
 * The app has ~90 `console.error('[Scope] message', error)` calls inside
 * try/catch blocks. Sentry's global handlers only see *uncaught* errors, so
 * without this those swallowed failures would never surface in production.
 *
 * Wrapping `console.error` once at startup covers every existing and future
 * call site without rewriting them, while preserving the original console
 * output for local development. It is a no-op unless Sentry is enabled.
 */
let installed = false;

export function installErrorReporting(): void {
  if (installed) return;
  if (process.env.EXPO_PUBLIC_SENTRY_ENABLED !== 'true') return;
  installed = true;

  const originalConsoleError = console.error.bind(console);

  console.error = (...args: unknown[]): void => {
    // Always keep the local console output.
    originalConsoleError(...args);

    try {
      const errorArg = args.find((arg): arg is Error => arg instanceof Error);
      if (errorArg) {
        const context = args.filter((arg) => typeof arg === 'string');
        Sentry.captureException(errorArg, { extra: { context } });
      } else {
        const message = args
          .map((arg) => (typeof arg === 'string' ? arg : ''))
          .join(' ')
          .trim();
        Sentry.captureMessage(message || 'console.error', 'error');
      }
    } catch {
      // Error reporting must never itself crash the app.
    }
  };
}
