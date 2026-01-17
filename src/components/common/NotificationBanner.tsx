// NotificationBanner - Prompt user to enable notifications
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Pressable, Animated, Platform } from 'react-native';
import { Text, useTheme, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNotificationStore } from '../../store';

interface NotificationBannerProps {
  onDismiss?: () => void;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({ onDismiss }) => {
  const theme = useTheme();
  const { permission, requestPermission } = useNotificationStore();
  const [dismissed, setDismissed] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const opacity = React.useRef(new Animated.Value(0)).current;
  
  // Check if we should show the banner
  const shouldShow = permission === 'default' && !dismissed;
  
  useEffect(() => {
    if (shouldShow) {
      // Fade in
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [shouldShow]);
  
  const handleEnable = async () => {
    setIsRequesting(true);
    await requestPermission();
    setIsRequesting(false);
    handleDismiss();
  };
  
  const handleDismiss = () => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setDismissed(true);
      onDismiss?.();
    });
  };
  
  // Don't render on unsupported platforms or if already decided
  if (permission === 'unsupported' || permission === 'granted' || permission === 'denied') {
    return null;
  }
  
  if (!shouldShow) {
    return null;
  }
  
  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          backgroundColor: theme.colors.primaryContainer,
          opacity,
        }
      ]}
    >
      <View style={styles.content}>
        <MaterialCommunityIcons 
          name="bell-outline" 
          size={24} 
          color={theme.colors.primary} 
          style={styles.icon}
        />
        <View style={styles.textContainer}>
          <Text variant="titleSmall" style={{ color: theme.colors.onPrimaryContainer }}>
            Enable Notifications
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer, opacity: 0.8 }}>
            Get notified when you receive messages or connection requests
          </Text>
        </View>
      </View>
      
      <View style={styles.actions}>
        <Pressable
          onPress={handleEnable}
          disabled={isRequesting}
          style={[
            styles.enableButton,
            { backgroundColor: theme.colors.primary }
          ]}
        >
          <Text style={{ color: theme.colors.onPrimary, fontWeight: '600' }}>
            {isRequesting ? 'Enabling...' : 'Enable'}
          </Text>
        </Pressable>
        
        <IconButton
          icon="close"
          size={20}
          onPress={handleDismiss}
          iconColor={theme.colors.onPrimaryContainer}
        />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      },
      default: {
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    }),
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  enableButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
});

export default NotificationBanner;
