// Chip/Tag selector component for multi-select options
import React from 'react';
import { StyleSheet, View, ScrollView, ViewStyle } from 'react-native';
import { Chip, Text, useTheme } from 'react-native-paper';

interface ChipSelectorProps {
  label?: string;
  options: readonly string[] | string[];
  selectedValues: string[];
  onSelect: (values: string[]) => void;
  multiSelect?: boolean;
  style?: ViewStyle;
  scrollable?: boolean;
}

export const ChipSelector: React.FC<ChipSelectorProps> = ({
  label,
  options,
  selectedValues,
  onSelect,
  multiSelect = true,
  style,
  scrollable = false,
}) => {
  const theme = useTheme();

  const handleSelect = (option: string) => {
    if (multiSelect) {
      if (selectedValues.includes(option)) {
        onSelect(selectedValues.filter((v) => v !== option));
      } else {
        onSelect([...selectedValues, option]);
      }
    } else {
      onSelect([option]);
    }
  };

  const renderChips = () => (
    <View style={styles.chipsContainer}>
      {options.map((option) => {
        const isSelected = selectedValues.includes(option);
        return (
          <Chip
            key={option}
            selected={isSelected}
            onPress={() => handleSelect(option)}
            style={[
              styles.chip,
              isSelected && { backgroundColor: theme.colors.primaryContainer },
            ]}
            textStyle={isSelected ? { color: theme.colors.onPrimaryContainer } : undefined}
            showSelectedCheck={false}
          >
            {option}
          </Chip>
        );
      })}
    </View>
  );

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text variant="labelLarge" style={[styles.label, { color: theme.colors.onBackground }]}>
          {label}
        </Text>
      )}
      {scrollable ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {renderChips()}
        </ScrollView>
      ) : (
        renderChips()
      )}
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
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginRight: 4,
    marginBottom: 4,
  },
});

export default ChipSelector;
