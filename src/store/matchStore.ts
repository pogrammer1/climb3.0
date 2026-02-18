// Match Store - Climber matching state management
import { create } from 'zustand';
import { DocumentSnapshot } from 'firebase/firestore';
import {
  sendMatchRequest,
  acceptMatchRequest,
  rejectMatchRequest,
  removeMatch,
  getPendingRequests,
  getAcceptedMatches,
  getMatchedProfiles,
  getMatchStatus,
  calculateCompatibility,
} from '../services/matchService';
import { searchClimbers } from '../services/profileService';
import { ClimberProfile, ClimberMatch, ClimberSearchFilters } from '../types';
import { getApiErrorMessage, getErrorMessage } from '../utils';

interface MatchState {
  // State
  discoveredClimbers: ClimberProfile[];
  pendingRequests: ClimberMatch[];
  sentRequests: ClimberMatch[];
  acceptedMatches: ClimberMatch[];
  matchedProfiles: ClimberProfile[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  lastDoc: DocumentSnapshot | null;
  filters: ClimberSearchFilters;
  hasAppliedInitialFilters: boolean;
  
  // Actions
  fetchClimbers: (userId: string, refresh?: boolean) => Promise<void>;
  loadMoreClimbers: (userId: string) => Promise<void>;
  fetchPendingRequests: (userId: string) => Promise<void>;
  fetchAcceptedMatches: (userId: string) => Promise<void>;
  fetchMatchedProfiles: (userId: string) => Promise<void>;
  sendRequest: (userId: string, targetUserId: string) => Promise<boolean>;
  acceptRequest: (matchId: string) => Promise<{ success: boolean; conversationId?: string }>;
  rejectRequest: (matchId: string) => Promise<boolean>;
  unmatch: (matchId: string) => Promise<boolean>;
  checkMatchStatus: (userId: string, targetUserId: string) => Promise<{ status: string | null; matchId: string | null }>;
  getCompatibilityScore: (profile1: ClimberProfile, profile2: ClimberProfile) => number;
  setFilters: (filters: ClimberSearchFilters) => void;
  setHasAppliedInitialFilters: (value: boolean) => void;
  setError: (error: string | null) => void;
  clearState: () => void;
}

export const useMatchStore = create<MatchState>((set, get) => ({
  // Initial state
  discoveredClimbers: [],
  pendingRequests: [],
  sentRequests: [],
  acceptedMatches: [],
  matchedProfiles: [],
  isLoading: false,
  isLoadingMore: false,
  hasMore: false,
  error: null,
  lastDoc: null,
  filters: {},
  hasAppliedInitialFilters: false,
  
  // Actions
  fetchClimbers: async (userId, refresh = false) => {
    set({ isLoading: true, error: null });
    
    if (refresh) {
      set({ discoveredClimbers: [], lastDoc: null });
    }
    
    try {
      const { filters } = get();
      const result = await searchClimbers(userId, filters);
      
      if (result.success && result.data) {
        set({
          discoveredClimbers: result.data.items,
          hasMore: result.data.hasMore,
          lastDoc: result.data.lastDoc as DocumentSnapshot | null,
        });
      } else {
        set({ error: getApiErrorMessage(result, 'Failed to fetch climbers') });
      }
    } catch (error) {
      set({ error: getErrorMessage(error, 'Failed to fetch climbers') });
    } finally {
      set({ isLoading: false });
    }
  },
  
  loadMoreClimbers: async (userId) => {
    const { lastDoc, hasMore, isLoadingMore, filters } = get();
    if (!hasMore || isLoadingMore || !lastDoc) return;
    
    set({ isLoadingMore: true });
    
    try {
      const result = await searchClimbers(userId, filters, lastDoc);
      
      if (result.success && result.data) {
        set((state) => ({
          discoveredClimbers: [...state.discoveredClimbers, ...result.data!.items],
          hasMore: result.data!.hasMore,
          lastDoc: result.data!.lastDoc as DocumentSnapshot | null,
        }));
      }
    } catch (error) {
      set({ error: getErrorMessage(error, 'Failed to load more climbers') });
    } finally {
      set({ isLoadingMore: false });
    }
  },
  
  fetchPendingRequests: async (userId) => {
    try {
      const result = await getPendingRequests(userId);
      
      if (result.success && result.data) {
        set({ pendingRequests: result.data });
      } else {
        set({ error: getApiErrorMessage(result, 'Failed to fetch pending requests') });
      }
    } catch (error) {
      set({ error: getErrorMessage(error, 'Failed to fetch pending requests') });
    }
  },
  
  fetchAcceptedMatches: async (userId) => {
    try {
      const result = await getAcceptedMatches(userId);
      
      if (result.success && result.data) {
        set({ acceptedMatches: result.data });
      } else {
        set({ error: getApiErrorMessage(result, 'Failed to fetch accepted matches') });
      }
    } catch (error) {
      set({ error: getErrorMessage(error, 'Failed to fetch accepted matches') });
    }
  },
  
  fetchMatchedProfiles: async (userId) => {
    try {
      const result = await getMatchedProfiles(userId);
      
      if (result.success && result.data) {
        set({ matchedProfiles: result.data });
      } else {
        set({ error: getApiErrorMessage(result, 'Failed to fetch matched profiles') });
      }
    } catch (error) {
      set({ error: getErrorMessage(error, 'Failed to fetch matched profiles') });
    }
  },
  
  sendRequest: async (userId, targetUserId) => {
    try {
      const result = await sendMatchRequest(userId, targetUserId);
      
      if (result.success && result.data) {
        set((state) => ({
          sentRequests: [result.data!, ...state.sentRequests],
        }));
        return true;
      }
      set({ error: getApiErrorMessage(result, 'Failed to send match request') });
      return false;
    } catch (error) {
      set({ error: getErrorMessage(error, 'Failed to send match request') });
      return false;
    }
  },
  
  acceptRequest: async (matchId) => {
    try {
      const result = await acceptMatchRequest(matchId);
      
      if (result.success) {
        set((state) => ({
          pendingRequests: state.pendingRequests.filter((r) => r.id !== matchId),
        }));
        return { success: true, conversationId: result.data?.conversationId };
      }
      set({ error: getApiErrorMessage(result, 'Failed to accept match request') });
      return { success: false };
    } catch (error) {
      set({ error: getErrorMessage(error, 'Failed to accept match request') });
      return { success: false };
    }
  },
  
  rejectRequest: async (matchId) => {
    try {
      const result = await rejectMatchRequest(matchId);
      
      if (result.success) {
        set((state) => ({
          pendingRequests: state.pendingRequests.filter((r) => r.id !== matchId),
        }));
        return true;
      }
      set({ error: getApiErrorMessage(result, 'Failed to reject match request') });
      return false;
    } catch (error) {
      set({ error: getErrorMessage(error, 'Failed to reject match request') });
      return false;
    }
  },
  
  unmatch: async (matchId) => {
    try {
      const result = await removeMatch(matchId);
      
      if (result.success) {
        set((state) => ({
          acceptedMatches: state.acceptedMatches.filter((m) => m.id !== matchId),
          matchedProfiles: state.matchedProfiles.filter((p) => {
            const match = state.acceptedMatches.find((m) => m.id === matchId);
            return match ? p.uid !== match.matchedUserId && p.uid !== match.userId : true;
          }),
        }));
        return true;
      }
      set({ error: getApiErrorMessage(result, 'Failed to unmatch') });
      return false;
    } catch (error) {
      set({ error: getErrorMessage(error, 'Failed to unmatch') });
      return false;
    }
  },
  
  checkMatchStatus: async (userId, targetUserId) => {
    try {
      const result = await getMatchStatus(userId, targetUserId);
      return result.data || { status: null, matchId: null };
    } catch (error) {
      set({ error: getErrorMessage(error, 'Failed to check match status') });
      return { status: null, matchId: null };
    }
  },
  
  getCompatibilityScore: (profile1, profile2) => {
    return calculateCompatibility(profile1, profile2);
  },
  
  setFilters: (filters) => {
    set({ filters });
  },
  
  setHasAppliedInitialFilters: (value) => {
    set({ hasAppliedInitialFilters: value });
  },
  
  setError: (error) => {
    set({ error });
  },
  
  clearState: () => {
    set({
      discoveredClimbers: [],
      pendingRequests: [],
      sentRequests: [],
      acceptedMatches: [],
      matchedProfiles: [],
      hasMore: false,
      lastDoc: null,
      error: null,
      hasAppliedInitialFilters: false,
    });
  },
}));
