// Schedule Store - User availability/scheduling state management
import { create } from 'zustand';
import {
  getSchedule,
  saveSchedule,
  toggleDayAvailability,
  getConnectionScheduleMatches,
} from '../services/scheduleService';
import {
  WeeklySchedule,
  DayAvailability,
  TimeSlot,
  ConnectionScheduleMatch,
  DayOfWeek,
} from '../types';

interface ScheduleState {
  // State
  mySchedule: WeeklySchedule | null;
  connectionMatches: ConnectionScheduleMatch[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // Actions
  fetchMySchedule: (userId: string) => Promise<void>;
  updateSchedule: (
    userId: string,
    schedule: DayAvailability[],
    preferredGyms?: string[],
    notes?: string
  ) => Promise<boolean>;
  toggleDay: (
    userId: string,
    day: DayOfWeek,
    isAvailable: boolean,
    slots?: TimeSlot[]
  ) => Promise<boolean>;
  fetchConnectionMatches: (userId: string, connectionIds: string[]) => Promise<void>;
  setError: (error: string | null) => void;
  clearState: () => void;
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  // Initial state
  mySchedule: null,
  connectionMatches: [],
  isLoading: false,
  isSaving: false,
  error: null,

  // Actions
  fetchMySchedule: async (userId) => {
    set({ isLoading: true, error: null });

    try {
      const result = await getSchedule(userId);
      if (result.success && result.data) {
        set({ mySchedule: result.data });
      } else {
        set({ error: result.error || 'Failed to fetch schedule' });
      }
    } catch (error) {
      set({ error: 'An error occurred while fetching schedule' });
    } finally {
      set({ isLoading: false });
    }
  },

  updateSchedule: async (userId, schedule, preferredGyms = [], notes = '') => {
    set({ isSaving: true, error: null });

    try {
      const result = await saveSchedule(userId, schedule, preferredGyms, notes);
      if (result.success && result.data) {
        set({ mySchedule: result.data });
        return true;
      } else {
        set({ error: result.error || 'Failed to save schedule' });
        return false;
      }
    } catch (error) {
      set({ error: 'An error occurred while saving schedule' });
      return false;
    } finally {
      set({ isSaving: false });
    }
  },

  toggleDay: async (userId, day, isAvailable, slots = []) => {
    set({ isSaving: true, error: null });

    try {
      const result = await toggleDayAvailability(userId, day, isAvailable, slots);
      if (result.success && result.data) {
        set({ mySchedule: result.data });
        return true;
      } else {
        set({ error: result.error || 'Failed to update availability' });
        return false;
      }
    } catch (error) {
      set({ error: 'An error occurred while updating availability' });
      return false;
    } finally {
      set({ isSaving: false });
    }
  },

  fetchConnectionMatches: async (userId, connectionIds) => {
    set({ isLoading: true, error: null });

    try {
      const result = await getConnectionScheduleMatches(userId, connectionIds);
      if (result.success && result.data) {
        set({ connectionMatches: result.data });
      } else {
        set({ error: result.error || 'Failed to fetch connection matches' });
      }
    } catch (error) {
      set({ error: 'An error occurred while fetching matches' });
    } finally {
      set({ isLoading: false });
    }
  },

  setError: (error) => set({ error }),

  clearState: () =>
    set({
      mySchedule: null,
      connectionMatches: [],
      isLoading: false,
      isSaving: false,
      error: null,
    }),
}));
