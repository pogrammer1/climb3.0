// Session Store - Climbing sessions state management
import { create } from 'zustand';
import {
  getUserSessions,
  createSession,
  updateSession,
  deleteSession,
  getSession,
  addClimb,
  updateClimb,
  getSessionClimbs,
  deleteClimb,
  getSessionStats,
} from '../services/sessionService';
import { ClimbingSession, Climb, SessionFormData, ClimbFormData, SessionFilters } from '../types';

interface SessionState {
  // State
  sessions: ClimbingSession[];
  currentSession: ClimbingSession | null;
  currentSessionClimbs: Climb[];
  stats: {
    totalSessions: number;
    totalClimbs: number;
    totalDuration: number;
    highestGradeYDS: string | null;
    highestGradeBouldering: string | null;
    favoriteCrag: string | null;
  } | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  lastDoc: unknown;
  filters: SessionFilters;
  
  // Actions
  fetchSessions: (userId: string, refresh?: boolean) => Promise<void>;
  loadMoreSessions: (userId: string) => Promise<void>;
  fetchSession: (sessionId: string) => Promise<void>;
  fetchSessionClimbs: (sessionId: string) => Promise<void>;
  createNewSession: (userId: string, data: SessionFormData) => Promise<ClimbingSession | null>;
  updateExistingSession: (sessionId: string, data: Partial<SessionFormData>) => Promise<boolean>;
  deleteExistingSession: (sessionId: string) => Promise<boolean>;
  addClimbToSession: (sessionId: string, data: ClimbFormData) => Promise<Climb | null>;
  updateClimbInSession: (climbId: string, data: Partial<ClimbFormData>) => Promise<boolean>;
  deleteClimbFromSession: (climbId: string) => Promise<boolean>;
  fetchStats: (userId: string) => Promise<void>;
  setFilters: (filters: SessionFilters) => void;
  clearCurrentSession: () => void;
  setError: (error: string | null) => void;
  resetStore: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  // Initial state
  sessions: [],
  currentSession: null,
  currentSessionClimbs: [],
  stats: null,
  isLoading: false,
  isLoadingMore: false,
  hasMore: false,
  error: null,
  lastDoc: null,
  filters: {},
  
  // Actions
  fetchSessions: async (userId, refresh = false) => {
    set({ isLoading: true, error: null });
    
    if (refresh) {
      set({ sessions: [], lastDoc: null });
    }
    
    try {
      const { filters } = get();
      const result = await getUserSessions(userId, filters);
      
      if (result.success && result.data) {
        set({
          sessions: result.data.items,
          hasMore: result.data.hasMore,
          lastDoc: result.data.lastDoc,
        });
      } else {
        set({ error: result.error || 'Failed to fetch sessions' });
      }
    } catch (error) {
      set({ error: 'An error occurred while fetching sessions' });
    } finally {
      set({ isLoading: false });
    }
  },
  
  loadMoreSessions: async (userId) => {
    const { lastDoc, hasMore, isLoadingMore, filters } = get();
    if (!hasMore || isLoadingMore || !lastDoc) return;
    
    set({ isLoadingMore: true });
    
    try {
      const result = await getUserSessions(userId, filters, lastDoc as any);
      
      if (result.success && result.data) {
        set((state) => ({
          sessions: [...state.sessions, ...result.data!.items],
          hasMore: result.data!.hasMore,
          lastDoc: result.data!.lastDoc,
        }));
      }
    } catch (error) {
      console.error('Load more sessions error:', error);
    } finally {
      set({ isLoadingMore: false });
    }
  },
  
  fetchSession: async (sessionId) => {
    set({ isLoading: true, error: null });
    
    try {
      const result = await getSession(sessionId);
      
      if (result.success && result.data) {
        set({ currentSession: result.data });
        // Also fetch climbs
        await get().fetchSessionClimbs(sessionId);
      } else {
        set({ error: result.error || 'Failed to fetch session' });
      }
    } catch (error) {
      set({ error: 'An error occurred while fetching session' });
    } finally {
      set({ isLoading: false });
    }
  },
  
