// Location Map Service - Aggregates session locations for map display
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { COLLECTIONS } from '../constants';
import { ClimbingSession } from '../types';

// Types for visited locations
export interface VisitedLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  locationType: 'indoor' | 'outdoor';
  sessionCount: number;
  firstVisit: Date;
  lastVisit: Date;
  totalDuration: number; // in minutes
}

// Cache for geocoded locations to avoid repeated API calls
const geocodeCache: Map<string, { latitude: number; longitude: number } | null> = new Map();

// Cloud Function URL for geocoding (avoids CORS issues)
const GEOCODE_FUNCTION_URL = 'https://us-central1-belay-91a94.cloudfunctions.net/geocodeLocation';

/**
 * Clear the geocode cache (useful when fixing bad coordinates)
 */
export const clearGeocodeCache = () => {
  geocodeCache.clear();
  console.log('Geocode cache cleared');
};

/**
 * Geocode a location name to coordinates using our Cloud Function
 * The Cloud Function calls OpenStreetMap Nominatim server-side (no CORS)
 */
export const geocodeLocation = async (locationName: string): Promise<{ latitude: number; longitude: number } | null> => {
  // Check cache first
  const cached = geocodeCache.get(locationName.toLowerCase());
  if (cached !== undefined) {
    return cached;
  }
  
  try {
    // Use our Cloud Function to geocode (avoids CORS issues)
    const response = await fetch(
      `${GEOCODE_FUNCTION_URL}?q=${encodeURIComponent(locationName)}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.latitude && data.longitude) {
      const result = {
        latitude: data.latitude,
        longitude: data.longitude,
      };
      geocodeCache.set(locationName.toLowerCase(), result);
      return result;
    }
    
    // Cache null result to avoid repeated failed lookups
    geocodeCache.set(locationName.toLowerCase(), null);
    return null;
  } catch (error) {
    console.error('Geocoding error for', locationName, error);
    geocodeCache.set(locationName.toLowerCase(), null);
    return null;
  }
};

/**
 * Get visited locations for a user from their sessions
 * Aggregates by location name and geocodes if needed
 */
export const getVisitedLocations = async (userId: string): Promise<VisitedLocation[]> => {
  try {
    // Fetch all sessions for the user
    const sessionsRef = collection(db, COLLECTIONS.SESSIONS);
    const q = query(
      sessionsRef,
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const sessions: ClimbingSession[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: data.date?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as ClimbingSession;
    });
    
    // Aggregate sessions by location
    const locationMap = new Map<string, {
      sessions: ClimbingSession[];
      locationType: 'indoor' | 'outdoor';
    }>();
    
    for (const session of sessions) {
      if (!session.location) {
        console.warn('Session missing location field:', session.id, session);
        continue; // skip this session
      }
      const key = session.location.toLowerCase().trim();
      if (!locationMap.has(key)) {
        locationMap.set(key, {
          sessions: [],
          locationType: session.locationType,
        });
      }
      locationMap.get(key)!.sessions.push(session);
    }
    
    // Convert to VisitedLocation array with geocoding
    const visitedLocations: VisitedLocation[] = [];
    
    // First, try to get coordinates from stored gyms
    const gymsRef = collection(db, 'gyms');
    const gymsSnapshot = await getDocs(gymsRef);
    const gymsMap = new Map<string, { 
      id: string;
      latitude?: number; 
      longitude?: number;
      city?: string;
      state?: string;
      address?: string;
    }>();
    
    // Log all gyms for debugging
    console.log('=== All gyms in database ===');
    gymsSnapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (!data.name) {
        console.warn('Gym missing name field:', docSnap.id, data);
        return; // skip this gym
      }
      const key = data.name.toLowerCase().trim();
      console.log(`Gym: "${data.name}" -> key: "${key}", city: "${data.city}", state: "${data.state}", address: "${data.address}", lat: ${data.location?.latitude}, lng: ${data.location?.longitude}`);
      gymsMap.set(key, {
        id: docSnap.id,
        latitude: data.location?.latitude,
        longitude: data.location?.longitude,
        city: data.city || '',
        state: data.state || '',
        address: data.address || '',
      });
    });
    console.log('=== End gyms list ===');
    
    // Process each unique location
    for (const [locationKey, { sessions, locationType }] of locationMap) {
      // Get the original location name (use the first session's format)
      const originalName = sessions[0].location;
      
      console.log(`Processing location: "${originalName}" (key: "${locationKey}")`);
      
      // Try to get coordinates from gyms database first
      const gymData = gymsMap.get(locationKey);
      let coordinates: { latitude: number; longitude: number } | null = null;
      
      console.log(`  Gym data found: ${gymData ? 'YES' : 'NO'}`, gymData);
      
      // If gym has stored coordinates, use them
      if (gymData?.latitude && gymData?.longitude) {
        coordinates = { latitude: gymData.latitude, longitude: gymData.longitude };
        console.log(`  Using stored coordinates: ${coordinates.latitude}, ${coordinates.longitude}`);
      }
      
      // If not found, try geocoding with city/state context for accuracy
      if (!coordinates) {
        // Build a more specific search query
        let searchQuery = originalName;
        let cityFromAddress = '';
        let stateFromAddress = '';
        
        // Extract city and state from address if available (format: "Street, City, ST, USA")
        if (gymData?.address) {
          const addressParts = gymData.address.split(',').map(p => p.trim());
          if (addressParts.length >= 3) {
            // Usually: Street, City, ST, USA or Street, City, ST USA
            cityFromAddress = addressParts[1] || '';
            // State might have "TX" or "TX USA"
            const stateMatch = addressParts[2]?.match(/([A-Z]{2})/);
            stateFromAddress = stateMatch ? stateMatch[1] : '';
          }
        }
        
        // Use extracted city/state, or fall back to stored values
        const city = cityFromAddress || gymData?.city || '';
        const state = stateFromAddress || gymData?.state || '';
        
        // Build geocoding query with city and state for accuracy
        if (city && state) {
          searchQuery = `${originalName}, ${city}, ${state}`;
        } else if (city) {
          searchQuery = `${originalName}, ${city}`;
        }
        
        // Add "climbing gym" to improve geocoding results for indoor locations
        if (locationType === 'indoor') {
          searchQuery = `${searchQuery} climbing gym`;
        }
        
        console.log(`  Geocoding with query: "${searchQuery}" (city: ${city}, state: ${state})`);
        coordinates = await geocodeLocation(searchQuery);
        console.log(`  Geocode result:`, coordinates);
        
        // If still not found, try alternative queries
        if (!coordinates && locationType === 'indoor') {
          // Try without "climbing gym" suffix
          if (city && state) {
            const simpleQuery = `${originalName}, ${city}, ${state}`;
            console.log(`  Trying without suffix: "${simpleQuery}"`);
            coordinates = await geocodeLocation(simpleQuery);
            console.log(`  Result:`, coordinates);
          }
          
          // Try with just city and state (no gym name - use for general location)
          if (!coordinates && city && state) {
            // Just get the city coordinates as fallback for now
            const cityQuery = `${city}, ${state}`;
            console.log(`  Trying city only: "${cityQuery}"`);
            const cityCoords = await geocodeLocation(cityQuery);
            if (cityCoords) {
              // Use city coordinates but log that this is approximate
              console.log(`  Using city coordinates (approximate): ${cityCoords.latitude}, ${cityCoords.longitude}`);
              coordinates = cityCoords;
            }
          }
        }
        
        // If we found coordinates and the gym exists but doesn't have them, save them!
        if (coordinates && gymData?.id) {
          try {
            const gymRef = doc(db, 'gyms', gymData.id);
            await setDoc(gymRef, {
              location: {
                latitude: coordinates.latitude,
                longitude: coordinates.longitude,
              },
              updatedAt: serverTimestamp(),
            }, { merge: true });
            console.log(`  ✓ Saved coordinates to gym ${gymData.id}`);
          } catch (e) {
            console.error(`  Failed to save coordinates to gym:`, e);
          }
        }
      }
      
      // Only add locations that we could geocode
      if (coordinates) {
        const sessionDates = sessions.map(s => new Date(s.date));
        const totalDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
        
        visitedLocations.push({
          id: locationKey.replace(/\s+/g, '-'),
          name: originalName,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          locationType,
          sessionCount: sessions.length,
          firstVisit: new Date(Math.min(...sessionDates.map(d => d.getTime()))),
          lastVisit: new Date(Math.max(...sessionDates.map(d => d.getTime()))),
          totalDuration,
        });
      }
    }
    
    // Sort by session count (most visited first)
    visitedLocations.sort((a, b) => b.sessionCount - a.sessionCount);
    
    return visitedLocations;
  } catch (error) {
    console.error('Error getting visited locations:', error);
    return [];
  }
};

/**
 * Get statistics about visited locations
 */
export const getLocationStats = (locations: VisitedLocation[]) => {
  const totalLocations = locations.length;
  const indoorCount = locations.filter(l => l.locationType === 'indoor').length;
  const outdoorCount = locations.filter(l => l.locationType === 'outdoor').length;
  const totalSessions = locations.reduce((sum, l) => sum + l.sessionCount, 0);
  const totalHours = locations.reduce((sum, l) => sum + l.totalDuration, 0) / 60;
  
  // Get unique cities/regions (this is a simplified version)
  const uniqueNames = new Set(locations.map(l => l.name));
  
  return {
    totalLocations,
    indoorCount,
    outdoorCount,
    totalSessions,
    totalHours: Math.round(totalHours * 10) / 10,
    uniqueLocations: uniqueNames.size,
  };
};
