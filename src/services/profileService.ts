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
import { getGymNamesByCity } from './gymService';
import { logServiceError } from '../utils/error';

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
    logServiceError('ProfileService.getProfile', error);
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
    logServiceError('ProfileService.saveProfile', error);
    return {
      success: false,
      error: 'Failed to save profile',
    };
  }
};

/**
 * Convert image URI to blob (handles web and native differently)
 */
const uriToBlob = async (uri: string): Promise<Blob> => {
  // For web: data URIs or blob URLs work directly with fetch
  // For native: file:// URIs need XMLHttpRequest
  if (uri.startsWith('data:') || uri.startsWith('blob:') || uri.startsWith('http')) {
    const response = await fetch(uri);
    return await response.blob();
  }
  
  // For file:// URIs on native (React Native)
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = function () {
      resolve(xhr.response);
    };
    xhr.onerror = function (e) {
      logServiceError('ProfileService.uriToBlob', e);
      reject(new TypeError('Network request failed'));
    };
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
};

/**
 * Upload profile photo
 */
export const uploadProfilePhoto = async (
  userId: string,
  imageUri: string
): Promise<ApiResponse<string>> => {
  try {
    // Convert URI to blob with improved handling
    const blob = await uriToBlob(imageUri);
    
    if (blob.size === 0) {
      throw new Error('Image blob is empty');
    }
    
    // Create storage reference with file extension
    const timestamp = Date.now();
    const storageRef = ref(storage, `${STORAGE_PATHS.PROFILE_IMAGES}/${userId}/profile_${timestamp}.jpg`);
    
    // Upload file with metadata
    const metadata = {
      contentType: 'image/jpeg',
    };

    await uploadBytes(storageRef, blob, metadata);
    
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
    logServiceError('ProfileService.uploadProfilePhoto', error);
    return {
      success: false,
      error: error.message || 'Failed to upload photo',
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
    logServiceError('ProfileService.deleteProfilePhoto', error);
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
    logServiceError('ProfileService.updateLocation', error);
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
    // Simple query - just get all profiles and filter in memory
    // This avoids Firestore composite index requirements
    let q = query(
      collection(db, COLLECTIONS.PROFILES),
      orderBy('updatedAt', 'desc'),
      limit(50) // Get more and filter in memory
    );
    
    // Handle pagination
    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }
    
    const querySnapshot = await getDocs(q);
    
    let climbers: ClimberProfile[] = [];
    let lastVisible: DocumentSnapshot | null = null;
    
    querySnapshot.forEach((docSnap) => {
      // Exclude current user
      if (docSnap.id !== currentUserId) {
        const data = docSnap.data();
        
        // Only include searchable profiles (but be lenient with isProfileComplete for now)
        const isSearchable = data.isSearchable !== false; // Default to true if not set
        
        if (isSearchable) {
          climbers.push({
            uid: docSnap.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          } as ClimberProfile);
        }
        lastVisible = docSnap;
      }
    });
    
    // Apply filters in memory
    if (filters.experienceLevels && filters.experienceLevels.length > 0) {
      climbers = climbers.filter(c => 
        filters.experienceLevels!.includes(c.experienceLevel)
      );
    }
    
    if (filters.climbingTypes && filters.climbingTypes.length > 0) {
      climbers = climbers.filter(c => 
        c.climbingTypes?.some(type => filters.climbingTypes!.includes(type))
      );
    }
    
    // Filter by home gym
    if (filters.homeGym && filters.homeGym.trim() !== '') {
      const gymLower = filters.homeGym.trim().toLowerCase();
      climbers = climbers.filter(c =>
        c.homeGym && c.homeGym.toLowerCase().includes(gymLower)
      );
    }
    
    // Filter by city: match against user's city field, location.city, or gyms in that city
    if (filters.city && filters.city.trim() !== '') {
      const cityLower = filters.city.trim().toLowerCase();
      // Get gym names in this city from the gyms collection (supplementary)
      const gymNamesInCity = await getGymNamesByCity(filters.city);
      
      climbers = climbers.filter(c => {
        // Direct match: user has city field set on their profile
        if (c.city && c.city.toLowerCase().includes(cityLower)) {
          return true;
        }
        // Fallback: match against location.city
        if (c.location?.city && c.location.city.toLowerCase().includes(cityLower)) {
          return true;
        }
        // Supplementary: match homeGym against known gyms in the city
        if (c.homeGym && gymNamesInCity.length > 0) {
          const userGymLower = c.homeGym.toLowerCase();
          if (gymNamesInCity.some(gn => userGymLower.includes(gn) || gn.includes(userGymLower))) {
            return true;
          }
        }
        return false;
      });
    }
    
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
            hasMore: querySnapshot.size >= 50,
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
    logServiceError('ProfileService.searchClimbers', error);
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
    logServiceError('ProfileService.toggleSearchability', error);
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
