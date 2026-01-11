// Profile Screen
import React, { useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, useTheme, Divider, Switch, List } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Card, Avatar, Button } from '../../components/common';
import { useAuthStore, useSessionStore, useMatchStore } from '../../store';
import { signOut } from '../../services/authService';
import { uploadProfilePhoto, toggleSearchability } from '../../services/profileService';
import { showAlert } from '../../utils/alert';

interface ProfileScreenProps {
  navigation: any;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const theme = useTheme();
  const { user, profile, fetchProfile, clearAuth } = useAuthStore();
  const { resetStore: resetSessionStore } = useSessionStore();
  const { clearState: clearMatchState } = useMatchStore();
  const [isUploading, setIsUploading] = useState(false);
  const [isSearchable, setIsSearchable] = useState(profile?.isSearchable ?? true);

  const handleEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  const handleChangePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        showAlert('Permission Required', 'Please allow access to your photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0] && user) {
        setIsUploading(true);
        await uploadProfilePhoto(user.uid, result.assets[0].uri);
        await fetchProfile();
        setIsUploading(false);
      }
    } catch (error) {
      setIsUploading(false);
      showAlert('Error', 'Failed to upload photo. Please try again.');
    }
  };

  const handleToggleSearchability = async (value: boolean) => {
    if (!user) return;
    setIsSearchable(value);
    await toggleSearchability(user.uid, value);
  };

  const handleSignOut = () => {
    showAlert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            // Clear all stores before signing out
            resetSessionStore();
            clearMatchState();
            clearAuth();
            await signOut();
          },
        },
      ]
    );
  };

  const StatItem = ({ label, value }: { label: string; value: string | number }) => (
    <View style={styles.statItem}>
      <Text variant="headlineSmall" style={{ color: theme.colors.onBackground, fontWeight: 'bold' }}>
        {value}
      </Text>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {label}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <Card style={styles.profileCard}>
          <View style={styles.avatarSection}>
            <Avatar
              source={profile?.photoURL}
              name={profile?.displayName || ''}
              size={100}
            />
            <Button
              title={isUploading ? 'Uploading...' : 'Change Photo'}
              onPress={handleChangePhoto}
              variant="text"
              size="small"
              disabled={isUploading}
            />
          </View>

          <Text variant="headlineSmall" style={[styles.name, { color: theme.colors.onBackground }]}>
            {profile?.displayName || user?.displayName || 'Climber'}
          </Text>
          
          {profile?.location && (
            <View style={styles.locationRow}>
              <MaterialCommunityIcons name="map-marker" size={16} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
                {profile.location.city}, {profile.location.state}
              </Text>
            </View>
          )}

          <Text variant="bodyMedium" style={[styles.bio, { color: theme.colors.onSurfaceVariant }]}>
            {profile?.bio || 'No bio yet. Tell others about yourself!'}
          </Text>

          <Button
            title="Edit Profile"
            onPress={handleEditProfile}
            variant="outline"
            fullWidth
            style={styles.editButton}
          />
        </Card>

        {/* Climbing Info */}
        <Card style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Climbing Info
          </Text>

          <View style={styles.statsRow}>
            <StatItem label="Experience" value={profile?.experienceLevel || 'N/A'} />
            <StatItem label="Years" value={profile?.yearsClimbing || 0} />
          </View>

          <Divider style={styles.divider} />

          {profile?.highestGradeYDS && (
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Highest Grade (YDS)
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onBackground, fontWeight: '600' }}>
                {profile.highestGradeYDS}
              </Text>
            </View>
          )}

          {profile?.highestGradeBouldering && (
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Highest Grade (V-Scale)
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onBackground, fontWeight: '600' }}>
                {profile.highestGradeBouldering}
              </Text>
            </View>
          )}

          {profile?.homeGym && (
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Home Gym
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onBackground, fontWeight: '600' }}>
                {profile.homeGym}
              </Text>
            </View>
          )}

          {profile?.climbingTypes && profile.climbingTypes.length > 0 && (
            <>
              <Divider style={styles.divider} />
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
                Climbing Types
              </Text>
              <View style={styles.tagsContainer}>
                {profile.climbingTypes.map((type) => (
                  <View key={type} style={[styles.tag, { backgroundColor: theme.colors.primaryContainer }]}>
                    <Text variant="labelSmall" style={{ color: theme.colors.onPrimaryContainer }}>
                      {type}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </Card>

        {/* Settings */}
        <Card style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Settings
          </Text>

          <View style={styles.settingRow}>
            <View>
              <Text variant="bodyLarge" style={{ color: theme.colors.onBackground }}>
                Discoverable
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Allow other climbers to find you
              </Text>
            </View>
            <Switch
              value={isSearchable}
              onValueChange={handleToggleSearchability}
              color={theme.colors.primary}
            />
          </View>

          <Divider style={styles.divider} />

          <List.Item
            title="Account Settings"
            left={(props) => <List.Icon {...props} icon="cog" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('AccountSettings')}
          />

          <List.Item
            title="Notifications"
            left={(props) => <List.Icon {...props} icon="bell" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('NotificationSettings')}
          />

          <List.Item
            title="Privacy"
            left={(props) => <List.Icon {...props} icon="shield-account" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('PrivacySettings')}
          />

          <List.Item
            title="Help & Support"
            left={(props) => <List.Icon {...props} icon="help-circle" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('Support')}
          />
        </Card>

        {/* Sign Out */}
        <Button
          title="Sign Out"
          onPress={handleSignOut}
          variant="outline"
          style={styles.signOutButton}
        />

        <Text variant="bodySmall" style={[styles.version, { color: theme.colors.onSurfaceVariant }]}>
          ClimbApp v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  profileCard: {
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  name: {
    fontWeight: '600',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bio: {
    textAlign: 'center',
    marginBottom: 16,
  },
  editButton: {
    marginTop: 8,
  },
  section: {
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  divider: {
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  signOutButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  version: {
    textAlign: 'center',
    marginBottom: 24,
  },
});

export default ProfileScreen;
