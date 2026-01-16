// My Schedule Screen - Edit personal climbing availability
import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, useTheme, IconButton, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, LoadingSpinner, SchedulePicker } from '../../components/common';
import { useAuthStore } from '../../store';
import { useScheduleStore } from '../../store/scheduleStore';
import { DayAvailability } from '../../types';
import { showAlert } from '../../utils/alert';
import { DAYS_OF_WEEK } from '../../constants';

interface MyScheduleScreenProps {
  navigation: any;
}

export const MyScheduleScreen: React.FC<MyScheduleScreenProps> = ({ navigation }) => {
  const theme = useTheme();
  const { user } = useAuthStore();
  const { mySchedule, isLoading, isSaving, fetchMySchedule, updateSchedule } = useScheduleStore();

  const [localSchedule, setLocalSchedule] = useState<DayAvailability[]>([]);
  const [notes, setNotes] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch schedule when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchMySchedule(user.uid);
      }
    }, [user])
  );

  // Initialize local state from fetched schedule
  useEffect(() => {
    if (mySchedule) {
      setLocalSchedule(mySchedule.schedule);
      setNotes(mySchedule.notes || '');
      setHasChanges(false);
    } else {
      // Initialize with empty schedule
      setLocalSchedule(
        DAYS_OF_WEEK.map((day) => ({
          day: day as any,
          slots: [],
          isAvailable: false,
        }))
      );
    }
  }, [mySchedule]);

  const handleScheduleChange = (newSchedule: DayAvailability[]) => {
    setLocalSchedule(newSchedule);
    setHasChanges(true);
  };

  const handleNotesChange = (text: string) => {
    setNotes(text);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!user) {
      showAlert('Error', 'You must be logged in to save your schedule');
      return;
    }

    const success = await updateSchedule(
      user.uid,
      localSchedule,
      mySchedule?.preferredGyms || [],
      notes
    );

    if (success) {
      showAlert('Success', 'Your climbing schedule has been updated!');
      setHasChanges(false);
      navigation.goBack();
    } else {
      showAlert('Error', 'Failed to save your schedule. Please try again.');
    }
  };

  const handleClearAll = () => {
    const clearedSchedule = localSchedule.map((day) => ({
      ...day,
      isAvailable: false,
      slots: [],
    }));
    setLocalSchedule(clearedSchedule);
    setHasChanges(true);
  };

  const getAvailableDaysCount = () => {
    return localSchedule.filter((d) => d.isAvailable).length;
  };

  const getTotalSlotsCount = () => {
    return localSchedule.reduce((total, day) => total + day.slots.length, 0);
  };

  if (isLoading && !mySchedule) {
    return <LoadingSpinner fullScreen message="Loading your schedule..." />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.outline }]}>
        <IconButton icon="close" onPress={() => navigation.goBack()} />
        <Text variant="titleLarge" style={{ color: theme.colors.onBackground, flex: 1 }}>
          My Climbing Schedule
        </Text>
        <Button
          title="Save"
          variant="text"
          onPress={handleSave}
          loading={isSaving}
          disabled={!hasChanges || isSaving}
        />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Summary */}
        <View style={[styles.summaryCard, { backgroundColor: theme.colors.primaryContainer }]}>
          <MaterialCommunityIcons
            name="calendar-check"
            size={24}
            color={theme.colors.onPrimaryContainer}
          />
          <View style={styles.summaryText}>
            <Text variant="titleMedium" style={{ color: theme.colors.onPrimaryContainer }}>
              {getAvailableDaysCount()} day{getAvailableDaysCount() !== 1 ? 's' : ''} available
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onPrimaryContainer, opacity: 0.8 }}
            >
              {getTotalSlotsCount()} time slot{getTotalSlotsCount() !== 1 ? 's' : ''} selected
            </Text>
          </View>
          {getAvailableDaysCount() > 0 && (
            <IconButton
              icon="close-circle"
              size={20}
              iconColor={theme.colors.onPrimaryContainer}
              onPress={handleClearAll}
            />
          )}
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <MaterialCommunityIcons
            name="information-outline"
            size={18}
            color={theme.colors.onSurfaceVariant}
          />
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant, marginLeft: 8, flex: 1 }}
          >
            Select the days and times when you're typically available to climb. This helps find
            matching schedules with your connections.
          </Text>
        </View>

        {/* Schedule Picker */}
        <View style={styles.section}>
          <Text
            variant="titleMedium"
            style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
          >
            Weekly Availability
          </Text>
          <View style={[styles.pickerContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
            <SchedulePicker
              schedule={localSchedule}
              onChange={handleScheduleChange}
              disabled={isSaving}
            />
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text
            variant="titleMedium"
            style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
          >
            Notes (Optional)
          </Text>
          <TextInput
            mode="outlined"
            placeholder="E.g., Flexible on weekends, prefer morning sessions..."
            value={notes}
            onChangeText={handleNotesChange}
            multiline
            numberOfLines={3}
            style={styles.notesInput}
            disabled={isSaving}
          />
        </View>

        {/* Tips */}
        <View style={[styles.tipsCard, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Text
            variant="labelLarge"
            style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}
          >
            💡 Tips
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            • Select multiple time slots per day if you have flexible availability
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            • Your connections will see when your schedules overlap
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            • Update your schedule anytime as your availability changes
          </Text>
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
    borderBottomWidth: 1,
  },
  scrollView: {
    flex: 1,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  summaryText: {
    flex: 1,
    marginLeft: 12,
  },
  instructions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: '600',
  },
  pickerContainer: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  notesInput: {
    backgroundColor: 'transparent',
  },
  tipsCard: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
  },
});

export default MyScheduleScreen;
