// Schedule Service - Handles user availability/scheduling operations
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { COLLECTIONS, DAYS_OF_WEEK } from '../constants';
import {
  WeeklySchedule,
  DayAvailability,
  TimeSlot,
  ScheduleOverlap,
  ConnectionScheduleMatch,
  UserProfile,
  ApiResponse,
  DayOfWeek,
} from '../types';
import { getProfile } from './profileService';
import { logServiceError } from '../utils/error';

/**
 * Get a user's weekly schedule
 */
export const getSchedule = async (userId: string): Promise<ApiResponse<WeeklySchedule>> => {
  try {
    const scheduleRef = doc(db, COLLECTIONS.SCHEDULES, userId);
    const scheduleSnap = await getDoc(scheduleRef);

    if (!scheduleSnap.exists()) {
      // Return a default empty schedule if none exists
      const defaultSchedule: WeeklySchedule = {
        id: userId,
        userId,
        schedule: DAYS_OF_WEEK.map((day) => ({
          day: day as DayOfWeek,
          slots: [],
          isAvailable: false,
        })),
        preferredGyms: [],
        notes: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return {
        success: true,
        data: defaultSchedule,
      };
    }

    const data = scheduleSnap.data();
    const schedule: WeeklySchedule = {
      ...data,
      id: scheduleSnap.id,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as WeeklySchedule;

    return {
      success: true,
      data: schedule,
    };
  } catch (error: any) {
    logServiceError('ScheduleService.getSchedule', error);
    return {
      success: false,
      error: 'Failed to fetch schedule',
    };
  }
};

/**
 * Save/update user's weekly schedule
 */
export const saveSchedule = async (
  userId: string,
  schedule: DayAvailability[],
  preferredGyms: string[] = [],
  notes: string = ''
): Promise<ApiResponse<WeeklySchedule>> => {
  try {
    const scheduleRef = doc(db, COLLECTIONS.SCHEDULES, userId);
    const existingSnap = await getDoc(scheduleRef);
    const isNew = !existingSnap.exists();

    const dataToSave = {
      userId,
      schedule,
      preferredGyms,
      notes,
      updatedAt: serverTimestamp(),
      ...(isNew && { createdAt: serverTimestamp() }),
    };

    await setDoc(scheduleRef, dataToSave, { merge: true });

    return await getSchedule(userId);
  } catch (error: any) {
    logServiceError('ScheduleService.saveSchedule', error);
    return {
      success: false,
      error: 'Failed to save schedule',
    };
  }
};

/**
 * Toggle availability for a specific day
 */
export const toggleDayAvailability = async (
  userId: string,
  day: DayOfWeek,
  isAvailable: boolean,
  slots: TimeSlot[] = []
): Promise<ApiResponse<WeeklySchedule>> => {
  try {
    const currentSchedule = await getSchedule(userId);
    if (!currentSchedule.success || !currentSchedule.data) {
      return {
        success: false,
        error: 'Could not fetch current schedule',
      };
    }

    const updatedSchedule = currentSchedule.data.schedule.map((daySchedule) =>
      daySchedule.day === day
        ? { ...daySchedule, isAvailable, slots: isAvailable ? slots : [] }
        : daySchedule
    );

    return await saveSchedule(
      userId,
      updatedSchedule,
      currentSchedule.data.preferredGyms,
      currentSchedule.data.notes
    );
  } catch (error: any) {
    logServiceError('ScheduleService.toggleDayAvailability', error);
    return {
      success: false,
      error: 'Failed to update availability',
    };
  }
};

/**
 * Calculate time overlap between two time slots
 */
const calculateSlotOverlap = (slot1: TimeSlot, slot2: TimeSlot): TimeSlot | null => {
  const toMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const toTimeString = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const start1 = toMinutes(slot1.startTime);
  const end1 = toMinutes(slot1.endTime);
  const start2 = toMinutes(slot2.startTime);
  const end2 = toMinutes(slot2.endTime);

  const overlapStart = Math.max(start1, start2);
  const overlapEnd = Math.min(end1, end2);

  if (overlapStart < overlapEnd) {
    return {
      startTime: toTimeString(overlapStart),
      endTime: toTimeString(overlapEnd),
    };
  }

  return null;
};

/**
 * Find schedule overlaps between two users
 */
export const findScheduleOverlaps = (
  schedule1: WeeklySchedule,
  schedule2: WeeklySchedule
): ScheduleOverlap[] => {
  const overlaps: ScheduleOverlap[] = [];

  for (const day1 of schedule1.schedule) {
    if (!day1.isAvailable || day1.slots.length === 0) continue;

    const day2 = schedule2.schedule.find((d) => d.day === day1.day);
    if (!day2 || !day2.isAvailable || day2.slots.length === 0) continue;

    const overlappingSlots: TimeSlot[] = [];

    for (const slot1 of day1.slots) {
      for (const slot2 of day2.slots) {
        const overlap = calculateSlotOverlap(slot1, slot2);
        if (overlap) {
          overlappingSlots.push(overlap);
        }
      }
    }

    if (overlappingSlots.length > 0) {
      overlaps.push({
        day: day1.day,
        overlappingSlots,
      });
    }
  }

  return overlaps;
};

/**
 * Calculate total overlap minutes from schedule overlaps
 */
const calculateTotalOverlapMinutes = (overlaps: ScheduleOverlap[]): number => {
  const toMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  let total = 0;
  for (const dayOverlap of overlaps) {
    for (const slot of dayOverlap.overlappingSlots) {
      const start = toMinutes(slot.startTime);
      const end = toMinutes(slot.endTime);
      total += end - start;
    }
  }

  return total;
};

/**
 * Get schedule matches for all connections
 */
export const getConnectionScheduleMatches = async (
  userId: string,
  connectionIds: string[]
): Promise<ApiResponse<ConnectionScheduleMatch[]>> => {
  try {
    // Get user's schedule
    const userScheduleResult = await getSchedule(userId);
    if (!userScheduleResult.success || !userScheduleResult.data) {
      return {
        success: false,
        error: 'Could not fetch your schedule',
      };
    }

    const userSchedule = userScheduleResult.data;
    const matches: ConnectionScheduleMatch[] = [];

    // Fetch schedules and profiles for all connections
    for (const connectionId of connectionIds) {
      try {
        const [scheduleResult, profileResult] = await Promise.all([
          getSchedule(connectionId),
          getProfile(connectionId),
        ]);

        if (
          scheduleResult.success &&
          scheduleResult.data &&
          profileResult.success &&
          profileResult.data
        ) {
          const overlaps = findScheduleOverlaps(userSchedule, scheduleResult.data);
          const totalOverlapMinutes = calculateTotalOverlapMinutes(overlaps);

          matches.push({
            connectionId,
            connectionProfile: profileResult.data,
            overlaps,
            totalOverlapMinutes,
          });
        }
      } catch (error) {
        logServiceError('ScheduleService.getConnectionScheduleMatches.connectionFetch', error);
        // Continue with other connections
      }
    }

    // Sort by total overlap time (most overlap first)
    matches.sort((a, b) => b.totalOverlapMinutes - a.totalOverlapMinutes);

    return {
      success: true,
      data: matches,
    };
  } catch (error: any) {
    logServiceError('ScheduleService.getConnectionScheduleMatches', error);
    return {
      success: false,
      error: 'Failed to fetch schedule matches',
    };
  }
};

/**
 * Format time slot for display
 */
export const formatTimeSlot = (slot: TimeSlot): string => {
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  return `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`;
};

/**
 * Format overlap duration for display
 */
export const formatOverlapDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
};
