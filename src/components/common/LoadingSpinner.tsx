// Loading Spinner Component
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  message?: string;
  fullScreen?: boolean;
  style?: ViewStyle;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  message,
  fullScreen = false,
  style,
}) => {
  const theme = useTheme();

  const containerStyle = fullScreen ? styles.fullScreen : styles.container;

  return (
    <View style={[containerStyle, { backgroundColor: fullScreen ? theme.colors.background : 'transparent' }, style]}>
      <ActivityIndicator
        animating={true}
        size={size}
        color={theme.colors.primary}
      />
      {message && (
        <Text style={[styles.message, { color: theme.colors.onBackground }]}>
          {message}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    marginTop: 12,
    fontSize: 14,
  },
});

export default LoadingSpinner;
