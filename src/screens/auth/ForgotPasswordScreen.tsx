// Forgot Password Screen
import React, { useState } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input } from '../../components/common';
import { resetPassword } from '../../services/authService';

interface ForgotPasswordScreenProps {
  navigation: any;
}

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ navigation }) => {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validateEmail = (): boolean => {
    if (!email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email');
      return false;
    }
    return true;
  };

  const handleResetPassword = async () => {
    setError(null);

    if (!validateEmail()) return;

    setIsLoading(true);
    try {
      const result = await resetPassword(email);

      if (result.success) {
        setIsSuccess(true);
      } else {
        setError(result.error || 'Failed to send reset email');
      }
    } catch (error) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigation.navigate('Login');
  };

  if (isSuccess) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.successContent}>
          <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.primary }]}>
            ✉️ Check Your Email
          </Text>
          <Text variant="bodyLarge" style={[styles.successMessage, { color: theme.colors.onBackground }]}>
            We've sent a password reset link to {email}. Please check your email and follow the instructions.
          </Text>
          <Button
            title="Back to Login"
            onPress={handleBackToLogin}
            fullWidth
            style={styles.button}
          />
        </View>
      </SafeAreaView>
    );
  }

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
            <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.primary }]}>
              🔐 Reset Password
            </Text>
            <Text variant="bodyLarge" style={{ color: theme.colors.onBackground, textAlign: 'center' }}>
              Enter your email address and we'll send you a link to reset your password.
            </Text>
          </View>

          <View style={styles.form}>
            {error && (
              <View style={[styles.errorContainer, { backgroundColor: theme.colors.errorContainer }]}>
                <Text style={{ color: theme.colors.onErrorContainer }}>{error}</Text>
              </View>
            )}

            <Input
              label="Email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setError(null);
              }}
              keyboardType="email-address"
              autoComplete="email"
              autoCapitalize="none"
              leftIcon="email-outline"
              required
            />

            <Button
              title="Send Reset Link"
              onPress={handleResetPassword}
              loading={isLoading}
              fullWidth
              style={styles.button}
            />

            <Button
              title="Back to Login"
              onPress={handleBackToLogin}
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
  successContent: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  successMessage: {
    textAlign: 'center',
    marginBottom: 32,
  },
  form: {
    marginBottom: 24,
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  button: {
    marginTop: 16,
    marginBottom: 8,
  },
});

export default ForgotPasswordScreen;
