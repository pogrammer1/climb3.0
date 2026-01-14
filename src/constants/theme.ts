// Theme configuration with light and dark mode support
import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

// Brand colors - Modern, clean palette
const brandColors = {
  primary: '#6366F1',      // Indigo - modern primary
  secondary: '#1E293B',    // Slate - clean secondary
  accent: '#06B6D4',       // Cyan accent
  success: '#10B981',      // Emerald
  warning: '#F59E0B',      // Amber
  error: '#EF4444',        // Red
  info: '#3B82F6',         // Blue
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
    background: '#FAFAFA',
    surface: '#FFFFFF',
    surfaceVariant: '#F1F5F9',
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onBackground: '#0F172A',
    onSurface: '#1E293B',
    onSurfaceVariant: '#64748B',
    outline: '#E2E8F0',
    primaryContainer: '#EEF2FF',
    onPrimaryContainer: '#4338CA',
  },
  custom: {
    success: brandColors.success,
    warning: brandColors.warning,
    info: brandColors.info,
    gradientStart: '#6366F1',
    gradientEnd: '#8B5CF6',
    cardBackground: '#FFFFFF',
    inputBackground: '#F8FAFC',
  },
};

// Dark theme
export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#818CF8',
    secondary: '#64748B',
    tertiary: brandColors.accent,
    error: brandColors.error,
    background: '#0F172A',
    surface: '#1E293B',
    surfaceVariant: '#334155',
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onBackground: '#F8FAFC',
    onSurface: '#F1F5F9',
    onSurfaceVariant: '#94A3B8',
    outline: '#475569',
    primaryContainer: '#312E81',
    onPrimaryContainer: '#C7D2FE',
  },
  custom: {
    success: brandColors.success,
    warning: brandColors.warning,
    info: brandColors.info,
    gradientStart: '#6366F1',
    gradientEnd: '#8B5CF6',
    cardBackground: '#1E293B',
    inputBackground: '#334155',
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
