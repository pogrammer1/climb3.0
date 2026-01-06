// Profile Service - Handles user profile operations
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  startAfter,
  GeoPoint,
  serverTimestamp,
  DocumentSnapshot,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { db, storage, auth } from '../config/firebase';
import { COLLECTIONS, STORAGE_PATHS, PAGINATION } from '../constants';
import {
  UserProfile,
  ClimberProfile,
  ProfileFormData,
  ApiResponse,
  PaginatedResponse,
  ClimberSearchFilters,
  Location,
} from '../types';

/**
 * Get user profile by ID
 */
export const getProfile = async (userId: string): Promise<ApiResponse<UserProfile>> => {
  try {
    const profileRef = doc(db, COLLECTIONS.PROFILES, userId);
    const profileSnap = await getDoc(profileRef);
    
    if (!profileSnap.exists()) {
      return {
        success: false,
        error: 'Profile not found',
      };
    }
    
    const data = profileSnap.data();
    const profile: UserProfile = {
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as UserProfile;
    
    return {
      success: true,
      data: profile,
    };
  } catch (error: any) {
    console.error('Get profile error:', error);
    return {
      success: false,
      error: 'Failed to fetch profile',
    };
  }
};

/**
 * Create or update user profile
 */
export const saveProfile = async (
  userId: string,
  profileData: Partial<ProfileFormData>,
  isNew: boolean = false
): Promise<ApiResponse<UserProfile>> => {
  try {
    const profileRef = doc(db, COLLECTIONS.PROFILES, userId);
    const user = auth.currentUser;
    
    const dataToSave: Partial<UserProfile> = {
      ...profileData,
      uid: userId,
      email: user?.email || '',
      updatedAt: new Date(),
      yearsClimbing: profileData.yearsClimbing ? parseInt(profileData.yearsClimbing, 10) : 0,
    };
    
    if (isNew) {
      dataToSave.createdAt = new Date();
      dataToSave.isProfileComplete = false;
      dataToSave.isSearchable = true;
    }
    
    // Check if profile is complete
    dataToSave.isProfileComplete = checkProfileCompleteness(dataToSave);
    
    await setDoc(profileRef, {
      ...dataToSave,
      updatedAt: serverTimestamp(),
      ...(isNew && { createdAt: serverTimestamp() }),
    }, { merge: true });
    
    // Update auth profile if display name changed
    if (profileData.displayName && user) {
      await updateProfile(user, { displayName: profileData.displayName });
    }
    
    const result = await getProfile(userId);
    return result;
  } catch (error: any) {
    console.error('Save profile error:', error);
    return {
      success: false,
      error: 'Failed to save profile',
    };
  }
};

/**
 * Upload profile photo
 */
export const uploadProfilePhoto = async (
  userId: string,
  imageUri: string
): Promise<ApiResponse<string>> => {
  try {
    // Convert URI to blob
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    // Create storage reference
    const storageRef = ref(storage, `${STORAGE_PATHS.PROFILE_IMAGES}/${userId}`);
    
    // Upload file
    await uploadBytes(storageRef, blob);
    
    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);
    
    // Update profile with photo URL
    await updateDoc(doc(db, COLLECTIONS.PROFILES, userId), {
      photoURL: downloadURL,
      updatedAt: serverTimestamp(),
    });
    
    // Update auth profile
    const user = auth.currentUser;
    if (user) {
      await updateProfile(user, { photoURL: downloadURL });
    }
    
    return {
      success: true,
      data: downloadURL,
      message: 'Profile photo uploaded',
    };
  } catch (error: any) {
    console.error('Upload photo error:', error);
    return {
      success: false,
      error: 'Failed to upload photo',
    };
  }
};

/**
 * Delete profile photo
 */
export const deleteProfilePhoto = async (userId: string): Promise<ApiResponse<null>> => {
  try {
    const storageRef = ref(storage, `${STORAGE_PATHS.PROFILE_IMAGES}/${userId}`);
    
    await deleteObject(storageRef);
    
    await updateDoc(doc(db, COLLECTIONS.PROFILES, userId), {
      photoURL: null,
      updatedAt: serverTimestamp(),
    });
    
    const user = auth.currentUser;
    if (user) {
      await updateProfile(user, { photoURL: '' });
    }
    
    return {
      success: true,
      message: 'Profile photo deleted',
    };
  } catch (error: any) {
    console.error('Delete photo error:', error);
    return {
      success: false,
      error: 'Failed to delete photo',
    };
  }
};

