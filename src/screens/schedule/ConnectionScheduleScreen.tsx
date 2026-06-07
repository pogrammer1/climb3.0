// Connection Schedule Screen - View and compare schedules with connections
import React, { useEffect, useCallback, useState } from 'react';
import { StyleSheet, View, ScrollView, Pressable, RefreshControl } from 'react-native';
import { Text, useTheme, IconButton, Divider, Badge, Card as PaperCard } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Avatar, Button, LoadingSpinner, EmptyState, Card } from '../../components/common';
import { useAuthStore, useMatchStore } from '../../store';
import { useScheduleStore } from '../../store/scheduleStore';
import { formatTimeSlot, formatOverlapDuration } from '../../services/scheduleService';
import { ConnectionScheduleMatch, ScheduleOverlap } from '../../types';
import { showAlert } from '../../utils/alert';
import { getOrCreateConversation } from '../../services/messageService';
import { logServiceError } from '../../utils/error';

interface ConnectionScheduleScreenProps {
  navigation: any;
}

export const ConnectionScheduleScreen: React.FC<ConnectionScheduleScreenProps> = ({ navigation }) => {
  const theme = useTheme();
  const { user } = useAuthStore();
  const { matchedProfiles, fetchMatchedProfiles } = useMatchStore();
  const {
    mySchedule,
    connectionMatches,
    isLoading,
    fetchMySchedule,
    fetchConnectionMatches,
  } = useScheduleStore();

  const [refreshing, setRefreshing] = useState(false);

  // Fetch data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchMySchedule(user.uid);
        fetchMatchedProfiles(user.uid);
      }
    }, [user])
  );

  // Fetch connection schedule matches when we have matched profiles
  useEffect(() => {
    if (user && matchedProfiles.length > 0) {
      const connectionIds = matchedProfiles.map((p) => p.uid);
      fetchConnectionMatches(user.uid, connectionIds);
    }
  }, [user, matchedProfiles]);

  const handleRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    await Promise.all([
      fetchMySchedule(user.uid),
      fetchMatchedProfiles(user.uid),
    ]);
    if (matchedProfiles.length > 0) {
      const connectionIds = matchedProfiles.map((p) => p.uid);
      await fetchConnectionMatches(user.uid, connectionIds);
    }
    setRefreshing(false);
  };

  const handleEditMySchedule = () => {
    navigation.navigate('MySchedule');
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
      logServiceError('ConnectionScheduleScreen.openConversation', error);
      showAlert('Error', 'Failed to open conversation.');
    }
  };

  const hasScheduleSetup = mySchedule && mySchedule.schedule.some((d) => d.isAvailable);

  const renderOverlapCard = (match: ConnectionScheduleMatch) => {
    const profile = match.connectionProfile;
    const hasOverlap = match.overlaps.length > 0;

    return (
      <Card key={match.connectionId} style={styles.matchCard}>
        <View style={styles.cardHeader}>
          <Avatar
            source={profile.photoURL}
            name={profile.displayName}
            size={48}
            onPress={() => handleViewProfile(match.connectionId)}
          />
          <View style={styles.headerInfo}>
            <Text variant="titleMedium" style={{ color: theme.colors.onBackground }}>
              {profile.displayName}
            </Text>
            {hasOverlap ? (
              <View style={styles.overlapBadge}>
                <MaterialCommunityIcons
                  name="clock-check"
                  size={14}
                  color={theme.colors.primary}
                />
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.primary, marginLeft: 4, fontWeight: '600' }}
                >
                  {formatOverlapDuration(match.totalOverlapMinutes)} overlap/week
                </Text>
              </View>
            ) : (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                No schedule overlap
              </Text>
            )}
          </View>
          <IconButton
            icon="message-text"
            mode="contained-tonal"
            size={20}
            onPress={() =>
              handleMessageUser(match.connectionId, profile.displayName, profile.photoURL)
            }
          />
        </View>

        {hasOverlap && (
          <View style={styles.overlapsContainer}>
            {match.overlaps.map((overlap, index) => (
              <View key={overlap.day} style={styles.dayOverlap}>
                <View style={styles.dayLabel}>
                  <MaterialCommunityIcons
                    name="calendar"
                    size={16}
                    color={theme.colors.tertiary || theme.colors.secondary}
                  />
                  <Text
                    variant="labelLarge"
                    style={{
                      color: theme.colors.tertiary || theme.colors.secondary,
                      marginLeft: 6,
                      fontWeight: '600',
                    }}
                  >
                    {overlap.day}
                  </Text>
                </View>
                <View style={styles.timeSlots}>
                  {overlap.overlappingSlots.map((slot, slotIndex) => (
                    <View
                      key={slotIndex}
                      style={[
                        styles.timeSlot,
                        { backgroundColor: theme.colors.secondaryContainer },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="clock-outline"
                        size={12}
                        color={theme.colors.onSecondaryContainer}
                      />
                      <Text
                        variant="bodySmall"
                        style={{
                          color: theme.colors.onSecondaryContainer,
                          marginLeft: 4,
                        }}
                      >
                        {formatTimeSlot(slot)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {!hasOverlap && (
          <View style={[styles.noOverlapHint, { backgroundColor: theme.colors.surfaceVariant }]}>
            <MaterialCommunityIcons
              name="information-outline"
              size={16}
              color={theme.colors.onSurfaceVariant}
            />
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant, marginLeft: 8, flex: 1 }}
            >
              Your schedules don't overlap. Consider messaging to find a time that works!
            </Text>
          </View>
        )}
      </Card>
    );
  };

  if (isLoading && connectionMatches.length === 0) {
    return <LoadingSpinner fullScreen message="Loading schedules..." />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleLarge" style={{ color: theme.colors.onBackground, flex: 1 }}>
          Climbing Schedules
        </Text>
        <IconButton icon="pencil" onPress={handleEditMySchedule} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* My Schedule Summary */}
        <View style={styles.section}>
          <Pressable
            style={[styles.myScheduleCard, { backgroundColor: theme.colors.primaryContainer }]}
            onPress={handleEditMySchedule}
          >
            <View style={styles.myScheduleHeader}>
              <MaterialCommunityIcons
                name="calendar-account"
                size={24}
                color={theme.colors.onPrimaryContainer}
              />
              <Text
                variant="titleMedium"
                style={{ color: theme.colors.onPrimaryContainer, marginLeft: 12, flex: 1 }}
              >
                My Availability
              </Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color={theme.colors.onPrimaryContainer}
              />
            </View>

            {hasScheduleSetup ? (
              <View style={styles.myScheduleSummary}>
                {mySchedule?.schedule
                  .filter((d) => d.isAvailable)
                  .map((day) => (
                    <View
                      key={day.day}
                      style={[
                        styles.dayBadge,
                        { backgroundColor: theme.colors.primary },
                      ]}
                    >
                      <Text
                        variant="labelSmall"
                        style={{ color: theme.colors.onPrimary, fontWeight: '600' }}
                      >
                        {day.day.slice(0, 3)}
                      </Text>
                    </View>
                  ))}
              </View>
            ) : (
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onPrimaryContainer, opacity: 0.8, marginTop: 8 }}
              >
                Tap to set up your climbing availability
              </Text>
            )}
          </Pressable>
        </View>

        <Divider style={styles.divider} />

        {/* Connection Schedule Matches */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons
              name="account-group"
              size={22}
              color={theme.colors.primary}
            />
            <Text
              variant="titleMedium"
              style={{ color: theme.colors.onBackground, marginLeft: 8 }}
            >
              Connection Availability
            </Text>
            {connectionMatches.filter((m) => m.overlaps.length > 0).length > 0 && (
              <Badge
                style={{
                  marginLeft: 8,
                  backgroundColor: theme.colors.tertiary || theme.colors.secondary,
                }}
              >
                {connectionMatches.filter((m) => m.overlaps.length > 0).length}
              </Badge>
            )}
          </View>

          {!hasScheduleSetup ? (
            <View style={[styles.emptyState, { backgroundColor: theme.colors.surfaceVariant }]}>
              <MaterialCommunityIcons
                name="calendar-plus"
                size={48}
                color={theme.colors.onSurfaceVariant}
              />
              <Text
                variant="titleMedium"
                style={{ color: theme.colors.onSurfaceVariant, marginTop: 16, textAlign: 'center' }}
              >
                Set Up Your Schedule
              </Text>
              <Text
                variant="bodyMedium"
                style={{
                  color: theme.colors.onSurfaceVariant,
                  marginTop: 8,
                  textAlign: 'center',
                  paddingHorizontal: 24,
                }}
              >
                Add your climbing availability to find the best times to climb with your connections
              </Text>
              <Button
                title="Add Availability"
                onPress={handleEditMySchedule}
                style={{ marginTop: 16 }}
              />
            </View>
          ) : connectionMatches.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: theme.colors.surfaceVariant }]}>
              <MaterialCommunityIcons
                name="account-search"
                size={48}
                color={theme.colors.onSurfaceVariant}
              />
              <Text
                variant="titleMedium"
                style={{ color: theme.colors.onSurfaceVariant, marginTop: 16, textAlign: 'center' }}
              >
                No Connections Yet
              </Text>
              <Text
                variant="bodyMedium"
                style={{
                  color: theme.colors.onSurfaceVariant,
                  marginTop: 8,
                  textAlign: 'center',
                }}
              >
                Connect with other climbers to compare schedules
              </Text>
              <Button
                title="Find Climbers"
                onPress={() => navigation.navigate('MainTabs', { screen: 'Discover' })}
                style={{ marginTop: 16 }}
              />
            </View>
          ) : (
            <View style={styles.matchesList}>
              {/* Show matches with overlaps first */}
              {connectionMatches
                .sort((a, b) => b.totalOverlapMinutes - a.totalOverlapMinutes)
                .map((match) => renderOverlapCard(match))}
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
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
    paddingHorizontal: 4,
    paddingVertical: 8,
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
    alignItems: 'center',
    marginBottom: 16,
  },
  divider: {
    marginHorizontal: 16,
  },
  myScheduleCard: {
    padding: 16,
    borderRadius: 16,
  },
  myScheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  myScheduleSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  dayBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  emptyState: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
  },
  matchesList: {
    gap: 12,
  },
  matchCard: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  overlapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  overlapsContainer: {
    marginTop: 16,
    gap: 12,
  },
  dayOverlap: {
    gap: 8,
  },
  dayLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeSlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginLeft: 22,
  },
  timeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  noOverlapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
});

export default ConnectionScheduleScreen;
