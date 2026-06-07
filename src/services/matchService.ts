// Match Service - Handles climber matching operations
import {
  doc,
  collection,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  or,
  and,
  serverTimestamp,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, db } from '../config/firebase';
import { COLLECTIONS, MATCH_STATUS } from '../constants';
import {
  ClimberMatch,
  ClimberProfile,
  ApiResponse,
  MatchStatus,
} from '../types';
import { getOrCreateConversation } from './messageService';
import { getProfile } from './profileService';
import { logServiceError } from '../utils/error';

type SendMatchRequestCallableData = {
  targetUserId: string;
};

type SendMatchRequestCallableResult = {
  id: string;
  userId: string;
  matchedUserId: string;
  status: string;
  initiatedBy: string;
  createdAt: number;
  updatedAt: number;
};

/**
 * Send a match request to another climber
 */
export const sendMatchRequest = async (
  userId: string,
  targetUserId: string
): Promise<ApiResponse<ClimberMatch>> => {
  try {
    const functions = getFunctions(app, 'us-central1');
    const callable = httpsCallable<SendMatchRequestCallableData, SendMatchRequestCallableResult>(
      functions,
      'sendMatchRequest'
    );

    const callableResult = await callable({ targetUserId });
    const resultData = callableResult.data;

    if (!resultData?.id) {
      return {
        success: false,
        error: 'Failed to send match request',
      };
    }
    
    return {
      success: true,
      data: {
        id: resultData.id,
        userId: resultData.userId,
        matchedUserId: resultData.matchedUserId,
        status: resultData.status as ClimberMatch['status'],
        initiatedBy: resultData.initiatedBy,
        createdAt: new Date(resultData.createdAt),
        updatedAt: new Date(resultData.updatedAt),
      } as ClimberMatch,
      message: 'Match request sent',
    };
  } catch (error: any) {
    const errorCode = error?.code as string | undefined;
    if (errorCode === 'functions/already-exists') {
      return {
        success: false,
        error: 'A match request already exists with this climber',
      };
    }

    if (errorCode === 'functions/resource-exhausted') {
      const retryAfterMs = Number(error?.details?.retryAfterMs || 0);
      const retryMinutes = Math.max(1, Math.ceil(retryAfterMs / 60000));
      return {
        success: false,
        error: `Too many match requests. Please wait ${retryMinutes} minute(s) before trying again.`,
      };
    }

    if (errorCode === 'functions/permission-denied') {
      return {
        success: false,
        error: 'This account cannot send match requests right now.',
      };
    }

    logServiceError('MatchService.sendMatchRequest', error);
    return {
      success: false,
      error: 'Failed to send match request',
    };
  }
};

/**
 * Accept a match request and create a conversation
 */
export const acceptMatchRequest = async (
  matchId: string
): Promise<ApiResponse<{ conversationId?: string }>> => {
  try {
    const matchRef = doc(db, COLLECTIONS.MATCHES, matchId);
    const matchSnap = await getDoc(matchRef);
    
    if (!matchSnap.exists()) {
      return {
        success: false,
        error: 'Match request not found',
      };
    }
    
    const matchData = matchSnap.data();
    const requesterId = matchData.userId; // The person who sent the request
    const accepterId = matchData.matchedUserId; // The person accepting
    
    // Update match status
    await updateDoc(matchRef, {
      status: MATCH_STATUS.ACCEPTED,
      updatedAt: serverTimestamp(),
    });
    
    // Get both user profiles to create conversation
    const [requesterResult, accepterResult] = await Promise.all([
      getProfile(requesterId),
      getProfile(accepterId),
    ]);
    
    let conversationId: string | undefined;
    
    // Create a conversation between the two users
    if (requesterResult.success && requesterResult.data && accepterResult.success && accepterResult.data) {
      const convoResult = await getOrCreateConversation(
        accepterId,
        requesterId,
        requesterResult.data.displayName,
        requesterResult.data.photoURL || null
      );
      
      if (convoResult.success && convoResult.data) {
        conversationId = convoResult.data.id;
      }
    }
    
    return {
      success: true,
      data: { conversationId },
      message: 'Match request accepted',
    };
  } catch (error: any) {
    logServiceError('MatchService.acceptMatchRequest', error);
    return {
      success: false,
      error: 'Failed to accept match request',
    };
  }
};