  fetchSessionClimbs: async (sessionId) => {
    try {
      const result = await getSessionClimbs(sessionId);
      
      if (result.success && result.data) {
        set({ currentSessionClimbs: result.data });
      }
    } catch (error) {
      console.error('Fetch session climbs error:', error);
    }
  },
  
  createNewSession: async (userId, data) => {
    set({ isLoading: true, error: null });
    
    try {
      const result = await createSession(userId, data);
      
      if (result.success && result.data) {
        set((state) => ({
          sessions: [result.data!, ...state.sessions],
        }));
        return result.data;
      } else {
        set({ error: result.error || 'Failed to create session' });
        return null;
      }
    } catch (error) {
      set({ error: 'An error occurred while creating session' });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
  
  updateExistingSession: async (sessionId, data) => {
    try {
      const result = await updateSession(sessionId, data);
      
      if (result.success) {
        // Refresh session data
        await get().fetchSession(sessionId);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Update session error:', error);
      return false;
    }
  },
  
  deleteExistingSession: async (sessionId) => {
    try {
      const result = await deleteSession(sessionId);
      
      if (result.success) {
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== sessionId),
          currentSession: state.currentSession?.id === sessionId ? null : state.currentSession,
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Delete session error:', error);
      return false;
    }
  },
  
  addClimbToSession: async (sessionId, data) => {
    try {
      const result = await addClimb(sessionId, data);
      
      if (result.success && result.data) {
        set((state) => ({
          currentSessionClimbs: [...state.currentSessionClimbs, result.data!],
        }));
        // Refresh the session to update climb count and other stats
        await get().fetchSession(sessionId);
        return result.data;
      }
      return null;
    } catch (error) {
      console.error('Add climb error:', error);
      return null;
    }
  },
  
  updateClimbInSession: async (climbId, data) => {
    try {
      const result = await updateClimb(climbId, data);
      
      if (result.success) {
        // Update the climb in local state
        set((state) => ({
          currentSessionClimbs: state.currentSessionClimbs.map((c) =>
            c.id === climbId
              ? {
                  ...c,
                  name: data.name ?? c.name,
                  climbingType: data.climbingType ?? c.climbingType,
                  grade: (data.grade ?? c.grade) as typeof c.grade,
                  gradeSystem: data.gradeSystem ?? c.gradeSystem,
                  result: data.result ?? c.result,
                  attempts: data.attempts ? parseInt(data.attempts, 10) : c.attempts,
                  notes: data.notes ?? c.notes,
                  rating: data.rating ?? c.rating,
                }
              : c
          ),
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Update climb error:', error);
      return false;
    }
  },
  
  deleteClimbFromSession: async (climbId) => {
    try {
      const result = await deleteClimb(climbId);
      
      if (result.success) {
        set((state) => ({
          currentSessionClimbs: state.currentSessionClimbs.filter((c) => c.id !== climbId),
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Delete climb error:', error);
      return false;
    }
  },
  
  fetchStats: async (userId) => {
    try {
      const result = await getSessionStats(userId);
      
      if (result.success && result.data) {
        set({ stats: result.data });
      }
    } catch (error) {
      console.error('Fetch stats error:', error);
    }
  },
  
  setFilters: (filters) => {
    set({ filters });
  },
  
  clearCurrentSession: () => {
    set({ currentSession: null, currentSessionClimbs: [] });
  },
  
  setError: (error) => {
    set({ error });
  },
  
  resetStore: () => {
    set({
      sessions: [],
      currentSession: null,
      currentSessionClimbs: [],
      stats: null,
      isLoading: false,
      isLoadingMore: false,
      hasMore: false,
      error: null,
      lastDoc: null,
      filters: {},
    });
  },
}));
