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
    <View
      style={[
        styles.featureCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.primary,
          borderWidth: 2,
          borderStyle: 'solid',
          shadowColor: theme.colors.primary,
        },
      ]}
    >
      <View style={[styles.featureIconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
        <MaterialCommunityIcons 
          name={icon} 
          size={32} 
          color={theme.colors.primary} 
        />
      </View>
      <Text variant="titleMedium" style={[styles.featureTitle, { color: theme.colors.onSurface, fontWeight: 'bold' }]}>
        {title}
      </Text>
      <Text variant="bodyMedium" style={[styles.featureDescription, { color: theme.colors.onSurface }]}>
        {description}
      </Text>
    </View>
  );
};

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width > 768; // height used below to cap CTA spacing on desktop

  const handleClimbOn = () => {
    navigation.navigate('Login');
  };

  // feature in boxes that describe main app features
  const features = [
    {
      icon: 'account-group' as const,
      title: 'Connect',
      description: 'Discover other climbers in your area and build a community with new friends who share your passion.',
    },
    {
      icon: 'chart-line' as const,
      title: 'Track',
      description: 'Log your climbing sessions, track progress. See how far you can go.',
    },
    {
      icon: 'trophy' as const,
      title: 'Challenges',
      description: 'Celebrate milestones as you progress with an achievement system.',
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Content Wrapper */}
        <View style={styles.mainContent}>
          {/* Hero Section - Title + Icon inline at the top */}
          <View style={styles.heroSection}>
            <View style={[styles.headerSection, isDesktop && styles.headerSectionDesktop]}>
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
              <View style={[styles.logoContainer, isDesktop && styles.logoContainerDesktop]}>
                <Image
                  source={require('../../../assets/zizi.png')}
                  style={[styles.logo, isDesktop && styles.logoDesktop]}
                  resizeMode="contain"
                />
              </View>
            </View>
          </View>

          {/* CTA Button - visible near bottom of initial viewport */}
          <View style={[
            styles.ctaContainer,
            isDesktop && styles.ctaContainerDesktop,
            // On desktop, cap the top margin so the CTA doesn't get pushed too far down by tall viewports
            isDesktop && { marginTop: Math.min(160, height * 0.45) }
          ]}>
            <Button
              title="Climb on"
              onPress={handleClimbOn}
              fullWidth
              style={isDesktop ? styles.ctaButtonDesktop : styles.ctaButton}
            />
          </View>

          {/* Features Section - below the fold */}
          <View style={[styles.featuresSection, isDesktop && styles.featuresSectionDesktop]}>
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

          {/* Footer - right below CTA */}
          <View style={styles.footer}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Already have an account?
            </Text>
            <Button
              title="Sign In"
              onPress={handleClimbOn}
              variant="text"
              size="small"
            />
          </View>
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
    paddingBottom: 40,
  },
  mainContent: {
    flex: 1,
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 0,
  },
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  headerSectionDesktop: {
    marginBottom: 16,
  },
  logoContainer: {
    width: 80,
    height: 80,
    marginLeft: 8,
  },
  logoContainerDesktop: {
    width: 120,
    height: 120,
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
    fontSize: 56,
    letterSpacing: 2,
  },
  titleDesktop: {
    fontSize: 96,
  },
  ctaContainer: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 200,
    alignSelf: 'center',
    marginTop: 'auto',
    paddingTop: 40,
  },
  ctaContainerDesktop: {
    maxWidth: 200,
    alignItems: 'center',
  },
  ctaButton: {
    marginTop: 0,
  },
  ctaButtonDesktop: {
    marginTop: 0,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    paddingBottom: 24,
    gap: 4,
  },
  featuresSection: {
    marginTop: 32,
    marginBottom: 32,
  },
  featuresSectionDesktop: {
    maxWidth: 1000,
    alignSelf: 'center',
    width: '100%',
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
    minHeight: 220,
    justifyContent: 'flex-start',
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
    fontSize: 28,
  },
  featureDescription: {
    textAlign: 'center',
    lineHeight: 26,
    fontSize: 16,
  },
});

export default WelcomeScreen;
