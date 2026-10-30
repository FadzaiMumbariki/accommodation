import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useResponsive, MAX_CONTENT_WIDTH } from '../../hooks/useResponsive';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  maxWidth?: number;
  noPadding?: boolean;
}

/**
 * Centered responsive container that keeps website layouts clean on laptop/desktop screens
 * while providing appropriate full-width responsiveness on mobile.
 */
export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  style,
  maxWidth = MAX_CONTENT_WIDTH,
  noPadding = false,
}) => {
  const { isDesktop, isTablet } = useResponsive();

  const isWide = isDesktop || isTablet;

  return (
    <View
      style={[
        styles.outer,
        isWide && styles.outerWide,
      ]}
    >
      <View
        style={[
          styles.inner,
          {
            maxWidth,
            paddingHorizontal: noPadding ? 0 : isDesktop ? 24 : isTablet ? 20 : 16,
          },
          style,
        ]}
      >
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    width: '100%',
    alignSelf: 'center',
  },
  outerWide: {
    alignItems: 'center',
  },
  inner: {
    width: '100%',
  },
});
