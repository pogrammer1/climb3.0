// New Session Screen - Create a climbing session with inline climb logging
import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Platform, Pressable } from 'react-native';
import { Text, useTheme, SegmentedButtons, IconButton, Chip, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Input, Card, GymPicker, AddClimbModal, ClimbFormData as AddClimbFormData } from '../../components/common';
import { useAuthStore, useSessionStore } from '../../store';
import { SessionFormData, ClimbFormData, ClimbingType, AttemptResult } from '../../types';
import { showAlert } from '../../utils/alert';
import { logServiceError } from '../../utils/error';

// Web-compatible DateTimePicker component
const DateTimePicker = ({ value, mode, onChange, maximumDate }: any) => {
  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <input
      type="date"
      value={formatDateForInput(value)}
      max={maximumDate ? formatDateForInput(maximumDate) : undefined}
      onChange={(e) => {
        if (e.target.value) {
          const [year, month, day] = e.target.value.split('-').map(Number);
          const newDate = new Date(year, month - 1, day, 12, 0, 0);
          onChange(null, newDate);
        }
      }}
      style={{
        padding: 12,
        fontSize: 16,
        borderRadius: 8,
        border: '1px solid #ccc',
        width: '100%',
      }}
    />
  );
};

interface TempClimb {
  id: string;
  name: string;
  climbingType: ClimbingType;
  grade: string;
  gradeSystem: 'yds' | 'v-scale';
  attempts: string;
  result: AttemptResult;
  notes: string;
  rating: number;
}

interface NewSessionScreenProps {
  navigation: any;
}

