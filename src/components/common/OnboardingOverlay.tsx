// Onboarding Overlay - Tutorial for new users
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  Animated,
  Dimensions,
} from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { logServiceError } from '../../utils/error';

const ONBOARDING_KEY = '@climb_onboarding_complete';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Reset onboarding so it shows again on next mount for testing.
export const resetOnboarding = async () => {
  await AsyncStorage.removeItem(ONBOARDING_KEY);
};

interface OnboardingOverlayProps {
  onComplete?: () => void;
}

export const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({ onComplete }) => {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const fadeAnim = useState(new Animated.Value(0))[0];

  const steps = [
    {
      title: 'Welcome to Belay!',
      description: 'Find climbing partners, log sessions, and connect with climbers near you. Let\'s get you set up!',
      icon: 'hand-wave',
    },
    {
      title: 'Set Up Your Profile',
      description: 'Add your home gym, profile photo, and more so other climbers in your area can discover and connect with you.',
      icon: 'account-edit',
      action: 'setup-profile',
    },
  ];

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  useEffect(() => {
    if (isVisible) {
      // Fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible, currentStep]);

  const checkOnboardingStatus = async () => {
    try {
      const hasCompleted = await AsyncStorage.getItem(ONBOARDING_KEY);
      if (!hasCompleted) {
        // Small delay to let the app render first
        setTimeout(() => setIsVisible(true), 500);
      }
    } catch (error) {
      logServiceError('OnboardingOverlay.checkStatus', error);
    }
  };

  const handleNext = () => {
    const step = steps[currentStep];
    // If this step has the setup-profile action, navigate to EditProfile
    if ((step as any).action === 'setup-profile') {
      handleComplete().then(() => {
        navigation.navigate('EditProfile');
      });
      return;
    }
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setIsVisible(false);
        onComplete?.();
      });
    } catch (error) {
      logServiceError('OnboardingOverlay.complete', error);
      setIsVisible(false);
    }
  };

  if (!isVisible) return null;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      {/* Dark backdrop */}
      <View style={styles.backdrop} />

      {/* Content card - center vertically to fit mobile browsers */}
      <View style={styles.centerContainer}>
        <View
          style={[
            styles.contentCard,
            {
              backgroundColor: theme.colors.surface,
            },
          ]}
        >
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
          <MaterialCommunityIcons
            name={step.icon as any}
            size={40}
            color={theme.colors.primary}
          />
        </View>

        <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]}>
          {step.title}
        </Text>

        <Text variant="bodyLarge" style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
          {step.description}
        </Text>

        {/* Step indicators */}
        <View style={styles.stepIndicators}>
          {steps.map((_, index) => (
            <View
              key={index}
              style={[
                styles.stepDot,
                {
                  backgroundColor:
                    index === currentStep
                      ? theme.colors.primary
                      : theme.colors.outlineVariant,
                },
              ]}
            />
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          {!isLastStep && (
            <Pressable onPress={handleSkip} style={styles.skipButton}>
              <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                Skip
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={handleNext}
            style={[styles.nextButton, { backgroundColor: theme.colors.primary }]}
          >
            <Text variant="labelLarge" style={{ color: theme.colors.onPrimary }}>
              {isLastStep ? 'Get Started' : (step as any).action === 'setup-profile' ? 'Set Up Profile' : 'Next'}
            </Text>
            {!isLastStep && !(step as any).action && (
              <MaterialCommunityIcons
                name="arrow-right"
                size={20}
                color={theme.colors.onPrimary}
              />
            )}
            {(step as any).action === 'setup-profile' && (
              <MaterialCommunityIcons
                name="account-edit"
                size={20}
                color={theme.colors.onPrimary}
              />
            )}
          </Pressable>
        </View>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },

  contentCard: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  centerContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  stepIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 8,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    width: '100%',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
});

export default OnboardingOverlay;
