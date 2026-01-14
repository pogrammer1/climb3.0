// GymPicker - Select from nearby climbing gyms with Google Places integration
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Pressable, TextInput, Platform } from 'react-native';
import { Text, useTheme, Portal, Modal, Searchbar, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { searchGyms, saveGymToDatabase, Gym } from '../../services/gymService';
import { useAuthStore } from '../../store';

// Fallback gyms when database is empty or offline
const FALLBACK_GYMS: Gym[] = [
  // Northeast US
  { id: '1', name: 'Brooklyn Boulders Queensbridge', address: '', city: 'Queens', state: 'NY', country: 'USA', type: 'indoor', category: 'gym', chain: 'Brooklyn Boulders', verified: true, sessionCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: '2', name: 'Brooklyn Boulders Gowanus', address: '', city: 'Brooklyn', state: 'NY', country: 'USA', type: 'indoor', category: 'gym', chain: 'Brooklyn Boulders', verified: true, sessionCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: '3', name: 'The Cliffs at LIC', address: '', city: 'Long Island City', state: 'NY', country: 'USA', type: 'indoor', category: 'gym', chain: 'The Cliffs', verified: true, sessionCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: '4', name: 'The Cliffs at Gowanus', address: '', city: 'Brooklyn', state: 'NY', country: 'USA', type: 'indoor', category: 'gym', chain: 'The Cliffs', verified: true, sessionCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: '5', name: 'Central Rock Gym', address: '', city: 'Worcester', state: 'MA', country: 'USA', type: 'indoor', category: 'gym', chain: 'Central Rock', verified: true, sessionCount: 0, createdAt: new Date(), updatedAt: new Date() },
  // West Coast
  { id: '6', name: 'Sender One LAX', address: '', city: 'Los Angeles', state: 'CA', country: 'USA', type: 'indoor', category: 'gym', chain: 'Sender One', verified: true, sessionCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: '7', name: 'Touchstone Mission Cliffs', address: '', city: 'San Francisco', state: 'CA', country: 'USA', type: 'indoor', category: 'gym', chain: 'Touchstone', verified: true, sessionCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: '8', name: 'Seattle Bouldering Project', address: '', city: 'Seattle', state: 'WA', country: 'USA', type: 'indoor', category: 'gym', chain: 'Bouldering Project', verified: true, sessionCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: '9', name: 'Planet Granite Portland', address: '', city: 'Portland', state: 'OR', country: 'USA', type: 'indoor', category: 'gym', chain: 'Planet Granite', verified: true, sessionCount: 0, createdAt: new Date(), updatedAt: new Date() },
  // Midwest & South
  { id: '10', name: 'First Ascent Chicago', address: '', city: 'Chicago', state: 'IL', country: 'USA', type: 'indoor', category: 'gym', chain: 'First Ascent', verified: true, sessionCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: '11', name: 'Austin Bouldering Project', address: '', city: 'Austin', state: 'TX', country: 'USA', type: 'indoor', category: 'gym', chain: 'Bouldering Project', verified: true, sessionCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: '12', name: 'Stone Summit Atlanta', address: '', city: 'Atlanta', state: 'GA', country: 'USA', type: 'indoor', category: 'gym', chain: 'Stone Summit', verified: true, sessionCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: '13', name: 'Movement Denver', address: '', city: 'Denver', state: 'CO', country: 'USA', type: 'indoor', category: 'gym', chain: 'Movement', verified: true, sessionCount: 0, createdAt: new Date(), updatedAt: new Date() },
  // Outdoor spots
  { id: 'out1', name: 'Red Rocks', address: '', city: 'Las Vegas', state: 'NV', country: 'USA', type: 'outdoor', category: 'crag', verified: true, sessionCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: 'out2', name: 'Joshua Tree', address: '', city: 'Joshua Tree', state: 'CA', country: 'USA', type: 'outdoor', category: 'boulder_area', verified: true, sessionCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: 'out3', name: 'Smith Rock', address: '', city: 'Terrebonne', state: 'OR', country: 'USA', type: 'outdoor', category: 'crag', verified: true, sessionCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: 'out4', name: 'The Gunks', address: '', city: 'New Paltz', state: 'NY', country: 'USA', type: 'outdoor', category: 'crag', verified: true, sessionCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: 'out5', name: 'Yosemite Valley', address: '', city: 'Yosemite', state: 'CA', country: 'USA', type: 'outdoor', category: 'crag', verified: true, sessionCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: 'out6', name: 'Bishop', address: '', city: 'Bishop', state: 'CA', country: 'USA', type: 'outdoor', category: 'boulder_area', verified: true, sessionCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: 'out7', name: 'Hueco Tanks', address: '', city: 'El Paso', state: 'TX', country: 'USA', type: 'outdoor', category: 'boulder_area', verified: true, sessionCount: 0, createdAt: new Date(), updatedAt: new Date() },
  { id: 'out8', name: 'Rumney', address: '', city: 'Rumney', state: 'NH', country: 'USA', type: 'outdoor', category: 'crag', verified: true, sessionCount: 0, createdAt: new Date(), updatedAt: new Date() },
];

interface GymPickerProps {
  value: string;
  onSelect: (gymName: string, gymId?: string) => void;
  locationType: 'indoor' | 'outdoor';
  error?: string;
}

export const GymPicker: React.FC<GymPickerProps> = ({
  value,
  onSelect,
  locationType,
  error,
}) => {
  const theme = useTheme();
  const { user } = useAuthStore();
  const [visible, setVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [customLocation, setCustomLocation] = useState('');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Get user's location on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }
      } catch (e) {
        console.log('Location permission not granted');
      }
    })();
  }, []);

  // Load initial gyms when modal opens
  useEffect(() => {
    if (visible) {
      loadGyms();
    }
  }, [visible, locationType]);

  // Search gyms when query changes (debounced)
  useEffect(() => {
    if (!visible) return;
    
    const timeoutId = setTimeout(() => {
      loadGyms(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, locationType, visible]);

  const loadGyms = async (query: string = '') => {
    setIsLoading(true);
    try {
      // Try to get gyms from database/Google Places
      const results = await searchGyms(query, locationType, userLocation || undefined);
      
      if (results.length > 0) {
        setGyms(results);
      } else {
        // Fall back to local list if no results
        const fallbackFiltered = FALLBACK_GYMS.filter(g => g.type === locationType);
        if (query) {
          const lowerQuery = query.toLowerCase();
          setGyms(fallbackFiltered.filter(g => 
            g.name.toLowerCase().includes(lowerQuery) ||
            g.city.toLowerCase().includes(lowerQuery) ||
            g.chain?.toLowerCase().includes(lowerQuery)
          ));
        } else {
          setGyms(fallbackFiltered);
        }
      }
    } catch (error) {
      console.error('Error loading gyms:', error);
      // Use fallback on error
      const fallbackFiltered = FALLBACK_GYMS.filter(g => g.type === locationType);
      setGyms(fallbackFiltered);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = async (gym: Gym) => {
    // If it's a Google Places result (not yet in our DB), save it
    if (gym.id.startsWith('google_') && user) {
      const savedGym = await saveGymToDatabase(gym, user.uid);
      if (savedGym) {
        onSelect(savedGym.name, savedGym.id);
      } else {
        onSelect(gym.name, gym.id);
      }
    } else {
      onSelect(gym.name, gym.id);
    }
    setVisible(false);
    setSearchQuery('');
  };

  const handleCustomSubmit = async () => {
    if (customLocation.trim() && user) {
      // Save custom location to database
      const customGym: Partial<Gym> = {
        name: customLocation.trim(),
        type: locationType,
        category: locationType === 'indoor' ? 'gym' : 'crag',
        city: '',
        address: '',
        state: '',
        country: '',
      };
      
      const savedGym = await saveGymToDatabase(customGym, user.uid);
      if (savedGym) {
        onSelect(savedGym.name, savedGym.id);
      } else {
        onSelect(customLocation.trim());
      }
      
      setVisible(false);
      setCustomLocation('');
      setSearchQuery('');
    } else if (customLocation.trim()) {
      onSelect(customLocation.trim());
      setVisible(false);
      setCustomLocation('');
      setSearchQuery('');
    }
  };

  const openPicker = () => {
    setSearchQuery('');
    setCustomLocation('');
    setVisible(true);
  };

  const formatGymLocation = (gym: Gym): string => {
    if (gym.city && gym.state) {
      return `${gym.city}, ${gym.state}`;
    }
    return gym.city || gym.address || '';
  };

  return (
    <View style={styles.container}>
      <Text variant="labelMedium" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>
        Location
      </Text>
      
      <Pressable
        onPress={openPicker}
        style={[
          styles.selector,
          { 
            backgroundColor: theme.colors.surfaceVariant,
            borderColor: error ? theme.colors.error : theme.colors.outline,
          }
        ]}
      >
        <MaterialCommunityIcons 
          name="map-marker" 
          size={20} 
          color={theme.colors.onSurfaceVariant} 
        />
        <Text 
          style={[
            styles.selectorText,
            { color: value ? theme.colors.onSurface : theme.colors.onSurfaceVariant }
          ]}
          numberOfLines={1}
        >
          {value || (locationType === 'indoor' ? 'Select a gym...' : 'Select a location...')}
        </Text>
        <MaterialCommunityIcons 
          name="chevron-down" 
          size={20} 
          color={theme.colors.onSurfaceVariant} 
        />
      </Pressable>
      
      {error && (
        <Text variant="bodySmall" style={[styles.errorText, { color: theme.colors.error }]}>
          {error}
        </Text>
      )}

      <Portal>
        <Modal
          visible={visible}
          onDismiss={() => setVisible(false)}
          contentContainerStyle={[
            styles.modal,
            { backgroundColor: theme.colors.surface }
          ]}
        >
          <View style={styles.modalHeader}>
            <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>
              {locationType === 'indoor' ? 'Select Gym' : 'Select Location'}
            </Text>
            <Pressable onPress={() => setVisible(false)}>
              <MaterialCommunityIcons name="close" size={24} color={theme.colors.onSurface} />
            </Pressable>
          </View>

          <Searchbar
            placeholder={locationType === 'indoor' ? 'Search gyms...' : 'Search locations...'}
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={[styles.searchbar, { backgroundColor: theme.colors.surfaceVariant }]}
            inputStyle={{ color: theme.colors.onSurface }}
          />

          {/* Custom location input */}
          <View style={styles.customInputContainer}>
            <TextInput
              placeholder="Or enter custom location..."
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={customLocation}
              onChangeText={setCustomLocation}
              onSubmitEditing={handleCustomSubmit}
              style={[
                styles.customInput,
                { 
                  backgroundColor: theme.colors.surfaceVariant,
                  color: theme.colors.onSurface,
                  borderColor: theme.colors.outline,
                }
              ]}
            />
            {customLocation.trim() && (
              <Pressable 
                onPress={handleCustomSubmit}
                style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
              >
                <MaterialCommunityIcons name="plus" size={20} color="#fff" />
              </Pressable>
            )}
          </View>

          <ScrollView style={styles.gymList} showsVerticalScrollIndicator={false}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
                  Searching gyms...
                </Text>
              </View>
            ) : gyms.length > 0 ? (
              <>
                <Text variant="labelSmall" style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
                  {searchQuery ? 'SEARCH RESULTS' : 'POPULAR LOCATIONS'}
                </Text>
                {gyms.map((gym) => (
                  <Pressable
                    key={gym.id}
                    onPress={() => handleSelect(gym)}
                    style={({ pressed }) => [
                      styles.gymItem,
                      { 
                        backgroundColor: pressed ? theme.colors.surfaceVariant : 'transparent',
                        borderBottomColor: theme.colors.outline,
                      }
                    ]}
                  >
                    <View style={[styles.gymIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                      <MaterialCommunityIcons 
                        name={gym.type === 'indoor' ? 'domain' : 'terrain'} 
                        size={20} 
                        color={theme.colors.primary} 
                      />
                    </View>
                    <View style={styles.gymInfo}>
                      <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
                        {gym.name}
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {formatGymLocation(gym)}
                        {gym.sessionCount > 0 && ` • ${gym.sessionCount} sessions`}
                        {gym.id.startsWith('google_') && ' • via Google'}
                      </Text>
                    </View>
                    <MaterialCommunityIcons 
                      name="chevron-right" 
                      size={20} 
                      color={theme.colors.onSurfaceVariant} 
                    />
                  </Pressable>
                ))}
              </>
            ) : (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons 
                  name="map-search" 
                  size={48} 
                  color={theme.colors.onSurfaceVariant} 
                />
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8, textAlign: 'center' }}>
                  No locations found.{'\n'}Enter a custom location above.
                </Text>
              </View>
            )}
          </ScrollView>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 6,
    fontWeight: '500',
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  selectorText: {
    flex: 1,
    fontSize: 16,
  },
  errorText: {
    marginTop: 4,
    marginLeft: 4,
  },
  modal: {
    margin: 20,
    borderRadius: 16,
    maxHeight: '80%',
    ...Platform.select({
      web: {
        maxWidth: 500,
        alignSelf: 'center',
        width: '100%',
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  searchbar: {
    marginHorizontal: 16,
    marginBottom: 8,
    elevation: 0,
  },
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  customInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gymList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    maxHeight: 400,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  sectionLabel: {
    marginTop: 8,
    marginBottom: 8,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  gymItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  gymIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gymInfo: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
});

export default GymPicker;
