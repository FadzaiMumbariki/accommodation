import { describe, expect, it } from '@jest/globals';
import { Routes, RouteHelpers } from './routes';

describe('Routes constants', () => {
  it('defines standard routes correctly', () => {
    expect(Routes.explore).toBe('/(tabs)/explore');
    expect(Routes.chat).toBe('/chat');
    expect(Routes.propertyDetails).toBe('/property-details');
    expect(Routes.login).toBe('/login');
    expect(Routes.signup).toBe('/signup');
  });

  it('builds parameterized routes with RouteHelpers', () => {
    expect(RouteHelpers.propertyDetails('prop-123')).toBe('/property-details?id=prop-123');
    expect(RouteHelpers.bookViewing('prop-456')).toBe('/book-viewing?id=prop-456');
    expect(RouteHelpers.loginWithReturnTo('/property-details?id=1')).toBe(
      '/login?returnTo=%2Fproperty-details%3Fid%3D1',
    );
  });
});
