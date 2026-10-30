import { useWindowDimensions, Platform } from 'react-native';

export interface ResponsiveInfo {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLaptop: boolean;
  isWeb: boolean;
  numColumns: number;
  maxContentWidth: number;
}

export const DESKTOP_BREAKPOINT = 1024;
export const TABLET_BREAKPOINT = 768;
export const MAX_CONTENT_WIDTH = 1240;

/**
 * Hook providing responsive layout breakpoints and grid calculations
 * to adapt mobile views to first-class desktop/laptop website layouts.
 */
export function useResponsive(): ResponsiveInfo {
  const { width, height } = useWindowDimensions();

  const isMobile = width < TABLET_BREAKPOINT;
  const isTablet = width >= TABLET_BREAKPOINT && width < DESKTOP_BREAKPOINT;
  const isDesktop = width >= DESKTOP_BREAKPOINT;
  const isLaptop = isDesktop;
  const isWeb = Platform.OS === 'web';

  const numColumns = width >= 1280 ? 3 : width >= TABLET_BREAKPOINT ? 2 : 1;

  return {
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
    isLaptop,
    isWeb,
    numColumns,
    maxContentWidth: MAX_CONTENT_WIDTH,
  };
}
