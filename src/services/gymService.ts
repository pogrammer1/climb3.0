// Gym Service - Handles local and user-added gym location data

import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { logServiceError } from '../utils/error';

export interface Gym {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  placeId?: string;
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
  sessionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const GYMS_COLLECTION = 'gyms';

const FALLBACK_CITIES: Record<string, string[]> = {
  queens: ['Brooklyn Boulders Queensbridge'],
  brooklyn: ['Brooklyn Boulders Gowanus', 'The Cliffs at Gowanus'],
  'long island city': ['The Cliffs at LIC'],
  worcester: ['Central Rock Gym'],
  'los angeles': ['Sender One LAX'],
  'san francisco': ['Touchstone Mission Cliffs'],
  seattle: ['Seattle Bouldering Project'],
  portland: ['Planet Granite Portland'],
  chicago: ['First Ascent Chicago'],
  austin: ['Austin Bouldering Project'],
  atlanta: ['Stone Summit Atlanta'],
  denver: ['Movement Denver'],
};

const logDebugWarning = (message: string): void => {
  if (__DEV__) {
    console.warn(message);
  }
};

/**
 * Get all gym names in a given city from Firestore and the local fallback list.
 */
export const getGymNamesByCity = async (city: string): Promise<string[]> => {
  const cityLower = city.trim().toLowerCase();
  if (!cityLower) return [];

  try {
    const gymsRef = collection(db, GYMS_COLLECTION);
    const snapshot = await getDocs(query(gymsRef, limit(200)));
    const gymNames: string[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.city && data.city.toLowerCase().includes(cityLower)) {
        gymNames.push(data.name.toLowerCase());
      }
    });

    for (const [fallbackCity, fallbackGyms] of Object.entries(FALLBACK_CITIES)) {
      if (fallbackCity.includes(cityLower) || cityLower.includes(fallbackCity)) {
        for (const name of fallbackGyms) {
          const nameLower = name.toLowerCase();
          if (!gymNames.includes(nameLower)) {
            gymNames.push(nameLower);
          }
        }
      }
    }

    return gymNames;
  } catch (error) {
    logServiceError('GymService.getGymNamesByCity', error);
    return [];
  }
};

export const searchGyms = async (
  searchQuery: string,
  locationType: 'indoor' | 'outdoor'
): Promise<Gym[]> => {
  try {
    return await searchLocalGyms(searchQuery, locationType);
  } catch (error) {
    logServiceError('GymService.searchGyms', error);
    return [];
  }
};

export const searchLocalGyms = async (
  searchQuery: string,
  locationType: 'indoor' | 'outdoor'
): Promise<Gym[]> => {
  try {
    const gymsRef = collection(db, GYMS_COLLECTION);
    const q = query(
      gymsRef,
      where('type', '==', locationType),
      orderBy('sessionCount', 'desc'),
      limit(50)
    );

    const snapshot = await getDocs(q);
    const allGyms = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Gym[];

    if (!searchQuery.trim()) {
      return allGyms.slice(0, 15);
    }

    const lowerQuery = searchQuery.toLowerCase();
    return allGyms.filter((gym) =>
      gym.name.toLowerCase().includes(lowerQuery) ||
      gym.city.toLowerCase().includes(lowerQuery) ||
      gym.chain?.toLowerCase().includes(lowerQuery) ||
      gym.address.toLowerCase().includes(lowerQuery)
    );
  } catch (error) {
    logServiceError('GymService.searchLocalGyms', error);
    return [];
  }
};

export const saveGymToDatabase = async (
  gym: Partial<Gym>,
  userId: string
): Promise<Gym | null> => {
  try {
    if (gym.placeId) {
      const existingGym = await getGymByPlaceId(gym.placeId);
      if (existingGym) {
        return existingGym;
      }
    }

    const gymRef = doc(collection(db, GYMS_COLLECTION));
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

    if (gym.placeId) newGym.placeId = gym.placeId;
    if (gym.location) newGym.location = gym.location;
    if (gym.chain) newGym.chain = gym.chain;

    await setDoc(gymRef, {
      ...newGym,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    logDebugWarning('Gym saved to database');
    return {
      ...newGym,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Gym;
  } catch (error) {
    logServiceError('GymService.saveGymToDatabase', error);
    return null;
  }
};

export const updateGymCoordinates = async (
  gymId: string,
  location: { latitude: number; longitude: number },
  city?: string,
  state?: string
): Promise<void> => {
  try {
    const gymRef = doc(db, GYMS_COLLECTION, gymId);
    const updateData: Record<string, any> = {
      location,
      updatedAt: serverTimestamp(),
    };
    if (city) updateData.city = city;
    if (state) updateData.state = state;

    await setDoc(gymRef, updateData, { merge: true });
    logDebugWarning('Updated gym coordinates');
  } catch (error) {
    logServiceError('GymService.updateGymCoordinates', error);
  }
};

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
    logServiceError('GymService.getGymByPlaceId', error);
    return null;
  }
};

export const incrementGymSessionCount = async (gymId: string): Promise<void> => {
  if (__DEV__) {
    console.warn(`Gym popularity counters are disabled on Firebase Spark (${gymId}).`);
  }
};

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
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Gym[];
  } catch (error) {
    logServiceError('GymService.getPopularGyms', error);
    return [];
  }
};

export default {
  searchGyms,
  searchLocalGyms,
  saveGymToDatabase,
  getGymByPlaceId,
  incrementGymSessionCount,
  getPopularGyms,
};
