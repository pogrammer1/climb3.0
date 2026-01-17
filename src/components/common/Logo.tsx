// Logo Component - App logo that works on all platforms
import React from 'react';
import { StyleSheet, View, Image, Platform } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  variant?: 'full' | 'icon-only' | 'text-only';
}

export const Logo: React.FC<LogoProps> = ({ 
  size = 'medium',
  showText = true,
  variant = 'full',
}) => {
  const theme = useTheme();
  
  const dimensions = {
    small: { icon: 40, text: 'headlineSmall' as const },
    medium: { icon: 64, text: 'displaySmall' as const },
    large: { icon: 96, text: 'displayMedium' as const },
  };
  
  const { icon: iconSize, text: textVariant } = dimensions[size];
  
  const renderIcon = () => {
    // Try to use the app icon, with fallback to styled icon
    try {
      return (
        <View style={[styles.iconContainer, { width: iconSize, height: iconSize }]}>
          <Image
            source={require('../../../assets/icon.png')}
            style={[styles.icon, { width: iconSize, height: iconSize }]}
            resizeMode="contain"
          />
        </View>
      );
    } catch (error) {
      // Fallback: styled text icon
      return (
        <View 
          style={[
            styles.fallbackIcon, 
            { 
              width: iconSize, 
              height: iconSize,
              backgroundColor: theme.colors.primary,
              borderRadius: iconSize / 4,
            }
          ]}
        >
          <Text 
            style={[
              styles.fallbackIconText, 
              { 
                fontSize: iconSize * 0.5,
                color: theme.colors.onPrimary,
              }
            ]}
          >
            B
          </Text>
        </View>
      );
    }
  };
  
  const renderText = () => (
    <Text 
      variant={textVariant} 
      style={[styles.logoText, { color: theme.colors.primary }]}
    >
      Belay
    </Text>
  );
  
  if (variant === 'icon-only') {
    return renderIcon();
  }
  
  if (variant === 'text-only') {
    return renderText();
  }
  
  return (
    <View style={styles.container}>
      {renderIcon()}
      {showText && <View style={styles.textContainer}>{renderText()}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    borderRadius: 16,
  },
  fallbackIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackIconText: {
    fontWeight: 'bold',
  },
  textContainer: {
    marginTop: 8,
  },
  logoText: {
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});

export default Logo;
