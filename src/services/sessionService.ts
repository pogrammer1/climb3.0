// Session Service - Handles climbing session operations
import {
  doc,
  collection,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  DocumentSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { COLLECTIONS, STORAGE_PATHS, PAGINATION } from '../constants';
import {
  ClimbingSession,
  Climb,
  SessionFormData,
  ClimbFormData,
  ApiResponse,
  PaginatedResponse,
  SessionFilters,
} from '../types';

/**
 * Create a new climbing session
 */
export const createSession = async (
  userId: string,
  sessionData: SessionFormData
): Promise<ApiResponse<ClimbingSession>> => {
  try {
    const sessionsRef = collection(db, COLLECTIONS.SESSIONS);
    
    const newSession = {
      userId,
      date: sessionData.date,
      location: sessionData.location,
      locationType: sessionData.locationType,
      duration: parseInt(sessionData.duration, 10) || 0,
      notes: sessionData.notes || '',
      photos: [],
      climbs: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(sessionsRef, newSession);
    
    return {
      success: true,
      data: {
        id: docRef.id,
        ...newSession,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ClimbingSession,
      message: 'Session created successfully',
    };
  } catch (error: any) {
    console.error('Create session error:', error);
    return {
      success: false,
      error: 'Failed to create session',
    };
  }
};

/**
 * Get a single session by ID
 */
export const getSession = async (sessionId: string): Promise<ApiResponse<ClimbingSession>> => {
  try {
    const sessionRef = doc(db, COLLECTIONS.SESSIONS, sessionId);
    const sessionSnap = await getDoc(sessionRef);
    
    if (!sessionSnap.exists()) {
      return {
        success: false,
        error: 'Session not found',
      };
    }
    
    const data = sessionSnap.data();
    const session: ClimbingSession = {
      id: sessionSnap.id,
      ...data,
      date: data.date?.toDate() || new Date(),
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as ClimbingSession;
    
    return {
      success: true,
      data: session,
    };
  } catch (error: any) {
    console.error('Get session error:', error);
    return {
      success: false,
      error: 'Failed to fetch session',
    };
  }
};

/**
 * Get user's sessions with pagination and filters
 */
export const getUserSessions = async (
  userId: string,
  filters: SessionFilters = {},
  lastDoc?: DocumentSnapshot
): Promise<ApiResponse<PaginatedResponse<ClimbingSession>>> => {
  try {
    let q = query(
      collection(db, COLLECTIONS.SESSIONS),
      where('userId', '==', userId),
      orderBy('date', 'desc'),
      limit(PAGINATION.SESSIONS_PER_PAGE)
    );
    
    // Apply filters
    if (filters.locationType && filters.locationType !== 'all') {
      q = query(q, where('locationType', '==', filters.locationType));
    }
    
    if (filters.startDate) {
      q = query(q, where('date', '>=', filters.startDate));
    }
    
    if (filters.endDate) {
      q = query(q, where('date', '<=', filters.endDate));
    }
    
    // Handle pagination
    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }
    
    const querySnapshot = await getDocs(q);
    
    const sessions: ClimbingSession[] = [];
    let lastVisible: DocumentSnapshot | null = null;
    
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      sessions.push({
        id: docSnap.id,
        ...data,
        date: data.date?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as ClimbingSession);
      lastVisible = docSnap;
    });
    
    return {
      success: true,
      data: {
        items: sessions,
        hasMore: querySnapshot.size === PAGINATION.SESSIONS_PER_PAGE,
        lastDoc: lastVisible,
      },
    };
  } catch (error: any) {
    console.error('Get user sessions error:', error);
    return {
      success: false,
      error: 'Failed to fetch sessions',
    };
  }
};

/**
 * Update a session
 */
export const updateSession = async (
  sessionId: string,
  sessionData: Partial<SessionFormData>
): Promise<ApiResponse<null>> => {
  try {
    const sessionRef = doc(db, COLLECTIONS.SESSIONS, sessionId);
    
    const updateData: Record<string, any> = {
      ...sessionData,
      updatedAt: serverTimestamp(),
    };
    
    if (sessionData.duration) {
      updateData.duration = parseInt(sessionData.duration, 10);
    }
    
    await updateDoc(sessionRef, updateData);
    
    return {
      success: true,
      message: 'Session updated',
    };
  } catch (error: any) {
    console.error('Update session error:', error);
    return {
      success: false,
      error: 'Failed to update session',
    };
  }
};

/**
 * Delete a session and all its climbs
 */
export const deleteSession = async (sessionId: string): Promise<ApiResponse<null>> => {
  try {
    const batch = writeBatch(db);
    
    // Delete session document
    const sessionRef = doc(db, COLLECTIONS.SESSIONS, sessionId);
    batch.delete(sessionRef);
    
    // Delete all climbs in this session
    const climbsQuery = query(
      collection(db, COLLECTIONS.CLIMBS),
      where('sessionId', '==', sessionId)
    );
    const climbsSnap = await getDocs(climbsQuery);
    climbsSnap.forEach((climbDoc) => {
      batch.delete(climbDoc.ref);
    });
    
    await batch.commit();
    
    return {
      success: true,
      message: 'Session deleted',
    };
  } catch (error: any) {
    console.error('Delete session error:', error);
    return {
      success: false,
      error: 'Failed to delete session',
    };
  }
};

/**
 * Add a climb to a session
 */
export const addClimb = async (
  sessionId: string,
  climbData: ClimbFormData
): Promise<ApiResponse<Climb>> => {
  try {
    const climbsRef = collection(db, COLLECTIONS.CLIMBS);
    
    const newClimb = {
      sessionId,
      name: climbData.name,
      grade: climbData.grade,
      gradeSystem: climbData.gradeSystem,
      climbingType: climbData.climbingType,
      result: climbData.result,
      attempts: parseInt(climbData.attempts, 10) || 1,
      notes: climbData.notes || '',
      rating: climbData.rating || 0,
      photos: [],
      createdAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(climbsRef, newClimb);
    
    // Update session's updatedAt
    await updateDoc(doc(db, COLLECTIONS.SESSIONS, sessionId), {
      updatedAt: serverTimestamp(),
    });
    
    return {
      success: true,
      data: {
        id: docRef.id,
        ...newClimb,
      } as unknown as Climb,
      message: 'Climb added',
    };
  } catch (error: any) {
    console.error('Add climb error:', error);
    return {
      success: false,
      error: 'Failed to add climb',
    };
  }
};

/**
 * Get all climbs for a session
 */
export const getSessionClimbs = async (
  sessionId: string
): Promise<ApiResponse<Climb[]>> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.CLIMBS),
      where('sessionId', '==', sessionId),
      orderBy('createdAt', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    
    const climbs: Climb[] = [];
    querySnapshot.forEach((docSnap) => {
      climbs.push({
        id: docSnap.id,
        ...docSnap.data(),
      } as Climb);
    });
    
    return {
      success: true,
      data: climbs,
    };
  } catch (error: any) {
    console.error('Get session climbs error:', error);
    return {
      success: false,
      error: 'Failed to fetch climbs',
    };
  }
};

/**
 * Update a climb
 */
export const updateClimb = async (
  climbId: string,
  climbData: Partial<ClimbFormData>
): Promise<ApiResponse<null>> => {
  try {
    const climbRef = doc(db, COLLECTIONS.CLIMBS, climbId);
    
    const updateData: Record<string, any> = { ...climbData };
    if (climbData.attempts) {
      updateData.attempts = parseInt(climbData.attempts, 10);
    }
    
    await updateDoc(climbRef, updateData);
    
    return {
      success: true,
      message: 'Climb updated',
    };
  } catch (error: any) {
    console.error('Update climb error:', error);
    return {
      success: false,
      error: 'Failed to update climb',
    };
  }
};

/**
 * Delete a climb
 */
export const deleteClimb = async (climbId: string): Promise<ApiResponse<null>> => {
  try {
    await deleteDoc(doc(db, COLLECTIONS.CLIMBS, climbId));
    
    return {
      success: true,
      message: 'Climb deleted',
    };
  } catch (error: any) {
    console.error('Delete climb error:', error);
    return {
      success: false,
      error: 'Failed to delete climb',
    };
  }
};

/**
 * Upload session photo
 */
export const uploadSessionPhoto = async (
  sessionId: string,
  imageUri: string
): Promise<ApiResponse<string>> => {
  try {
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    const filename = `${sessionId}_${Date.now()}`;
    const storageRef = ref(storage, `${STORAGE_PATHS.SESSION_IMAGES}/${filename}`);
    
    await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(storageRef);
    
    // Update session with new photo
    const sessionRef = doc(db, COLLECTIONS.SESSIONS, sessionId);
    const sessionSnap = await getDoc(sessionRef);
    const currentPhotos = sessionSnap.data()?.photos || [];
    
    await updateDoc(sessionRef, {
      photos: [...currentPhotos, downloadURL],
      updatedAt: serverTimestamp(),
    });
    
    return {
      success: true,
      data: downloadURL,
      message: 'Photo uploaded',
    };
  } catch (error: any) {
    console.error('Upload session photo error:', error);
    return {
      success: false,
      error: 'Failed to upload photo',
    };
  }
};

/**
 * Get session statistics for a user
 */
export const getSessionStats = async (
  userId: string
): Promise<ApiResponse<{
  totalSessions: number;
  totalClimbs: number;
  totalDuration: number;
  highestGradeYDS: string | null;
  highestGradeBouldering: string | null;
  favoriteCrag: string | null;
}>> => {
  try {
    // Get all sessions
    const sessionsQuery = query(
      collection(db, COLLECTIONS.SESSIONS),
      where('userId', '==', userId)
    );
    const sessionsSnap = await getDocs(sessionsQuery);
    
    let totalSessions = 0;
    let totalDuration = 0;
    const locationCounts: Record<string, number> = {};
    
    sessionsSnap.forEach((docSnap) => {
      const data = docSnap.data();
      totalSessions++;
      totalDuration += data.duration || 0;
      
      if (data.location) {
        locationCounts[data.location] = (locationCounts[data.location] || 0) + 1;
      }
    });
    
    // Get all climbs
    const climbsQuery = query(
      collection(db, COLLECTIONS.CLIMBS),
      where('sessionId', 'in', sessionsSnap.docs.map((d) => d.id).slice(0, 10)) // Firestore limit
    );
    const climbsSnap = await getDocs(climbsQuery);
    
    const totalClimbs = climbsSnap.size;
    
    // Find favorite location
    let favoriteCrag: string | null = null;
    let maxCount = 0;
    Object.entries(locationCounts).forEach(([location, count]) => {
      if (count > maxCount) {
        maxCount = count;
        favoriteCrag = location;
      }
    });
    
    return {
      success: true,
      data: {
        totalSessions,
        totalClimbs,
        totalDuration,
        highestGradeYDS: null, // Would need to calculate
        highestGradeBouldering: null,
        favoriteCrag,
      },
    };
  } catch (error: any) {
    console.error('Get session stats error:', error);
    return {
      success: false,
      error: 'Failed to fetch statistics',
    };
  }
};