/**
 * Reject a match request
 */
export const rejectMatchRequest = async (
  matchId: string
): Promise<ApiResponse<null>> => {
  try {
    const matchRef = doc(db, COLLECTIONS.MATCHES, matchId);
    
    await updateDoc(matchRef, {
      status: MATCH_STATUS.REJECTED,
      updatedAt: serverTimestamp(),
    });
    
    return {
      success: true,
      message: 'Match request rejected',
    };
  } catch (error: any) {
    logServiceError('MatchService.rejectMatchRequest', error);
    return {
      success: false,
      error: 'Failed to reject match request',
    };
  }
};

/**
 * Remove a match (unmatch)
 */
export const removeMatch = async (matchId: string): Promise<ApiResponse<null>> => {
  try {
    await deleteDoc(doc(db, COLLECTIONS.MATCHES, matchId));
    
    return {
      success: true,
      message: 'Match removed',
    };
  } catch (error: any) {
    logServiceError('MatchService.removeMatch', error);
    return {
      success: false,
      error: 'Failed to remove match',
    };
  }
};

/**
 * Get all pending match requests for a user
 */
export const getPendingRequests = async (
  userId: string
): Promise<ApiResponse<ClimberMatch[]>> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.MATCHES),
      where('matchedUserId', '==', userId),
      where('status', '==', MATCH_STATUS.PENDING),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    
    const requests: ClimberMatch[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      requests.push({
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as ClimberMatch);
    });
    
    return {
      success: true,
      data: requests,
    };
  } catch (error: any) {
    logServiceError('MatchService.getPendingRequests', error);
    return {
      success: false,
      error: 'Failed to fetch pending requests',
    };
  }
};

/**
 * Get all sent match requests by a user
 */
export const getSentRequests = async (
  userId: string
): Promise<ApiResponse<ClimberMatch[]>> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.MATCHES),
      where('userId', '==', userId),
      where('initiatedBy', '==', userId),
      where('status', '==', MATCH_STATUS.PENDING),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    
    const requests: ClimberMatch[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      requests.push({
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as ClimberMatch);
    });
    
    return {
      success: true,
      data: requests,
    };
  } catch (error: any) {
    logServiceError('MatchService.getSentRequests', error);
    return {
      success: false,
      error: 'Failed to fetch sent requests',
    };
  }
};

/**
 * Get all accepted matches for a user
 */
export const getAcceptedMatches = async (
  userId: string
): Promise<ApiResponse<ClimberMatch[]>> => {
  try {
    // Query for matches where user is either the sender or receiver
    const q = query(
      collection(db, COLLECTIONS.MATCHES),
      and(
        where('status', '==', MATCH_STATUS.ACCEPTED),
        or(
          where('userId', '==', userId),
          where('matchedUserId', '==', userId)
        )
      )
    );
    
    const querySnapshot = await getDocs(q);
    
    const matches: ClimberMatch[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      matches.push({
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as ClimberMatch);
    });
    
    return {
      success: true,
      data: matches,
    };
  } catch (error: any) {
    logServiceError('MatchService.getAcceptedMatches', error);
    return {
      success: false,
      error: 'Failed to fetch matches',
    };
  }
};

/**
 * Get matched climber profiles with their profile data
 */
