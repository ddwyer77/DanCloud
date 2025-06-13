import { Platform, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Base design tokens
export const colors = {
  // Primary colors
  primary: '#007AFF',
  primaryDark: '#0056CC',
  primaryLight: '#4DA6FF',
  
  // Secondary colors
  secondary: '#FF5500',
  secondaryDark: '#CC4400',
  secondaryLight: '#FF7733',
  
  // Neutral colors
  white: '#FFFFFF',
  black: '#000000',
  gray100: '#F8F9FA',
  gray200: '#E9ECEF',
  gray300: '#DEE2E6',
  gray400: '#CED4DA',
  gray500: '#ADB5BD',
  gray600: '#6C757D',
  gray700: '#495057',
  gray800: '#343A40',
  gray900: '#212529',
  
  // Semantic colors
  success: '#28A745',
  warning: '#FFC107',
  danger: '#DC3545',
  info: '#17A2B8',
  
  // Text colors
  textPrimary: '#333333',
  textSecondary: '#666666',
  textMuted: '#999999',
  textDisabled: '#CCCCCC',
  
  // Background colors
  background: '#FFFFFF',
  backgroundSecondary: '#F8F9FA',
  backgroundMuted: '#F5F5F5',
  
  // Border colors
  border: '#E0E0E0',
  borderLight: '#F0F0F0',
  borderDark: '#CCCCCC',
  
  // Input colors
  inputBackground: '#F9F9F9',
  inputBorder: '#DDDDDD',
  inputBorderFocus: '#007AFF',
  
  // Overlay colors
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.2)',
};

// Typography
export const typography = {
  // Font sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },
  
  // Font weights
  fontWeight: {
    light: '300' as const,
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  
  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
    loose: 1.8,
  },
  
  // Font families (can be customized)
  fontFamily: {
    regular: Platform.OS === 'ios' ? 'System' : 'Roboto',
    medium: Platform.OS === 'ios' ? 'System' : 'Roboto-Medium',
    bold: Platform.OS === 'ios' ? 'System' : 'Roboto-Bold',
  },
};

// Spacing system (based on 4px grid)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
  '6xl': 80,
};

// Border radius
export const borderRadius = {
  none: 0,
  sm: 4,
  base: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
};

// Shadows
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  base: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  xl: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 16,
  },
};

// Layout constants
export const layout = {
  screen: {
    width,
    height,
  },
  header: {
    height: Platform.OS === 'ios' ? 44 : 56,
  },
  tabBar: {
    height: Platform.OS === 'ios' ? 83 : 60,
  },
  audioPlayer: {
    height: 114,
  },
  safeArea: {
    top: Platform.OS === 'ios' ? 44 : 0,
    bottom: Platform.OS === 'ios' ? 34 : 0,
  },
};

// Common component styles
export const componentStyles = {
  // Container styles
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  // Header styles
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  
  // Button styles
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.base,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minHeight: 48,
  },
  
  buttonText: {
    color: colors.white,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  
  buttonSecondary: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  
  buttonSecondaryText: {
    color: colors.primary,
  },
  
  buttonDisabled: {
    backgroundColor: colors.gray400,
  },
  
  // Input styles
  input: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.base,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.base,
    backgroundColor: colors.inputBackground,
    color: colors.textPrimary,
    minHeight: 48,
  },
  
  inputFocused: {
    borderColor: colors.inputBorderFocus,
    backgroundColor: colors.white,
  },
  
  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  
  // Card styles
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    ...shadows.base,
  },
  
  // Content styles
  content: {
    flex: 1,
    paddingHorizontal: spacing.base,
  },
  
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  
  // Section styles
  section: {
    marginBottom: spacing.lg,
  },
  
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  
  // Loading states
  loadingContainer: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: colors.background,
  },
  
  // Error states
  errorContainer: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
  },
  
  errorText: {
    fontSize: typography.fontSize.base,
    color: colors.danger,
    textAlign: 'center' as const,
    marginBottom: spacing.lg,
  },
};

// Animation durations
export const animations = {
  fast: 150,
  normal: 250,
  slow: 400,
};

// Breakpoints for responsive design
export const breakpoints = {
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
};

export default {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  layout,
  componentStyles,
  animations,
  breakpoints,
}; 