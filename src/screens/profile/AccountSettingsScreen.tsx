// Account Settings Screen
import React, { useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, useTheme, List, Divider, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, Button } from '../../components/common';
import { useAuthStore } from '../../store';
import { showAlert } from '../../utils/alert';
import { deleteAccount, resetPassword, sendVerificationEmail } from '../../services/authService';

interface AccountSettingsScreenProps {
  navigation: any;
}

export const AccountSettingsScreen: React.FC<AccountSettingsScreenProps> = ({ navigation }) => {
  const theme = useTheme();
  const { user, profile, clearAuth } = useAuthStore();
  const [isSendingPasswordReset, setIsSendingPasswordReset] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handleChangePassword = () => {
    if (!user?.email || isSendingPasswordReset) return;

    showAlert(
      'Change Password',
      'A password reset email will be sent to your email address.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Send Email', 
          onPress: async () => {
            setIsSendingPasswordReset(true);
            const result = await resetPassword(user.email || '');
            setIsSendingPasswordReset(false);

            if (result.success) {
              showAlert('Email Sent', result.message || 'Check your inbox for password reset instructions.');
            } else {
              showAlert('Could Not Send Email', result.error || 'Failed to send password reset email.');
            }
          }
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    if (isDeletingAccount) return;

    showAlert(
      'Delete Account',
      'This will permanently delete your account, profile, sessions, climbs, schedule, matches, conversations, and uploaded photos. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeletingAccount(true);
            const result = await deleteAccount();
            setIsDeletingAccount(false);

            if (result.success) {
              clearAuth();
              showAlert('Account Deleted', 'Your account and app data have been deleted.');
            } else {
              showAlert('Could Not Delete Account', result.error || 'Please try again or contact support.');
            }
          }
        },
      ]
    );
  };

  const handleSendVerificationEmail = async () => {
    const result = await sendVerificationEmail();
    if (result.success) {
      showAlert('Verification Email', result.message || 'Verification email sent.');
    } else {
      showAlert('Could Not Send Email', result.error || 'Failed to send verification email.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.outline }]}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleLarge" style={{ color: theme.colors.onBackground, flex: 1 }}>
          Account Settings
        </Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Account Info */}
        <Card style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Account Information
          </Text>

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="email-outline" size={24} color={theme.colors.onSurfaceVariant} />
            <View style={styles.infoContent}>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Email
              </Text>
              <Text variant="bodyLarge" style={{ color: theme.colors.onBackground }}>
                {user?.email || 'Not set'}
              </Text>
            </View>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="account-outline" size={24} color={theme.colors.onSurfaceVariant} />
            <View style={styles.infoContent}>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Display Name
              </Text>
              <Text variant="bodyLarge" style={{ color: theme.colors.onBackground }}>
                {profile?.displayName || 'Not set'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Edit Profile */}
        <Card style={styles.section}>
          <List.Item
            title="Edit Profile"
            description="Update your profile information"
            left={(props) => <List.Icon {...props} icon="account-edit" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('EditProfile')}
          />
        </Card>

        {/* Security */}
        <Card style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Security
          </Text>

          <List.Item
            title="Change Password"
            description="Update your password"
            left={(props) => <List.Icon {...props} icon="lock-outline" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={handleChangePassword}
            disabled={isSendingPasswordReset}
          />

          {!user?.emailVerified && (
            <List.Item
              title="Verify Email"
              description="Required for discovery and messaging"
              left={(props) => <List.Icon {...props} icon="email-check-outline" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={handleSendVerificationEmail}
            />
          )}
        </Card>

        {/* Danger Zone */}
        <Card style={styles.dangerSection}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.error }]}>
            Danger Zone
          </Text>

          <Button
            title={isDeletingAccount ? 'Deleting Account' : 'Delete Account'}
            onPress={handleDeleteAccount}
            variant="outline"
            loading={isDeletingAccount}
            disabled={isDeletingAccount}
          />
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
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoContent: {
    marginLeft: 16,
    flex: 1,
  },
  divider: {
    marginVertical: 8,
  },
  dangerSection: {
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#d32f2f',
  },
});

export default AccountSettingsScreen;
