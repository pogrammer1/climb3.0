// Root Stack Navigator (Main app flow)
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from 'react-native-paper';
import { MainTabNavigator } from './MainTabNavigator';
import { NewSessionScreen, SessionDetailScreen } from '../screens/session';
import { ChatScreen } from '../screens/chat';
import { EditProfileScreen } from '../screens/profile';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const theme = useTheme();

  return (
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
      <Stack.Screen name="SessionDetail" component={SessionDetailScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
};

export default RootNavigator;
