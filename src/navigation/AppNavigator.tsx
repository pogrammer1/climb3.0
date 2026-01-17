// App Navigator - Main entry point for navigation
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useAuthStore } from '../store';
import { getProfile } from '../services/profileService';
import { AuthNavigator } from './AuthNavigator';
import { RootNavigator } from './RootNavigator';
import { LoadingSpinner, NotificationProvider } from '../components/common';
import { AppStackParamList } from './types';

const Stack = createNativeStackNavigator<AppStackParamList>();

export const AppNavigator: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { user, setUser, setProfile } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          const result = await getProfile(firebaseUser.uid);
          if (result.success && result.data) {
            setProfile(result.data);
          } else {
            // Profile doesn't exist yet, that's okay for new users
            setProfile(null);
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }

      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setProfile]);

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading..." />;
  }

  return (
    <NavigationContainer>
      <NotificationProvider>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {user ? (
            <Stack.Screen name="Main" component={RootNavigator} />
          ) : (
            <Stack.Screen name="Auth" component={AuthNavigator} />
          )}
        </Stack.Navigator>
      </NotificationProvider>
    </NavigationContainer>
  );
};

export default AppNavigator;
