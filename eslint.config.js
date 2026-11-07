// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintConfigPrettier = require('eslint-config-prettier/flat');

module.exports = defineConfig([
  expoConfig,
  // Turns off ESLint rules that would conflict with Prettier's formatting.
  eslintConfigPrettier,
  {
    ignores: ['dist/**', '.expo/**', 'coverage/**', 'supabase/functions/**'],
  },
]);
