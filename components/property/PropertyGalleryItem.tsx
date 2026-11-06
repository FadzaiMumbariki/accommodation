import React from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  type StyleProp,
  type ViewStyle,
  type ImageStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { Brand } from '../../constants/Colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface PropertyGalleryItemProps {
  item: string;
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  accessibilityLabel?: string;
}

/**
 * Individual slide item for property photo galleries and hero carousels.
 * Memoized to prevent re-renders when carousel index or parent state updates.
 */
export const PropertyGalleryItem: React.FC<PropertyGalleryItemProps> = React.memo(
  ({
    item,
    width = SCREEN_WIDTH,
    height = 300,
    style,
    imageStyle,
    accessibilityLabel = 'Property photo',
  }) => {
    return (
      <View style={[styles.slide, { width, height }, style]}>
        <Image
          source={{ uri: item }}
          style={[styles.image, { width, height }, imageStyle]}
          contentFit="cover"
          transition={250}
          cachePolicy="memory-disk"
          accessibilityLabel={accessibilityLabel}
        />
      </View>
    );
  },
);

PropertyGalleryItem.displayName = 'PropertyGalleryItem';

const styles = StyleSheet.create({
  slide: {
    backgroundColor: Brand.navy,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
