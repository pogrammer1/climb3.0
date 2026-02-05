// Onboarding Overlay - Tutorial for new users
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const ONBOARDING_KEY = '@climb_onboarding_complete';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface OnboardingOverlayProps {
  onComplete?: () => void;
}

export const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({ onComplete }) => {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const pulseAnim = useState(new Animated.Value(1))[0];

  const steps = [
    {
      title: 'Welcome to Belay! 🧗',
      description: 'Let\'s take a quick tour to help you get started.',
      icon: 'hand-wave',
    },
    {
      title: 'Set Up Your Profile',
      description: 'Add your home gym, photo, bio, and climbing experience so other climbers can find and connect with you.',
      icon: 'account-edit',
      action: 'setup-profile',
    },
    {
      title: 'Navigation Bar',
      description: 'Use the navigation bar at the bottom to move between screens. Tap any icon to explore!',
      icon: 'gesture-tap',
      highlightBottom: true,
    },
    {
      title: 'You\'re All Set! 🎉',
      description: 'Log your climbs, discover partners, and connect with the climbing community!',
      icon: 'check-circle',
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

      // Start pulse animation for navigation highlight
      if (steps[currentStep].highlightBottom) {
        startPulseAnimation();
      }
    }
  }, [isVisible, currentStep]);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const checkOnboardingStatus = async () => {
    try {
      const hasCompleted = await AsyncStorage.getItem(ONBOARDING_KEY);
      if (!hasCompleted) {
        // Small delay to let the app render first
        setTimeout(() => setIsVisible(true), 500);
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
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
      console.error('Error saving onboarding status:', error);
      setIsVisible(false);
    }
  };

  if (!isVisible) return null;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const bottomNavHeight = Platform.OS === 'ios' ? 85 : 65;

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
      {/* Dark backdrop */}
      <View style={styles.backdrop} />

      {/* Bottom nav highlight cutout */}
      {step.highlightBottom && (
        <Animated.View
          style={[
            styles.bottomHighlight,
            {
              height: bottomNavHeight,
              backgroundColor: theme.colors.surface,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <View style={styles.highlightBorder} />
          <View style={styles.arrowContainer}>
            <MaterialCommunityIcons
              name="arrow-down"
              size={32}
              color={theme.colors.primary}
            />
          </View>
        </Animated.View>
      )}

      {/* Content card */}
      <View
        style={[
          styles.contentCard,
          {
            backgroundColor: theme.colors.surface,
            bottom: step.highlightBottom ? bottomNavHeight + 80 : SCREEN_HEIGHT / 2 - 100,
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
  bottomHighlight: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'visible',
  },
  highlightBorder: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: 0,
    borderTopLeftRadius: 19,
    borderTopRightRadius: 19,
    borderWidth: 3,
    borderBottomWidth: 0,
    borderColor: '#4CAF50',
  },
  arrowContainer: {
    position: 'absolute',
    top: -50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  contentCard: {
    position: 'absolute',
    left: 24,
    right: 24,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
