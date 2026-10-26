import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Animated, type StyleProp, type ViewStyle } from 'react-native';
import { Brand } from '../../constants/Colors';

interface SkeletonProps {
  width?: ViewStyle['width'];
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Skeleton loading placeholder with a shimmer animation.
 * Use while data is being fetched to give immediate visual feedback.
 */
export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  // useState keeps the Animated.Value stable across renders without triggering
  // the react-hooks/refs lint rule that fires on useRef().current in render.
  const [animatedValue] = useState(() => new Animated.Value(0));
  const [opacity] = useState(() =>
    animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0.4, 0.9],
    }),
  );

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [animatedValue]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius, opacity },
        style,
      ]}
    />
  );
}

/** Skeleton placeholder that looks like a property card. */
export function PropertyCardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton height={180} borderRadius={14} style={{ marginBottom: 12 }} />
      <Skeleton width="60%" height={14} style={{ marginBottom: 8 }} />
      <Skeleton width="40%" height={12} style={{ marginBottom: 8 }} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Skeleton width={60} height={12} />
        <Skeleton width={60} height={12} />
        <Skeleton width={60} height={12} />
      </View>
    </View>
  );
}

/** Skeleton placeholder that looks like a conversation list item. */
export function ConversationSkeleton() {
  return (
    <View style={styles.convo}>
      <Skeleton width={52} height={52} borderRadius={26} />
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton width="50%" height={14} />
        <Skeleton width="80%" height={12} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: Brand.gray200,
  },
  card: {
    backgroundColor: Brand.white,
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    shadowColor: Brand.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  convo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
});
