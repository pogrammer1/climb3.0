// Auth Store - Global authentication state management using Zustand
import { create } from 'zustand';
import { User as FirebaseUser } from 'firebase/auth';
import { subscribeToAuthState } from '../services/authService';
import { getProfile } from '../services/profileService';
import { User, UserProfile } from '../types';

interface AuthState {
  // State
  user: FirebaseUser | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  
  // Actions
  setUser: (user: FirebaseUser | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  fetchProfile: () => Promise<void>;
  clearAuth: () => void;
  initializeAuthListener: () => () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  user: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
  
  // Actions
  setUser: (user) => {
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    });
  },
  
  setProfile: (profile) => {
    set({ profile });
  },
  
  setLoading: (isLoading) => {
    set({ isLoading });
  },
  
  setError: (error) => {
    set({ error });
  },
  
  fetchProfile: async () => {
    const { user } = get();
    if (!user) return;
    
    try {
      const result = await getProfile(user.uid);
      if (result.success && result.data) {
        set({ profile: result.data });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  },
  
  clearAuth: () => {
    set({
      user: null,
      profile: null,
      isAuthenticated: false,
      error: null,
    });
  },
  
  initializeAuthListener: () => {
    const unsubscribe = subscribeToAuthState(async (firebaseUser) => {
      set({ isLoading: true });
      
      if (firebaseUser) {
        set({
          user: firebaseUser,
          isAuthenticated: true,
        });
        
        // Fetch user profile
        try {
          const result = await getProfile(firebaseUser.uid);
          if (result.success && result.data) {
            set({ profile: result.data });
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
        }
      } else {
        set({
          user: null,
          profile: null,
          isAuthenticated: false,
        });
      }
      
      set({ isLoading: false });
    });
    
    return unsubscribe;
  },
}));
