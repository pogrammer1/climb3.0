// Welcome Screen - Landing page for new visitors
import React from 'react';
import { StyleSheet, View, ScrollView, Image, useWindowDimensions, Platform } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/common';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface WelcomeScreenProps {
  navigation: any;
}

interface FeatureCardProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => {
  const theme = useTheme();
  
  return (
    <View style={[styles.featureCard, { backgroundColor: theme.colors.surface }]}>
      <View style={[styles.featureIconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
        <MaterialCommunityIcons 
          name={icon} 
          size={32} 
          color={theme.colors.primary} 
        />
      </View>
      <Text variant="titleMedium" style={[styles.featureTitle, { color: theme.colors.onSurface }]}>
        {title}
      </Text>
      <Text variant="bodyMedium" style={[styles.featureDescription, { color: theme.colors.onSurfaceVariant }]}>
        {description}
      </Text>
    </View>
  );
};

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width > 768;

  const handleClimbOn = () => {
    navigation.navigate('Login');
  };

  // feature in boxes that describe main app features
  const features = [
    {
      icon: 'account-group' as const,
      title: 'Connect with Climbers',
      description: 'Find and connect with climbing partners in your area. Build your climbing community and discover new friends who share your passion.',
    },
    {
      icon: 'chart-line' as const,
      title: 'Track Your Sessions',
      description: 'Log your climbing sessions, track your progress, and analyze your stats over time. See how far you\'ve come on your climbing journey.',
    },
    {
      icon: 'trophy' as const,
      title: 'Earn Achievements',
      description: 'Complete challenges and earn badges as you progress. Celebrate milestones and stay motivated with our achievement system.',
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section with Logo */}
        <View style={styles.headerSection}>
          <View style={[styles.logoContainer, isDesktop && styles.logoContainerDesktop]}>
            <Image
              source={require('../../../assets/icon.png')}
              style={[styles.logo, isDesktop && styles.logoDesktop]}
              resizeMode="contain"
            />
          </View>
          
          <Text 
            variant="displayLarge" 
            style={[
              styles.title, 
              { color: theme.colors.primary },
              isDesktop && styles.titleDesktop
            ]}
          >
            Belay
          </Text>
          
          <Text 
            variant="titleMedium" 
            style={[styles.tagline, { color: theme.colors.onSurfaceVariant }]}
          >
            Your climbing companion
          </Text>
        </View>

        {/* CTA Button */}
        <View style={[styles.ctaContainer, isDesktop && styles.ctaContainerDesktop]}>
          <Button
            title="Climb on"
            onPress={handleClimbOn}
            fullWidth={!isDesktop}
            style={isDesktop ? styles.ctaButtonDesktop : styles.ctaButton}
          />
        </View>

        {/* Features Section */}
        <View style={[styles.featuresSection, isDesktop && styles.featuresSectionDesktop]}>
          <Text 
            variant="titleLarge" 
            style={[styles.featuresTitle, { color: theme.colors.onBackground }]}
          >
            Why Belay?
          </Text>
          
          <View style={[styles.featuresGrid, isDesktop && styles.featuresGridDesktop]}>
            {features.map((feature, index) => (
              <View 
                key={index} 
                style={[
                  styles.featureCardWrapper,
                  isDesktop && styles.featureCardWrapperDesktop
                ]}
              >
                <FeatureCard
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Already have an account?{' '}
          </Text>
          <Button
            title="Sign In"
            onPress={handleClimbOn}
            variant="text"
            style={styles.signInLink}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 40,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  logoContainerDesktop: {
    width: 160,
    height: 160,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  logoDesktop: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontWeight: 'bold',
    fontSize: 48,
    marginBottom: 8,
  },
  titleDesktop: {
    fontSize: 64,
  },
  tagline: {
    textAlign: 'center',
  },
  ctaContainer: {
    marginBottom: 48,
    alignItems: 'center',
  },
  ctaContainerDesktop: {
    alignItems: 'center',
  },
  ctaButton: {
    paddingVertical: 8,
  },
  ctaButtonDesktop: {
    minWidth: 200,
    paddingHorizontal: 48,
    paddingVertical: 8,
  },
  featuresSection: {
    marginBottom: 32,
  },
  featuresSectionDesktop: {
    maxWidth: 1000,
    alignSelf: 'center',
    width: '100%',
  },
  featuresTitle: {
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '600',
  },
  featuresGrid: {
    gap: 16,
  },
  featuresGridDesktop: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  featureCardWrapper: {
    width: '100%',
  },
  featureCardWrapperDesktop: {
    flex: 1,
    maxWidth: 320,
  },
  featureCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  featureIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  featureTitle: {
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  featureDescription: {
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
    paddingTop: 16,
  },
  signInLink: {
    marginLeft: -8,
  },
});

export default WelcomeScreen;
