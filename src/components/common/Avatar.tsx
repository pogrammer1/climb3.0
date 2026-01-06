// Avatar Component for user profile pictures
import React from 'react';
import { StyleSheet, View, Image, ViewStyle } from 'react-native';
import { Avatar as PaperAvatar, useTheme } from 'react-native-paper';

interface AvatarProps {
  source?: string | null;
  name?: string;
  size?: number;
  style?: ViewStyle;
  onPress?: () => void;
}

export const Avatar: React.FC<AvatarProps> = ({
  source,
  name = '',
  size = 48,
  style,
  onPress,
}) => {
  const theme = useTheme();

  const getInitials = (fullName: string): string => {
    const names = fullName.trim().split(' ');
    if (names.length === 0) return '?';
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  if (source) {
    return (
      <PaperAvatar.Image
        source={{ uri: source }}
        size={size}
        style={[styles.avatar, style]}
      />
    );
  }

  return (
    <PaperAvatar.Text
      label={getInitials(name)}
      size={size}
      style={[styles.avatar, { backgroundColor: theme.colors.primary }, style]}
      labelStyle={{ color: theme.colors.onPrimary }}
    />
  );
};

const styles = StyleSheet.create({
  avatar: {
    // Additional styles if needed
  },
});

export default Avatar;
