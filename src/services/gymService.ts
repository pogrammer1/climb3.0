// Gym Service - Handles gym location data with optional Google Places integration

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
 * Uses the JavaScript API for web (due to CORS) and REST API for native
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
    
    // Check if we're in a browser environment
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      // Use Google Maps JavaScript API for web (handles CORS)
      return await searchWithJavaScriptAPI(searchTerm, locationType, userLocation, apiKey);
    } else {
      // Use REST API for native (no CORS issues)
      return await searchWithRestAPI(searchTerm, locationType, userLocation, apiKey);
    }
  } catch (error) {
    console.error('Error searching Google Places:', error);
    return [];
  }
};

/**
 * Load Google Maps JavaScript API dynamically (using async loading for best performance)
 */
let googleMapsLoaded = false;
let googleMapsLoadPromise: Promise<void> | null = null;

const loadGoogleMapsAPI = (apiKey: string): Promise<void> => {
  if (googleMapsLoaded && (window as any).google?.maps?.places) {
    return Promise.resolve();
  }
  
  if (googleMapsLoadPromise) {
    return googleMapsLoadPromise;
  }
  
  googleMapsLoadPromise = new Promise((resolve, reject) => {
    // Check if already loaded
    if ((window as any).google?.maps?.places) {
      googleMapsLoaded = true;
      resolve();
      return;
    }
    
    // Use the recommended async loading pattern with importLibrary
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async&libraries=places`;
    script.async = true;
    
    script.onload = () => {
      googleMapsLoaded = true;
      resolve();
    };
    
    script.onerror = () => {
      googleMapsLoadPromise = null;
      reject(new Error('Failed to load Google Maps API'));
    };
    
    document.head.appendChild(script);
  });
  
  return googleMapsLoadPromise;
};

/**
 * Search using Google Maps JavaScript API (for web)
 * Uses the new Places API (New) with AutocompleteSuggestion
 */
const searchWithJavaScriptAPI = async (
  searchTerm: string,
  locationType: 'indoor' | 'outdoor',
  userLocation: { latitude: number; longitude: number },
  apiKey: string
): Promise<Gym[]> => {
  try {
    await loadGoogleMapsAPI(apiKey);
    
    const google = (window as any).google;
    if (!google?.maps?.places) {
      console.warn('Google Maps Places library not available');
      return [];
    }
    
    // Use the new Places API (New) with AutocompleteSuggestion
    const { AutocompleteSuggestion, Place } = google.maps.places;
    
    if (AutocompleteSuggestion) {
      // New API available - use it
      try {
        // Create a proper Circle object for locationBias (new API format)
        const locationBias = new google.maps.Circle({
          center: { lat: userLocation.latitude, lng: userLocation.longitude },
          radius: 50000,
        });
        
        const request = {
          input: searchTerm,
          locationBias: locationBias,
          includedPrimaryTypes: ['establishment'],
        };
        
        const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
        
        if (!suggestions || suggestions.length === 0) {
          return [];
        }
        
        const gyms: Gym[] = suggestions.slice(0, 5).map((suggestion: any) => {
          const prediction = suggestion.placePrediction;
          return {
            id: `google_${prediction.placeId}`,
            placeId: prediction.placeId,
            name: prediction.mainText?.text || prediction.text?.text || '',
            address: prediction.secondaryText?.text || '',
            city: extractCity(prediction.text?.text || ''),
            state: '',
            country: '',
            type: locationType,
            category: locationType === 'indoor' ? 'gym' : 'crag',
            verified: false,
            sessionCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        });
        
        return gyms;
      } catch (newApiError: any) {
        // Check for expired key error
        if (newApiError?.message?.includes('ExpiredKey') || 
            newApiError?.message?.includes('InvalidKey') ||
            newApiError?.message?.includes('API key')) {
          console.error('Google Maps API key issue:', newApiError.message);
          // Don't fall back, just return empty results since the key is invalid
          return [];
        }
        console.warn('New Places API error, falling back to legacy:', newApiError);
        // Fall through to legacy API
      }
    }
    
    // Fallback to legacy AutocompleteService if new API not available
    return new Promise((resolve) => {
      const service = new google.maps.places.AutocompleteService();
      
      // Use location and radius for legacy API (proper format)
      const request = {
        input: searchTerm,
        location: new google.maps.LatLng(userLocation.latitude, userLocation.longitude),
        radius: 50000,
        types: ['establishment'],
      };
      
      service.getPlacePredictions(request, (predictions: any[], status: string) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions) {
          console.warn('Places autocomplete error:', status);
          resolve([]);
          return;
        }
        
        const gyms: Gym[] = predictions.slice(0, 5).map((prediction: any) => ({
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
        
        resolve(gyms);
      });
    });
  } catch (error: any) {
    // Check for API key errors
    if (error?.message?.includes('ExpiredKey') || 
        error?.message?.includes('InvalidKey') ||
        error?.message?.includes('API key')) {
      console.error('Google Maps API key issue:', error.message);
    } else {
      console.error('Error with JavaScript API:', error);
    }
    return [];
  }
};

/**
 * Search using REST API (for native apps - no CORS)
 */
const searchWithRestAPI = async (
  searchTerm: string,
  locationType: 'indoor' | 'outdoor',
  userLocation: { latitude: number; longitude: number },
  apiKey: string
): Promise<Gym[]> => {
  const autocompleteUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(searchTerm)}&types=establishment&location=${userLocation.latitude},${userLocation.longitude}&radius=50000&key=${apiKey}`;
  
  const response = await fetch(autocompleteUrl);
  const data = await response.json();
  
  if (data.status !== 'OK' || !data.predictions) {
    console.warn('Google Places API error:', data.status);
    return [];
  }
  
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
};

/**
 * Get place details from Google Places API
 * Uses JavaScript API for web (CORS), REST API for native
 */
export const getPlaceDetails = async (
  placeId: string,
  apiKey: string
): Promise<Partial<Gym> | null> => {
  try {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      return await getPlaceDetailsWithJavaScriptAPI(placeId, apiKey);
    } else {
      return await getPlaceDetailsWithRestAPI(placeId, apiKey);
    }
  } catch (error) {
    console.error('Error getting place details:', error);
    return null;
  }
};

/**
 * Get place details using JavaScript API (for web)
 * Uses the new Places API (New) with Place class
 */
const getPlaceDetailsWithJavaScriptAPI = async (
  placeId: string,
  apiKey: string
): Promise<Partial<Gym> | null> => {
  try {
    await loadGoogleMapsAPI(apiKey);
    
    const google = (window as any).google;
    if (!google?.maps?.places) {
      return null;
    }
    
    // Try to use the new Place class first
    const { Place } = google.maps.places;
    
    if (Place) {
      try {
        const place = new Place({ id: placeId });
        await place.fetchFields({
          fields: ['displayName', 'formattedAddress', 'location', 'addressComponents'],
        });
        
        const addressComponents = place.addressComponents || [];
        
        return {
          name: place.displayName || '',
          address: place.formattedAddress || '',
          city: extractAddressComponentNew(addressComponents, 'locality'),
          state: extractAddressComponentNew(addressComponents, 'administrative_area_level_1'),
          country: extractAddressComponentNew(addressComponents, 'country'),
          location: place.location ? {
            latitude: place.location.lat(),
            longitude: place.location.lng(),
          } : undefined,
        };
      } catch (newApiError) {
        console.warn('New Place API error, falling back to legacy:', newApiError);
        // Fall through to legacy API
      }
    }
    
    // Fallback to legacy PlacesService
    return new Promise((resolve) => {
      const div = document.createElement('div');
      const service = new google.maps.places.PlacesService(div);
      
      service.getDetails(
        {
          placeId: placeId,
          fields: ['name', 'formatted_address', 'geometry', 'address_components'],
        },
        (result: any, status: string) => {
          if (status !== google.maps.places.PlacesServiceStatus.OK || !result) {
            resolve(null);
            return;
          }
          
          const addressComponents = result.address_components || [];
          
          resolve({
            name: result.name,
            address: result.formatted_address,
            city: extractAddressComponent(addressComponents, 'locality'),
            state: extractAddressComponent(addressComponents, 'administrative_area_level_1'),
            country: extractAddressComponent(addressComponents, 'country'),
            location: result.geometry?.location ? {
              latitude: result.geometry.location.lat(),
              longitude: result.geometry.location.lng(),
            } : undefined,
          });
        }
      );
    });
  } catch (error) {
    console.error('Error with JavaScript API place details:', error);
    return null;
  }
};

/**
 * Extract address component from new Places API format
 */
const extractAddressComponentNew = (components: any[], type: string): string => {
  const component = components.find((c: any) => c.types?.includes(type));
  return component?.longText || component?.shortText || '';
};

/**
 * Get place details using REST API (for native)
 */
const getPlaceDetailsWithRestAPI = async (
  placeId: string,
  apiKey: string
): Promise<Partial<Gym> | null> => {
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
    
    // Build the gym object, excluding undefined values
    const newGym: Record<string, any> = {
      id: gymRef.id,
      name: gym.name || '',
      address: gym.address || '',
      city: gym.city || '',
      state: gym.state || '',
      country: gym.country || '',
      type: gym.type || 'indoor',
      category: gym.category || 'gym',
      verified: false,
      addedBy: userId,
      sessionCount: 0,
    };
    
    // Only add optional fields if they have values
    if (gym.placeId) {
      newGym.placeId = gym.placeId;
    }
    if (gym.location) {
      newGym.location = gym.location;
    }
    if (gym.chain) {
      newGym.chain = gym.chain;
    }
    
    await setDoc(gymRef, {
      ...newGym,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    console.log('Gym saved to database:', newGym.name);
    return {
      ...newGym,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Gym;
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