/**
 * Update user location
 */
export const updateLocation = async (
  userId: string,
  location: Location
): Promise<ApiResponse<null>> => {
  try {
    await updateDoc(doc(db, COLLECTIONS.PROFILES, userId), {
      location,
      geoPoint: new GeoPoint(location.latitude, location.longitude),
      updatedAt: serverTimestamp(),
    });
    
    return {
      success: true,
      message: 'Location updated',
    };
  } catch (error: any) {
    console.error('Update location error:', error);
    return {
      success: false,
      error: 'Failed to update location',
    };
  }
};

/**
 * Search for climbers with filters
 */
export const searchClimbers = async (
  currentUserId: string,
  filters: ClimberSearchFilters = {},
  lastDoc?: DocumentSnapshot
): Promise<ApiResponse<PaginatedResponse<ClimberProfile>>> => {
  try {
    let q = query(
      collection(db, COLLECTIONS.PROFILES),
      where('isSearchable', '==', true),
      where('isProfileComplete', '==', true),
      orderBy('updatedAt', 'desc'),
      limit(PAGINATION.CLIMBERS_PER_PAGE)
    );
    
    // Add filters
    if (filters.experienceLevels && filters.experienceLevels.length > 0) {
      q = query(q, where('experienceLevel', 'in', filters.experienceLevels));
    }
    
    if (filters.climbingTypes && filters.climbingTypes.length > 0) {
      q = query(q, where('climbingTypes', 'array-contains-any', filters.climbingTypes));
    }
    
    // Handle pagination
    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }
    
    const querySnapshot = await getDocs(q);
    
    const climbers: ClimberProfile[] = [];
    let lastVisible: DocumentSnapshot | null = null;
    
    querySnapshot.forEach((docSnap) => {
      if (docSnap.id !== currentUserId) {
        const data = docSnap.data();
        climbers.push({
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as ClimberProfile);
        lastVisible = docSnap;
      }
    });
    
    // Calculate distance if user location provided
    if (filters.location) {
      climbers.forEach((climber) => {
        if (climber.location) {
          climber.distance = calculateDistance(
            filters.location!.latitude,
            filters.location!.longitude,
            climber.location.latitude,
            climber.location.longitude
          );
        }
      });
      
      // Filter by max distance if specified
      if (filters.maxDistance) {
        const filtered = climbers.filter(
          (c) => c.distance !== undefined && c.distance <= filters.maxDistance!
        );
        return {
          success: true,
          data: {
            items: filtered,
            hasMore: querySnapshot.size === PAGINATION.CLIMBERS_PER_PAGE,
            lastDoc: lastVisible,
          },
        };
      }
    }
    
    return {
      success: true,
      data: {
        items: climbers,
        hasMore: querySnapshot.size === PAGINATION.CLIMBERS_PER_PAGE,
        lastDoc: lastVisible,
      },
    };
  } catch (error: any) {
    console.error('Search climbers error:', error);
    return {
      success: false,
      error: 'Failed to search climbers',
    };
  }
};

/**
 * Toggle profile visibility for search
 */
export const toggleSearchability = async (
  userId: string,
  isSearchable: boolean
): Promise<ApiResponse<null>> => {
  try {
    await updateDoc(doc(db, COLLECTIONS.PROFILES, userId), {
      isSearchable,
      updatedAt: serverTimestamp(),
    });
    
    return {
      success: true,
      message: `Profile ${isSearchable ? 'visible' : 'hidden'} in search`,
    };
  } catch (error: any) {
    console.error('Toggle searchability error:', error);
    return {
      success: false,
      error: 'Failed to update visibility',
    };
  }
};

/**
 * Check if profile has minimum required fields
 */
const checkProfileCompleteness = (profile: Partial<UserProfile>): boolean => {
  return Boolean(
    profile.displayName &&
    profile.experienceLevel &&
    profile.climbingTypes &&
    profile.climbingTypes.length > 0
  );
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // Round to 1 decimal
};

const toRad = (value: number): number => {
  return (value * Math.PI) / 180;
};
