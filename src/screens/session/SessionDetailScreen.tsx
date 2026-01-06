// Session Detail Screen - View and manage climbing session
import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import { Text, useTheme, IconButton, FAB, Portal, Modal, Divider, Menu, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, Button, LoadingSpinner, EmptyState, GradePicker } from '../../components/common';
import { useSessionStore } from '../../store';
import { ClimbingSession, Climb, ClimbingType, BoulderGrade, RopeGrade } from '../../types';
import { format } from 'date-fns';
import { CLIMBING_TYPES } from '../../constants';

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
  const { currentSession, isLoading, error, fetchSession, addClimbToSession, deleteSession } = useSessionStore();
  
  const [menuVisible, setMenuVisible] = useState(false);
  const [addClimbModalVisible, setAddClimbModalVisible] = useState(false);
  const [newClimb, setNewClimb] = useState<Partial<Climb>>({
    type: 'bouldering',
    grade: 'V0',
    attempts: 1,
    completed: true,
  });

  useEffect(() => {
    fetchSession(sessionId);
  }, [sessionId]);

  const handleDelete = () => {
    Alert.alert(
      'Delete Session',
      'Are you sure you want to delete this session? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSession(sessionId);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete session');
            }
          },
        },
      ]
    );
  };

  const handleAddClimb = async () => {
    if (!newClimb.grade) {
      Alert.alert('Error', 'Please select a grade');
      return;
    }

    const climb: Omit<Climb, 'id'> = {
      type: newClimb.type as ClimbingType,
      grade: newClimb.grade as BoulderGrade | RopeGrade,
      attempts: newClimb.attempts || 1,
      completed: newClimb.completed ?? true,
      notes: newClimb.notes,
    };

    try {
      await addClimbToSession(sessionId, climb);
      setAddClimbModalVisible(false);
      setNewClimb({
        type: 'bouldering',
        grade: 'V0',
        attempts: 1,
        completed: true,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to add climb');
    }
  };

  const getGradeColor = (type: ClimbingType, completed: boolean): string => {
    if (!completed) return theme.colors.outline;
    return type === 'bouldering' ? '#E67E22' : '#3498DB';
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
  const stats = {
    totalClimbs: session.climbs?.length || 0,
    completed: session.climbs?.filter((c) => c.completed).length || 0,
    boulders: session.climbs?.filter((c) => c.type === 'bouldering').length || 0,
    routes: session.climbs?.filter((c) => c.type !== 'bouldering').length || 0,
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

      <ScrollView contentContainerStyle={styles.content}>
        {/* Session Info Card */}
        <Card style={styles.infoCard}>
          <View style={styles.dateRow}>
            <MaterialCommunityIcons
              name="calendar"
              size={24}
              color={theme.colors.primary}
            />
            <View style={styles.dateInfo}>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                {format(new Date(session.date), 'EEEE, MMMM d, yyyy')}
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {session.locationType === 'indoor' ? 'Indoor' : 'Outdoor'} Session
              </Text>
            </View>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={20}
                color={theme.colors.onSurfaceVariant}
              />
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                {formatDuration(session.duration)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <MaterialCommunityIcons
                name="map-marker"
                size={20}
                color={theme.colors.onSurfaceVariant}
              />
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                {session.location || 'No location'}
              </Text>
            </View>
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

          {session.climbs && session.climbs.length > 0 ? (
            session.climbs.map((climb, index) => (
              <Card key={climb.id || index} style={styles.climbCard}>
                <View style={styles.climbContent}>
                  <View
                    style={[
                      styles.gradeIndicator,
                      { backgroundColor: getGradeColor(climb.type, climb.completed) },
                    ]}
                  >
                    <Text style={styles.gradeText}>{climb.grade}</Text>
                  </View>
                  <View style={styles.climbInfo}>
                    <View style={styles.climbHeader}>
                      <Chip compact style={styles.typeChip}>
                        {CLIMBING_TYPES.find((t) => t.value === climb.type)?.label || climb.type}
                      </Chip>
                      {climb.completed ? (
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
                    </View>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {climb.attempts} attempt{climb.attempts !== 1 ? 's' : ''}
                      {climb.notes && ` • ${climb.notes}`}
                    </Text>
                  </View>
                </View>
              </Card>
            ))
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
      <Portal>
        <Modal
          visible={addClimbModalVisible}
          onDismiss={() => setAddClimbModalVisible(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          <Text variant="titleLarge" style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
            Add Climb
          </Text>

          {/* Climb Type */}
          <Text variant="labelLarge" style={[styles.label, { color: theme.colors.onSurface }]}>
            Type
          </Text>
          <View style={styles.typeButtons}>
            {CLIMBING_TYPES.map((type) => (
              <Chip
                key={type.value}
                selected={newClimb.type === type.value}
                onPress={() => setNewClimb({ ...newClimb, type: type.value as ClimbingType })}
                style={styles.typeButton}
              >
                {type.label}
              </Chip>
            ))}
          </View>

          {/* Grade Picker */}
          <Text variant="labelLarge" style={[styles.label, { color: theme.colors.onSurface }]}>
            Grade
          </Text>
          <GradePicker
            type={newClimb.type === 'bouldering' ? 'boulder' : 'rope'}
            value={newClimb.grade || ''}
            onChange={(grade) => setNewClimb({ ...newClimb, grade })}
          />

          {/* Attempts */}
          <Text variant="labelLarge" style={[styles.label, { color: theme.colors.onSurface }]}>
            Attempts
          </Text>
          <View style={styles.attemptsRow}>
            <IconButton
              icon="minus"
              mode="contained"
              onPress={() => setNewClimb({ ...newClimb, attempts: Math.max(1, (newClimb.attempts || 1) - 1) })}
            />
            <Text variant="headlineSmall" style={{ color: theme.colors.onSurface }}>
              {newClimb.attempts || 1}
            </Text>
            <IconButton
              icon="plus"
              mode="contained"
              onPress={() => setNewClimb({ ...newClimb, attempts: (newClimb.attempts || 1) + 1 })}
            />
          </View>

          {/* Completed Toggle */}
          <View style={styles.completedRow}>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
              Completed
            </Text>
            <Chip
              selected={newClimb.completed}
              onPress={() => setNewClimb({ ...newClimb, completed: !newClimb.completed })}
            >
              {newClimb.completed ? 'Yes' : 'No'}
            </Chip>
          </View>

          {/* Actions */}
          <View style={styles.modalActions}>
            <Button
              variant="outline"
              onPress={() => setAddClimbModalVisible(false)}
              style={styles.modalButton}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onPress={handleAddClimb}
              style={styles.modalButton}
            >
              Add Climb
            </Button>
          </View>
        </Modal>
      </Portal>
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
  headerTitle: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
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
  typeChip: {
    height: 24,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  modal: {
    margin: 20,
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    marginBottom: 8,
    marginTop: 16,
  },
  typeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    marginRight: 8,
  },
  attemptsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  completedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
    gap: 12,
  },
  modalButton: {
    minWidth: 100,
  },
});

export default SessionDetailScreen;
