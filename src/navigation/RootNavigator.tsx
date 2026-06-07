// Root Stack Navigator (Main app flow)
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from 'react-native-paper';
import { MainTabNavigator } from './MainTabNavigator';
import { NewSessionScreen, SessionDetailScreen, EditSessionScreen, SessionsMapScreen } from '../screens/session';
import { ChatScreen } from '../screens/chat';
import { EditProfileScreen, ClimberProfileScreen, MatchRequestsScreen, AccountSettingsScreen, NotificationSettingsScreen, AchievementsScreen, ReportContentScreen } from '../screens/profile';
import { ConnectionScheduleScreen, MyScheduleScreen } from '../screens/schedule';
import { OnboardingOverlay } from '../components/common';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Screen
        name="NewSession"
        component={NewSessionScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen name="SessionDetail" component={SessionDetailScreen as React.ComponentType<{}>} />
      <Stack.Screen
        name="EditSession"
        component={EditSessionScreen as React.ComponentType<{}>}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen name="SessionsMap" component={SessionsMapScreen} />
      <Stack.Screen name="Chat" component={ChatScreen as React.ComponentType<{}>} />
      <Stack.Screen name="ClimberProfile" component={ClimberProfileScreen as React.ComponentType<{}>} />
      <Stack.Screen name="MatchRequests" component={MatchRequestsScreen} />
      <Stack.Screen name="ConnectionSchedule" component={ConnectionScheduleScreen} />
      <Stack.Screen
        name="MySchedule"
        component={MyScheduleScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="AccountSettings"
        component={AccountSettingsScreen}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
      />
      <Stack.Screen
        name="Achievements"
        component={AchievementsScreen as React.ComponentType<{}>}
      />
      <Stack.Screen
        name="ReportContent"
        component={ReportContentScreen as React.ComponentType<{}>}
        options={{ presentation: 'modal' }}
      />
    </Stack.Navigator>
    
    {/* Onboarding overlay for first-time users */}
    <OnboardingOverlay />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default RootNavigator;
