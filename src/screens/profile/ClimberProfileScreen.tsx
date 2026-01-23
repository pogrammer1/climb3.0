// Climber Profile Screen - View another climber's profile
import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, Pressable } from 'react-native';
import { Text, useTheme, Chip, Divider, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, Avatar, Button, LoadingSpinner, EmptyState, AchievementBadgeList } from '../../components/common';
import { useAuthStore, useMatchStore, useAchievementStore } from '../../store';
import { getProfile } from '../../services/profileService';
import { getSchedule, formatTimeSlot, findScheduleOverlaps } from '../../services/scheduleService';
import { getOrCreateConversation } from '../../services/messageService';
import { getUserAchievementStats, checkAndAwardAchievements } from '../../services/achievementService';
import { ClimberProfile, WeeklySchedule, ScheduleOverlap, AchievementProgress } from '../../types';
import { showAlert } from '../../utils/alert';
import { useScheduleStore } from '../../store/scheduleStore';

interface ClimberProfileScreenProps {
  navigation: any;
  route: {
    params: {
      climberId: string;
    };
  };
}

export const ClimberProfileScreen: React.FC<ClimberProfileScreenProps> = ({ navigation, route }) => {
  const { climberId } = route.params;
  const theme = useTheme();
  const { user } = useAuthStore();
  const { sendRequest, acceptedMatches, fetchAcceptedMatches } = useMatchStore();
  const { profile: myProfile } = useAuthStore();

  const [climber, setClimber] = useState<ClimberProfile | null>(null);
  const [climberSchedule, setClimberSchedule] = useState<WeeklySchedule | null>(null);
  const [scheduleOverlaps, setScheduleOverlaps] = useState<ScheduleOverlap[]>([]);
  const [climberAchievements, setClimberAchievements] = useState<AchievementProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [openingChat, setOpeningChat] = useState(false);

  const { mySchedule, fetchMySchedule } = useScheduleStore();

  // Check if already connected with this climber
  const isConnected = acceptedMatches.some(
    (match) => match.userId === climberId || match.matchedUserId === climberId
  );

  useEffect(() => {
    loadProfile();
    if (user) {
      fetchAcceptedMatches(user.uid);
      fetchMySchedule(user.uid);
    }
  }, [climberId, user]);

  // Calculate schedule overlaps when both schedules are available
  useEffect(() => {
    if (mySchedule && climberSchedule) {
      const overlaps = findScheduleOverlaps(mySchedule, climberSchedule);
      setScheduleOverlaps(overlaps);
    }
  }, [mySchedule, climberSchedule]);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const [profileResult, scheduleResult] = await Promise.all([
        getProfile(climberId),
        getSchedule(climberId),
      ]);
      
      if (profileResult.success && profileResult.data) {
        setClimber(profileResult.data as ClimberProfile);
        
        // Load achievements for this climber
        const statsResult = await getUserAchievementStats(climberId);
        if (statsResult.success && statsResult.data) {
          const achievementsResult = await checkAndAwardAchievements(climberId, statsResult.data);
          if (achievementsResult.success && achievementsResult.data) {
            setClimberAchievements(achievementsResult.data.filter(a => a.isUnlocked));
          }
        }
      }
      
      if (scheduleResult.success && scheduleResult.data) {
        setClimberSchedule(scheduleResult.data);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendRequest = async () => {
    if (!user || !climber) return;
    setSendingRequest(true);
    try {
      const result = await sendRequest(user.uid, climber.uid);
      if (result) {
        showAlert('Success', 'Connection request sent!');
      } else {
        showAlert('Error', 'Failed to send request. Please try again.');
      }
    } catch (error) {
      showAlert('Error', 'Failed to send request. Please try again.');
    } finally {
      setSendingRequest(false);
    }
  };

  const handleMessage = async () => {
    if (!isConnected) {
      showAlert('Connect First', 'You need to connect with this climber before you can message them.');
      return;
    }
    
    if (!user || !climber) return;
    
    setOpeningChat(true);
    try {
      const result = await getOrCreateConversation(
        user.uid,
        climber.uid,
        climber.displayName,
        climber.photoURL || null
      );
      if (result.success && result.data) {
        navigation.navigate('Chat', { conversationId: result.data.id });
      } else {
        showAlert('Error', 'Could not open conversation.');
      }
    } catch (error) {
      console.error('Error opening chat:', error);
      showAlert('Error', 'Failed to open conversation.');
    } finally {
      setOpeningChat(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <LoadingSpinner fullScreen message="Loading profile..." />
      </SafeAreaView>
    );
  }

  if (!climber) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <EmptyState
          icon="account-alert"
          title="Profile Not Found"
          message="This climber's profile could not be found."
          actionLabel="Go Back"
          onAction={() => navigation.goBack()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.outline }]}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleLarge" style={{ color: theme.colors.onBackground, flex: 1 }}>
          Climber Profile
        </Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Header */}
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <Avatar
              source={climber.photoURL}
              name={climber.displayName}
              size={100}
            />
            <View style={styles.profileInfo}>
              <Text variant="headlineSmall" style={{ color: theme.colors.onSurface }}>
                {climber.displayName}
              </Text>
              {climber.location && (
                <View style={styles.locationRow}>
                  <MaterialCommunityIcons name="map-marker" size={16} color={theme.colors.onSurfaceVariant} />
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
                    {climber.location.city}, {climber.location.state}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {climber.bio && (
            <>
              <Divider style={styles.divider} />
              <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
                {climber.bio}
              </Text>
            </>
          )}
        </Card>

        {/* Climbing Stats */}
        <Card style={styles.statsCard}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Climbing Stats
          </Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text variant="headlineSmall" style={{ color: theme.colors.primary }}>
                {climber.experienceLevel}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Experience
              </Text>
            </View>
            {climber.yearsClimbing > 0 && (
              <View style={styles.statItem}>
                <Text variant="headlineSmall" style={{ color: theme.colors.primary }}>
                  {climber.yearsClimbing}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Years
                </Text>
              </View>
            )}
            {climber.highestGradeYDS && (
              <View style={styles.statItem}>
                <Text variant="headlineSmall" style={{ color: theme.colors.primary }}>
                  {climber.highestGradeYDS}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Top Rope
                </Text>
              </View>
            )}
            {climber.highestGradeBouldering && (
              <View style={styles.statItem}>
                <Text variant="headlineSmall" style={{ color: theme.colors.primary }}>
                  {climber.highestGradeBouldering}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Boulder
                </Text>
              </View>
            )}
          </View>
        </Card>

        {/* Achievements */}
        {climberAchievements.length > 0 && (
          <Pressable onPress={() => navigation.navigate('Achievements', { userId: climberId })}>
            <Card style={styles.achievementsCard}>
              <View style={styles.achievementHeader}>
                <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface, marginBottom: 0 }]}>
                  Achievements
                </Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.primary} />
              </View>
              <AchievementBadgeList
                achievements={climberAchievements}
                maxDisplay={6}
                size="medium"
                onSeeAll={() => navigation.navigate('Achievements', { userId: climberId })}
              />
            </Card>
          </Pressable>
        )}

        {/* Climbing Types */}
        {climber.climbingTypes && climber.climbingTypes.length > 0 && (
          <Card style={styles.typesCard}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Climbing Styles
            </Text>
            <View style={styles.chipsContainer}>
              {climber.climbingTypes.map((type) => (
                <Chip key={type} style={styles.chip}>
                  {type}
                </Chip>
              ))}
            </View>
          </Card>
        )}

        {/* Availability */}
        {climberSchedule && climberSchedule.schedule.some(d => d.isAvailable) && (
          <Card style={styles.availabilityCard}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Climbing Schedule
            </Text>
            
            {/* Schedule Overlaps - Show when connected or viewing */}
            {scheduleOverlaps.length > 0 && (
              <View style={[styles.overlapSection, { backgroundColor: theme.colors.primaryContainer }]}>
                <View style={styles.overlapHeader}>
                  <MaterialCommunityIcons name="clock-check" size={20} color={theme.colors.primary} />
                  <Text variant="labelLarge" style={{ color: theme.colors.primary, marginLeft: 8, fontWeight: '600' }}>
                    Matching Availability
                  </Text>
                </View>
                {scheduleOverlaps.map((overlap) => (
                  <View key={overlap.day} style={styles.overlapDay}>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onPrimaryContainer, fontWeight: '600' }}>
                      {overlap.day}
                    </Text>
                    <View style={styles.overlapSlots}>
                      {overlap.overlappingSlots.map((slot, idx) => (
                        <Text key={idx} variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer }}>
                          {formatTimeSlot(slot)}
                        </Text>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            )}
            
            {/* Full Schedule Display */}
            <View style={styles.scheduleGrid}>
              {climberSchedule.schedule
                .filter(day => day.isAvailable && day.slots.length > 0)
                .map((day) => (
                  <View key={day.day} style={[styles.scheduleDay, { backgroundColor: theme.colors.surfaceVariant }]}>
                    <Text variant="labelLarge" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                      {day.day}
                    </Text>
                    <View style={styles.daySlots}>
                      {day.slots.map((slot, idx) => (
                        <View key={idx} style={styles.slotRow}>
                          <MaterialCommunityIcons name="clock-outline" size={14} color={theme.colors.onSurfaceVariant} />
                          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
                            {formatTimeSlot(slot)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
            </View>
          </Card>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          {isConnected ? (
            <Button
              title="Connected"
              onPress={() => {}}
              disabled
              variant="outline"
              style={styles.actionButton}
              icon="check"
            />
          ) : (
            <Button
              title="Connect"
              onPress={handleSendRequest}
              loading={sendingRequest}
              style={styles.actionButton}
            />
          )}
          <Button
            title="Message"
            onPress={handleMessage}
            loading={openingChat}
            variant={isConnected ? 'primary' : 'outline'}
            style={styles.actionButton}
            icon="message-text"
          />
        </View>
      </ScrollView>
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
    paddingVertical: 4,
    borderBottomWidth: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  profileCard: {
    padding: 16,
    marginBottom: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  compatBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  divider: {
    marginVertical: 16,
  },
  statsCard: {
    padding: 16,
    marginBottom: 16,
  },
  achievementsCard: {
    padding: 16,
    marginBottom: 16,
  },
  achievementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    minWidth: 80,
    marginVertical: 8,
  },
  typesCard: {
    padding: 16,
    marginBottom: 16,
  },
  availabilityCard: {
    padding: 16,
    marginBottom: 16,
  },
  overlapSection: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  overlapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  overlapDay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  overlapSlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  scheduleGrid: {
    gap: 8,
  },
  scheduleDay: {
    padding: 12,
    borderRadius: 8,
  },
  daySlots: {
    marginTop: 6,
    gap: 4,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginRight: 4,
    marginBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
  },
});

export default ClimberProfileScreen;
