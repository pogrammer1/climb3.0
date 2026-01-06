// New Session Screen - Create a climbing session
import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Alert, Platform } from 'react-native';
import { Text, useTheme, SegmentedButtons, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Button, Input, Card } from '../../components/common';
import { useAuthStore, useSessionStore } from '../../store';
import { SessionFormData } from '../../types';

interface NewSessionScreenProps {
  navigation: any;
}

export const NewSessionScreen: React.FC<NewSessionScreenProps> = ({ navigation }) => {
  const theme = useTheme();
  const { user } = useAuthStore();
  const { createNewSession, isLoading } = useSessionStore();

  const [formData, setFormData] = useState<SessionFormData>({
    date: new Date(),
    location: '',
    locationType: 'indoor',
    duration: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof SessionFormData, string>>>({});
  const [showDatePicker, setShowDatePicker] = useState(false);

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

    const session = await createNewSession(user.uid, formData);

    if (session) {
      // Navigate to session detail to add climbs
      navigation.replace('SessionDetail', { sessionId: session.id, isNew: true });
    } else {
      Alert.alert('Error', 'Failed to create session. Please try again.');
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <IconButton
          icon="close"
          onPress={() => navigation.goBack()}
        />
        <Text variant="titleLarge" style={{ color: theme.colors.onBackground }}>
          New Session
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
          <Input
            label="Location Name"
            value={formData.location}
            onChangeText={(text) => setFormData({ ...formData, location: text })}
            placeholder={formData.locationType === 'indoor' ? 'e.g., Brooklyn Boulders' : 'e.g., Red Rocks'}
            error={errors.location}
            leftIcon="map-marker"
            required
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

        <View style={styles.footer}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
            After creating the session, you can add individual climbs with grades and notes.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Button
          title="Create Session"
          onPress={handleCreateSession}
          loading={isLoading}
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
};

// Simple DateTimePicker fallback for web
const DateTimePicker = ({ value, mode, onChange, maximumDate }: any) => {
  if (Platform.OS === 'web') {
    return (
      <input
        type="date"
        value={value.toISOString().split('T')[0]}
        max={maximumDate?.toISOString().split('T')[0]}
        onChange={(e) => onChange(null, new Date(e.target.value))}
        style={{
          padding: 12,
          fontSize: 16,
          borderRadius: 8,
          border: '1px solid #ccc',
          marginBottom: 16,
        }}
      />
    );
  }
  
  // For native, would use @react-native-community/datetimepicker
  return null;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  label: {
    marginBottom: 8,
    marginTop: 8,
  },
  dateButton: {
    marginBottom: 16,
  },
  segmented: {
    marginBottom: 16,
  },
  footer: {
    padding: 16,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
});

export default NewSessionScreen;
