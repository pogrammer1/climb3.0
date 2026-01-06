// Custom Input Component with validation support
import React, { useState } from 'react';
import { StyleSheet, View, ViewStyle, TextStyle } from 'react-native';
import { TextInput, HelperText, useTheme } from 'react-native-paper';

interface InputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'decimal-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: 'email' | 'password' | 'username' | 'name' | 'off';
  error?: string;
  helperText?: string;
  disabled?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  required?: boolean;
  onBlur?: () => void;
  onFocus?: () => void;
}

export const Input: React.FC<InputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoComplete = 'off',
  error,
  helperText,
  disabled = false,
  multiline = false,
  numberOfLines = 1,
  maxLength,
  leftIcon,
  rightIcon,
  onRightIconPress,
  style,
  inputStyle,
  required = false,
  onBlur,
  onFocus,
}) => {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(!secureTextEntry);

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  const displayLabel = required ? `${label} *` : label;

  return (
    <View style={[styles.container, style]}>
      <TextInput
        label={displayLabel}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry && !isPasswordVisible}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        disabled={disabled}
        multiline={multiline}
        numberOfLines={numberOfLines}
        maxLength={maxLength}
        error={!!error}
        mode="outlined"
        outlineColor={theme.colors.outline}
        activeOutlineColor={theme.colors.primary}
        style={[
          styles.input,
          multiline && styles.multilineInput,
          inputStyle,
        ]}
        onFocus={handleFocus}
        onBlur={handleBlur}
        left={leftIcon ? <TextInput.Icon icon={leftIcon} /> : undefined}
        right={
          secureTextEntry ? (
            <TextInput.Icon
              icon={isPasswordVisible ? 'eye-off' : 'eye'}
              onPress={togglePasswordVisibility}
            />
          ) : rightIcon ? (
            <TextInput.Icon icon={rightIcon} onPress={onRightIconPress} />
          ) : undefined
        }
      />
      {(error || helperText) && (
        <HelperText type={error ? 'error' : 'info'} visible={!!(error || helperText)}>
          {error || helperText}
        </HelperText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'transparent',
  },
  multilineInput: {
    minHeight: 100,
  },
});

export default Input;
