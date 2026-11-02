import { beforeAll, describe, it } from '@jest/globals';
import { by, device, element, expect as detoxExpect } from 'detox';

/**
 * First Detox smoke test: the app launches cold and reaches the sign-in screen.
 *
 * Detox only runs against a native build (see `.detoxrc.js`), so this suite is
 * not part of `npm test` — run it with `npm run e2e:test` after `npm run e2e:build`.
 */
describe('App launch', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('boots to the sign-in screen', async () => {
    await detoxExpect(element(by.text('Welcome back'))).toBeVisible();
    await detoxExpect(element(by.text('Sign In to ImbaFind'))).toBeVisible();
  });

  it('shows an error message when signing in with empty credentials', async () => {
    await element(by.text('Sign In to ImbaFind')).tap();
    await detoxExpect(
      element(by.text('Please enter both your email address and password.')),
    ).toBeVisible();
  });
});
