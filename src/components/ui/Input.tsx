import React, { useState, forwardRef, useImperativeHandle, useRef } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../styles/theme';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  required?: boolean;
  showCharacterCount?: boolean;
}

export interface InputRef {
  focus: () => void;
  blur: () => void;
  isFocused: () => boolean;
}

const Input = forwardRef<InputRef, InputProps>(({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  inputStyle,
  labelStyle,
  required = false,
  showCharacterCount = false,
  maxLength,
  value = '',
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    blur: () => inputRef.current?.blur(),
    isFocused: () => isFocused,
  }));

  const handleFocus = (e: any) => {
    setIsFocused(true);
    props.onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    props.onBlur?.(e);
  };

  const getInputContainerStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: borderRadius.base,
      backgroundColor: colors.inputBackground,
      minHeight: 48,
    };

    if (error) {
      baseStyle.borderColor = colors.danger;
      baseStyle.backgroundColor = '#FEF2F2'; // Light red background
    } else if (isFocused) {
      baseStyle.borderColor = colors.inputBorderFocus;
      baseStyle.backgroundColor = colors.white;
    } else {
      baseStyle.borderColor = colors.inputBorder;
    }

    return baseStyle;
  };

  const getInputStyle = (): TextStyle => {
    return {
      flex: 1,
      fontSize: typography.fontSize.base,
      color: colors.textPrimary,
      paddingHorizontal: leftIcon || rightIcon ? spacing.sm : spacing.base,
      paddingVertical: spacing.md,
    };
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <View style={styles.labelContainer}>
          <Text style={[styles.label, labelStyle]}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        </View>
      )}
      
      <View style={getInputContainerStyle()}>
        {leftIcon && (
          <View style={styles.iconContainer}>
            <Ionicons
              name={leftIcon}
              size={20}
              color={isFocused ? colors.primary : colors.gray500}
            />
          </View>
        )}
        
        <TextInput
          ref={inputRef}
          style={[getInputStyle(), inputStyle]}
          value={value}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={colors.gray500}
          selectionColor={colors.primary}
          maxLength={maxLength}
          {...props}
        />
        
        {rightIcon && (
          <TouchableOpacity
            style={styles.iconContainer}
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
          >
            <Ionicons
              name={rightIcon}
              size={20}
              color={isFocused ? colors.primary : colors.gray500}
            />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.footer}>
        <View style={styles.messageContainer}>
          {error && <Text style={styles.error}>{error}</Text>}
          {!error && hint && <Text style={styles.hint}>{hint}</Text>}
        </View>
        
        {showCharacterCount && maxLength && (
          <Text style={styles.characterCount}>
            {value.length}/{maxLength}
          </Text>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.base,
  },
  labelContainer: {
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
  },
  required: {
    color: colors.danger,
  },
  iconContainer: {
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: spacing.xs,
    minHeight: 16,
  },
  messageContainer: {
    flex: 1,
  },
  error: {
    fontSize: typography.fontSize.xs,
    color: colors.danger,
    lineHeight: typography.lineHeight.tight * typography.fontSize.xs,
  },
  hint: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    lineHeight: typography.lineHeight.tight * typography.fontSize.xs,
  },
  characterCount: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
});

Input.displayName = 'Input';

export default Input; 