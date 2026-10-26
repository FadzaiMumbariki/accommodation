const { getDefaultConfig } = require('expo/metro-config');
const sentryEnabled = process.env.EXPO_PUBLIC_SENTRY_ENABLED === 'true';

/** @type {import('expo/metro-config').MetroConfig} */
const config = sentryEnabled
  ? require('@sentry/react-native/metro').getSentryExpoConfig(__dirname)
  : getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  buffer: require.resolve('buffer'),
};

module.exports = config;
