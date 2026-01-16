// Discover Screen - Find and match with other climbers
import React, { useEffect, useCallback, useState } from 'react';
import { StyleSheet, View, ScrollView, Pressable } from 'react-native';
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
    fetchClimbers,
    fetchPendingRequests,
    fetchAcceptedMatches,
    fetchMatchedProfiles,
    setFilters,
    sendRequest,
    getCompatibilityScore,
  } = useMatchStore();

  const [showFilters, setShowFilters] = useState(false);
  const [tempFilters, setTempFilters] = useState<ClimberSearchFilters>(filters);
  const [sendingRequestTo, setSendingRequestTo] = useState<string | null>(null);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [connectedUserIds, setConnectedUserIds] = useState<Set<string>>(new Set());
  const [pendingWithProfiles, setPendingWithProfiles] = useState<PendingRequestWithProfile[]>([]);
  const [connectedWithProfiles, setConnectedWithProfiles] = useState<ConnectedUserWithProfile[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchClimbers(user.uid, true);
        fetchPendingRequests(user.uid);
        fetchAcceptedMatches(user.uid);
        fetchMatchedProfiles(user.uid);
      }
    }, [user])
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
    if (user) {
      fetchClimbers(user.uid, true);
    }
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
    (tempFilters.climbingTypes?.length || 0);

  // Filter out connected users from discovered climbers
  const newClimbers = discoveredClimbers.filter(c => !connectedUserIds.has(c.uid));

  const renderClimberCard = (item: ClimberProfile, isConnected: boolean = false) => {
    const compatibilityScore = myProfile ? getCompatibilityScore(myProfile, item) : 0;

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
              {item.location && (
                <>
                  <MaterialCommunityIcons name="map-marker" size={14} color={theme.colors.onSurfaceVariant} />
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
                    {item.location.city}, {item.location.state}
                  </Text>
                </>
              )}
            </View>
            {item.experienceLevel && (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {item.experienceLevel} • {item.yearsClimbing || 0} yrs
              </Text>
            )}
          </View>
          {compatibilityScore > 0 && (
            <View style={[styles.compatBadge, { backgroundColor: theme.colors.primaryContainer }]}>
              <Text variant="labelSmall" style={{ color: theme.colors.onPrimaryContainer }}>
                {compatibilityScore}%
              </Text>
            </View>
          )}
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
        <IconButton
          icon="filter-variant"
          mode={activeFiltersCount > 0 ? 'contained' : 'outlined'}
          onPress={() => setShowFilters(true)}
        />
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Pending Requests Section - Always visible */}
        <View style={styles.section}>
          <Pressable 
            style={styles.sectionHeader}
            onPress={() => navigation.navigate('MatchRequests')}
          >
            <View style={styles.sectionTitleRow}>
              <MaterialCommunityIcons name="account-clock" size={22} color={theme.colors.primary} />
              <Text variant="titleMedium" style={{ color: theme.colors.onBackground, marginLeft: 8 }}>
                Pending Requests
              </Text>
              {pendingRequests.length > 0 && (
                <Badge style={{ marginLeft: 8, backgroundColor: theme.colors.error }}>
                  {pendingRequests.length}
                </Badge>
              )}
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
          </Pressable>
          
          {pendingWithProfiles.length === 0 ? (
            <Pressable 
              style={[styles.emptySection, { backgroundColor: theme.colors.surfaceVariant }]}
              onPress={() => navigation.navigate('MatchRequests')}
            >
              <MaterialCommunityIcons name="account-clock-outline" size={32} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8, textAlign: 'center' }}>
                No pending requests
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                When someone wants to connect, they'll appear here
              </Text>
            </Pressable>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
              {pendingWithProfiles.map((item) => (
                <Pressable 
                  key={item.id} 
                  style={[styles.pendingCard, { backgroundColor: theme.colors.surfaceVariant }]}
                  onPress={() => navigation.navigate('MatchRequests')}
                >
                  <Avatar
                    source={item.profile?.photoURL}
                    name={item.profile?.displayName || 'Unknown'}
                    size={56}
                  />
                  <Text 
                    variant="labelMedium" 
                    style={{ color: theme.colors.onSurface, marginTop: 8, textAlign: 'center', width: 80 }}
                    numberOfLines={1}
                  >
                    {item.profile?.displayName || 'Unknown'}
                  </Text>
                  <Text variant="labelSmall" style={{ color: theme.colors.primary, marginTop: 4 }}>
                    Respond
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        <Divider style={styles.divider} />

        {/* Connected Users Section - Always visible */}
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
            </View>
            {activeFiltersCount > 0 && (
              <Chip compact onClose={handleClearFilters}>
                {activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''}
              </Chip>
            )}
          </View>

          {newClimbers.length === 0 ? (
            <View style={[styles.emptySection, { backgroundColor: theme.colors.surfaceVariant }]}>
              <MaterialCommunityIcons name="account-search-outline" size={32} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8, textAlign: 'center' }}>
                No new climbers found
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                Try adjusting your filters or check back later
              </Text>
            </View>
          ) : (
            <View style={styles.climbersGrid}>
              {newClimbers.map((climber) => renderClimberCard(climber, false))}
            </View>
          )}
        </View>

        {/* Bottom padding */}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Filters Modal */}
      <Portal>
        <Modal
          visible={showFilters}
          onDismiss={() => setShowFilters(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          <Text variant="titleLarge" style={[styles.modalTitle, { color: theme.colors.onBackground }]}>
            Filter Climbers
          </Text>

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
              onPress={handleClearFilters}
              variant="outline"
              style={styles.modalButton}
            />
            <Button
              title="Apply Filters"
              onPress={handleApplyFilters}
              style={styles.modalButton}
            />
          </View>
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
  modal: {
    margin: 20,
    padding: 20,
    borderRadius: 12,
    maxHeight: '80%',
  },
  modalTitle: {
    marginBottom: 20,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    minWidth: 120,
  },
});

export default DiscoverScreen;
