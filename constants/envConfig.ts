import Constants from 'expo-constants';

/**
 * Centralized environment configuration with runtime validation.
 * Loads values from process.env (build time) or Constants.expoConfig.extra (runtime).
 * Provides type-safe access to all environment variables with clear error messages.
 */

// Helper to get value from both sources
function getEnvValue(key: string, fallback = ''): string {
  return Constants.expoConfig?.extra?.[key] ?? process.env[`EXPO_PUBLIC_${key}`] ?? fallback;
}

// Helper to get boolean value
function getEnvBoolean(key: string, fallback = false): boolean {
  const value = getEnvValue(key);
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

// ============================================================================
// SUPABASE CONFIGURATION
// ============================================================================

export const SUPABASE_URL = getEnvValue(
  'SUPABASE_URL',
  Constants.expoConfig?.extra?.supabaseUrl ?? '',
);
export const SUPABASE_ANON_KEY = getEnvValue(
  'SUPABASE_ANON_KEY',
  Constants.expoConfig?.extra?.supabaseAnonKey ?? '',
);

/**
 * Validates Supabase configuration at runtime.
 * Call this during app initialization to fail fast if config is missing.
 */
export function validateSupabaseConfig(): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!SUPABASE_URL || SUPABASE_URL.includes('your-project')) {
    errors.push(
      'EXPO_PUBLIC_SUPABASE_URL is missing or invalid. Set it in .env.local or app.json extra config.',
    );
  }

  if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes('your-anon-key')) {
    errors.push(
      'EXPO_PUBLIC_SUPABASE_ANON_KEY is missing or invalid. Set it in .env.local or app.json extra config.',
    );
  }

  if (SUPABASE_URL && !SUPABASE_URL.startsWith('https://')) {
    errors.push('EXPO_PUBLIC_SUPABASE_URL must start with https://');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// SENTRY CONFIGURATION
// ============================================================================

export const SENTRY_ENABLED = getEnvBoolean('SENTRY_ENABLED', false);
export const SENTRY_DSN = getEnvValue('SENTRY_DSN');

/**
 * Validates Sentry configuration.
 * Only validates if Sentry is enabled.
 */
export function validateSentryConfig(): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (SENTRY_ENABLED && !SENTRY_DSN) {
    errors.push('EXPO_PUBLIC_SENTRY_DSN is required when EXPO_PUBLIC_SENTRY_ENABLED is true.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// GOOGLE MAPS CONFIGURATION
// ============================================================================

export const GOOGLE_MAPS_API_KEY = getEnvValue(
  'GOOGLE_MAPS_API_KEY',
  Constants.expoConfig?.extra?.googleMapsApiKey ?? '',
);

// ============================================================================
// EAS CONFIGURATION
// ============================================================================

export const EAS_PROJECT_ID = getEnvValue(
  'EAS_PROJECT_ID',
  Constants.expoConfig?.extra?.eas?.projectId ?? '',
);

// ============================================================================
// SUPPORT CONTACT CONFIGURATION
// ============================================================================

export const SUPPORT_PHONE = getEnvValue('SUPPORT_PHONE');
export const SUPPORT_WHATSAPP = getEnvValue('SUPPORT_WHATSAPP');
export const SUPPORT_EMAIL = getEnvValue('SUPPORT_EMAIL');
export const SUPPORT_HOURS = getEnvValue('SUPPORT_HOURS', '8am - 6pm CAT');

export const SUPPORT_CONTACT = {
  phone: SUPPORT_PHONE,
  whatsapp: SUPPORT_WHATSAPP,
  email: SUPPORT_EMAIL,
  businessHours: SUPPORT_HOURS,
  hasPhone: SUPPORT_PHONE.length > 0,
  hasWhatsapp: SUPPORT_WHATSAPP.length > 0,
  hasEmail: SUPPORT_EMAIL.length > 0,
} as const;

// ============================================================================
// RUNTIME VALIDATION
// ============================================================================

/**
 * Validates all critical environment configuration.
 * Call this at app startup to fail fast if configuration is missing or invalid.
 *
 * @returns Object with validation results and any error messages
 */
export function validateEnvConfig(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Critical: Supabase must be configured
  const supabaseValidation = validateSupabaseConfig();
  errors.push(...supabaseValidation.errors);

  // Optional: Sentry validation (only if enabled)
  const sentryValidation = validateSentryConfig();
  if (SENTRY_ENABLED) {
    errors.push(...sentryValidation.errors);
  }

  // Warnings for optional features
  if (!GOOGLE_MAPS_API_KEY) {
    warnings.push(
      'EXPO_PUBLIC_GOOGLE_MAPS_API_KEY not set. Map features may have limited functionality.',
    );
  }

  if (!EAS_PROJECT_ID) {
    warnings.push('EXPO_PUBLIC_EAS_PROJECT_ID not set. Push notifications may not work correctly.');
  }

  if (!SUPPORT_CONTACT.hasPhone && !SUPPORT_CONTACT.hasWhatsapp && !SUPPORT_CONTACT.hasEmail) {
    warnings.push(
      'No support contact methods configured. Users will not see contact options in the Help screen.',
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// DEVELOPMENT HELPERS
// ============================================================================

/**
 * Logs environment configuration status to console.
 * Only runs in development mode.
 */
export function logEnvConfig(): void {
  if (__DEV__) {
    const validation = validateEnvConfig();

    console.log('=== Environment Configuration ===');
    console.log(`Supabase URL: ${SUPABASE_URL ? '✓ Set' : '✗ Missing'}`);
    console.log(`Supabase Key: ${SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing'}`);
    console.log(`Sentry: ${SENTRY_ENABLED ? '✓ Enabled' : '✗ Disabled'}`);
    console.log(`Google Maps: ${GOOGLE_MAPS_API_KEY ? '✓ Set' : '✗ Missing'}`);
    console.log(`EAS Project ID: ${EAS_PROJECT_ID ? '✓ Set' : '✗ Missing'}`);
    console.log(
      `Support Contacts: ${SUPPORT_CONTACT.hasPhone || SUPPORT_CONTACT.hasWhatsapp || SUPPORT_CONTACT.hasEmail ? '✓ Configured' : '✗ None'}`,
    );

    if (validation.errors.length > 0) {
      console.error('\n❌ Configuration Errors:');
      validation.errors.forEach((error) => console.error(`  • ${error}`));
    }

    if (validation.warnings.length > 0) {
      console.warn('\n⚠️  Configuration Warnings:');
      validation.warnings.forEach((warning) => console.warn(`  • ${warning}`));
    }

    if (validation.isValid && validation.warnings.length === 0) {
      console.log('\n✓ All configuration valid');
    }

    console.log('================================\n');
  }
}

// Auto-validate in development
if (__DEV__) {
  const validation = validateEnvConfig();
  if (!validation.isValid) {
    console.error(
      '❌ Environment configuration validation failed. See errors above.',
      '\nThe app may not function correctly.',
    );
  }
}