export const NewSessionScreen: React.FC<NewSessionScreenProps> = ({ navigation }) => {
  const theme = useTheme();
  const { user } = useAuthStore();
  const { createNewSession, addClimbToSession, fetchStats, isLoading } = useSessionStore();

  // Session form data
  const [formData, setFormData] = useState<SessionFormData>({
    date: new Date(),
    location: '',
    locationType: 'indoor',
    duration: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof SessionFormData, string>>>({});
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Climb management
  const [climbs, setClimbs] = useState<TempClimb[]>([]);
  const [showClimbModal, setShowClimbModal] = useState(false);
  const [editingClimbIndex, setEditingClimbIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof SessionFormData, string>> = {};

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }

    if (!formData.duration.trim()) {
      newErrors.duration = 'Duration is required';
    } else if (isNaN(parseInt(formData.duration, 10)) || parseInt(formData.duration, 10) <= 0) {
      newErrors.duration = 'Please enter a valid duration';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateSession = async () => {
    if (!validateForm() || !user) return;

    setSaving(true);
    try {
      // Create the session first
      const session = await createNewSession(user.uid, formData);

      if (session) {
        // Add all climbs to the session
        for (const climb of climbs) {
          const climbData: ClimbFormData = {
            name: climb.name,
            climbingType: climb.climbingType,
            grade: climb.grade,
            gradeSystem: climb.gradeSystem,
            attempts: climb.attempts,
            result: climb.result,
            notes: climb.notes,
            rating: climb.rating,
          };
          await addClimbToSession(session.id, climbData);
        }

        // Refresh stats
        await fetchStats(user.uid);

        showAlert('Success', 'Session created successfully!');
        navigation.goBack();
      } else {
        showAlert('Error', 'Failed to create session. Please try again.');
      }
    } catch (error) {
      logServiceError('NewSessionScreen.createSession', error);
      showAlert('Error', 'Failed to create session. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setFormData({ ...formData, date: selectedDate });
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleAddClimb = () => {
    setEditingClimbIndex(null);
    setShowClimbModal(true);
  };

  const handleEditClimb = (index: number) => {
    setEditingClimbIndex(index);
    setShowClimbModal(true);
  };

  const handleSaveClimb = (climbData: AddClimbFormData) => {
    const climbToSave: TempClimb = {
      id: editingClimbIndex !== null ? climbs[editingClimbIndex].id : Date.now().toString(),
      ...climbData,
    };

    if (editingClimbIndex !== null) {
      const updatedClimbs = [...climbs];
      updatedClimbs[editingClimbIndex] = climbToSave;
      setClimbs(updatedClimbs);
    } else {
      setClimbs([...climbs, climbToSave]);
    }

    setShowClimbModal(false);
  };

  const handleDeleteClimb = (index: number) => {
    setClimbs(climbs.filter((_, i) => i !== index));
  };

  // Get color based on attempt result, add diff color for fail other than gray later maybe or change system all together
  const getResultColor = (result: AttemptResult): string => {
    const successResults = ['Send', 'Flash', 'Onsight', 'Redpoint'];
    return successResults.includes(result) ? theme.colors.primary : theme.colors.outline;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <IconButton icon="close" onPress={() => navigation.goBack()} />
        <Text variant="titleLarge" style={{ color: theme.colors.onBackground }}>
          Log Session
        </Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Session Details Card */}
        <Card style={styles.formCard}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Session Details
          </Text>

          {/* Date Picker */}
          <Text variant="labelMedium" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>
            Date
          </Text>
          {showDatePicker || Platform.OS === 'web' ? (
            <View style={styles.dateRow}>
              <DateTimePicker
                value={formData.date}
                mode="date"
                onChange={handleDateChange}
                maximumDate={new Date()}
              />
            </View>
          ) : (
            <Pressable onPress={() => setShowDatePicker(true)} style={styles.dateButton}>
              <View style={styles.dateRow}>
                <MaterialCommunityIcons name="calendar" size={20} color={theme.colors.primary} />
                <Text variant="bodyLarge" style={styles.dateText} numberOfLines={1} ellipsizeMode="tail">
                  {formatDate(formData.date)}
                </Text>
              </View>
            </Pressable>
          )}

          {/* Location Type */}
          <Text variant="labelMedium" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>
            Location Type
          </Text>
          <SegmentedButtons
            value={formData.locationType}
            onValueChange={(value) => setFormData({ ...formData, locationType: value as 'indoor' | 'outdoor' })}
            buttons={[
              { value: 'indoor', label: 'Indoor' },
              { value: 'outdoor', label: 'Outdoor' },
            ]}
            style={styles.segmented}
          />

          {/* Location Name */}
          <GymPicker
            value={formData.location}
            onSelect={(gymName) => setFormData({ ...formData, location: gymName })}
            locationType={formData.locationType}
            error={errors.location}
          />
          {formData.location ? (
            <View style={styles.gymNameRow}>
              <MaterialCommunityIcons name="map-marker" size={20} color={theme.colors.primary} />
              <Text style={styles.gymNameText} numberOfLines={2} ellipsizeMode="tail">
                {formData.location}
              </Text>
            </View>
          ) : null}

          {/* Duration */}
          <Input
            label="Duration (minutes)"
            value={formData.duration}
            onChangeText={(text) => setFormData({ ...formData, duration: text })}
            placeholder="e.g., 120"
            keyboardType="numeric"
            error={errors.duration}
            leftIcon="clock-outline"
          />

          {/* Notes */}
          <Input
            label="Notes (optional)"
            value={formData.notes}
            onChangeText={(text) => setFormData({ ...formData, notes: text })}
            placeholder="How was your session?"
            multiline
            numberOfLines={2}
            leftIcon="note-text"
          />
        </Card>

        {/* Climbs Card */}
        <Card style={styles.climbsCard}>
          <View style={styles.climbsHeader}>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
              Climbs ({climbs.length})
            </Text>
            <Button
              title="Add Climb"
              onPress={handleAddClimb}
              variant="outline"
              size="small"
              icon="plus"
            />
          </View>

          {climbs.length === 0 ? (
            <View style={styles.emptyClimbs}>
              <MaterialCommunityIcons name="trending-up" size={40} color={theme.colors.outline} />
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                No climbs added yet
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Add your climbs to track your progress
              </Text>
            </View>
          ) : (
            <View style={styles.climbsList}>
              {climbs.map((climb, index) => (
                <View key={climb.id}>
                  {index > 0 && <Divider style={styles.climbDivider} />}
                  <Pressable
                    style={styles.climbItem}
                    onPress={() => handleEditClimb(index)}
                  >
                    <View style={[styles.gradeChip, { backgroundColor: getResultColor(climb.result) + '20' }]}>
                      <Text style={[styles.gradeText, { color: getResultColor(climb.result) }]}>
                        {climb.grade}
                      </Text>
                    </View>
                    <View style={styles.climbInfo}>
                      <View style={styles.climbTopRow}>
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                          {climb.climbingType}
                        </Text>
                        <Chip compact style={styles.resultChip}>
                          {climb.result}
                        </Chip>
                      </View>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {climb.attempts} attempt{climb.attempts !== '1' ? 's' : ''}
                        {climb.name ? `  ${climb.name}` : ''}
                      </Text>
                    </View>
                    <IconButton
                      icon="delete-outline"
                      size={20}
                      onPress={() => handleDeleteClimb(index)}
                    />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </Card>
      </ScrollView>

      {/* Bottom Bar */}
      <View style={[styles.bottomBar, { backgroundColor: theme.colors.surface }]}>
        <Button
          title={saving ? 'Creating...' : `Create Session${climbs.length > 0 ? ` with ${climbs.length} climb${climbs.length > 1 ? 's' : ''}` : ''}`}
          onPress={handleCreateSession}
          loading={saving || isLoading}
          fullWidth
        />
      </View>

      {/* Add/Edit Climb Modal */}
      <AddClimbModal
        visible={showClimbModal}
        onDismiss={() => setShowClimbModal(false)}
        onSave={handleSaveClimb}
        initialData={editingClimbIndex !== null ? climbs[editingClimbIndex] : undefined}
        isEditing={editingClimbIndex !== null}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '100%',
    marginBottom: 8,
  },
  dateText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    minWidth: 0,
    maxWidth: '90%',
    color: '#333',
  },
  gymNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
    maxWidth: '100%',
  },
  gymNameText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
    minWidth: 0,
    maxWidth: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  formCard: {
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    marginTop: 12,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  segmented: {
    marginBottom: 8,
  },
  climbsCard: {
    padding: 16,
  },
  climbsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyClimbs: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  climbsList: {
    marginTop: 8,
  },
  climbItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  climbDivider: {
    marginVertical: 4,
  },
  gradeChip: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  gradeText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  climbInfo: {
    flex: 1,
  },
  climbTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultChip: {
    height: 24,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
});

export default NewSessionScreen;
