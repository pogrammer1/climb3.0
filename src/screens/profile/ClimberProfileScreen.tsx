// Climber Profile Screen - View another climber's profile
import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, useTheme, Chip, Divider, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, Avatar, Button, LoadingSpinner, EmptyState } from '../../components/common';
import { useAuthStore, useMatchStore } from '../../store';
import { getProfile } from '../../services/profileService';
import { ClimberProfile } from '../../types';
import { showAlert } from '../../utils/alert';

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
  const { sendRequest, getCompatibilityScore } = useMatchStore();
  const { profile: myProfile } = useAuthStore();

  const [climber, setClimber] = useState<ClimberProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sendingRequest, setSendingRequest] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [climberId]);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const result = await getProfile(climberId);
      if (result.success && result.data) {
        setClimber(result.data as ClimberProfile);
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

  const handleMessage = () => {
    // For now, show an alert that this requires being connected first
    showAlert('Connect First', 'You need to connect with this climber before you can message them.');
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

  const compatibilityScore = myProfile ? getCompatibilityScore(myProfile, climber) : 0;

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
              {compatibilityScore > 0 && (
                <View style={[styles.compatBadge, { backgroundColor: theme.colors.primaryContainer }]}>
                  <Text variant="labelMedium" style={{ color: theme.colors.onPrimaryContainer }}>
                    {compatibilityScore}% match
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
        {climber.availableDays && climber.availableDays.length > 0 && (
          <Card style={styles.availabilityCard}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Availability
            </Text>
            <View style={styles.chipsContainer}>
              {climber.availableDays.map((day: string) => (
                <Chip key={day} style={styles.chip} icon="calendar">
                  {day}
                </Chip>
              ))}
            </View>
          </Card>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            title="Connect"
            onPress={handleSendRequest}
            loading={sendingRequest}
            style={styles.actionButton}
          />
          <Button
            title="Message"
            onPress={handleMessage}
            variant="outline"
            style={styles.actionButton}
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
