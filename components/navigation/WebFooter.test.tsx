import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { useResponsive } from '../../hooks/useResponsive';
import { WebFooter } from './WebFooter';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('../../hooks/useResponsive', () => ({ useResponsive: jest.fn() }));

const useResponsiveMock = useResponsive as unknown as jest.Mock;
const pushMock = router.push as unknown as jest.Mock;

function setViewport(overrides: { isDesktop: boolean; isTablet: boolean }) {
  useResponsiveMock.mockReturnValue({
    isDesktop: overrides.isDesktop,
    isTablet: overrides.isTablet,
    isMobile: !overrides.isDesktop && !overrides.isTablet,
  });
}

describe('WebFooter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing on mobile', async () => {
    setViewport({ isDesktop: false, isTablet: false });

    await render(<WebFooter />);

    expect(screen.toJSON()).toBeNull();
  });

  it('renders the footer content on desktop', async () => {
    setViewport({ isDesktop: true, isTablet: false });

    await render(<WebFooter />);

    expect(screen.getByText('Explore Cities')).toBeTruthy();
    expect(screen.getByText('Privacy Policy')).toBeTruthy();
  });

  it('navigates when a footer link is pressed', async () => {
    setViewport({ isDesktop: true, isTablet: false });

    await render(<WebFooter />);

    await fireEvent.press(screen.getByText('Terms of Service'));

    expect(pushMock).toHaveBeenCalledWith('/legal/terms');
  });
});
