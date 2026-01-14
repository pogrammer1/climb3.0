// Gym Service - Handles gym location data with optional Google Places integration
// 
// SETUP INSTRUCTIONS FOR GOOGLE PLACES API:
// 1. Go to https://console.cloud.google.com/
// 2. Create a new project or select your existing Firebase project
// 3. Enable "Places API" and "Maps JavaScript API"
// 4. Go to Credentials > Create Credentials > API Key
// 5. Restrict the API key to your domains (belay-91a94.web.app, localhost)
// 6. Add to your .env file: EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=your-api-key
//
// PRICING (as of 2024):
// - Places Autocomplete: $2.83 per 1000 requests
// - Place Details: $17 per 1000 requests  
// - Google gives $200/month free credit = ~7000 autocomplete searches free
//

import {
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  GeoPoint,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { COLLECTIONS } from '../constants';

// Types
export interface Gym {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  placeId?: string; // Google Places ID for deduplication
  location?: {
    latitude: number;
    longitude: number;
  };
  type: 'indoor' | 'outdoor';
  category: 'gym' | 'crag' | 'boulder_area';
  chain?: string;
  amenities?: string[];
  verified: boolean;
  addedBy?: string;
  sessionCount: number; // How many sessions logged here
  createdAt: Date;
  updatedAt: Date;
}

export interface PlaceAutocompleteResult {
  placeId: string;
  name: string;
  address: string;
}

// The collection for gyms in Firestore
const GYMS_COLLECTION = 'gyms';

/**
 * Search for gyms in our database first, then optionally Google Places
 */
export const searchGyms = async (
  searchQuery: string,
  locationType: 'indoor' | 'outdoor',
  userLocation?: { latitude: number; longitude: number }
): Promise<Gym[]> => {
  try {
    // First, search our local database
    const localResults = await searchLocalGyms(searchQuery, locationType);
    
    // If we have enough results, return them
    if (localResults.length >= 5) {
      return localResults;
    }
    
    // Otherwise, supplement with Google Places (if API key is available)
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
    if (apiKey && userLocation) {
      const googleResults = await searchGooglePlaces(searchQuery, locationType, userLocation, apiKey);
      
      // Merge results, avoiding duplicates by placeId
      const existingPlaceIds = new Set(localResults.map(g => g.placeId).filter(Boolean));
      const newGyms = googleResults.filter(g => !existingPlaceIds.has(g.placeId));
      
      return [...localResults, ...newGyms];
    }
    
    return localResults;
  } catch (error) {
    console.error('Error searching gyms:', error);
    return [];
  }
};

/**
 * Search gyms stored in Firestore
 */
export const searchLocalGyms = async (
  searchQuery: string,
  locationType: 'indoor' | 'outdoor'
): Promise<Gym[]> => {
  try {
    const gymsRef = collection(db, GYMS_COLLECTION);
    
    // Get all gyms of this type (Firestore doesn't support full-text search)
    const q = query(
      gymsRef,
      where('type', '==', locationType),
      orderBy('sessionCount', 'desc'),
      limit(50)
    );
    
    const snapshot = await getDocs(q);
    const allGyms = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Gym[];
    
    // Client-side filter by search query
    if (!searchQuery.trim()) {
      return allGyms.slice(0, 15);
    }
    
    const lowerQuery = searchQuery.toLowerCase();
    return allGyms.filter(gym => 
      gym.name.toLowerCase().includes(lowerQuery) ||
      gym.city.toLowerCase().includes(lowerQuery) ||
      gym.chain?.toLowerCase().includes(lowerQuery) ||
      gym.address.toLowerCase().includes(lowerQuery)
    );
  } catch (error) {
    console.error('Error searching local gyms:', error);
    return [];
  }
};

/**
 * Search Google Places API for climbing gyms
 */
export const searchGooglePlaces = async (
  searchQuery: string,
  locationType: 'indoor' | 'outdoor',
  userLocation: { latitude: number; longitude: number },
  apiKey: string
): Promise<Gym[]> => {
  try {
    // Build search term based on location type
    const searchTerm = locationType === 'indoor' 
      ? `${searchQuery} climbing gym` 
      : `${searchQuery} rock climbing outdoor`;
    
    // Use Places Autocomplete API
    const autocompleteUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(searchTerm)}&types=establishment&location=${userLocation.latitude},${userLocation.longitude}&radius=50000&key=${apiKey}`;
    
    const response = await fetch(autocompleteUrl);
    const data = await response.json();
    
    if (data.status !== 'OK' || !data.predictions) {
      console.warn('Google Places API error:', data.status);
      return [];
    }
    
    // Convert predictions to our Gym format
    const gyms: Gym[] = data.predictions.slice(0, 5).map((prediction: any) => ({
      id: `google_${prediction.place_id}`,
      placeId: prediction.place_id,
      name: prediction.structured_formatting?.main_text || prediction.description,
      address: prediction.structured_formatting?.secondary_text || '',
      city: extractCity(prediction.description),
      state: '',
      country: '',
      type: locationType,
      category: locationType === 'indoor' ? 'gym' : 'crag',
      verified: false,
      sessionCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    
    return gyms;
  } catch (error) {
    console.error('Error searching Google Places:', error);
    return [];
  }
};

/**
 * Get place details from Google Places API
 */
export const getPlaceDetails = async (
  placeId: string,
  apiKey: string
): Promise<Partial<Gym> | null> => {
  try {
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,geometry,address_components&key=${apiKey}`;
    
    const response = await fetch(detailsUrl);
    const data = await response.json();
    
    if (data.status !== 'OK' || !data.result) {
      return null;
    }
    
    const result = data.result;
    const addressComponents = result.address_components || [];
    
    return {
      name: result.name,
      address: result.formatted_address,
      city: extractAddressComponent(addressComponents, 'locality'),
      state: extractAddressComponent(addressComponents, 'administrative_area_level_1'),
      country: extractAddressComponent(addressComponents, 'country'),
      location: result.geometry?.location ? {
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
      } : undefined,
    };
  } catch (error) {
    console.error('Error getting place details:', error);
    return null;
  }
};

