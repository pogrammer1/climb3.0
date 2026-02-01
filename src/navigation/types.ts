// Navigation Types
import { NavigatorScreenParams } from '@react-navigation/native';

// Auth Stack
export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
};

// Main Tab Navigator
export type MainTabParamList = {
  Home: undefined;
  Sessions: undefined;
  Discover: undefined;
  Messages: undefined;
  Profile: undefined;
};

// Root Stack (contains tabs and other screens)
export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  NewSession: undefined;
  SessionDetail: { sessionId: string };
  EditSession: { sessionId: string };
  SessionsMap: undefined;
  Chat: { conversationId: string };
  EditProfile: undefined;
  MatchProfile: { matchId: string };
  ClimberProfile: { climberId: string };
  MatchRequests: undefined;
  ConnectionSchedule: undefined;
  MySchedule: undefined;
  Settings: undefined;
  AccountSettings: undefined;
  NotificationSettings: undefined;
  Achievements: { userId?: string } | undefined;
};

// Combined navigation types
export type AppStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<RootStackParamList>;
};

// Declare global types for useNavigation hook
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
