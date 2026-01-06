// Theme configuration with light and dark mode support
import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

// Brand colors
const brandColors = {
  primary: '#FF6B35',      // Climbing orange
  secondary: '#2E4057',    // Deep blue
  accent: '#048A81',       // Teal accent
  success: '#4CAF50',      // Green
  warning: '#FFC107',      // Amber
  error: '#F44336',        // Red
  info: '#2196F3',         // Blue
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
    background: '#F5F5F5',
    surface: '#FFFFFF',
    surfaceVariant: '#F0F0F0',
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onBackground: '#1A1A1A',
    onSurface: '#1A1A1A',
    outline: '#E0E0E0',
  },
  custom: {
    success: brandColors.success,
    warning: brandColors.warning,
    info: brandColors.info,
    gradientStart: '#FF6B35',
    gradientEnd: '#FF8C5A',
    cardBackground: '#FFFFFF',
    inputBackground: '#F5F5F5',
  },
};

// Dark theme
export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: brandColors.primary,
    secondary: '#4A6583',
    tertiary: brandColors.accent,
    error: brandColors.error,
    background: '#121212',
    surface: '#1E1E1E',
    surfaceVariant: '#2A2A2A',
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onBackground: '#FFFFFF',
    onSurface: '#FFFFFF',
    outline: '#404040',
  },
  custom: {
    success: brandColors.success,
    warning: brandColors.warning,
    info: brandColors.info,
    gradientStart: '#FF6B35',
    gradientEnd: '#FF8C5A',
    cardBackground: '#1E1E1E',
    inputBackground: '#2A2A2A',
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
