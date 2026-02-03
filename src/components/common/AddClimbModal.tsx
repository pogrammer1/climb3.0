// AddClimbModal - Reusable modal for adding/editing climbs
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, useTheme, IconButton, Chip, Portal, Modal } from 'react-native-paper';
import { Button, Input, GradePicker } from './index';
import { ClimbingType, AttemptResult } from '../../types';
import { CLIMBING_TYPES, ATTEMPT_RESULTS } from '../../constants';

export interface ClimbFormData {
  name: string;
  climbingType: ClimbingType;
  grade: string;
  gradeSystem: 'yds' | 'v-scale';
  attempts: string;
  result: AttemptResult;
  notes: string;
  rating: number;
}

interface AddClimbModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSave: (climb: ClimbFormData) => void;
  initialData?: Partial<ClimbFormData>;
  isEditing?: boolean;
}

const defaultClimbData: ClimbFormData = {
  name: '',
  climbingType: 'Bouldering',
  grade: 'V0',
  gradeSystem: 'v-scale',
  attempts: '1',
  result: 'Send',
  notes: '',
  rating: 3,
};

export const AddClimbModal: React.FC<AddClimbModalProps> = ({
  visible,
  onDismiss,
  onSave,
  initialData,
  isEditing = false,
}) => {
  const theme = useTheme();
  const [climbData, setClimbData] = useState<ClimbFormData>(defaultClimbData);
  const [gradeSystem, setGradeSystem] = useState<'yds' | 'v-scale'>('v-scale');

  // Reset form when modal opens or initialData changes
  useEffect(() => {
    if (visible) {
      if (initialData) {
        setClimbData({
          name: initialData.name || '',
          climbingType: initialData.climbingType || 'Bouldering',
          grade: initialData.grade || (initialData.climbingType === 'Bouldering' ? 'V0' : '5.6'),
          gradeSystem: initialData.gradeSystem || (initialData.climbingType === 'Bouldering' ? 'v-scale' : 'yds'),
          attempts: initialData.attempts || '1',
          result: initialData.result || 'Send',
          notes: initialData.notes || '',
          rating: initialData.rating || 3,
        });
        setGradeSystem(initialData.gradeSystem || (initialData.climbingType === 'Bouldering' ? 'v-scale' : 'yds'));
      } else {
        setClimbData(defaultClimbData);
        setGradeSystem('v-scale');
      }
    }
  }, [visible, initialData]);

  const handleTypeChange = (type: ClimbingType) => {
    const newGradeSystem = type === 'Bouldering' ? 'v-scale' : 'yds';
    setGradeSystem(newGradeSystem);
    setClimbData({
      ...climbData,
      climbingType: type,
      gradeSystem: newGradeSystem,
      grade: newGradeSystem === 'v-scale' ? 'V0' : '5.6',
    });
  };

  const handleAttemptsChange = (delta: number) => {
    const current = parseInt(climbData.attempts || '1', 10);
    const newValue = Math.max(1, current + delta);
    setClimbData({ ...climbData, attempts: String(newValue) });
  };

  const handleSave = () => {
    onSave(climbData);
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text variant="titleLarge" style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
            {isEditing ? 'Edit Climb' : 'Add Climb'}
          </Text>

          {/* Climb Name (Optional) */}
          <Input
            label="Route Name (optional)"
            value={climbData.name}
            onChangeText={(text) => setClimbData({ ...climbData, name: text })}
            placeholder="e.g., The Nose, Pink One in Corner"
          />

          {/* Climb Type */}
          <Text variant="labelMedium" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>
            Type
          </Text>
          <View style={styles.typeButtons}>
            {CLIMBING_TYPES.map((type) => (
              <Chip
                key={type}
                selected={climbData.climbingType === type}
                onPress={() => handleTypeChange(type as ClimbingType)}
                style={styles.typeChip}
              >
                {type}
              </Chip>
            ))}
          </View>

          {/* Grade Picker */}
          <GradePicker
            gradeSystem={gradeSystem}
            value={climbData.grade}
            onValueChange={(grade) => setClimbData({ ...climbData, grade })}
          />

          {/* Attempts */}
          <Text variant="labelMedium" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>
            Attempts
          </Text>
          <View style={styles.attemptsRow}>
            <IconButton
              icon="minus"
              mode="contained-tonal"
              onPress={() => handleAttemptsChange(-1)}
            />
            <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, minWidth: 40, textAlign: 'center' }}>
              {climbData.attempts}
            </Text>
            <IconButton
              icon="plus"
              mode="contained-tonal"
              onPress={() => handleAttemptsChange(1)}
            />
          </View>

          {/* Result */}
          <Text variant="labelMedium" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>
            Result
          </Text>
          <View style={styles.typeButtons}>
            {ATTEMPT_RESULTS.map((result) => (
              <Chip
                key={result}
                selected={climbData.result === result}
                onPress={() => setClimbData({ ...climbData, result: result as AttemptResult })}
                style={styles.typeChip}
              >
                {result}
              </Chip>
            ))}
          </View>

          {/* Notes */}
          <Input
            label="Notes (optional)"
            value={climbData.notes}
            onChangeText={(text) => setClimbData({ ...climbData, notes: text })}
            placeholder="Beta, conditions, etc."
            multiline
            numberOfLines={2}
          />

          {/* Actions */}
          <View style={styles.modalActions}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={onDismiss}
              style={styles.modalButton}
            />
            <Button
              title={isEditing ? 'Save' : 'Add'}
              onPress={handleSave}
              style={styles.modalButton}
            />
          </View>
        </ScrollView>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    maxHeight: '90%',
  },
  modalTitle: {
    marginBottom: 16,
    textAlign: 'center',
  },
  label: {
    marginBottom: 8,
    marginTop: 12,
  },
  typeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  typeChip: {
    marginBottom: 4,
  },
  attemptsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    minWidth: 100,
  },
});

export default AddClimbModal;
