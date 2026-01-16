// SchedulePicker Component - Select day and time availability with custom hours
import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Pressable, Platform } from 'react-native';
import { Text, useTheme, Chip, Checkbox, Divider, IconButton, Button, Modal, Portal } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DayAvailability, TimeSlot, DayOfWeek } from '../../types';
import { DAYS_OF_WEEK, SCHEDULE_TIME_SLOTS } from '../../constants';

interface SchedulePickerProps {
  schedule: DayAvailability[];
  onChange: (schedule: DayAvailability[]) => void;
  disabled?: boolean;
  compact?: boolean;
}

// Time picker options (hours)
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = ['00', '15', '30', '45'];

export const SchedulePicker: React.FC<SchedulePickerProps> = ({
  schedule,
  onChange,
  disabled = false,
  compact = false,
}) => {
  const theme = useTheme();
  const [expandedDay, setExpandedDay] = useState<DayOfWeek | null>(null);
  const [showCustomTimeModal, setShowCustomTimeModal] = useState(false);
  const [customTimeDay, setCustomTimeDay] = useState<DayOfWeek | null>(null);
  const [customStartHour, setCustomStartHour] = useState('09');
  const [customStartMinute, setCustomStartMinute] = useState('00');
  const [customEndHour, setCustomEndHour] = useState('12');
  const [customEndMinute, setCustomEndMinute] = useState('00');

  const getDaySchedule = (day: DayOfWeek): DayAvailability => {
    return (
      schedule.find((s) => s.day === day) || {
        day,
        slots: [],
        isAvailable: false,
      }
    );
  };

  const toggleDayAvailability = (day: DayOfWeek) => {
    if (disabled) return;

    const currentDaySchedule = getDaySchedule(day);
    const newSchedule = schedule.map((s) =>
      s.day === day
        ? {
            ...s,
            isAvailable: !s.isAvailable,
            slots: !s.isAvailable ? [{ startTime: '09:00', endTime: '17:00' }] : [],
          }
        : s
    );

    if (!schedule.find((s) => s.day === day)) {
      newSchedule.push({
        day,
        isAvailable: true,
        slots: [{ startTime: '09:00', endTime: '17:00' }],
      });
    }

    onChange(newSchedule);
  };

  const addCustomTimeSlot = () => {
    if (!customTimeDay) return;

    const startTime = `${customStartHour.padStart(2, '0')}:${customStartMinute}`;
    const endTime = `${customEndHour.padStart(2, '0')}:${customEndMinute}`;

    // Validate that end time is after start time
    if (startTime >= endTime) {
      return;
    }

    const currentDaySchedule = getDaySchedule(customTimeDay);
    const newSlots = [...currentDaySchedule.slots, { startTime, endTime }];
    newSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));

    const newSchedule = schedule.map((s) =>
      s.day === customTimeDay
        ? { ...s, slots: newSlots, isAvailable: true }
        : s
    );

    if (!schedule.find((s) => s.day === customTimeDay)) {
      newSchedule.push({
        day: customTimeDay,
        isAvailable: true,
        slots: newSlots,
      });
    }

    onChange(newSchedule);
    setShowCustomTimeModal(false);
  };

  const removeTimeSlot = (day: DayOfWeek, slotIndex: number) => {
    if (disabled) return;

    const currentDaySchedule = getDaySchedule(day);
    const newSlots = currentDaySchedule.slots.filter((_, idx) => idx !== slotIndex);

    const newSchedule = schedule.map((s) =>
      s.day === day
        ? { ...s, slots: newSlots, isAvailable: newSlots.length > 0 }
        : s
    );

    onChange(newSchedule);
  };

  const togglePresetSlot = (day: DayOfWeek, slotInfo: { startTime: string; endTime: string }) => {
    if (disabled) return;

    const currentDaySchedule = getDaySchedule(day);
    const slotExists = currentDaySchedule.slots.some(
      (s) => s.startTime === slotInfo.startTime && s.endTime === slotInfo.endTime
    );

    let newSlots: TimeSlot[];
    if (slotExists) {
      newSlots = currentDaySchedule.slots.filter(
        (s) => !(s.startTime === slotInfo.startTime && s.endTime === slotInfo.endTime)
      );
    } else {
      newSlots = [...currentDaySchedule.slots, { startTime: slotInfo.startTime, endTime: slotInfo.endTime }];
    }

    newSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));

    const newSchedule = schedule.map((s) =>
      s.day === day
        ? { ...s, slots: newSlots, isAvailable: newSlots.length > 0 }
        : s
    );

    if (!schedule.find((s) => s.day === day)) {
      newSchedule.push({
        day,
        isAvailable: newSlots.length > 0,
        slots: newSlots,
      });
    }

    onChange(newSchedule);
  };

  const isPresetSelected = (day: DayOfWeek, slotInfo: { startTime: string; endTime: string }): boolean => {
    const daySchedule = getDaySchedule(day);
    return daySchedule.slots.some(
      (s) => s.startTime === slotInfo.startTime && s.endTime === slotInfo.endTime
    );
  };

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const openCustomTimeModal = (day: DayOfWeek) => {
    setCustomTimeDay(day);
    setCustomStartHour('09');
    setCustomStartMinute('00');
    setCustomEndHour('12');
    setCustomEndMinute('00');
    setShowCustomTimeModal(true);
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {DAYS_OF_WEEK.map((day) => {
            const daySchedule = getDaySchedule(day as DayOfWeek);
            const isSelected = daySchedule.isAvailable;
            const slotsCount = daySchedule.slots.length;

            return (
              <Pressable
                key={day}
                style={[
                  styles.compactDayChip,
                  {
                    backgroundColor: isSelected
                      ? theme.colors.primaryContainer
                      : theme.colors.surfaceVariant,
                    borderColor: isSelected ? theme.colors.primary : theme.colors.outline,
                  },
                ]}
                onPress={() => toggleDayAvailability(day as DayOfWeek)}
                disabled={disabled}
              >
                <Text
                  variant="labelMedium"
                  style={{
                    color: isSelected ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant,
                    fontWeight: isSelected ? '600' : '400',
                  }}
                >
                  {day.slice(0, 3)}
                </Text>
                {isSelected && slotsCount > 0 && (
                  <Text
                    variant="labelSmall"
                    style={{ color: theme.colors.primary, marginTop: 2 }}
                  >
                    {slotsCount} slots
                  </Text>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {DAYS_OF_WEEK.map((day, index) => {
        const daySchedule = getDaySchedule(day as DayOfWeek);
        const isAvailable = daySchedule.isAvailable;
        const isExpanded = expandedDay === day;

        return (
          <View key={day}>
            {index > 0 && <Divider />}
            <Pressable
              style={[
                styles.dayRow,
                {
                  backgroundColor: isAvailable
                    ? theme.colors.primaryContainer
                    : theme.colors.surface,
                },
              ]}
              onPress={() => setExpandedDay(isExpanded ? null : (day as DayOfWeek))}
              disabled={disabled}
            >
              <View style={styles.dayInfo}>
                <Checkbox
                  status={isAvailable ? 'checked' : 'unchecked'}
                  onPress={() => toggleDayAvailability(day as DayOfWeek)}
                  disabled={disabled}
                  color={theme.colors.primary}
                />
                <View style={styles.dayTextContainer}>
                  <Text
                    variant="titleMedium"
                    style={{
                      color: isAvailable
                        ? theme.colors.onPrimaryContainer
                        : theme.colors.onSurface,
                    }}
                  >
                    {day}
                  </Text>
                  {isAvailable && daySchedule.slots.length > 0 && (
                    <Text
                      variant="bodySmall"
                      style={{
                        color: isAvailable
                          ? theme.colors.onPrimaryContainer
                          : theme.colors.onSurfaceVariant,
                        opacity: 0.8,
                      }}
                    >
                      {daySchedule.slots.map((s) => `${formatTime(s.startTime)} - ${formatTime(s.endTime)}`).join(', ')}
                    </Text>
                  )}
                </View>
              </View>
              <MaterialCommunityIcons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={24}
                color={theme.colors.onSurfaceVariant}
              />
            </Pressable>

            {isExpanded && (
              <View style={[styles.slotsContainer, { backgroundColor: theme.colors.surface }]}>
                {/* Current time slots */}
                {daySchedule.slots.length > 0 && (
                  <View style={styles.currentSlotsSection}>
                    <Text
                      variant="labelMedium"
                      style={[styles.slotsLabel, { color: theme.colors.onSurfaceVariant }]}
                    >
                      Your time slots:
                    </Text>
                    <View style={styles.currentSlots}>
                      {daySchedule.slots.map((slot, slotIndex) => (
                        <View
                          key={slotIndex}
                          style={[
                            styles.currentSlotChip,
                            { backgroundColor: theme.colors.secondaryContainer },
                          ]}
                        >
                          <MaterialCommunityIcons
                            name="clock-outline"
                            size={16}
                            color={theme.colors.onSecondaryContainer}
                          />
                          <Text
                            variant="bodyMedium"
                            style={{
                              color: theme.colors.onSecondaryContainer,
                              marginLeft: 6,
                              flex: 1,
                            }}
                          >
                            {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                          </Text>
                          <IconButton
                            icon="close"
                            size={16}
                            iconColor={theme.colors.onSecondaryContainer}
                            onPress={() => removeTimeSlot(day as DayOfWeek, slotIndex)}
                            style={{ margin: 0 }}
                          />
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Quick add presets */}
                <Text
                  variant="labelMedium"
                  style={[styles.slotsLabel, { color: theme.colors.onSurfaceVariant, marginTop: daySchedule.slots.length > 0 ? 16 : 0 }]}
                >
                  Quick add:
                </Text>
                <View style={styles.slotsGrid}>
                  {SCHEDULE_TIME_SLOTS.map((slot) => {
                    const selected = isPresetSelected(day as DayOfWeek, slot);
                    return (
                      <Chip
                        key={slot.label}
                        selected={selected}
                        onPress={() => togglePresetSlot(day as DayOfWeek, slot)}
                        style={[
                          styles.slotChip,
                          {
                            backgroundColor: selected
                              ? theme.colors.primaryContainer
                              : theme.colors.surfaceVariant,
                          },
                        ]}
                        textStyle={{
                          color: selected
                            ? theme.colors.onPrimaryContainer
                            : theme.colors.onSurfaceVariant,
                          fontSize: 12,
                        }}
                        disabled={disabled}
                        showSelectedCheck={false}
                      >
                        {slot.label}
                      </Chip>
                    );
                  })}
                </View>

                {/* Custom time button */}
                <Pressable
                  style={[styles.addCustomButton, { borderColor: theme.colors.primary }]}
                  onPress={() => openCustomTimeModal(day as DayOfWeek)}
                >
                  <MaterialCommunityIcons
                    name="plus"
                    size={18}
                    color={theme.colors.primary}
                  />
                  <Text
                    variant="labelLarge"
                    style={{ color: theme.colors.primary, marginLeft: 8 }}
                  >
                    Add Custom Hours
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        );
      })}

      {/* Custom Time Modal */}
      <Portal>
        <Modal
          visible={showCustomTimeModal}
          onDismiss={() => setShowCustomTimeModal(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          <Text variant="titleLarge" style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
            Add Custom Time for {customTimeDay}
          </Text>

          <View style={styles.timeInputRow}>
            <View style={styles.timeInputGroup}>
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
                Start Time
              </Text>
              <View style={styles.timeSelectors}>
                <View style={[styles.timeSelector, { backgroundColor: theme.colors.surfaceVariant }]}>
                  <ScrollView style={styles.timeSelectorScroll} showsVerticalScrollIndicator={false}>
                    {HOURS.map((hour) => (
                      <Pressable
                        key={hour}
                        style={[
                          styles.timeOption,
                          customStartHour === hour.toString().padStart(2, '0') && {
                            backgroundColor: theme.colors.primaryContainer,
                          },
                        ]}
                        onPress={() => setCustomStartHour(hour.toString().padStart(2, '0'))}
                      >
                        <Text
                          style={{
                            color: customStartHour === hour.toString().padStart(2, '0')
                              ? theme.colors.onPrimaryContainer
                              : theme.colors.onSurface,
                          }}
                        >
                          {hour.toString().padStart(2, '0')}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
                <Text style={{ color: theme.colors.onSurface, fontSize: 20, marginHorizontal: 4 }}>:</Text>
                <View style={[styles.timeSelector, { backgroundColor: theme.colors.surfaceVariant }]}>
                  <ScrollView style={styles.timeSelectorScroll} showsVerticalScrollIndicator={false}>
                    {MINUTES.map((minute) => (
                      <Pressable
                        key={minute}
                        style={[
                          styles.timeOption,
                          customStartMinute === minute && {
                            backgroundColor: theme.colors.primaryContainer,
                          },
                        ]}
                        onPress={() => setCustomStartMinute(minute)}
                      >
                        <Text
                          style={{
                            color: customStartMinute === minute
                              ? theme.colors.onPrimaryContainer
                              : theme.colors.onSurface,
                          }}
                        >
                          {minute}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>

            <MaterialCommunityIcons
              name="arrow-right"
              size={24}
              color={theme.colors.onSurfaceVariant}
              style={{ marginHorizontal: 16, marginTop: 24 }}
            />

            <View style={styles.timeInputGroup}>
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
                End Time
              </Text>
              <View style={styles.timeSelectors}>
                <View style={[styles.timeSelector, { backgroundColor: theme.colors.surfaceVariant }]}>
                  <ScrollView style={styles.timeSelectorScroll} showsVerticalScrollIndicator={false}>
                    {HOURS.map((hour) => (
                      <Pressable
                        key={hour}
                        style={[
                          styles.timeOption,
                          customEndHour === hour.toString().padStart(2, '0') && {
                            backgroundColor: theme.colors.primaryContainer,
                          },
                        ]}
                        onPress={() => setCustomEndHour(hour.toString().padStart(2, '0'))}
                      >
                        <Text
                          style={{
                            color: customEndHour === hour.toString().padStart(2, '0')
                              ? theme.colors.onPrimaryContainer
                              : theme.colors.onSurface,
                          }}
                        >
                          {hour.toString().padStart(2, '0')}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
                <Text style={{ color: theme.colors.onSurface, fontSize: 20, marginHorizontal: 4 }}>:</Text>
                <View style={[styles.timeSelector, { backgroundColor: theme.colors.surfaceVariant }]}>
                  <ScrollView style={styles.timeSelectorScroll} showsVerticalScrollIndicator={false}>
                    {MINUTES.map((minute) => (
                      <Pressable
                        key={minute}
                        style={[
                          styles.timeOption,
                          customEndMinute === minute && {
                            backgroundColor: theme.colors.primaryContainer,
                          },
                        ]}
                        onPress={() => setCustomEndMinute(minute)}
                      >
                        <Text
                          style={{
                            color: customEndMinute === minute
                              ? theme.colors.onPrimaryContainer
                              : theme.colors.onSurface,
                          }}
                        >
                          {minute}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>
          </View>

          <View style={[styles.previewContainer, { backgroundColor: theme.colors.primaryContainer }]}>
            <Text variant="bodyLarge" style={{ color: theme.colors.onPrimaryContainer, textAlign: 'center', fontWeight: '600' }}>
              {formatTime(`${customStartHour}:${customStartMinute}`)} - {formatTime(`${customEndHour}:${customEndMinute}`)}
            </Text>
          </View>

          {`${customStartHour}:${customStartMinute}` >= `${customEndHour}:${customEndMinute}` && (
            <Text variant="bodySmall" style={{ color: theme.colors.error, textAlign: 'center', marginTop: 8 }}>
              End time must be after start time
            </Text>
          )}

          <View style={styles.modalActions}>
            <Button mode="outlined" onPress={() => setShowCustomTimeModal(false)} style={styles.modalButton}>
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={addCustomTimeSlot}
              style={styles.modalButton}
              disabled={`${customStartHour}:${customStartMinute}` >= `${customEndHour}:${customEndMinute}`}
            >
              Add Time Slot
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  dayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dayTextContainer: {
    marginLeft: 8,
    flex: 1,
  },
  slotsContainer: {
    padding: 16,
    paddingTop: 8,
  },
  slotsLabel: {
    marginBottom: 12,
  },
  currentSlotsSection: {
    marginBottom: 8,
  },
  currentSlots: {
    gap: 8,
  },
  currentSlotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 8,
    borderRadius: 8,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotChip: {
    marginBottom: 4,
  },
  addCustomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  compactContainer: {
    marginVertical: 8,
  },
  compactDayChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 8,
    alignItems: 'center',
    borderWidth: 1,
    minWidth: 60,
  },
  modal: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    maxWidth: 400,
    alignSelf: 'center',
    width: '90%',
  },
  modalTitle: {
    marginBottom: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  timeInputGroup: {
    alignItems: 'center',
  },
  timeSelectors: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeSelector: {
    width: 50,
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
  },
  timeSelectorScroll: {
    flex: 1,
  },
  timeOption: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  previewContainer: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    minWidth: 100,
  },
});

export default SchedulePicker;
