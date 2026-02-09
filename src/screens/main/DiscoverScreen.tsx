// Discover Screen - Find and match with other climbers
import React, { useEffect, useCallback, useState } from 'react';
import { StyleSheet, View, ScrollView, Pressable, TextInput, Platform, Dimensions } from 'react-native';
import { Text, useTheme, Chip, IconButton, Modal, Portal, Badge, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, Avatar, Button, LoadingSpinner, EmptyState, ChipSelector } from '../../components/common';
import { useAuthStore, useMatchStore } from '../../store';
import { ClimberProfile, ClimberSearchFilters, UserProfile } from '../../types';
import { CLIMBING_TYPES, EXPERIENCE_LEVELS } from '../../constants';
import { showAlert } from '../../utils/alert';
import { getProfile } from '../../services/profileService';
import { getOrCreateConversation } from '../../services/messageService';

interface PendingRequestWithProfile {
  id: string;
  odId: string;
  profile: UserProfile | null;
}

interface ConnectedUserWithProfile {
  odId: string;
  profile: UserProfile | null;
}

interface DiscoverScreenProps {
  navigation: any;
}

export const DiscoverScreen: React.FC<DiscoverScreenProps> = ({ navigation }) => {
  const theme = useTheme();
  const { user, profile: myProfile } = useAuthStore();
  const {
    discoveredClimbers,
    pendingRequests,
    sentRequests: storeSentRequests,
    acceptedMatches,
    matchedProfiles,
    isLoading,
    filters,
    hasAppliedInitialFilters,
    fetchClimbers,
    fetchPendingRequests,
    fetchAcceptedMatches,
    fetchMatchedProfiles,
    setFilters,
    setHasAppliedInitialFilters,
    sendRequest,
  } = useMatchStore();

  const [showFilters, setShowFilters] = useState(false);
  const [tempFilters, setTempFilters] = useState<ClimberSearchFilters>(filters);
  const [sendingRequestTo, setSendingRequestTo] = useState<string | null>(null);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [connectedUserIds, setConnectedUserIds] = useState<Set<string>>(new Set());
  const [pendingWithProfiles, setPendingWithProfiles] = useState<PendingRequestWithProfile[]>([]);
  const [connectedWithProfiles, setConnectedWithProfiles] = useState<ConnectedUserWithProfile[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Initial filter form state (shown before first search)
  const [initialCity, setInitialCity] = useState('');
  const [initialHomeGym, setInitialHomeGym] = useState('');
  const [initialClimbingTypes, setInitialClimbingTypes] = useState<string[]>([]);
  const [initialExperienceLevels, setInitialExperienceLevels] = useState<string[]>([]);
  const [locationFilterMode, setLocationFilterMode] = useState<'city' | 'gym'>('city');

  // Pre-fill initial filters from user's profile (only when filter setup is showing)
  useEffect(() => {
    if (myProfile && !hasAppliedInitialFilters) {
      if (myProfile.homeGym) {
        setInitialHomeGym(myProfile.homeGym);
        setLocationFilterMode('gym');
      }
      if (myProfile.location?.city) {
        setInitialCity(myProfile.location.city);
        if (!myProfile.homeGym) {
          setLocationFilterMode('city');
        }
      }
      if (myProfile.climbingTypes && myProfile.climbingTypes.length > 0) {
        setInitialClimbingTypes([...myProfile.climbingTypes]);
      }
    }
  }, [myProfile, hasAppliedInitialFilters]);

  // Sync tempFilters when filters change
  useEffect(() => {
    setTempFilters(filters);
  }, [filters]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user) {
        // Only fetch climbers if initial filters have been applied
        if (hasAppliedInitialFilters) {
          fetchClimbers(user.uid, true);
        }
        fetchPendingRequests(user.uid);
        fetchAcceptedMatches(user.uid);
        fetchMatchedProfiles(user.uid);
      }
    }, [user, hasAppliedInitialFilters])
  );

  // Track sent requests from store
  useEffect(() => {
    const sent = new Set(storeSentRequests.map(r => r.matchedUserId));
    setSentRequests(sent);
  }, [storeSentRequests]);

  // Track connected users from accepted matches
  useEffect(() => {
    const connected = new Set<string>();
    acceptedMatches.forEach(match => {
      if (match.userId !== user?.uid) connected.add(match.userId);
      if (match.matchedUserId !== user?.uid) connected.add(match.matchedUserId);
    });
    setConnectedUserIds(connected);
  }, [acceptedMatches, user]);

  // Fetch profiles for pending requests
  useEffect(() => {
    const fetchProfiles = async () => {
      if (pendingRequests.length === 0) {
        setPendingWithProfiles([]);
        return;
      }

      const withProfiles = await Promise.all(
        pendingRequests.map(async (request) => {
          try {
            const result = await getProfile(request.userId);
            return {
              id: request.id,
              odId: request.userId,
              profile: result.success && result.data ? result.data : null,
            };
          } catch {
            return { id: request.id, odId: request.userId, profile: null };
          }
        })
      );
      setPendingWithProfiles(withProfiles);
    };

    fetchProfiles();
  }, [pendingRequests]);

  // Set connected profiles from matchedProfiles store
  useEffect(() => {
    const profiles = matchedProfiles.map(p => ({
      odId: p.uid,
      profile: p as unknown as UserProfile,
    }));
    setConnectedWithProfiles(profiles);
  }, [matchedProfiles]);

  const handleRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    await Promise.all([
      fetchClimbers(user.uid, true),
      fetchPendingRequests(user.uid),
      fetchAcceptedMatches(user.uid),
      fetchMatchedProfiles(user.uid),
    ]);
    setRefreshing(false);
  };

  const handleApplyFilters = () => {
    setFilters(tempFilters);
    setShowFilters(false);
    if (user) {
      fetchClimbers(user.uid, true);
    }
  };

  const handleClearFilters = () => {
    setTempFilters({});
    setFilters({});
    setShowFilters(false);
    // Reset back to initial filter setup state
    setHasAppliedInitialFilters(false);
  };

  // Handle initial filter search (first time flow)
  const handleInitialSearch = () => {
    const newFilters: ClimberSearchFilters = {};

    if (locationFilterMode === 'city' && initialCity.trim()) {
      newFilters.city = initialCity.trim();
    } else if (locationFilterMode === 'gym' && initialHomeGym.trim()) {
      newFilters.homeGym = initialHomeGym.trim();
    }

    if (initialClimbingTypes.length > 0) {
      newFilters.climbingTypes = initialClimbingTypes as any;
    }

    if (initialExperienceLevels.length > 0 && !initialExperienceLevels.includes('Any')) {
      newFilters.experienceLevels = initialExperienceLevels as any;
    }

    setFilters(newFilters);
    setTempFilters(newFilters);
    setHasAppliedInitialFilters(true);
    if (user) {
      fetchClimbers(user.uid, true);
    }
  };

  // Reset filters and go back to initial filter view
  const handleResetToInitialFilters = () => {
    setHasAppliedInitialFilters(false);
    setFilters({});
    setTempFilters({});
  };

  const handleSendRequest = async (targetUserId: string) => {
    if (!user) return;
    setSendingRequestTo(targetUserId);
    try {
      const success = await sendRequest(user.uid, targetUserId);
      if (success) {
        setSentRequests(prev => new Set(prev).add(targetUserId));
        showAlert('Request Sent!', 'Your connection request has been sent.');
      } else {
        showAlert('Request Failed', 'Could not send connection request. You may have already sent a request to this climber.');
      }
    } catch (error) {
      showAlert('Error', 'Failed to send connection request.');
    } finally {
      setSendingRequestTo(null);
    }
  };

  const handleViewProfile = (climberId: string) => {
    navigation.navigate('ClimberProfile', { climberId });
  };

  const handleMessageUser = async (otherUserId: string, otherUserName: string, otherUserPhoto: string | null) => {
    if (!user) return;
    try {
      const result = await getOrCreateConversation(user.uid, otherUserId, otherUserName, otherUserPhoto);
      if (result.success && result.data) {
        navigation.navigate('Chat', { conversationId: result.data.id });
      } else {
        showAlert('Error', 'Could not open conversation.');
      }
    } catch (error) {
      console.error('Error opening conversation:', error);
      showAlert('Error', 'Failed to open conversation.');
    }
  };

  const activeFiltersCount =
    (tempFilters.experienceLevels?.length || 0) +
    (tempFilters.climbingTypes?.length || 0) +
    (tempFilters.homeGym ? 1 : 0) +
    (tempFilters.city ? 1 : 0);

  // Filter out connected users from discovered climbers
  const newClimbers = discoveredClimbers.filter(c => !connectedUserIds.has(c.uid));

  const renderClimberCard = (item: ClimberProfile, isConnected: boolean = false) => {
    return (
      <Card key={item.uid} style={styles.climberCard}>
        <View style={styles.cardHeader}>
          <Avatar
            source={item.photoURL}
            name={item.displayName}
            size={56}
            onPress={() => handleViewProfile(item.uid)}
          />
          <View style={styles.headerInfo}>
            <Text variant="titleMedium" style={{ color: theme.colors.onBackground }}>
              {item.displayName}
            </Text>
            <View style={styles.locationRow}>
              {(item.city || item.location) && (
                <>
                  <MaterialCommunityIcons name="map-marker" size={14} color={theme.colors.onSurfaceVariant} />
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
                    {item.city || (item.location ? `${item.location.city}, ${item.location.state}` : '')}
                  </Text>
                </>
              )}
            </View>
            {item.homeGym && (
              <View style={styles.locationRow}>
                <MaterialCommunityIcons name="warehouse" size={14} color={theme.colors.onSurfaceVariant} />
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }} numberOfLines={1}>
                  {item.homeGym}
                </Text>
              </View>
            )}
            {item.experienceLevel && (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {item.experienceLevel} • {item.yearsClimbing || 0} yrs
              </Text>
            )}
          </View>
        </View>

        <View style={styles.cardActions}>
          <Button
            title="Profile"
            onPress={() => handleViewProfile(item.uid)}
            variant="outline"
            size="small"
            style={styles.actionButton}
          />
          {isConnected ? (
            <Button
              title="Message"
              onPress={() => navigation.navigate('Messages')}
              size="small"
              style={styles.actionButton}
              icon="message-text"
            />
          ) : sentRequests.has(item.uid) ? (
            <Button
              title="Requested"
              onPress={() => {}}
              disabled
              size="small"
              style={styles.actionButton}
            />
          ) : (
            <Button
              title="Connect"
              onPress={() => handleSendRequest(item.uid)}
              loading={sendingRequestTo === item.uid}
              size="small"
              style={styles.actionButton}
            />
          )}
        </View>
      </Card>
    );
  };

  if (isLoading && discoveredClimbers.length === 0 && connectedWithProfiles.length === 0) {
    return <LoadingSpinner fullScreen message="Finding climbers near you..." />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="headlineMedium" style={{ color: theme.colors.onBackground }}>
          Discover
        </Text>
        {hasAppliedInitialFilters && (
          <IconButton
            icon="filter-variant"
            mode={activeFiltersCount > 0 ? 'contained' : 'outlined'}
            onPress={() => {
              setTempFilters(filters);
              setShowFilters(true);
            }}
          />
        )}
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* My Connections Section - Now at top */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <MaterialCommunityIcons name="account-check" size={22} color={theme.colors.tertiary || theme.colors.secondary} />
              <Text variant="titleMedium" style={{ color: theme.colors.onBackground, marginLeft: 8 }}>
                My Connections
              </Text>
              {connectedWithProfiles.length > 0 && (
                <Badge style={{ marginLeft: 8, backgroundColor: theme.colors.tertiary || theme.colors.secondary }}>
                  {connectedWithProfiles.length}
                </Badge>
              )}
            </View>
            <Pressable 
              style={[styles.scheduleButton, { backgroundColor: theme.colors.primaryContainer }]}
              onPress={() => navigation.navigate('ConnectionSchedule')}
            >
              <MaterialCommunityIcons name="calendar-clock" size={18} color={theme.colors.primary} />
              <Text variant="labelMedium" style={{ color: theme.colors.primary, marginLeft: 6, fontWeight: '600' }}>
                Schedules
              </Text>
            </Pressable>
          </View>
          
          {connectedWithProfiles.length === 0 ? (
            <View style={[styles.emptySection, { backgroundColor: theme.colors.surfaceVariant }]}>
              <MaterialCommunityIcons name="account-multiple-outline" size={32} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8, textAlign: 'center' }}>
                No connections yet
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                Connect with climbers below to start chatting
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
              {connectedWithProfiles.map((item) => (
                <View key={item.odId} style={[styles.connectedCard, { backgroundColor: theme.colors.secondaryContainer }]}>
                  <Pressable onPress={() => handleViewProfile(item.odId)}>
                    <Avatar
                      source={item.profile?.photoURL}
                      name={item.profile?.displayName || 'Unknown'}
                      size={56}
                    />
                  </Pressable>
                  <Pressable onPress={() => handleViewProfile(item.odId)}>
                    <Text 
                      variant="labelMedium" 
                      style={{ color: theme.colors.onSecondaryContainer, marginTop: 8, textAlign: 'center', width: 80 }}
                      numberOfLines={1}
                    >
                      {item.profile?.displayName || 'Unknown'}
                    </Text>
                  </Pressable>
                  <Pressable 
                    style={styles.messageButton}
                    onPress={() => handleMessageUser(
                      item.odId, 
                      item.profile?.displayName || 'Unknown',
                      item.profile?.photoURL || null
                    )}
                  >
                    <MaterialCommunityIcons name="message-text" size={14} color={theme.colors.primary} />
                    <Text variant="labelSmall" style={{ color: theme.colors.primary, marginLeft: 4 }}>
                      Message
                    </Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        <Divider style={styles.divider} />

        {/* Find New Climbers Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <MaterialCommunityIcons name="account-search" size={22} color={theme.colors.primary} />
              <Text variant="titleMedium" style={{ color: theme.colors.onBackground, marginLeft: 8 }}>
                Find New Climbers
              </Text>
              <Pressable 
                style={[styles.pendingRequestsButton, { backgroundColor: theme.colors.primaryContainer, marginLeft: 10 }]}
                onPress={() => navigation.navigate('MatchRequests')}
              >
                <MaterialCommunityIcons name="account-clock" size={18} color={theme.colors.primary} />
                <Text variant="labelMedium" style={{ color: theme.colors.primary, marginLeft: 6, fontWeight: '600' }}>
                  Requests
                </Text>
                {pendingRequests.length > 0 && (
                  <Badge size={18} style={{ marginLeft: 6, backgroundColor: theme.colors.error }}>
                    {pendingRequests.length}
                  </Badge>
                )}
              </Pressable>
            </View>
            {hasAppliedInitialFilters && activeFiltersCount > 0 && (
              <Chip compact onClose={handleClearFilters} style={{ marginRight: 8 }}>
                {activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''}
              </Chip>
            )}
          </View>

          {!hasAppliedInitialFilters ? (
            /* Initial Filter Selection - shown before any search */
            <Card style={styles.initialFilterCard}>
              <View style={styles.initialFilterHeader}>
                <MaterialCommunityIcons name="tune-variant" size={28} color={theme.colors.primary} />
                <Text variant="titleMedium" style={{ color: theme.colors.onBackground, marginLeft: 10 }}>
                  Set Your Preferences
                </Text>
              </View>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
                Filter by location and climbing preferences to find partners near you.
              </Text>

              {/* Location Filter Toggle */}
              <Text variant="labelLarge" style={{ color: theme.colors.onBackground, marginBottom: 8 }}>
                Search By
              </Text>
              <View style={styles.locationToggle}>
                <Pressable
                  style={[
                    styles.locationToggleButton,
                    locationFilterMode === 'city' && { backgroundColor: theme.colors.primaryContainer },
                    { borderColor: theme.colors.outline },
                  ]}
                  onPress={() => setLocationFilterMode('city')}
                >
                  <MaterialCommunityIcons
                    name="city-variant-outline"
                    size={18}
                    color={locationFilterMode === 'city' ? theme.colors.primary : theme.colors.onSurfaceVariant}
                  />
                  <Text
                    variant="labelMedium"
                    style={{
                      color: locationFilterMode === 'city' ? theme.colors.primary : theme.colors.onSurfaceVariant,
                      marginLeft: 6,
                    }}
                  >
                    City
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.locationToggleButton,
                    locationFilterMode === 'gym' && { backgroundColor: theme.colors.primaryContainer },
                    { borderColor: theme.colors.outline },
                  ]}
                  onPress={() => setLocationFilterMode('gym')}
                >
                  <MaterialCommunityIcons
                    name="warehouse"
                    size={18}
                    color={locationFilterMode === 'gym' ? theme.colors.primary : theme.colors.onSurfaceVariant}
                  />
                  <Text
                    variant="labelMedium"
                    style={{
                      color: locationFilterMode === 'gym' ? theme.colors.primary : theme.colors.onSurfaceVariant,
                      marginLeft: 6,
                    }}
                  >
                    Home Gym
                  </Text>
                </Pressable>
              </View>

              {/* Location Input */}
              {locationFilterMode === 'city' ? (
                <View style={[styles.filterInputWrapper, { borderColor: theme.colors.outline, backgroundColor: theme.colors.surfaceVariant }]}>
                  <MaterialCommunityIcons name="map-marker" size={20} color={theme.colors.onSurfaceVariant} />
                  <TextInput
                    style={[styles.filterInput, { color: theme.colors.onSurface }]}
                    value={initialCity}
                    onChangeText={setInitialCity}
                    placeholder="Enter city (e.g. Austin, Dallas)"
                    placeholderTextColor={theme.colors.onSurfaceVariant}
                  />
                  {initialCity.length > 0 && (
                    <Pressable onPress={() => setInitialCity('')}>
                      <MaterialCommunityIcons name="close-circle" size={18} color={theme.colors.onSurfaceVariant} />
                    </Pressable>
                  )}
                </View>
              ) : (
                <View style={[styles.filterInputWrapper, { borderColor: theme.colors.outline, backgroundColor: theme.colors.surfaceVariant }]}>
                  <MaterialCommunityIcons name="warehouse" size={20} color={theme.colors.onSurfaceVariant} />
                  <TextInput
                    style={[styles.filterInput, { color: theme.colors.onSurface }]}
                    value={initialHomeGym}
                    onChangeText={setInitialHomeGym}
                    placeholder="Enter gym name"
                    placeholderTextColor={theme.colors.onSurfaceVariant}
                  />
                  {initialHomeGym.length > 0 && (
                    <Pressable onPress={() => setInitialHomeGym('')}>
                      <MaterialCommunityIcons name="close-circle" size={18} color={theme.colors.onSurfaceVariant} />
                    </Pressable>
                  )}
                </View>
              )}

              {/* Climbing Type Filter */}
              <ChipSelector
                label="Climbing Type"
                options={CLIMBING_TYPES}
                selectedValues={initialClimbingTypes}
                onSelect={(values) => setInitialClimbingTypes(values)}
                style={{ marginTop: 4 }}
              />

              {/* Experience Level Filter (with Any option) */}
              <ChipSelector
                label="Experience Level"
                options={['Any', ...EXPERIENCE_LEVELS]}
                selectedValues={initialExperienceLevels}
                onSelect={(values) => {
                  // If 'Any' is newly selected, clear other selections
                  if (values.includes('Any') && !initialExperienceLevels.includes('Any')) {
                    setInitialExperienceLevels(['Any']);
                  } else if (values.length > 1 && values.includes('Any')) {
                    // If selecting specific level while Any is selected, remove Any
                    setInitialExperienceLevels(values.filter(v => v !== 'Any'));
                  } else {
                    setInitialExperienceLevels(values);
                  }
                }}
              />

              <Button
                title="Find Climbers"
                onPress={handleInitialSearch}
                icon="magnify"
                style={{ marginTop: 8 }}
              />
            </Card>
          ) : (
            /* Results after filters applied */
            <>
              {isLoading && discoveredClimbers.length === 0 ? (
                <View style={[styles.emptySection, { backgroundColor: theme.colors.surfaceVariant }]}>
                  <LoadingSpinner message="Searching for climbers..." />
                </View>
              ) : newClimbers.length === 0 ? (
                <View style={[styles.emptySection, { backgroundColor: theme.colors.surfaceVariant }]}>
                  <MaterialCommunityIcons name="account-search-outline" size={32} color={theme.colors.onSurfaceVariant} />
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8, textAlign: 'center' }}>
                    No climbers found with these filters
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginBottom: 12 }}>
                    Try adjusting your filters or broadening your search
                  </Text>
                  <Button
                    title="Change Filters"
                    onPress={() => {
                      setTempFilters(filters);
                      setShowFilters(true);
                    }}
                    variant="outline"
                    size="small"
                    icon="tune-variant"
                  />
                </View>
              ) : (
                <View style={styles.climbersGrid}>
                  {newClimbers.map((climber) => renderClimberCard(climber, false))}
                </View>
              )}
            </>
          )}
        </View>

        {/* Bottom padding */}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Filters Modal - Improved for mobile */}
      <Portal>
        <Modal
          visible={showFilters}
          onDismiss={() => setShowFilters(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <Text variant="titleLarge" style={[styles.modalTitle, { color: theme.colors.onBackground }]}>
                Filter Climbers
              </Text>
              <IconButton
                icon="close"
                size={22}
                onPress={() => setShowFilters(false)}
              />
            </View>

            {/* Location Filters */}
            <Text variant="labelLarge" style={{ color: theme.colors.onBackground, marginBottom: 8 }}>
              Location
            </Text>
            <View style={[styles.filterInputWrapper, { borderColor: theme.colors.outline, backgroundColor: theme.colors.surfaceVariant, marginBottom: 12 }]}>
              <MaterialCommunityIcons name="city-variant-outline" size={20} color={theme.colors.onSurfaceVariant} />
              <TextInput
                style={[styles.filterInput, { color: theme.colors.onSurface }]}
                value={tempFilters.city || ''}
                onChangeText={(text) => setTempFilters({ ...tempFilters, city: text || undefined })}
                placeholder="Filter by city"
                placeholderTextColor={theme.colors.onSurfaceVariant}
              />
              {(tempFilters.city || '').length > 0 && (
                <Pressable onPress={() => setTempFilters({ ...tempFilters, city: undefined })}>
                  <MaterialCommunityIcons name="close-circle" size={18} color={theme.colors.onSurfaceVariant} />
                </Pressable>
              )}
            </View>
            <View style={[styles.filterInputWrapper, { borderColor: theme.colors.outline, backgroundColor: theme.colors.surfaceVariant, marginBottom: 16 }]}>
              <MaterialCommunityIcons name="warehouse" size={20} color={theme.colors.onSurfaceVariant} />
              <TextInput
                style={[styles.filterInput, { color: theme.colors.onSurface }]}
                value={tempFilters.homeGym || ''}
                onChangeText={(text) => setTempFilters({ ...tempFilters, homeGym: text || undefined })}
                placeholder="Filter by home gym"
                placeholderTextColor={theme.colors.onSurfaceVariant}
              />
              {(tempFilters.homeGym || '').length > 0 && (
                <Pressable onPress={() => setTempFilters({ ...tempFilters, homeGym: undefined })}>
                  <MaterialCommunityIcons name="close-circle" size={18} color={theme.colors.onSurfaceVariant} />
                </Pressable>
              )}
            </View>

            <ChipSelector
              label="Experience Level"
              options={EXPERIENCE_LEVELS}
              selectedValues={tempFilters.experienceLevels || []}
              onSelect={(values) => setTempFilters({ ...tempFilters, experienceLevels: values as any })}
            />

            <ChipSelector
              label="Climbing Types"
              options={CLIMBING_TYPES}
              selectedValues={tempFilters.climbingTypes || []}
              onSelect={(values) => setTempFilters({ ...tempFilters, climbingTypes: values as any })}
            />

            <View style={styles.modalActions}>
              <Button
                title="Clear All"
                onPress={() => {
                  const cleared: ClimberSearchFilters = {};
                  setTempFilters(cleared);
                  setFilters(cleared);
                  setShowFilters(false);
                  // Reset back to initial filter setup state
                  setHasAppliedInitialFilters(false);
                }}
                variant="outline"
                style={styles.modalButton}
              />
              <Button
                title="Apply"
                onPress={handleApplyFilters}
                style={styles.modalButton}
              />
            </View>
          </ScrollView>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptySection: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  horizontalScroll: {
    gap: 12,
    paddingRight: 16,
  },
  pendingCard: {
    width: 100,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  connectedCard: {
    width: 100,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  scheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  sectionHeaderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  pendingRequestsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  divider: {
    marginHorizontal: 16,
  },
  climbersGrid: {
    gap: 12,
  },
  climberCard: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  compatBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
  // Initial filter card
  initialFilterCard: {
    padding: 20,
  },
  initialFilterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationToggle: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  locationToggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  filterInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'web' ? 10 : 4,
    marginBottom: 16,
    gap: 6,
  },
  filterInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: Platform.OS === 'web' ? 4 : 8,
    minWidth: 0,
  } as any,
  // Filter modal - improved for mobile
  modal: {
    marginHorizontal: 16,
    marginVertical: 40,
    padding: 20,
    borderRadius: 16,
    maxHeight: Dimensions.get('window').height - 100,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
    paddingBottom: 8,
  },
  modalButton: {
    flex: 1,
  },
});

export default DiscoverScreen;
