import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const sentryEnabled = process.env.EXPO_PUBLIC_SENTRY_ENABLED === 'true';
  const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  const mapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  const plugins: NonNullable<ExpoConfig['plugins']> = [...(config.plugins ?? [])];

  if (sentryEnabled) {
    const organization = process.env.SENTRY_ORG;
    const project = process.env.SENTRY_PROJECT;
    if (!sentryDsn || !organization || !project) {
      throw new Error(
        'Sentry is enabled, but EXPO_PUBLIC_SENTRY_DSN, SENTRY_ORG, and SENTRY_PROJECT must all be set.',
      );
    }
    plugins.push([
      '@sentry/react-native/expo',
      {
        url: 'https://sentry.io/',
        organization,
        project,
        note: 'Use SENTRY_AUTH_TOKEN env to authenticate with Sentry.',
      },
    ]);
  }

  if (mapsApiKey) {
    plugins.push([
      'react-native-maps',
      {
        androidGoogleMapsApiKey: mapsApiKey,
        iosGoogleMapsApiKey: mapsApiKey,
      },
    ]);
  }

  // Detox adds native test hooks, instrumentation and ProGuard keeps to the
  // generated projects. Only include it for the E2E prebuild (`detox build`
  // sets DETOX_ENABLED=true) so release builds stay free of test-only config.
  if (process.env.DETOX_ENABLED === 'true') {
    plugins.push('expo-detox-config-plugin');
  }

  // `google-services.json` is never committed, so cloud builds receive it through an EAS
  // "file" environment variable, whose value is the path to the file on the build runner.
  // Locally we fall back to the gitignored file if it is present.
  const googleServicesFile =
    process.env.GOOGLE_SERVICES_JSON ??
    (() => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return require('fs').existsSync('./google-services.json')
          ? './google-services.json'
          : undefined;
      } catch {
        return undefined;
      }
    })();

  const androidConfig = {
    ...config.android,
    ...(mapsApiKey
      ? {
          config: {
            ...config.android?.config,
            googleMaps: {
              apiKey: mapsApiKey,
            },
          },
        }
      : {}),
    ...(googleServicesFile ? { googleServicesFile } : {}),
  };

  return {
    ...config,
    name: config.name ?? 'ImbaFind',
    slug: config.slug ?? 'imbafind',
    android: androidConfig,
    extra: {
      ...config.extra,
      ...(process.env.EXPO_PUBLIC_EAS_PROJECT_ID || config.extra?.eas?.projectId
        ? {
            eas: {
              projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? config.extra?.eas?.projectId,
            },
          }
        : {}),
      ...(process.env.EXPO_PUBLIC_SUPABASE_URL
        ? { supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL }
        : {}),
      ...(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
        ? { supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY }
        : {}),
      googleMapsApiKey: mapsApiKey ?? '',
      sentryDsn: sentryDsn ?? '',
      sentryEnabled,
    },
    plugins,
  };
};