export const getMatchedProfiles = async (
  userId: string
): Promise<ApiResponse<ClimberProfile[]>> => {
  try {
    const matchesResult = await getAcceptedMatches(userId);
    if (!matchesResult.success || !matchesResult.data) {
      return {
        success: false,
        error: matchesResult.error || 'Failed to fetch matches',
      };
    }
    
    const profiles: ClimberProfile[] = [];
    
    for (const match of matchesResult.data) {
      // Get the other user's ID
      const otherUserId = match.userId === userId ? match.matchedUserId : match.userId;
      
      // Fetch their profile
      const profileRef = doc(db, COLLECTIONS.PROFILES, otherUserId);
      const profileSnap = await getDoc(profileRef);
      
      if (profileSnap.exists()) {
        const data = profileSnap.data();
        profiles.push({
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as ClimberProfile);
      }
    }
    
    return {
      success: true,
      data: profiles,
    };
  } catch (error: any) {
    logServiceError('MatchService.getMatchedProfiles', error);
    return {
      success: false,
      error: 'Failed to fetch matched profiles',
    };
  }
};

/**
 * Check if a match already exists between two users
 */
export const getExistingMatch = async (
  userId: string,
  targetUserId: string
): Promise<ClimberMatch | null> => {
  try {
    // Check both directions
    const q = query(
      collection(db, COLLECTIONS.MATCHES),
      or(
        where('userId', '==', userId),
        where('matchedUserId', '==', userId)
      )
    );
    
    const querySnapshot = await getDocs(q);
    
    for (const docSnap of querySnapshot.docs) {
      const data = docSnap.data();
      if (
        (data.userId === userId && data.matchedUserId === targetUserId) ||
        (data.userId === targetUserId && data.matchedUserId === userId)
      ) {
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as ClimberMatch;
      }
    }
    
    return null;
  } catch (error) {
    logServiceError('MatchService.getExistingMatch', error);
    return null;
  }
};

/**
 * Get match status between two users
 */
export const getMatchStatus = async (
  userId: string,
  targetUserId: string
): Promise<ApiResponse<{
  status: MatchStatus | null;
  matchId: string | null;
  initiatedBy: string | null;
}>> => {
  try {
    const match = await getExistingMatch(userId, targetUserId);
    
    return {
      success: true,
      data: {
        status: match?.status || null,
        matchId: match?.id || null,
        initiatedBy: match?.initiatedBy || null,
      },
    };
  } catch (error: any) {
    logServiceError('MatchService.getMatchStatus', error);
    return {
      success: false,
      error: 'Failed to get match status',
    };
  }
};

/**
 * Calculate compatibility score between two profiles
 */
export const calculateCompatibility = (
  profile1: ClimberProfile,
  profile2: ClimberProfile
): number => {
  let score = 0;
  let maxScore = 0;
  
  // Climbing types overlap (30 points max)
  maxScore += 30;
  const types1 = new Set(profile1.climbingTypes);
  const types2 = new Set(profile2.climbingTypes);
  const typeOverlap = [...types1].filter((t) => types2.has(t)).length;
  score += Math.min(30, typeOverlap * 10);
  
  // Experience level match (20 points)
  maxScore += 20;
  if (profile1.experienceLevel === profile2.experienceLevel) {
    score += 20;
  } else {
    // Adjacent levels get partial points
    const levels = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
    const diff = Math.abs(
      levels.indexOf(profile1.experienceLevel) - levels.indexOf(profile2.experienceLevel)
    );
    score += Math.max(0, 20 - diff * 10);
  }
  
  // Available days overlap (25 points max)
  maxScore += 25;
  const days1 = new Set(profile1.availableDays);
  const days2 = new Set(profile2.availableDays);
  const dayOverlap = [...days1].filter((d) => days2.has(d)).length;
  score += Math.min(25, dayOverlap * 5);
  
  // Partner preferences match (25 points)
  maxScore += 25;
  const prefs1 = new Set(profile1.partnerPreferences);
  const prefs2 = new Set(profile2.partnerPreferences);
  const prefOverlap = [...prefs1].filter((p) => prefs2.has(p)).length;
  score += Math.min(25, prefOverlap * 8);
  
  return Math.round((score / maxScore) * 100);
};
