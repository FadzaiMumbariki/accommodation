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

  let hasGoogleServices = false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    hasGoogleServices = require('fs').existsSync('./google-services.json');
  } catch {}

  const androidConfig = {
    ...config.android,
    ...(hasGoogleServices ? { googleServicesFile: './google-services.json' } : {}),
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
              projectId:
                process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? config.extra?.eas?.projectId,
            },
          }
        : {}),
      ...(process.env.EXPO_PUBLIC_SUPABASE_URL
        ? { supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL }
        : {}),
      ...(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
        ? { supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY }
        : {}),
      sentryDsn: sentryDsn ?? '',
      sentryEnabled,
    },
    plugins,
  };
};
