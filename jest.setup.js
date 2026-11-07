/* global jest */
/**
 * Shared Jest setup (runs after jest-expo's own setup).
 *
 * `@expo/vector-icons` loads its icon font on mount. Inside the Jest
 * environment the bundled font asset is not registered, so `expo-font` throws
 * `Module "1" is missing from the asset registry` and every component that
 * renders an icon fails. Reporting the fonts as already loaded keeps those
 * components renderable without touching the asset registry.
 */
jest.mock('expo-font', () => {
  const actual = jest.requireActual('expo-font');

  return {
    ...actual,
    isLoaded: () => true,
    loadAsync: jest.fn(async () => {}),
  };
});
