import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Chip, IconButton, Text, TextInput, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/common';
import { submitReport } from '../../services/reportService';
import { useAuthStore } from '../../store';
import { ReportReason } from '../../types';
import { showAlert } from '../../utils/alert';
import { logServiceError } from '../../utils/error';

type ReportContentScreenProps = {
  navigation: any;
  route: {
    params: {
      targetType: 'user' | 'message';
      reportedUserId?: string;
      reportedUserName?: string;
      conversationId?: string;
      messageId?: string;
      messagePreview?: string;
    };
  };
};

const REASONS: Array<{ value: ReportReason; label: string }> = [
  { value: 'harassment', label: 'Harassment' },
  { value: 'hate_speech', label: 'Hate speech' },
  { value: 'sexual_content', label: 'Sexual content' },
  { value: 'spam', label: 'Spam' },
  { value: 'impersonation', label: 'Impersonation' },
  { value: 'safety_concern', label: 'Safety concern' },
  { value: 'other', label: 'Other' },
];

export const ReportContentScreen: React.FC<ReportContentScreenProps> = ({ navigation, route }) => {
  const theme = useTheme();
  const { user } = useAuthStore();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const title = route.params.targetType === 'message' ? 'Report Message' : 'Report Climber';
  const subtitle = useMemo(() => {
    if (route.params.targetType === 'message') {
      return 'This sends the message and your note to moderation review.';
    }

    const name = route.params.reportedUserName || 'this climber';
    return `This sends ${name}'s profile and your note to moderation review.`;
  }, [route.params]);

  const handleSubmit = async () => {
    if (!user || !reason) {
      showAlert('Report Incomplete', 'Choose a reason before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitReport(user.uid, {
        targetType: route.params.targetType,
        reason,
        details,
        reportedUserId: route.params.reportedUserId,
        conversationId: route.params.conversationId,
        messageId: route.params.messageId,
        messagePreview: route.params.messagePreview,
      });

      if (result.success) {
        showAlert('Report Submitted', 'Thanks for helping keep Belay safer.');
        navigation.goBack();
      } else {
        showAlert('Could Not Submit Report', result.error || 'Please try again.');
      }
    } catch (error) {
      logServiceError('ReportContentScreen.submit', error);
      showAlert('Could Not Submit Report', 'Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.outline }]}>
        <IconButton icon="close" onPress={() => navigation.goBack()} />
        <Text variant="titleLarge" style={[styles.headerTitle, { color: theme.colors.onBackground }]}>
          {title}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {subtitle}
        </Text>

        {route.params.messagePreview && (
          <View style={[styles.preview, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Message
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
              {route.params.messagePreview}
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
            Reason
          </Text>
          <View style={styles.reasonGrid}>
            {REASONS.map((item) => (
              <Chip
                key={item.value}
                selected={reason === item.value}
                onPress={() => setReason(item.value)}
                style={styles.reasonChip}
              >
                {item.label}
              </Chip>
            ))}
          </View>
        </View>

        <TextInput
          label="Details"
          value={details}
          onChangeText={setDetails}
          mode="outlined"
          multiline
          maxLength={2000}
          numberOfLines={6}
          placeholder="Add context for the moderation review."
          style={styles.detailsInput}
        />

        <Button
          title="Submit Report"
          icon="flag-outline"
          fullWidth
          loading={isSubmitting}
          disabled={!reason || isSubmitting}
          onPress={handleSubmit}
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
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 48,
  },
  content: {
    padding: 20,
    gap: 20,
  },
  preview: {
    borderRadius: 8,
    gap: 6,
    padding: 12,
  },
  section: {
    gap: 12,
  },
  reasonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonChip: {
    marginBottom: 4,
  },
  detailsInput: {
    minHeight: 140,
  },
});

export default ReportContentScreen;
