// Session Detail Screen - View and manage climbing session
import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, useTheme, IconButton, FAB, Divider, Menu, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, Button, LoadingSpinner, EmptyState, AddClimbModal, ClimbFormData as AddClimbFormData } from '../../components/common';
import { useSessionStore, useAuthStore } from '../../store';
import { ClimbingSession, Climb, ClimbingType, ClimbFormData, AttemptResult } from '../../types';
import { format } from 'date-fns';
import { showAlert } from '../../utils/alert';
import { logServiceError } from '../../utils/error';

interface SessionDetailScreenProps {
  navigation: any;
  route: {
    params: {
      sessionId: string;
    };
  };
}

export const SessionDetailScreen: React.FC<SessionDetailScreenProps> = ({ navigation, route }) => {
  const { sessionId } = route.params;
  const theme = useTheme();
  const { user } = useAuthStore();
  const { currentSession, currentSessionClimbs, isLoading, error, fetchSession, fetchSessionClimbs, addClimbToSession, updateClimbInSession, deleteClimbFromSession, deleteExistingSession, fetchStats } = useSessionStore();
  
  const [menuVisible, setMenuVisible] = useState(false);
  const [addClimbModalVisible, setAddClimbModalVisible] = useState(false);
  const [editClimbModalVisible, setEditClimbModalVisible] = useState(false);
  const [selectedClimb, setSelectedClimb] = useState<Climb | null>(null);
  const [climbMenuVisible, setClimbMenuVisible] = useState<string | null>(null);

  useEffect(() => {
    fetchSession(sessionId);
    fetchSessionClimbs(sessionId);
  }, [sessionId]);

  const handleDelete = async () => {
    const confirmed = await new Promise<boolean>((resolve) => {
      showAlert(
        'Delete Session',
        'Are you sure you want to delete this session? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
        ]
      );
    });

    if (confirmed) {
      try {
        const success = await deleteExistingSession(sessionId);
        if (success) {
          // Refresh stats after deletion
          if (user) {
            await fetchStats(user.uid);
          }
          navigation.goBack();
        } else {
          showAlert('Error', 'Failed to delete session. Please try again.');
        }
      } catch (error) {
        logServiceError('SessionDetailScreen.deleteSession', error);
        showAlert('Error', 'Failed to delete session');
      }
    }
  };

  const handleAddClimb = async (climbData: AddClimbFormData) => {
    try {
      await addClimbToSession(sessionId, climbData);
      // Refresh stats for the home screen
      if (user) {
        await fetchStats(user.uid);
      }
      setAddClimbModalVisible(false);
    } catch (error) {
      logServiceError('SessionDetailScreen.addClimb', error);
      showAlert('Error', 'Failed to add climb');
    }
  };

  const handleEditClimb = (climb: Climb) => {
    setSelectedClimb(climb);
    setClimbMenuVisible(null);
    setEditClimbModalVisible(true);
  };

  const handleUpdateClimb = async (climbData: AddClimbFormData) => {
    if (!selectedClimb) {
      return;
    }

    try {
      const success = await updateClimbInSession(selectedClimb.id, climbData);
      if (success) {
        // Refresh stats
        if (user) {
          await fetchStats(user.uid);
        }
        setEditClimbModalVisible(false);
        setSelectedClimb(null);
      } else {
        showAlert('Error', 'Failed to update climb');
      }
    } catch (error) {
      logServiceError('SessionDetailScreen.updateClimb', error);
      showAlert('Error', 'Failed to update climb');
    }
  };

  const handleDeleteClimb = async (climbId: string) => {
    const confirmed = await new Promise<boolean>((resolve) => {
      showAlert(
        'Delete Climb',
        'Are you sure you want to delete this climb?',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
        ]
      );
    });

    if (confirmed) {
      try {
        const success = await deleteClimbFromSession(climbId);
        if (success && user) {
          await fetchStats(user.uid);
        }
        setClimbMenuVisible(null);
      } catch (error) {
        logServiceError('SessionDetailScreen.deleteClimb', error);
        showAlert('Error', 'Failed to delete climb');
      }
    }
  };

  const getGradeColor = (climbingType: ClimbingType, result: AttemptResult): string => {
    const isSuccess = ['Send', 'Flash', 'Onsight', 'Redpoint'].includes(result);
    if (!isSuccess) return theme.colors.outline;
    return climbingType === 'Bouldering' ? '#E67E22' : '#3498DB';
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} min`;
    if (mins === 0) return `${hours} hr`;
    return `${hours} hr ${mins} min`;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <LoadingSpinner fullScreen message="Loading session..." />
      </SafeAreaView>
    );
  }

  if (!currentSession) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <EmptyState
          icon="calendar-alert"
          title="Session Not Found"
          message="This session may have been deleted."
          actionLabel="Go Back"
          onAction={() => navigation.goBack()}
        />
      </SafeAreaView>
    );
  }

  const session = currentSession;
  const climbs = currentSessionClimbs || [];
  const stats = {
    totalClimbs: climbs.length,
    completed: climbs.filter((c) => ['Send', 'Flash', 'Onsight', 'Redpoint'].includes(c.result)).length,
    boulders: climbs.filter((c) => c.climbingType === 'Bouldering').length,
    routes: climbs.filter((c) => c.climbingType !== 'Bouldering').length,
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.outline }]}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <View style={styles.headerTitle}>
          <Text variant="titleLarge" style={{ color: theme.colors.onBackground }}>
            Session Details
          </Text>
        </View>
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <IconButton icon="dots-vertical" onPress={() => setMenuVisible(true)} />
          }
        >
          <Menu.Item
            onPress={() => {
              setMenuVisible(false);
              navigation.navigate('EditSession', { sessionId });
            }}
            title="Edit Session"
            leadingIcon="pencil"
          />
          <Menu.Item
            onPress={() => {
              setMenuVisible(false);
              handleDelete();
            }}
            title="Delete Session"
            leadingIcon="delete"
            titleStyle={{ color: theme.colors.error }}
          />
        </Menu>
      </View>

      <ScrollView contentContainerStyle={styles.mobileContent}>
        {/* Session Info Card */}
        <Card style={styles.infoCard}>
          <View style={styles.dateRow}>
            <MaterialCommunityIcons
              name="calendar"
              size={24}
              color={theme.colors.primary}
            />
            <View style={styles.dateInfo}>
              <Text
                variant="titleMedium"
                style={[{ color: theme.colors.onSurface }, styles.dateText]}
                numberOfLines={1}
                ellipsizeMode="tail"
                adjustsFontSizeToFit={false}
              >
                {format(new Date(session.date), 'EEEE, MMMM d, yyyy')}
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {session.locationType === 'indoor' ? 'Indoor' : 'Outdoor'} Session
              </Text>
            </View>
          </View>

          <Divider style={styles.divider} />

          {/* Duration Row */}
          <View style={styles.statRow}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={20}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginLeft: 8 }}>
              {formatDuration(session.duration)}
            </Text>
          </View>

          {/* Location Row - on its own line */}
          <View style={styles.statRow}>
            <MaterialCommunityIcons
              name="map-marker"
              size={20}
              color={theme.colors.onSurfaceVariant}
            />
            <Text
              variant="bodyMedium"
              style={styles.locationText}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {session.location || 'No location'}
            </Text>
          </View>

          {session.notes && (
            <>
              <Divider style={styles.divider} />
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {session.notes}
              </Text>
            </>
          )}
        </Card>

        {/* Stats Summary */}
        <View style={styles.statsGrid}>
          <Card style={styles.miniStatCard}>
            <Text variant="headlineSmall" style={{ color: theme.colors.primary }}>
              {stats.totalClimbs}
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Total Climbs
            </Text>
          </Card>
          <Card style={styles.miniStatCard}>
            <Text variant="headlineSmall" style={{ color: theme.colors.tertiary }}>
              {stats.completed}
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Completed
            </Text>
          </Card>
          <Card style={styles.miniStatCard}>
            <Text variant="headlineSmall" style={{ color: '#E67E22' }}>
              {stats.boulders}
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Boulders
            </Text>
          </Card>
          <Card style={styles.miniStatCard}>
            <Text variant="headlineSmall" style={{ color: '#3498DB' }}>
              {stats.routes}
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Routes
            </Text>
          </Card>
        </View>

        {/* Climbs List */}
        <View style={styles.climbsSection}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Climbs ({stats.totalClimbs})
          </Text>

          {climbs.length > 0 ? (
            climbs.map((climb, index) => {
              const isSuccess = ['Send', 'Flash', 'Onsight', 'Redpoint'].includes(climb.result);
              return (
                <Card key={climb.id || index} style={styles.climbCard}>
                  <View style={styles.climbContent}>
                    <View
                      style={[
                        styles.gradeIndicator,
                        { backgroundColor: getGradeColor(climb.climbingType, climb.result) },
                      ]}
                    >
                      <Text style={styles.gradeText}>{climb.grade}</Text>
                    </View>
                    <View style={styles.climbInfo}>
                      <View style={styles.climbHeader}>
                        <Chip compact style={styles.typeChip}>
                          {climb.climbingType}
                        </Chip>
                        <View style={styles.climbActions}>
                          {isSuccess ? (
                            <MaterialCommunityIcons
                              name="check-circle"
                              size={20}
                              color={theme.colors.primary}
                            />
                          ) : (
                            <MaterialCommunityIcons
                              name="close-circle-outline"
                              size={20}
                              color={theme.colors.outline}
                            />
                          )}
                          <Menu
                            visible={climbMenuVisible === climb.id}
                            onDismiss={() => setClimbMenuVisible(null)}
                            anchor={
                              <IconButton
                                icon="dots-vertical"
                                size={18}
                                onPress={() => setClimbMenuVisible(climb.id)}
                                style={styles.climbMenuButton}
                              />
                            }
                          >
                            <Menu.Item
                              onPress={() => handleEditClimb(climb)}
                              title="Edit"
                              leadingIcon="pencil"
                            />
                            <Menu.Item
                              onPress={() => handleDeleteClimb(climb.id)}
                              title="Delete"
                              leadingIcon="delete"
                              titleStyle={{ color: theme.colors.error }}
                            />
                          </Menu>
                        </View>
                      </View>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {climb.attempts} attempt{climb.attempts !== 1 ? 's' : ''} • {climb.result}
                      </Text>
                      {climb.notes ? (
                        <Text variant="bodySmall" style={[styles.climbNotes, { color: theme.colors.onSurfaceVariant }]}>
                          {climb.notes}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </Card>
              );
            })
          ) : (
            <EmptyState
              icon="hiking"
              title="No Climbs Yet"
              message="Tap the + button to add your first climb"
            />
          )}
        </View>
      </ScrollView>

      {/* Add Climb FAB */}
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
        onPress={() => setAddClimbModalVisible(true)}
      />

      {/* Add Climb Modal */}
      <AddClimbModal
        visible={addClimbModalVisible}
        onDismiss={() => setAddClimbModalVisible(false)}
        onSave={handleAddClimb}
        isEditing={false}
      />

      {/* Edit Climb Modal */}
      <AddClimbModal
        visible={editClimbModalVisible}
        onDismiss={() => {
          setEditClimbModalVisible(false);
          setSelectedClimb(null);
        }}
        onSave={handleUpdateClimb}
        initialData={selectedClimb ? {
          name: selectedClimb.name || '',
          climbingType: selectedClimb.climbingType,
          grade: selectedClimb.grade as string,
          gradeSystem: selectedClimb.climbingType === 'Bouldering' ? 'v-scale' : 'yds',
          attempts: String(selectedClimb.attempts),
          result: selectedClimb.result,
          notes: selectedClimb.notes || '',
          rating: selectedClimb.rating || 3,
        } : undefined}
        isEditing={true}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dateText: {
    flexShrink: 1,
    minWidth: 0,
    maxWidth: '100%',
  },
  locationNameContainer: {
    flex: 1,
    minWidth: 0,
    maxWidth: '80%',
  },
  locationName: {
    flexShrink: 1,
    minWidth: 0,
    maxWidth: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
  },
  headerTitle: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  mobileContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 100,
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
  },
  infoCard: {
    padding: 16,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateInfo: {
    marginLeft: 12,
    flex: 1,
  },
  divider: {
    marginVertical: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  locationText: {
    flex: 1,
    marginLeft: 8,
    color: '#333',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    marginHorizontal: -4,
  },
  miniStatCard: {
    width: '23%',
    margin: '1%',
    padding: 12,
    alignItems: 'center',
  },
  climbsSection: {
    marginTop: 24,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  climbCard: {
    marginBottom: 8,
    padding: 0,
    overflow: 'hidden',
  },
  climbContent: {
    flexDirection: 'row',
  },
  gradeIndicator: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  gradeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  climbInfo: {
    flex: 1,
    padding: 12,
  },
  climbHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  climbActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  climbMenuButton: {
    margin: 0,
    marginLeft: 4,
  },
  climbNotes: {
    marginTop: 4,
    fontStyle: 'italic',
  },
  typeChip: {
    height: 24,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});

export default SessionDetailScreen;
