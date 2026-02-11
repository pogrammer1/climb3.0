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
    <View style={styles.featureCard}>
      <View style={styles.featureRow}>
        <View style={[styles.featureIconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
          <MaterialCommunityIcons 
            name={icon} 
            size={28} 
            color={theme.colors.primary} 
          />
        </View>
        <Text variant="titleMedium" style={[styles.featureTitle, { color: theme.colors.onSurface, fontWeight: 'bold' }]}>
          {title}
        </Text>
      </View>
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
              variant="outline"
              style={[
                isDesktop ? styles.ctaButtonDesktop : styles.ctaButton,
                { backgroundColor: '#ffffff', borderColor: '#000000', borderWidth: 1 }
              ]}
              labelStyle={{ color: '#000000', fontWeight: '600' }}
            />
          </View>

          {/* Features Section - below the fold */}
          <View style={[styles.featuresSection, isDesktop && styles.featuresSectionDesktop]}>
            <View style={[styles.featuresGrid, isDesktop && styles.featuresGridDesktop]}>
              {features.map((feature, index) => (
                <View key={index} style={styles.featureCardWrapper}>
                  {/* Divider line - inset on left and right */}
                  <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
                  <FeatureCard
                    title={feature.title}
                    icon={feature.icon}
                    description={feature.description}
                  />
                </View>
              ))}
              {/* Bottom divider */}
              <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
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
    maxWidth: 150,
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
    gap: 0,
  },
  featuresGridDesktop: {
    gap: 0,
  },
  featureCardWrapper: {
    width: '100%',
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
  featureCard: {
    paddingVertical: 20,
    paddingLeft: 16, // align with divider inset (ScrollView padding 24 + divider margin 16)
    paddingRight: 4,
    alignItems: 'flex-start',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featureTitle: {
    fontWeight: '600',
    textAlign: 'left',
    fontSize: 22,
  },
  featureDescription: {
    textAlign: 'left',
    lineHeight: 22,
    fontSize: 15,
    paddingLeft: 0, // start under the feature icon
  },
});

export default WelcomeScreen;
