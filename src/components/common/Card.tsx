// Card Component for consistent card styling
import React from 'react';
import { StyleSheet, View, ViewStyle, Pressable } from 'react-native';
import { Card as PaperCard, useTheme } from 'react-native-paper';
import { shadows } from '../../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: 'elevated' | 'outlined' | 'flat';
  padding?: 'none' | 'small' | 'medium' | 'large';
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  variant = 'elevated',
  padding = 'medium',
}) => {
  const theme = useTheme();

  const getPaddingStyle = (): ViewStyle => {
    switch (padding) {
      case 'none':
        return { padding: 0 };
      case 'small':
        return { padding: 8 };
      case 'large':
        return { padding: 24 };
      default:
        return { padding: 16 };
    }
  };

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'outlined':
        return {
          borderWidth: 1,
          borderColor: theme.colors.outline,
          elevation: 0,
        };
      case 'flat':
        return {
          elevation: 0,
          backgroundColor: theme.colors.surfaceVariant,
        };
      default:
        return shadows.small;
    }
  };

  const cardStyle = [
    styles.card,
    getVariantStyle(),
    getPaddingStyle(),
    { backgroundColor: theme.colors.surface },
    style,
  ];

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}>
        <View style={cardStyle}>{children}</View>
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    overflow: 'hidden',
  },
});

export default Card;
