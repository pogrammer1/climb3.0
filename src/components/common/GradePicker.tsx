// Grade Picker Component for climbing grades
import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, ViewStyle } from 'react-native';
import { Text, Chip, SegmentedButtons, useTheme } from 'react-native-paper';
import { CLIMBING_GRADES_YDS, BOULDERING_GRADES } from '../../constants';

interface GradePickerProps {
  value: string | null;
  gradeSystem: 'yds' | 'v-scale';
  onValueChange: (grade: string) => void;
  onSystemChange?: (system: 'yds' | 'v-scale') => void;
  label?: string;
  style?: ViewStyle;
  showSystemSelector?: boolean;
}

export const GradePicker: React.FC<GradePickerProps> = ({
  value,
  gradeSystem,
  onValueChange,
  onSystemChange,
  label = 'Grade',
  style,
  showSystemSelector = true,
}) => {
  const theme = useTheme();
  const grades = gradeSystem === 'yds' ? CLIMBING_GRADES_YDS : BOULDERING_GRADES;

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text variant="labelLarge" style={[styles.label, { color: theme.colors.onBackground }]}>
          {label}
        </Text>
      )}
      
      {showSystemSelector && onSystemChange && (
        <SegmentedButtons
          value={gradeSystem}
          onValueChange={(value) => onSystemChange(value as 'yds' | 'v-scale')}
          buttons={[
            { value: 'yds', label: 'YDS (5.x)' },
            { value: 'v-scale', label: 'V-Scale' },
          ]}
          style={styles.segmented}
        />
      )}
      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.gradesContainer}
      >
        {grades.map((grade) => (
          <Chip
            key={grade}
            selected={value === grade}
            onPress={() => onValueChange(grade)}
            style={[
              styles.gradeChip,
              value === grade && { backgroundColor: theme.colors.primaryContainer },
            ]}
            textStyle={value === grade ? { color: theme.colors.onPrimaryContainer } : undefined}
            showSelectedCheck={false}
          >
            {grade}
          </Chip>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
  },
  segmented: {
    marginBottom: 12,
  },
  gradesContainer: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  gradeChip: {
    marginRight: 8,
  },
});

export default GradePicker;
