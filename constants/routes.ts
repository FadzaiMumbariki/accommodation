/**
 * Route constants for type-safe navigation with expo-router.
 * Prevents typos in path strings across the app.
 */
export const Routes = {
  // Tabs
  home: '/(tabs)' as const,
  explore: '/(tabs)/explore' as const,
  saved: '/(tabs)/saved' as const,
  messages: '/(tabs)/messages' as const,
  profile: '/(tabs)/profile' as const,

  // Screens
  propertyDetails: '/property-details' as const,
  bookViewing: '/book-viewing' as const,
  chat: '/chat' as const,
  aiChat: '/ai-chat' as const,
  addProperty: '/add-property' as const,
  postRequest: '/post-request' as const,
  myActivity: '/my-activity' as const,
  landlordDashboard: '/landlord-dashboard' as const,
  adminVerifications: '/admin-verifications' as const,
  locationSelector: '/location-selector' as const,
  notifications: '/notifications' as const,
  profileEdit: '/profile-edit' as const,
  settings: '/settings' as const,
  about: '/about' as const,
  faq: '/faq' as const,
  help: '/help' as const,
  onboarding: '/onboarding' as const,

  // Auth
  login: '/login' as const,
  signup: '/auth/signup' as const,
  chooseAccount: '/choose-account' as const,
  resetPassword: '/reset-password' as const,
  accountCreated: '/account-created' as const,

  // Legal
  terms: '/legal/terms' as const,
  privacy: '/legal/privacy' as const,
} as const;

export type AppRoute = (typeof Routes)[keyof typeof Routes];

/**
 * Helper to build parameterized route paths.
 */
export const RouteHelpers = {
  propertyDetails: (id: string) =>
    `${Routes.propertyDetails}?id=${encodeURIComponent(id)}` as const,
  bookViewing: (id: string) => `${Routes.bookViewing}?id=${encodeURIComponent(id)}` as const,
  loginWithReturnTo: (returnTo: string) =>
    `${Routes.login}?returnTo=${encodeURIComponent(returnTo)}` as const,
};
