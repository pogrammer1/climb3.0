// Legal Screen - Beta privacy and terms baseline
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../components/common';

interface LegalScreenProps {
  navigation: any;
}

const SUPPORT_EMAIL = 'belay.app.notifications@gmail.com';

export const LegalScreen: React.FC<LegalScreenProps> = ({ navigation }) => {
  const theme = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.outline }]}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleLarge" style={{ color: theme.colors.onBackground, flex: 1 }}>
          Privacy & Terms
        </Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Beta Notice
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Belay is in beta for climbers to log sessions, connect with partners, message connections, and plan climbing
            availability. Features may change while user testing is active.
          </Text>
        </Card>

        <Card style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Privacy
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: theme.colors.onSurfaceVariant }]}>
            Belay stores account details, profile information, climbing sessions, schedules, messages, reports, and any
            uploaded media so the app can provide its core features.
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: theme.colors.onSurfaceVariant }]}>
            Your email is kept for account and notification use. Social profile data such as display name, bio, city,
            home gym, climbing preferences, schedule availability, and achievements may be visible to signed-in climbers
            when discovery or profile features require it.
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Firebase provides encrypted transit and server-side encrypted storage. App access is limited by Firebase
            Auth, Firestore rules, and Storage rules.
          </Text>
        </Card>

        <Card style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Your Data
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: theme.colors.onSurfaceVariant }]}>
            You can export your data or delete your account from Account Settings. During the Spark beta, account
            deletion removes your account and client-accessible app data such as profile, sessions, climbs, schedule,
            matches, and conversations. Email {SUPPORT_EMAIL} for any media cleanup questions.
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            For questions or support, email {SUPPORT_EMAIL}.
          </Text>
        </Card>

        <Card style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Terms
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: theme.colors.onSurfaceVariant }]}>
            Use Belay respectfully. Do not harass, impersonate, spam, upload harmful content, or use the app to plan
            unsafe activity. Reports and moderation tools may be used to review and restrict abusive behavior.
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Climbing is risky. Belay is a planning and social tool, not a guide service, emergency service, or source of
            professional safety advice. You are responsible for your own decisions, partners, equipment, and conditions.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  paragraph: {
    marginBottom: 12,
  },
});

export default LegalScreen;
