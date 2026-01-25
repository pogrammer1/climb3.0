// Main Tab Navigator
import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  HomeScreen,
  SessionsScreen,
  DiscoverScreen,
  MessagesScreen,
  ProfileScreen,
} from '../screens/main';
import { MainTabParamList } from './types';
import { useMessageStore, useMatchStore, useNotificationStore } from '../store';

const Tab = createBottomTabNavigator<MainTabParamList>();

type TabIconName = 'home' | 'home-outline' | 'clipboard-list' | 'clipboard-list-outline' |
  'compass' | 'compass-outline' | 'message' | 'message-outline' | 'account' | 'account-outline';

export const MainTabNavigator: React.FC = () => {
  const theme = useTheme();
  const { totalUnreadCount } = useMessageStore();
  const { pendingRequests } = useMatchStore();

  const getTabBarIcon = (
    routeName: keyof MainTabParamList,
    focused: boolean,
    color: string
  ): TabIconName => {
    const icons: Record<keyof MainTabParamList, { focused: TabIconName; unfocused: TabIconName }> = {
      Home: { focused: 'home', unfocused: 'home-outline' },
      Sessions: { focused: 'clipboard-list', unfocused: 'clipboard-list-outline' },
      Discover: { focused: 'compass', unfocused: 'compass-outline' },
      Messages: { focused: 'message', unfocused: 'message-outline' },
      Profile: { focused: 'account', unfocused: 'account-outline' },
    };

    return focused ? icons[routeName].focused : icons[routeName].unfocused;
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          const iconName = getTabBarIcon(route.name, focused, color);
          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outlineVariant,
          borderTopWidth: 1,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 85 : 65,
          // Enhanced shadow for better visibility
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 16,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="Sessions"
        component={SessionsScreen}
        options={{ tabBarLabel: 'Sessions' }}
      />
      <Tab.Screen
        name="Discover"
        component={DiscoverScreen}
        options={{ 
          tabBarLabel: 'Discover',
          tabBarBadge: pendingRequests.length > 0 ? pendingRequests.length : undefined,
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          tabBarLabel: 'Messages',
          tabBarBadge: totalUnreadCount > 0 ? totalUnreadCount : undefined,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
