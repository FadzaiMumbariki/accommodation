import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Brand } from '../../constants/Colors';

interface SecondaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  variant?: 'outline' | 'ghost' | 'navy';
}

export const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  title,
  onPress,
  disabled = false,
  style,
  textStyle,
  icon,
  variant = 'outline',
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'navy':
        return {
          btn: { backgroundColor: Brand.navy, borderWidth: 0 },
          txt: { color: Brand.white },
        };
      case 'ghost':
        return {
          btn: { backgroundColor: 'transparent', borderWidth: 0 },
          txt: { color: Brand.terracotta },
        };
      case 'outline':
      default:
        return {
          btn: { backgroundColor: Brand.white, borderWidth: 1.5, borderColor: Brand.navy },
          txt: { color: Brand.navy },
        };
    }
  };

  const v = getVariantStyles();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        v.btn,
        disabled && styles.buttonDisabled,
        style,
      ]}
    >
      {icon}
      <Text
        style={[
          styles.text,
          v.txt,
          icon ? { marginLeft: 8 } : null,
          disabled && styles.textDisabled,
          textStyle,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  textDisabled: {
    color: Brand.gray400,
  },
});
