import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Brand } from '../../constants/Colors';

interface BackButtonProps {
  onPress?: () => void;
  color?: string;
  style?: ViewStyle;
}

export const BackButton: React.FC<BackButtonProps> = ({
  onPress,
  color = Brand.navy,
  style,
}) => (
  <TouchableOpacity
    onPress={onPress ?? (() => router.back())}
    style={[styles.btn, style]}
    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    activeOpacity={0.75}
    accessibilityRole="button"
    accessibilityLabel="Go back"
  >
    <Ionicons name="arrow-back" size={22} color={color} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Brand.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
