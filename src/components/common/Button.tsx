// Custom Button Component with loading state and variants
import React from 'react';
import { StyleSheet, ViewStyle, TextStyle, Platform } from 'react-native';
import { Button as PaperButton, ActivityIndicator } from 'react-native-paper';
import { brandColors } from '../../constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  style?: ViewStyle;
  labelStyle?: TextStyle;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  icon,
  style,
  labelStyle,
  fullWidth = false,
}) => {
  const getMode = () => {
    switch (variant) {
      case 'primary':
        return 'contained';
      case 'secondary':
        return 'contained-tonal';
      case 'outline':
        return 'outlined';
      case 'text':
        return 'text';
      default:
        return 'contained';
    }
  };

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: 8,
    };

    switch (size) {
      case 'small':
        return { ...baseStyle, paddingVertical: 2 };
      case 'large':
        return { ...baseStyle, paddingVertical: 8 };
      default:
        return { ...baseStyle, paddingVertical: 4 };
    }
  };

  const getLabelStyle = (): TextStyle => {
    switch (size) {
      case 'small':
        return { fontSize: 12 };
      case 'large':
        return { fontSize: 18 };
      default:
        return { fontSize: 14 };
    }
  };

  const buttonColor = variant === 'primary' ? brandColors.primary : undefined;
  
  // Darker ripple/hover color for better visibility - fills entire button
  const rippleColor = variant === 'primary' 
    ? 'rgba(0, 0, 0, 0.25)' 
    : 'rgba(99, 102, 241, 0.35)';

  return (
    <PaperButton
      mode={getMode()}
      onPress={onPress}
      disabled={disabled || loading}
      icon={loading ? undefined : icon}
      buttonColor={buttonColor}
      rippleColor={rippleColor}
      style={[
        getButtonStyle(),
        fullWidth && styles.fullWidth,
        Platform.OS === 'web' && styles.webHover,
        style,
      ]}
      labelStyle={[getLabelStyle(), labelStyle]}
      contentStyle={styles.content}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        title
      )}
    </PaperButton>
  );
};

const styles = StyleSheet.create({
  fullWidth: {
    width: '100%',
  },
  content: {
    height: 48,
  },
  webHover: {
    // @ts-ignore - web-specific style
    cursor: 'pointer',
  },
});

export default Button;
