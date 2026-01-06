// Empty State Component for when lists are empty
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Button from './Button';

interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'inbox-outline',
  title,
  message,
  actionLabel,
  onAction,
  style,
}) => {
  const theme = useTheme();

  return (
    <View style={[styles.container, style]}>
      <MaterialCommunityIcons
        name={icon as any}
        size={64}
        color={theme.colors.outline}
        style={styles.icon}
      />
      <Text variant="titleLarge" style={[styles.title, { color: theme.colors.onBackground }]}>
        {title}
      </Text>
      {message && (
        <Text variant="bodyMedium" style={[styles.message, { color: theme.colors.onSurfaceVariant }]}>
          {message}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button
          title={actionLabel}
          onPress={onAction}
          variant="primary"
          style={styles.action}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    textAlign: 'center',
    marginBottom: 24,
  },
  action: {
    minWidth: 150,
  },
});

export default EmptyState;
