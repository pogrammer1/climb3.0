// Sessions Map Screen - Displays visited climbing locations on a map
import React, { useEffect, useState, useMemo } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { Text, useTheme, IconButton, Card, Chip, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore, useSessionStore } from '../../store';
import { getVisitedLocations, VisitedLocation, clearGeocodeCache } from '../../services/locationMapService';
import { logServiceError } from '../../utils/error';
import { format } from 'date-fns';

// Import WebMapView only on web platform
// eslint-disable-next-line @typescript-eslint/no-var-requires
const WebMapView = Platform.OS === 'web' ? require('../../components/common/WebMapView').WebMapView : null;

interface SessionsMapScreenProps {
  navigation: any;
}

// Default center (US center) - will be overridden by user's locations
const DEFAULT_CENTER = {
  latitude: 39.8283,
  longitude: -98.5795,
};

export const SessionsMapScreen: React.FC<SessionsMapScreenProps> = ({ navigation }) => {
  const theme = useTheme();
  const { user } = useAuthStore();
  const { sessions } = useSessionStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const [visitedLocations, setVisitedLocations] = useState<VisitedLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<VisitedLocation | null>(null);
  const [filter, setFilter] = useState<'all' | 'indoor' | 'outdoor'>('all');

  // Load visited locations
  useEffect(() => {
    const loadLocations = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        // Clear geocode cache to allow fresh lookups if needed
        clearGeocodeCache();
        
        const locations = await getVisitedLocations(user.uid);
        
        // Check for locations with duplicate coordinates and log them
        const coordCounts = new Map<string, string[]>();
        locations.forEach(loc => {
          const key = `${loc.latitude.toFixed(5)},${loc.longitude.toFixed(5)}`;
          const existing = coordCounts.get(key) || [];
          existing.push(loc.name);
          coordCounts.set(key, existing);
        });
        coordCounts.forEach((names) => {
          if (__DEV__ && names.length > 1) {
            logServiceError('SessionsMapScreen.duplicateCoordinates', {
              message: `Duplicate coordinate group detected (${names.length} locations).`,
            });
          }
        });
        
        setVisitedLocations(locations);
      } catch (error) {
        logServiceError('SessionsMapScreen.loadLocations', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadLocations();
  }, [user, sessions]); // Re-load when sessions change

  // Filter locations
  const filteredLocations = useMemo(() => {
    if (filter === 'all') return visitedLocations;
    return visitedLocations.filter(loc => loc.locationType === filter);
  }, [visitedLocations, filter]);

  // Calculate map center
  const mapCenter = useMemo(() => {
    if (filteredLocations.length === 0) return DEFAULT_CENTER;
    
    const avgLat = filteredLocations.reduce((sum, loc) => sum + loc.latitude, 0) / filteredLocations.length;
    const avgLng = filteredLocations.reduce((sum, loc) => sum + loc.longitude, 0) / filteredLocations.length;
    
    return { latitude: avgLat, longitude: avgLng };
  }, [filteredLocations]);

  // Render stats card
  const renderStats = () => {
    const indoorCount = visitedLocations.filter(l => l.locationType === 'indoor').length;
    const outdoorCount = visitedLocations.filter(l => l.locationType === 'outdoor').length;
    const totalSessions = visitedLocations.reduce((sum, l) => sum + l.sessionCount, 0);
    
    return (
      <Card style={[styles.statsCard, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text variant="headlineSmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
              {visitedLocations.length}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Locations
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.colors.outline }]} />
          <View style={styles.statItem}>
            <Text variant="headlineSmall" style={{ color: '#048A81', fontWeight: 'bold' }}>
              {indoorCount}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Indoor
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.colors.outline }]} />
          <View style={styles.statItem}>
            <Text variant="headlineSmall" style={{ color: '#FF6B35', fontWeight: 'bold' }}>
              {outdoorCount}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Outdoor
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.colors.outline }]} />
          <View style={styles.statItem}>
            <Text variant="headlineSmall" style={{ color: theme.colors.onBackground, fontWeight: 'bold' }}>
              {totalSessions}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Sessions
            </Text>
          </View>
        </View>
      </Card>
    );
  };

  // Render filter chips
  const renderFilters = () => (
    <View style={styles.filterContainer}>
      <Chip
        selected={filter === 'all'}
        onPress={() => setFilter('all')}
        style={[styles.filterChip, filter === 'all' && { backgroundColor: theme.colors.primaryContainer }]}
        textStyle={{ color: filter === 'all' ? theme.colors.primary : theme.colors.onSurfaceVariant }}
      >
        All
      </Chip>
      <Chip
        selected={filter === 'indoor'}
        onPress={() => setFilter('indoor')}
        style={[styles.filterChip, filter === 'indoor' && { backgroundColor: '#048A8120' }]}
        textStyle={{ color: filter === 'indoor' ? '#048A81' : theme.colors.onSurfaceVariant }}
        icon={() => <MaterialCommunityIcons name="office-building" size={16} color={filter === 'indoor' ? '#048A81' : theme.colors.onSurfaceVariant} />}
      >
        Indoor
      </Chip>
      <Chip
        selected={filter === 'outdoor'}
        onPress={() => setFilter('outdoor')}
        style={[styles.filterChip, filter === 'outdoor' && { backgroundColor: '#FF6B3520' }]}
        textStyle={{ color: filter === 'outdoor' ? '#FF6B35' : theme.colors.onSurfaceVariant }}
        icon={() => <MaterialCommunityIcons name="terrain" size={16} color={filter === 'outdoor' ? '#FF6B35' : theme.colors.onSurfaceVariant} />}
      >
        Outdoor
      </Chip>
    </View>
  );

  // Render selected location card
  const renderSelectedLocation = () => {
    if (!selectedLocation) return null;
    
    return (
      <Card style={[styles.selectedCard, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.selectedHeader}>
          <View style={[
            styles.locationTypeBadge,
            { backgroundColor: selectedLocation.locationType === 'indoor' ? '#048A8120' : '#FF6B3520' }
          ]}>
            <MaterialCommunityIcons
              name={selectedLocation.locationType === 'indoor' ? 'office-building' : 'terrain'}
              size={20}
              color={selectedLocation.locationType === 'indoor' ? '#048A81' : '#FF6B35'}
            />
          </View>
          <View style={styles.selectedInfo}>
            <Text variant="titleMedium" style={{ color: theme.colors.onBackground }} numberOfLines={1}>
              {selectedLocation.name}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {selectedLocation.sessionCount} session{selectedLocation.sessionCount !== 1 ? 's' : ''} • 
              Last visit: {format(new Date(selectedLocation.lastVisit), 'MMM d, yyyy')}
            </Text>
          </View>
          <IconButton
            icon="close"
            size={20}
            onPress={() => setSelectedLocation(null)}
          />
        </View>
        {selectedLocation.firstVisit !== selectedLocation.lastVisit && (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, marginLeft: 52 }}>
            First visit: {format(new Date(selectedLocation.firstVisit), 'MMM d, yyyy')}
          </Text>
        )}
      </Card>
    );
  };

  // Render web map
  const renderWebMap = () => {
    if (!WebMapView) return null;
    
    return (
      <View style={styles.mapContainer}>
        <WebMapView
          locations={filteredLocations}
          center={mapCenter}
          onLocationSelect={setSelectedLocation}
        />
      </View>
    );
  };

  // Render native map placeholder (for future native implementation)
  const renderNativeMap = () => {
    return (
      <View style={[styles.mapContainer, styles.mapLoading, { backgroundColor: theme.colors.surfaceVariant }]}>
        <MaterialCommunityIcons name="map" size={64} color={theme.colors.outline} />
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 16, textAlign: 'center' }}>
          Map view is currently optimized for web.{'\n'}
          Native map support coming soon!
        </Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
          <Text variant="titleLarge" style={{ color: theme.colors.onBackground, flex: 1 }}>
            My Climbing Map
          </Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 16 }}>
            Loading your climbing locations...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleLarge" style={{ color: theme.colors.onBackground, flex: 1 }}>
          My Climbing Map
        </Text>
      </View>

      {/* Stats */}
      {renderStats()}

      {/* Filters */}
      {renderFilters()}

      {/* Map */}
      {filteredLocations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="map-marker-off" size={64} color={theme.colors.outline} />
          <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 16 }}>
            No locations to display
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.outline, textAlign: 'center', marginTop: 8 }}>
            {filter !== 'all' 
              ? `No ${filter} locations found. Try changing the filter.`
              : 'Log climbing sessions with gym locations to see them on the map!'}
          </Text>
        </View>
      ) : (
        Platform.OS === 'web' ? renderWebMap() : renderNativeMap()
      )}

      {/* Selected Location Card - hidden since popup now shows info */}
      {/* {renderSelectedLocation()} */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
    paddingVertical: 8,
  },
  statsCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  filterChip: {
    borderRadius: 20,
  },
  mapContainer: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    ...Platform.select({
      web: {
        minHeight: 400,
      },
    }),
  },
  mapLoading: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedCard: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    padding: 12,
    borderRadius: 12,
    elevation: 4,
  },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationTypeBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedInfo: {
    flex: 1,
    marginLeft: 12,
  },
});

export default SessionsMapScreen;
