// Theme configuration with light and dark mode support
import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

// Brand colors - Minimalistic grey palette
const brandColors = {
  primary: '#000000',      // black primary
  secondary: '#23272A',    // Darker grey secondary
  accent: '#2d2d2d',       // Light grey accent
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
    background: '#ffffff', 
    surface: '#FFFFFF',
    surfaceVariant: '#ffffff', 
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onBackground: '#23272A',
    onSurface: '#000000',
    onSurfaceVariant: '#000000',
    outline: '#242424',
    primaryContainer: '#ffffff',
    onPrimaryContainer: '#23272A',
  },
  custom: {
    success: brandColors.success,
    warning: brandColors.warning,
    info: brandColors.info,
    gradientStart: '#282a2d',
    gradientEnd: '#363636',
    cardBackground: '#FFFFFF',
    inputBackground: '#ffffff',
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
    surfaceVariant: '#000000',
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onBackground: '#F4F4F5',
    onSurface: '#E5E7EB',
    onSurfaceVariant: '#2d2d2d',
    outline: '#363434',
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
