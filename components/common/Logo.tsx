import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../../theme/colors';

interface LogoProps {
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  showText?: boolean;
  showTagline?: boolean;
  layout?: 'horizontal' | 'vertical';
  variant?: 'light' | 'dark';
}

export const Logo: React.FC<LogoProps> = ({
  size = 'medium',
  showText = true,
  showTagline = false,
  layout = 'horizontal',
  variant = 'light',
}) => {
  const dimensions = {
    small: { iconSize: 28, titleSize: 18, taglineSize: 11 },
    medium: { iconSize: 42, titleSize: 24, taglineSize: 13 },
    large: { iconSize: 64, titleSize: 32, taglineSize: 14 },
    xlarge: { iconSize: 92, titleSize: 38, taglineSize: 16 },
  }[size];

  const iconWidth = dimensions.iconSize;
  const iconHeight = dimensions.iconSize * 1.15;

  const textColor = variant === 'dark' ? colors.cream : colors.navy;
  const taglineColor = variant === 'dark' ? colors.lightTerracotta : colors.mutedNavy;

  return (
    <View
      style={[
        styles.container,
        layout === 'vertical' ? styles.containerVertical : styles.containerHorizontal,
      ]}
    >
      <View style={[styles.iconWrapper, { width: iconWidth, height: iconHeight }]}>
        <Svg
          width={iconWidth}
          height={iconHeight}
          viewBox="0 0 100 115"
          fill="none"
        >
          {/* Rounded Pin Shape / Shield */}
          <Path
            d="M50 0C22.38 0 0 22.38 0 50c0 30 45 62 48.5 64.5a3 3 0 0 0 3 0C55 112 100 80 100 50 100 22.38 77.62 0 50 0z"
            fill={colors.terracotta}
          />
          {/* House Roof */}
          <Path
            d="M50 24L24 46h9v26h34V46h9L50 24z"
            fill="#FFFFFF"
          />
          {/* Chimney */}
          <Path
            d="M62 30h6v12h-6V30z"
            fill="#FFFFFF"
          />
          {/* House Door / Center Pin Cutout */}
          <Path
            d="M44 54h12v18H44V54z"
            fill={colors.terracotta}
          />
          {/* Small Heart or Window Dot */}
          <Circle cx="50" cy="42" r="3.5" fill={colors.terracotta} />
        </Svg>
      </View>

      {showText && (
        <View
          style={[
            styles.textContainer,
            layout === 'vertical' ? styles.textContainerVertical : styles.textContainerHorizontal,
          ]}
        >
          <View style={styles.titleRow}>
            <Text style={[styles.brandImba, { fontSize: dimensions.titleSize, color: textColor }]}>
              Imba
            </Text>
            <Text
              style={[
                styles.brandFind,
                { fontSize: dimensions.titleSize, color: colors.terracotta },
              ]}
            >
              Find
            </Text>
          </View>
          {showTagline && (
            <Text
              style={[
                styles.tagline,
                { fontSize: dimensions.taglineSize, color: taglineColor },
                layout === 'vertical' && { textAlign: 'center' },
              ]}
            >
              Find a place. Make it home.
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  containerHorizontal: {
    flexDirection: 'row',
  },
  containerVertical: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  iconWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    justifyContent: 'center',
  },
  textContainerHorizontal: {
    marginLeft: 10,
  },
  textContainerVertical: {
    marginTop: 14,
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandImba: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  brandFind: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  tagline: {
    marginTop: 4,
    fontWeight: '500',
  },
});
