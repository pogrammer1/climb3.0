// Sign Up Screen
import React, { useState } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input, Logo } from '../../components/common';
import { signUp } from '../../services/authService';
import { saveProfile } from '../../services/profileService';
import { SignupFormData } from '../../types';

interface SignUpScreenProps {
  navigation: any;
}

export const SignUpScreen: React.FC<SignUpScreenProps> = ({ navigation }) => {
  const theme = useTheme();
  const [formData, setFormData] = useState<SignupFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
  });
  const [errors, setErrors] = useState<Partial<SignupFormData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const newErrors: Partial<SignupFormData> = {};

    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Name is required';
    } else if (formData.displayName.trim().length < 2) {
      newErrors.displayName = 'Name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    setGeneralError(null);

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const result = await signUp(formData);

      if (result.success && result.data) {
        // Create initial profile
        await saveProfile(
          result.data.uid,
          {
            displayName: formData.displayName,
            bio: '',
            experienceLevel: 'Beginner',
            climbingTypes: [],
            highestGradeYDS: null,
            highestGradeBouldering: null,
            homeGym: '',
            yearsClimbing: '0',
            partnerPreferences: [],
            availableDays: [],
            availableTimes: [],
          },
          true
        );
        // Navigation will be handled by auth state listener
      } else {
        setGeneralError(result.error || 'Sign up failed');
      }
    } catch (error) {
      setGeneralError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = () => {
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Logo size="medium" />
            <Text variant="titleMedium" style={[styles.subtitle, { color: theme.colors.onBackground }]}>
              Join the climbing community!
            </Text>
          </View>

          <View style={styles.form}>
            {generalError && (
              <View style={[styles.errorContainer, { backgroundColor: theme.colors.errorContainer }]}>
                <Text style={{ color: theme.colors.onErrorContainer }}>{generalError}</Text>
              </View>
            )}

            <Input
              label="Display Name"
              value={formData.displayName}
              onChangeText={(text) => setFormData({ ...formData, displayName: text })}
              autoCapitalize="words"
              autoComplete="name"
              error={errors.displayName}
              leftIcon="account-outline"
              required
            />

            <Input
              label="Email"
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              keyboardType="email-address"
              autoComplete="email"
              autoCapitalize="none"
              error={errors.email}
              leftIcon="email-outline"
              required
            />

            <Input
              label="Password"
              value={formData.password}
              onChangeText={(text) => setFormData({ ...formData, password: text })}
              secureTextEntry
              autoComplete="password"
              error={errors.password}
              leftIcon="lock-outline"
              helperText="At least 6 characters"
              required
            />

            <Input
              label="Confirm Password"
              value={formData.confirmPassword}
              onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
              secureTextEntry
              error={errors.confirmPassword}
              leftIcon="lock-check-outline"
              required
            />

            <Button
              title="Create Account"
              onPress={handleSignUp}
              loading={isLoading}
              fullWidth
              style={styles.signUpButton}
            />
          </View>

          <View style={styles.footer}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onBackground }}>
              Already have an account?
            </Text>
            <Button
              title="Sign In"
              onPress={handleSignIn}
              variant="text"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  subtitle: {
    marginTop: 12,
  },
  form: {
    marginBottom: 24,
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  signUpButton: {
    marginTop: 16,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SignUpScreen;
