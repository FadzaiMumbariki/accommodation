import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { renderHook } from '@testing-library/react-native';
import { useWindowDimensions, Dimensions, ScaledSize } from 'react-native';

import {
  DESKTOP_BREAKPOINT,
  MAX_CONTENT_WIDTH,
  TABLET_BREAKPOINT,
  useResponsive,
} from './useResponsive';

const dimensionsSpy = jest.spyOn(Dimensions, 'get');

function setWidth(width: number, height = 800) {
  const size: ScaledSize = { width, height, scale: 1, fontScale: 1 };
  dimensionsSpy.mockReturnValue(size);
}

describe('useResponsive', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('treats narrow screens as mobile with a single column', async () => {
    setWidth(TABLET_BREAKPOINT - 1);

    const { result } = await renderHook(() => useResponsive());

    expect(result.current.isMobile).toBe(true);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isDesktop).toBe(false);
    expect(result.current.numColumns).toBe(1);
  });

  it('treats mid-width screens as tablet with two columns', async () => {
    setWidth(900);

    const { result } = await renderHook(() => useResponsive());

    expect(result.current.isTablet).toBe(true);
    expect(result.current.isDesktop).toBe(false);
    expect(result.current.numColumns).toBe(2);
  });

  it('treats wide screens as desktop and laptop', async () => {
    setWidth(DESKTOP_BREAKPOINT);

    const { result } = await renderHook(() => useResponsive());

    expect(result.current.isDesktop).toBe(true);
    expect(result.current.isLaptop).toBe(true);
    expect(result.current.numColumns).toBe(2);
  });

  it('uses three columns on very wide screens', async () => {
    setWidth(1300, 900);

    const { result } = await renderHook(() => useResponsive());

    expect(result.current.numColumns).toBe(3);
    expect(result.current.maxContentWidth).toBe(MAX_CONTENT_WIDTH);
    expect(result.current.height).toBe(900);
  });
});
