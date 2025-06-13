import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../../styles/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  fullWidth = false,
}) => {
  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: borderRadius.base,
      flexDirection: 'row',
    };

    // Size styles
    switch (size) {
      case 'small':
        baseStyle.paddingHorizontal = spacing.md;
        baseStyle.paddingVertical = spacing.sm;
        baseStyle.minHeight = 36;
        break;
      case 'large':
        baseStyle.paddingHorizontal = spacing.xl;
        baseStyle.paddingVertical = spacing.lg;
        baseStyle.minHeight = 56;
        break;
      default: // medium
        baseStyle.paddingHorizontal = spacing.lg;
        baseStyle.paddingVertical = spacing.md;
        baseStyle.minHeight = 48;
    }

    // Variant styles
    switch (variant) {
      case 'secondary':
        baseStyle.backgroundColor = colors.secondary;
        break;
      case 'outline':
        baseStyle.backgroundColor = colors.white;
        baseStyle.borderWidth = 1;
        baseStyle.borderColor = colors.primary;
        break;
      case 'ghost':
        baseStyle.backgroundColor = 'transparent';
        break;
      case 'danger':
        baseStyle.backgroundColor = colors.danger;
        break;
      default: // primary
        baseStyle.backgroundColor = colors.primary;
    }

    // Disabled state
    if (disabled || loading) {
      baseStyle.opacity = 0.6;
    }

    // Full width
    if (fullWidth) {
      baseStyle.width = '100%';
    }

    // Add shadow for elevated buttons
    if (variant === 'primary' || variant === 'secondary' || variant === 'danger') {
      Object.assign(baseStyle, shadows.sm);
    }

    return baseStyle;
  };

  const getTextStyle = (): TextStyle => {
    const baseTextStyle: TextStyle = {
      fontWeight: typography.fontWeight.semibold,
      textAlign: 'center',
    };

    // Size styles
    switch (size) {
      case 'small':
        baseTextStyle.fontSize = typography.fontSize.sm;
        break;
      case 'large':
        baseTextStyle.fontSize = typography.fontSize.lg;
        break;
      default: // medium
        baseTextStyle.fontSize = typography.fontSize.base;
    }

    // Variant colors
    switch (variant) {
      case 'outline':
        baseTextStyle.color = colors.primary;
        break;
      case 'ghost':
        baseTextStyle.color = colors.primary;
        break;
      default:
        baseTextStyle.color = colors.white;
    }

    return baseTextStyle;
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      accessibilityLabel={title}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? colors.primary : colors.white}
          style={{ marginRight: spacing.sm }}
        />
      )}
      <Text style={[getTextStyle(), textStyle]}>
        {loading ? 'Loading...' : title}
      </Text>
    </TouchableOpacity>
  );
};

export default Button; 