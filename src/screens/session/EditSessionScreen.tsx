// Edit Session Screen - Edit an existing climbing session
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Platform } from 'react-native';
import { Text, useTheme, SegmentedButtons, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input, Card, LoadingSpinner, GymPicker } from '../../components/common';
import { useSessionStore } from '../../store';
import { SessionFormData } from '../../types';
import { showAlert } from '../../utils/alert';

// Web-compatible DateTimePicker component
const DateTimePicker = ({ value, mode, onChange, maximumDate }: any) => {
  // Format date as YYYY-MM-DD for HTML input, using local timezone
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
          // Parse the date string as local time, not UTC
          const [year, month, day] = e.target.value.split('-').map(Number);
          const newDate = new Date(year, month - 1, day, 12, 0, 0); // noon to avoid any timezone edge cases
          onChange(null, newDate);
        }
      }}
      style={{
        padding: 12,
        fontSize: 16,
        borderRadius: 8,
        border: '1px solid #ccc',
        marginBottom: 16,
        width: '100%',
      }}
    />
  );
};

interface EditSessionScreenProps {
  navigation: any;
  route: {
    params: {
      sessionId: string;
    };
  };
}

export const EditSessionScreen: React.FC<EditSessionScreenProps> = ({ navigation, route }) => {
  const { sessionId } = route.params;
  const theme = useTheme();
  const { currentSession, isLoading, fetchSession, updateExistingSession } = useSessionStore();

  const [formData, setFormData] = useState<SessionFormData>({
    date: new Date(),
    location: '',
    locationType: 'indoor',
    duration: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof SessionFormData, string>>>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSession(sessionId);
  }, [sessionId]);

  useEffect(() => {
    if (currentSession) {
      setFormData({
        date: new Date(currentSession.date),
        location: currentSession.location || '',
        locationType: currentSession.locationType || 'indoor',
        duration: currentSession.duration?.toString() || '',
        notes: currentSession.notes || '',
      });
    }
  }, [currentSession]);

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

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const success = await updateExistingSession(sessionId, {
        date: formData.date,
        location: formData.location.trim(),
        locationType: formData.locationType,
        duration: formData.duration,
        notes: formData.notes.trim(),
      });

      if (success) {
        showAlert('Success', 'Session updated successfully!');
        navigation.goBack();
      } else {
        showAlert('Error', 'Failed to update session. Please try again.');
      }
    } catch (error) {
      showAlert('Error', 'Failed to update session. Please try again.');
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
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading && !currentSession) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <LoadingSpinner fullScreen message="Loading session..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <IconButton
          icon="close"
          onPress={() => navigation.goBack()}
        />
        <Text variant="titleLarge" style={{ color: theme.colors.onBackground }}>
          Edit Session
        </Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.formCard}>
          {/* Date Picker */}
          <Text variant="labelLarge" style={[styles.label, { color: theme.colors.onBackground }]}>
            Date
          </Text>
          <Button
            title={formatDate(formData.date)}
            onPress={() => setShowDatePicker(true)}
            variant="outline"
            icon="calendar"
            style={styles.dateButton}
          />
          
          {showDatePicker && (
            <DateTimePicker
              value={formData.date}
              mode="date"
              display="default"
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
          )}

          {/* Location Type */}
          <Text variant="labelLarge" style={[styles.label, { color: theme.colors.onBackground }]}>
            Location Type
          </Text>
          <SegmentedButtons
            value={formData.locationType}
            onValueChange={(value) => setFormData({ ...formData, locationType: value as 'indoor' | 'outdoor' })}
            buttons={[
              { value: 'indoor', label: '🏢 Indoor', icon: 'office-building' },
              { value: 'outdoor', label: '⛰️ Outdoor', icon: 'terrain' },
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

          {/* Duration */}
          <Input
            label="Duration (minutes)"
            value={formData.duration}
            onChangeText={(text) => setFormData({ ...formData, duration: text })}
            placeholder="e.g., 120"
            keyboardType="numeric"
            error={errors.duration}
            leftIcon="clock-outline"
            required
          />

          {/* Notes */}
          <Input
            label="Notes"
            value={formData.notes}
            onChangeText={(text) => setFormData({ ...formData, notes: text })}
            placeholder="How was your session? Any highlights?"
            multiline
            numberOfLines={4}
            leftIcon="note-text"
          />
        </Card>

        <Button
          title="Save Changes"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          fullWidth
          style={styles.saveButton}
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
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  scrollContent: {
    padding: 16,
  },
  formCard: {
    padding: 16,
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    marginTop: 16,
  },
  dateButton: {
    marginBottom: 8,
  },
  segmented: {
    marginBottom: 16,
  },
  saveButton: {
    marginTop: 8,
  },
});

export default EditSessionScreen;
