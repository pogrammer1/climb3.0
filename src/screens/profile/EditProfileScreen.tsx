// Edit Profile Screen - Update user profile information
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert, Image, Pressable } from 'react-native';
import { Text, useTheme, IconButton, Chip, SegmentedButtons } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Input, Button, ChipSelector, GradePicker, LoadingSpinner } from '../../components/common';
import { useAuthStore } from '../../store';
import { profileService } from '../../services/profileService';
import { UserProfile, ExperienceLevel, ClimbingType } from '../../types';
import { EXPERIENCE_LEVELS, CLIMBING_TYPES } from '../../constants';

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
    experienceLevel: 'beginner' as ExperienceLevel,
    climbingTypes: [] as ClimbingType[],
    maxBoulderGrade: '',
    maxRopeGrade: '',
    homeGym: '',
    availability: {
      weekdays: false,
      weekends: false,
      mornings: false,
      afternoons: false,
      evenings: false,
    },
    socialLinks: {
      instagram: '',
      mountainProject: '',
    },
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName || '',
        bio: profile.bio || '',
        experienceLevel: profile.experienceLevel || 'beginner',
        climbingTypes: profile.climbingTypes || [],
        maxBoulderGrade: profile.maxBoulderGrade || '',
        maxRopeGrade: profile.maxRopeGrade || '',
        homeGym: profile.homeGym || '',
        availability: profile.availability || {
          weekdays: false,
          weekends: false,
          mornings: false,
          afternoons: false,
          evenings: false,
        },
        socialLinks: profile.socialLinks || {
          instagram: '',
          mountainProject: '',
        },
      });
    }
  }, [profile]);

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photos to update your profile picture.');
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
          const photoURL = await profileService.uploadProfilePhoto(user.uid, result.assets[0].uri);
          setProfile({ ...profile!, photoURL });
          Alert.alert('Success', 'Profile photo updated!');
        } catch (error) {
          Alert.alert('Error', 'Failed to upload photo');
        } finally {
          setUploading(false);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to access photos');
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

  const toggleAvailability = (key: keyof typeof formData.availability) => {
    setFormData((prev) => ({
      ...prev,
      availability: {
        ...prev.availability,
        [key]: !prev.availability[key],
      },
    }));
  };

  const handleSave = async () => {
    if (!user || !profile) return;

    if (!formData.displayName.trim()) {
      Alert.alert('Error', 'Display name is required');
      return;
    }

    setLoading(true);
    try {
      const updates: Partial<UserProfile> = {
        displayName: formData.displayName.trim(),
        bio: formData.bio.trim(),
        experienceLevel: formData.experienceLevel,
        climbingTypes: formData.climbingTypes,
        maxBoulderGrade: formData.maxBoulderGrade || undefined,
        maxRopeGrade: formData.maxRopeGrade || undefined,
        homeGym: formData.homeGym.trim() || undefined,
        availability: formData.availability,
        socialLinks: {
          instagram: formData.socialLinks.instagram.trim() || undefined,
          mountainProject: formData.socialLinks.mountainProject.trim() || undefined,
        },
      };

      await profileService.updateProfile(user.uid, updates);
      setProfile({ ...profile, ...updates });
      Alert.alert('Success', 'Profile updated successfully!');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const availabilityOptions = [
    { key: 'weekdays' as const, label: 'Weekdays', icon: 'briefcase' },
    { key: 'weekends' as const, label: 'Weekends', icon: 'calendar-weekend' },
    { key: 'mornings' as const, label: 'Mornings', icon: 'weather-sunny' },
    { key: 'afternoons' as const, label: 'Afternoons', icon: 'white-balance-sunny' },
    { key: 'evenings' as const, label: 'Evenings', icon: 'weather-night' },
  ];

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
          variant="text"
          onPress={handleSave}
          loading={loading}
          disabled={loading}
        >
          Save
        </Button>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Photo */}
        <View style={styles.photoSection}>
          <Pressable onPress={handlePickImage} disabled={uploading}>
            <View style={[styles.photoContainer, { borderColor: theme.colors.primary }]}>
              {uploading ? (
                <LoadingSpinner size={40} />
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
        </View>

        {/* Experience Level */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Experience Level
          </Text>
          <View style={styles.experienceButtons}>
            {EXPERIENCE_LEVELS.map((level) => (
              <Chip
                key={level.value}
                selected={formData.experienceLevel === level.value}
                onPress={() => setFormData({ ...formData, experienceLevel: level.value as ExperienceLevel })}
                style={styles.experienceChip}
              >
                {level.label}
              </Chip>
            ))}
          </View>
        </View>

        {/* Climbing Types */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Climbing Types
          </Text>
          <View style={styles.typeButtons}>
            {CLIMBING_TYPES.map((type) => (
              <Chip
                key={type.value}
                selected={formData.climbingTypes.includes(type.value as ClimbingType)}
                onPress={() => toggleClimbingType(type.value as ClimbingType)}
                style={styles.typeChip}
                icon={type.icon}
              >
                {type.label}
              </Chip>
            ))}
          </View>
        </View>

        {/* Max Grades */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Max Grades
          </Text>
          
          <Text variant="labelLarge" style={[styles.label, { color: theme.colors.onSurface }]}>
            Boulder Grade
          </Text>
          <GradePicker
            type="boulder"
            value={formData.maxBoulderGrade}
            onChange={(grade) => setFormData({ ...formData, maxBoulderGrade: grade })}
          />

          <Text variant="labelLarge" style={[styles.label, { color: theme.colors.onSurface, marginTop: 16 }]}>
            Rope Grade
          </Text>
          <GradePicker
            type="rope"
            value={formData.maxRopeGrade}
            onChange={(grade) => setFormData({ ...formData, maxRopeGrade: grade })}
          />
        </View>

        {/* Availability */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Availability
          </Text>
          <View style={styles.availabilityGrid}>
            {availabilityOptions.map((option) => (
              <Chip
                key={option.key}
                selected={formData.availability[option.key]}
                onPress={() => toggleAvailability(option.key)}
                style={styles.availabilityChip}
                icon={option.icon}
              >
                {option.label}
              </Chip>
            ))}
          </View>
        </View>

        {/* Social Links */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Social Links
          </Text>

          <Input
            label="Instagram"
            value={formData.socialLinks.instagram || ''}
            onChangeText={(text) => setFormData({
              ...formData,
              socialLinks: { ...formData.socialLinks, instagram: text },
            })}
            placeholder="@username"
            leftIcon="instagram"
          />

          <Input
            label="Mountain Project"
            value={formData.socialLinks.mountainProject || ''}
            onChangeText={(text) => setFormData({
              ...formData,
              socialLinks: { ...formData.socialLinks, mountainProject: text },
            })}
            placeholder="Profile URL"
            leftIcon="mountain"
          />
        </View>

        {/* Save Button */}
        <Button
          variant="primary"
          onPress={handleSave}
          loading={loading}
          style={styles.saveButton}
          fullWidth
        >
          Save Changes
        </Button>
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
  },
  content: {
    padding: 16,
    paddingBottom: 40,
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
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  editPhotoIcon: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  label: {
    marginBottom: 8,
  },
  experienceButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  experienceChip: {
    marginRight: 4,
  },
  typeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    marginRight: 4,
  },
  availabilityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  availabilityChip: {
    marginRight: 4,
  },
  saveButton: {
    marginTop: 16,
  },
});

export default EditProfileScreen;