/**
 * Save a gym to Firestore (called when user selects a Google Places result)
 * This makes it available for everyone without additional API calls
 */
export const saveGymToDatabase = async (
  gym: Partial<Gym>,
  userId: string
): Promise<Gym | null> => {
  try {
    // Check if gym already exists by placeId
    if (gym.placeId) {
      const existingGym = await getGymByPlaceId(gym.placeId);
      if (existingGym) {
        return existingGym;
      }
    }
    
    const gymRef = doc(collection(db, GYMS_COLLECTION));
    const newGym: Gym = {
      id: gymRef.id,
      name: gym.name || '',
      address: gym.address || '',
      city: gym.city || '',
      state: gym.state || '',
      country: gym.country || '',
      placeId: gym.placeId,
      location: gym.location,
      type: gym.type || 'indoor',
      category: gym.category || 'gym',
      chain: gym.chain,
      verified: false,
      addedBy: userId,
      sessionCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await setDoc(gymRef, {
      ...newGym,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    console.log('Gym saved to database:', newGym.name);
    return newGym;
  } catch (error) {
    console.error('Error saving gym:', error);
    return null;
  }
};

/**
 * Get gym by Google Place ID
 */
export const getGymByPlaceId = async (placeId: string): Promise<Gym | null> => {
  try {
    const gymsRef = collection(db, GYMS_COLLECTION);
    const q = query(gymsRef, where('placeId', '==', placeId), limit(1));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }
    
    return {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data(),
    } as Gym;
  } catch (error) {
    console.error('Error getting gym by placeId:', error);
    return null;
  }
};

/**
 * Increment session count when a session is logged at this gym
 */
export const incrementGymSessionCount = async (gymId: string): Promise<void> => {
  try {
    const gymRef = doc(db, GYMS_COLLECTION, gymId);
    const gymSnap = await getDoc(gymRef);
    
    if (gymSnap.exists()) {
      const currentCount = gymSnap.data().sessionCount || 0;
      await setDoc(gymRef, {
        sessionCount: currentCount + 1,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }
  } catch (error) {
    console.error('Error incrementing session count:', error);
  }
};

/**
 * Get popular gyms (most sessions logged)
 */
export const getPopularGyms = async (
  locationType: 'indoor' | 'outdoor',
  limitCount: number = 10
): Promise<Gym[]> => {
  try {
    const gymsRef = collection(db, GYMS_COLLECTION);
    const q = query(
      gymsRef,
      where('type', '==', locationType),
      orderBy('sessionCount', 'desc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Gym[];
  } catch (error) {
    console.error('Error getting popular gyms:', error);
    return [];
  }
};

// Helper functions
function extractCity(description: string): string {
  const parts = description.split(',');
  return parts.length > 1 ? parts[1].trim() : '';
}

function extractAddressComponent(components: any[], type: string): string {
  const component = components.find((c: any) => c.types.includes(type));
  return component?.long_name || '';
}

export default {
  searchGyms,
  searchLocalGyms,
  searchGooglePlaces,
  getPlaceDetails,
  saveGymToDatabase,
  getGymByPlaceId,
  incrementGymSessionCount,
  getPopularGyms,
};
