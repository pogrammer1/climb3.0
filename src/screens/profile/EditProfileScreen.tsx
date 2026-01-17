// Edit Profile Screen - Update user profile information
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Image, Pressable } from 'react-native';
import { Text, useTheme, IconButton, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Input, Button, GradePicker, LoadingSpinner } from '../../components/common';
import { useAuthStore } from '../../store';
import { saveProfile, uploadProfilePhoto } from '../../services/profileService';
import { UserProfile, ExperienceLevel, ClimbingType, YDSGrade, BoulderingGrade, EmailNotificationType } from '../../types';
import { EXPERIENCE_LEVELS, CLIMBING_TYPES } from '../../constants';
import { showAlert } from '../../utils/alert';

// Email notification type options
const EMAIL_NOTIFICATION_TYPES: { value: EmailNotificationType; label: string; description: string }[] = [
  { value: 'messages', label: 'New Messages', description: 'When someone sends you a message' },
  { value: 'connections', label: 'Connection Requests', description: 'When someone wants to connect' },
  { value: 'reminders', label: 'Climbing Reminders', description: 'Upcoming sessions and activity' },
];

interface EditProfileScreenProps {
  navigation: any;
}

export const EditProfileScreen: React.FC<EditProfileScreenProps> = ({ navigation }) => {
  const theme = useTheme();
  const { user, profile, setProfile } = useAuthStore();
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    experienceLevel: 'Beginner' as ExperienceLevel,
    climbingTypes: [] as ClimbingType[],
    highestGradeYDS: null as YDSGrade | null,
    highestGradeBouldering: null as BoulderingGrade | null,
    homeGym: '',
    yearsClimbing: '',
    partnerPreferences: [] as string[],
    availableDays: [] as string[],
    availableTimes: [] as string[],
    emailNotifications: true,
    emailNotificationTypes: ['messages', 'connections'] as EmailNotificationType[],
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName || '',
        bio: profile.bio || '',
        experienceLevel: profile.experienceLevel || 'Beginner',
        climbingTypes: profile.climbingTypes || [],
        highestGradeYDS: profile.highestGradeYDS || null,
        highestGradeBouldering: profile.highestGradeBouldering || null,
        homeGym: profile.homeGym || '',
        yearsClimbing: profile.yearsClimbing?.toString() || '',
        partnerPreferences: profile.partnerPreferences || [],
        availableDays: profile.availableDays || [],
        availableTimes: profile.availableTimes || [],
        emailNotifications: profile.emailNotifications ?? true,
        emailNotificationTypes: profile.emailNotificationTypes || ['messages', 'connections'],
      });
    }
  }, [profile]);

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        showAlert('Permission Required', 'Please allow access to your photos to update your profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0] && user) {
        setUploading(true);
        try {
          const response = await uploadProfilePhoto(user.uid, result.assets[0].uri);
          if (response.success && response.data) {
            setProfile({ ...profile!, photoURL: response.data });
            showAlert('Success', 'Profile photo updated!');
          } else {
            showAlert('Error', response.error || 'Failed to upload photo');
          }
        } catch (error) {
          showAlert('Error', 'Failed to upload photo');
        } finally {
          setUploading(false);
        }
      }
    } catch (error) {
      showAlert('Error', 'Failed to access photos');
    }
  };

  const toggleClimbingType = (type: ClimbingType) => {
    setFormData((prev) => ({
      ...prev,
      climbingTypes: prev.climbingTypes.includes(type)
        ? prev.climbingTypes.filter((t) => t !== type)
        : [...prev.climbingTypes, type],
    }));
  };

  const toggleEmailNotificationType = (type: EmailNotificationType) => {
    setFormData((prev) => ({
      ...prev,
      emailNotificationTypes: prev.emailNotificationTypes.includes(type)
        ? prev.emailNotificationTypes.filter((t) => t !== type)
        : [...prev.emailNotificationTypes, type],
    }));
  };

  const handleSave = async () => {
    if (!user) {
      showAlert('Error', 'You must be logged in to save changes');
      return;
    }

    if (!formData.displayName.trim()) {
      showAlert('Error', 'Display name is required');
      return;
    }

    setLoading(true);
    try {
      console.log('Saving profile for user:', user.uid);
      const isNewProfile = !profile;
      const result = await saveProfile(user.uid, {
        displayName: formData.displayName.trim(),
        bio: formData.bio.trim(),
        experienceLevel: formData.experienceLevel,
        climbingTypes: formData.climbingTypes,
        highestGradeYDS: formData.highestGradeYDS,
        highestGradeBouldering: formData.highestGradeBouldering,
        homeGym: formData.homeGym.trim(),
        yearsClimbing: formData.yearsClimbing,
        partnerPreferences: formData.partnerPreferences,
        availableDays: formData.availableDays,
        availableTimes: formData.availableTimes,
        emailNotifications: formData.emailNotifications,
        emailNotificationTypes: formData.emailNotificationTypes,
      }, isNewProfile);

      console.log('Save result:', result);

      if (result.success && result.data) {
        setProfile(result.data);
        showAlert('Success', 'Profile updated successfully!');
        navigation.goBack();
      } else {
        console.error('Save failed:', result.error);
        showAlert('Error', result.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Save error:', error);
      showAlert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.outline }]}>
        <IconButton icon="close" onPress={() => navigation.goBack()} />
        <View style={styles.headerTitle}>
          <Text variant="titleLarge" style={{ color: theme.colors.onBackground }}>
            Edit Profile
          </Text>
        </View>
        <Button
          title="Save"
          variant="text"
          onPress={handleSave}
          loading={loading}
          disabled={loading}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Photo */}
        <View style={styles.photoSection}>
          <Pressable onPress={handlePickImage} disabled={uploading}>
            <View style={[styles.photoContainer, { borderColor: theme.colors.primary }]}>
              {uploading ? (
                <LoadingSpinner size="large" />
              ) : profile?.photoURL ? (
                <Image source={{ uri: profile.photoURL }} style={styles.photo} />
              ) : (
                <MaterialCommunityIcons
                  name="account"
                  size={60}
                  color={theme.colors.onSurfaceVariant}
                />
              )}
              <View style={[styles.editPhotoIcon, { backgroundColor: theme.colors.primary }]}>
                <MaterialCommunityIcons name="camera" size={16} color={theme.colors.onPrimary} />
              </View>
            </View>
          </Pressable>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
            Tap to change photo
          </Text>
        </View>

        {/* Basic Info */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Basic Info
          </Text>
          
          <Input
            label="Display Name"
            value={formData.displayName}
            onChangeText={(text) => setFormData({ ...formData, displayName: text })}
            placeholder="Your climbing name"
            leftIcon="account"
          />

          <Input
            label="Bio"
            value={formData.bio}
            onChangeText={(text) => setFormData({ ...formData, bio: text })}
            placeholder="Tell others about yourself..."
            multiline
            numberOfLines={3}
            leftIcon="text"
          />

          <Input
            label="Home Gym"
            value={formData.homeGym}
            onChangeText={(text) => setFormData({ ...formData, homeGym: text })}
            placeholder="Your regular climbing spot"
            leftIcon="home"
          />

          <Input
            label="Years Climbing"
            value={formData.yearsClimbing}
            onChangeText={(text) => setFormData({ ...formData, yearsClimbing: text })}
            placeholder="e.g., 3"
            keyboardType="numeric"
            leftIcon="calendar"
          />
        </View>

        {/* Experience Level */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Experience Level
          </Text>
          <View style={styles.chipContainer}>
            {EXPERIENCE_LEVELS.map((level) => (
              <Chip
                key={level}
                selected={formData.experienceLevel === level}
                onPress={() => setFormData({ ...formData, experienceLevel: level })}
                style={styles.chip}
              >
                {level}
              </Chip>
            ))}
          </View>
        </View>

        {/* Climbing Types */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Climbing Types
          </Text>
          <View style={styles.chipContainer}>
            {CLIMBING_TYPES.map((type) => (
              <Chip
                key={type}
                selected={formData.climbingTypes.includes(type)}
                onPress={() => toggleClimbingType(type)}
                style={styles.chip}
              >
                {type}
              </Chip>
            ))}
          </View>
        </View>

        {/* Max Grades */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Highest Grades
          </Text>
          
          <GradePicker
            label="Rope Climbing (YDS)"
            value={formData.highestGradeYDS}
            gradeSystem="yds"
            onValueChange={(grade) => setFormData({ ...formData, highestGradeYDS: grade as YDSGrade })}
            showSystemSelector={false}
          />

          <GradePicker
            label="Bouldering (V-Scale)"
            value={formData.highestGradeBouldering}
            gradeSystem="v-scale"
            onValueChange={(grade) => setFormData({ ...formData, highestGradeBouldering: grade as BoulderingGrade })}
            showSystemSelector={false}
            style={{ marginTop: 16 }}
          />
        </View>

        {/* Email Notifications */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Email Notifications
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
            Receive email updates for important activity
          </Text>
          
          <Pressable
            onPress={() => setFormData({ ...formData, emailNotifications: !formData.emailNotifications })}
            style={[styles.notificationToggle, { backgroundColor: theme.colors.surface }]}
          >
            <View style={styles.notificationToggleContent}>
              <MaterialCommunityIcons
                name={formData.emailNotifications ? 'bell' : 'bell-off'}
                size={24}
                color={formData.emailNotifications ? theme.colors.primary : theme.colors.onSurfaceVariant}
              />
              <View style={styles.notificationToggleText}>
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
                  Enable Email Notifications
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {formData.emailNotifications ? 'You will receive emails' : 'Emails are disabled'}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.toggleSwitch,
                {
                  backgroundColor: formData.emailNotifications ? theme.colors.primary : theme.colors.surfaceVariant,
                },
              ]}
            >
              <View
                style={[
                  styles.toggleKnob,
                  {
                    backgroundColor: 'white',
                    transform: [{ translateX: formData.emailNotifications ? 20 : 0 }],
                  },
                ]}
              />
            </View>
          </Pressable>

          {formData.emailNotifications && (
            <View style={styles.notificationTypes}>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginBottom: 8 }}>
                Notify me about:
              </Text>
              {EMAIL_NOTIFICATION_TYPES.map((type) => (
                <Pressable
                  key={type.value}
                  onPress={() => toggleEmailNotificationType(type.value)}
                  style={[
                    styles.notificationTypeItem,
                    {
                      backgroundColor: formData.emailNotificationTypes.includes(type.value)
                        ? theme.colors.primaryContainer
                        : theme.colors.surface,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={formData.emailNotificationTypes.includes(type.value) ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={22}
                    color={formData.emailNotificationTypes.includes(type.value) ? theme.colors.primary : theme.colors.onSurfaceVariant}
                  />
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                      {type.label}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {type.description}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Save Button */}
        <Button
          title="Save Changes"
          variant="primary"
          onPress={handleSave}
          loading={loading}
          style={styles.saveButton}
          fullWidth
        />
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
  headerTitle: {
    flex: 1,
    alignItems: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  photoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  editPhotoIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: '600',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginBottom: 4,
  },
  saveButton: {
    marginTop: 16,
  },
  notificationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  notificationToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  notificationToggleText: {
    marginLeft: 12,
    flex: 1,
  },
  toggleSwitch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    padding: 5,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  notificationTypes: {
    marginTop: 8,
  },
  notificationTypeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
  },
});

export default EditProfileScreen;
