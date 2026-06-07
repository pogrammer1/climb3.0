// Achievement Store - State management for achievements
import { create } from 'zustand';
import {
  getUserAchievements,
  getUserAchievementStats,
  checkAndAwardAchievements,
  markAchievementNotified,
} from '../services/achievementService';
import { AchievementProgress, UserAchievement, UserAchievementStats } from '../types';
import { logServiceError } from '../utils/error';

interface AchievementState {
  // State
  achievements: AchievementProgress[];
  userAchievements: UserAchievement[];
  stats: UserAchievementStats | null;
  newUnlockedAchievements: AchievementProgress[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchAchievements: (userId: string) => Promise<void>;
  fetchUserAchievements: (userId: string) => Promise<void>;
  refreshAchievements: (userId: string) => Promise<AchievementProgress[]>;
  getUnlockedAchievements: () => AchievementProgress[];
  getLockedAchievements: () => AchievementProgress[];
  getAchievementsByCategory: () => Record<string, AchievementProgress[]>;
  markAsNotified: (userId: string, achievementId: string) => Promise<void>;
  clearNewAchievements: () => void;
  clearState: () => void;
}

export const useAchievementStore = create<AchievementState>((set, get) => ({
  // Initial state
  achievements: [],
  userAchievements: [],
  stats: null,
  newUnlockedAchievements: [],
  isLoading: false,
  error: null,
  
  // Actions
  fetchAchievements: async (userId) => {
    set({ isLoading: true, error: null });
    
    try {
      // Get user stats
      const statsResult = await getUserAchievementStats(userId);
      
      if (!statsResult.success || !statsResult.data) {
        set({ error: 'Failed to fetch achievement stats', isLoading: false });
        return;
      }
      
      set({ stats: statsResult.data });
      
      // Check and award achievements
      const progressResult = await checkAndAwardAchievements(userId, statsResult.data);
      
      if (progressResult.success && progressResult.data) {
        // Find newly unlocked achievements (not notified yet)
        const userAchResult = await getUserAchievements(userId);
        const notNotified = userAchResult.data?.filter(a => !a.notified) || [];
        const newUnlocked = progressResult.data.filter(
          p => p.isUnlocked && notNotified.some(n => n.achievementId === p.achievementId)
        );
        
        set({
          achievements: progressResult.data,
          newUnlockedAchievements: newUnlocked,
          userAchievements: userAchResult.data || [],
        });
      }
    } catch (error) {
      set({ error: 'An error occurred while fetching achievements' });
    } finally {
      set({ isLoading: false });
    }
  },
  
  fetchUserAchievements: async (userId) => {
    try {
      const result = await getUserAchievements(userId);
      if (result.success && result.data) {
        set({ userAchievements: result.data });
      }
    } catch (error) {
      logServiceError('AchievementStore.fetchUserAchievements', error);
    }
  },
  
  refreshAchievements: async (userId) => {
    // Get fresh stats
    const statsResult = await getUserAchievementStats(userId);
    
    if (!statsResult.success || !statsResult.data) {
      return [];
    }
    
    set({ stats: statsResult.data });
    
    // Check for new achievements
    const progressResult = await checkAndAwardAchievements(userId, statsResult.data);
    
    if (progressResult.success && progressResult.data) {
      set({ achievements: progressResult.data });
      return progressResult.data;
    }
    
    return [];
  },
  
  getUnlockedAchievements: () => {
    const { achievements } = get();
    return achievements.filter(a => a.isUnlocked).sort((a, b) => {
      // Sort by unlock date, most recent first
      if (a.unlockedAt && b.unlockedAt) {
        return b.unlockedAt.getTime() - a.unlockedAt.getTime();
      }
      return 0;
    });
  },
  
  getLockedAchievements: () => {
    const { achievements } = get();
    return achievements.filter(a => !a.isUnlocked).sort((a, b) => {
      // Sort by percent complete, highest first
      return b.percentComplete - a.percentComplete;
    });
  },
  
  getAchievementsByCategory: () => {
    const { achievements } = get();
    const grouped: Record<string, AchievementProgress[]> = {};
    
    achievements.forEach(achievement => {
      const category = achievement.definition.category;
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(achievement);
    });
    
    // Sort by order within each category
    Object.keys(grouped).forEach(category => {
      grouped[category].sort((a, b) => a.definition.order - b.definition.order);
    });
    
    return grouped;
  },
  
  markAsNotified: async (userId, achievementId) => {
    try {
      await markAchievementNotified(userId, achievementId);
      
      set(state => ({
        newUnlockedAchievements: state.newUnlockedAchievements.filter(
          a => a.achievementId !== achievementId
        ),
        userAchievements: state.userAchievements.map(a =>
          a.achievementId === achievementId ? { ...a, notified: true } : a
        ),
      }));
    } catch (error) {
      logServiceError('AchievementStore.markAsNotified', error);
    }
  },
  
  clearNewAchievements: () => {
    set({ newUnlockedAchievements: [] });
  },
  
  clearState: () => {
    set({
      achievements: [],
      userAchievements: [],
      stats: null,
      newUnlockedAchievements: [],
      isLoading: false,
      error: null,
    });
  },
}));

export default useAchievementStore;
