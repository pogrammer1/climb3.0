// Match Requests Screen - View and manage incoming connection requests
import React, { useEffect, useCallback, useState } from 'react';
import { StyleSheet, View, FlatList } from 'react-native';
import { Text, useTheme, IconButton, Button as PaperButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, Avatar, LoadingSpinner, EmptyState } from '../../components/common';
import { useAuthStore, useMatchStore } from '../../store';
import { ClimberMatch, UserProfile } from '../../types';
import { getProfile } from '../../services/profileService';
import { showAlert } from '../../utils/alert';

interface MatchRequestWithProfile extends ClimberMatch {
  senderProfile?: UserProfile | null;
}

interface MatchRequestsScreenProps {
  navigation: any;
}

export const MatchRequestsScreen: React.FC<MatchRequestsScreenProps> = ({ navigation }) => {
  const theme = useTheme();
  const { user } = useAuthStore();
  const {
    pendingRequests,
    isLoading,
    fetchPendingRequests,
    acceptRequest,
    rejectRequest,
  } = useMatchStore();

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [requestsWithProfiles, setRequestsWithProfiles] = useState<MatchRequestWithProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchPendingRequests(user.uid);
      }
    }, [user])
  );

  // Fetch profiles for all pending requests
  useEffect(() => {
    const fetchProfiles = async () => {
      if (pendingRequests.length === 0) {
        setRequestsWithProfiles([]);
        return;
      }

      setLoadingProfiles(true);
      const requestsWithProfileData: MatchRequestWithProfile[] = await Promise.all(
        pendingRequests.map(async (request) => {
          try {
            const result = await getProfile(request.userId);
            return {
              ...request,
              senderProfile: result.success ? result.data : null,
            };
          } catch {
            return { ...request, senderProfile: null };
          }
        })
      );
      setRequestsWithProfiles(requestsWithProfileData);
      setLoadingProfiles(false);
    };

    fetchProfiles();
  }, [pendingRequests]);

  const handleAccept = async (matchId: string) => {
    setProcessingId(matchId);
    try {
      const result = await acceptRequest(matchId);
      if (result.success) {
        showAlert(
          'Connected!', 
          'You are now connected with this climber. Would you like to send them a message?',
          [
            { text: 'Later', style: 'cancel' },
            {
              text: 'Message',
              onPress: () => {
                if (result.conversationId) {
                  navigation.navigate('Chat', { conversationId: result.conversationId });
                } else {
                  navigation.navigate('Messages');
                }
              },
            },
          ]
        );
      } else {
        showAlert('Error', 'Failed to accept request. Please try again.');
      }
    } catch (error) {
      showAlert('Error', 'Something went wrong. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (matchId: string) => {
    showAlert(
      'Decline Request',
      'Are you sure you want to decline this connection request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(matchId);
            try {
              const success = await rejectRequest(matchId);
              if (!success) {
                showAlert('Error', 'Failed to decline request. Please try again.');
              }
            } catch (error) {
              showAlert('Error', 'Something went wrong. Please try again.');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const handleViewProfile = (climberId: string) => {
    navigation.navigate('ClimberProfile', { climberId });
  };

  const renderRequestCard = ({ item }: { item: MatchRequestWithProfile }) => {
    const isProcessing = processingId === item.id;
    const profile = item.senderProfile;
    
    return (
      <Card style={styles.requestCard}>
        <View style={styles.cardContent}>
          <Avatar
            source={profile?.photoURL}
            name={profile?.displayName || 'Unknown'}
            size={56}
            onPress={() => handleViewProfile(item.userId)}
          />
          <View style={styles.info}>
            <Text variant="titleMedium" style={{ color: theme.colors.onBackground }}>
              {profile?.displayName || 'Unknown Climber'}
            </Text>
            {profile?.location && (
              <View style={styles.locationRow}>
                <MaterialCommunityIcons
                  name="map-marker"
                  size={14}
                  color={theme.colors.onSurfaceVariant}
                />
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
                  {profile.location.city}, {profile.location.state}
                </Text>
              </View>
            )}
            {profile?.experienceLevel && (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {profile.experienceLevel} • {profile.yearsClimbing || 0} yrs climbing
              </Text>
            )}
          </View>
        </View>
        
        <View style={styles.actions}>
          <PaperButton
            mode="outlined"
            onPress={() => handleReject(item.id)}
            disabled={isProcessing}
            style={styles.actionButton}
            compact
          >
            Decline
          </PaperButton>
          <PaperButton
            mode="contained"
            onPress={() => handleAccept(item.id)}
            loading={isProcessing}
            disabled={isProcessing}
            style={styles.actionButton}
            compact
          >
            Accept
          </PaperButton>
        </View>
      </Card>
    );
  };

  if ((isLoading || loadingProfiles) && requestsWithProfiles.length === 0) {
    return <LoadingSpinner fullScreen message="Loading requests..." />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Text variant="headlineSmall" style={{ color: theme.colors.onBackground, flex: 1 }}>
          Connection Requests
        </Text>
      </View>

      {requestsWithProfiles.length === 0 ? (
        <EmptyState
          icon="account-multiple-outline"
          title="No Pending Requests"
          message="When other climbers want to connect with you, their requests will appear here."
        />
      ) : (
        <FlatList
          data={requestsWithProfiles}
          renderItem={renderRequestCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
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
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  requestCard: {
    padding: 16,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  actionButton: {
    minWidth: 100,
  },
});

export default MatchRequestsScreen;
