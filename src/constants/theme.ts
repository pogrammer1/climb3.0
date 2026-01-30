// Theme configuration with light and dark mode support
import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

// Brand colors - Minimalistic grey palette
const brandColors = {
  primary: '#44484C',      // Minimal grey primary
  secondary: '#23272A',    // Darker grey secondary
  accent: '#A3A3A3',       // Light grey accent
  success: '#6EE7B7',      // Muted green
  warning: '#FBBF24',      // Muted amber
  error: '#EF4444',        // Red 
  info: '#60A5FA',         // Muted blue
};

// Light theme
export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: brandColors.primary,
    secondary: brandColors.secondary,
    tertiary: brandColors.accent,
    error: brandColors.error,
    background: '#F4F4F5', 
    surface: '#FFFFFF',
    surfaceVariant: '#E5E7EB', 
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onBackground: '#23272A',
    onSurface: '#44484C',
    onSurfaceVariant: '#6B7280',
    outline: '#D1D5DB',
    primaryContainer: '#E5E7EB',
    onPrimaryContainer: '#23272A',
  },
  custom: {
    success: brandColors.success,
    warning: brandColors.warning,
    info: brandColors.info,
    gradientStart: '#44484C',
    gradientEnd: '#A3A3A3',
    cardBackground: '#FFFFFF',
    inputBackground: '#F4F4F5',
  },
};

// Dark theme
export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: brandColors.primary,
    secondary: brandColors.secondary,
    tertiary: brandColors.accent,
    error: brandColors.error,
    background: '#18181B', // darker grey
    surface: '#23272A',
    surfaceVariant: '#44484C',
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onBackground: '#F4F4F5',
    onSurface: '#E5E7EB',
    onSurfaceVariant: '#A3A3A3',
    outline: '#44484C',
    primaryContainer: '#23272A',
    onPrimaryContainer: '#F4F4F5',
  },
  custom: {
    success: brandColors.success,
    warning: brandColors.warning,
    info: brandColors.info,
    gradientStart: '#23272A',
    gradientEnd: '#44484C',
    cardBackground: '#23272A',
    inputBackground: '#18181B',
  },
};

// Typography
export const typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  fontSize: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 24,
    xxxl: 32,
  },
};

// Spacing
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Border radius
export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 16,
  xl: 24,
  full: 9999,
};

// Shadows (for iOS)
export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
};

export type AppTheme = typeof lightTheme;
export { brandColors };
