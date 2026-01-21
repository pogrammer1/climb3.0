// Notification Settings Screen
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, useTheme, Switch, Divider, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Button } from '../../components/common';
import { useAuthStore } from '../../store';
import { saveProfile } from '../../services/profileService';
import { EmailNotificationType } from '../../types';
import { showAlert } from '../../utils/alert';

interface NotificationSettingsScreenProps {
  navigation: any;
}

const NOTIFICATION_TYPES: { value: EmailNotificationType; label: string; description: string }[] = [
  { value: 'messages', label: 'New Messages', description: 'When someone sends you a message' },
  { value: 'connections', label: 'Connection Requests', description: 'When someone wants to connect' },
  { value: 'reminders', label: 'Climbing Reminders', description: 'Upcoming sessions and activity' },
];

export const NotificationSettingsScreen: React.FC<NotificationSettingsScreenProps> = ({ navigation }) => {
  const theme = useTheme();
  const { user, profile, setProfile } = useAuthStore();
  
  const [emailNotifications, setEmailNotifications] = useState(profile?.emailNotifications ?? true);
  const [enabledTypes, setEnabledTypes] = useState<EmailNotificationType[]>(
    profile?.emailNotificationTypes || ['messages', 'connections']
  );
  const [pushEnabled, setPushEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setEmailNotifications(profile.emailNotifications ?? true);
      setEnabledTypes(profile.emailNotificationTypes || ['messages', 'connections']);
    }
  }, [profile]);

  const toggleNotificationType = (type: EmailNotificationType) => {
    setEnabledTypes(prev => 
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const result = await saveProfile(user.uid, {
        ...profile,
        emailNotifications,
        emailNotificationTypes: enabledTypes,
      } as any);
      
      if (result.success) {
        setProfile({
          ...profile!,
          emailNotifications,
          emailNotificationTypes: enabledTypes,
        });
        showAlert('Success', 'Notification settings saved!');
        navigation.goBack();
      } else {
        showAlert('Error', result.error || 'Failed to save settings');
      }
    } catch (error) {
      showAlert('Error', 'Failed to save notification settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.outline }]}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleLarge" style={{ color: theme.colors.onBackground, flex: 1 }}>
          Notification Settings
        </Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Push Notifications */}
        <Card style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Push Notifications
          </Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text variant="bodyLarge" style={{ color: theme.colors.onBackground }}>
                Enable Push Notifications
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Receive notifications on your device
              </Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={setPushEnabled}
              color={theme.colors.primary}
            />
          </View>
        </Card>

        {/* Email Notifications */}
        <Card style={styles.section}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Email Notifications
          </Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text variant="bodyLarge" style={{ color: theme.colors.onBackground }}>
                Enable Email Notifications
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Receive notifications via email
              </Text>
            </View>
            <Switch
              value={emailNotifications}
              onValueChange={setEmailNotifications}
              color={theme.colors.primary}
            />
          </View>

          {emailNotifications && (
            <>
              <Divider style={styles.divider} />
              <Text variant="bodyMedium" style={[styles.subsectionTitle, { color: theme.colors.onSurfaceVariant }]}>
                Notify me about:
              </Text>

              {NOTIFICATION_TYPES.map((type) => (
                <View key={type.value} style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text variant="bodyLarge" style={{ color: theme.colors.onBackground }}>
                      {type.label}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {type.description}
                    </Text>
                  </View>
                  <Switch
                    value={enabledTypes.includes(type.value)}
                    onValueChange={() => toggleNotificationType(type.value)}
                    color={theme.colors.primary}
                  />
                </View>
              ))}
            </>
          )}
        </Card>

        <Button
          title="Save Settings"
          onPress={handleSave}
          loading={saving}
          fullWidth
        />
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
  subsectionTitle: {
    marginBottom: 12,
    marginTop: 8,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  divider: {
    marginVertical: 8,
  },
});

export default NotificationSettingsScreen;
