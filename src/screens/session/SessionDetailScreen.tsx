// Session Detail Screen - View and manage climbing session
import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, TextInput as RNTextInput } from 'react-native';
import { Text, useTheme, IconButton, FAB, Portal, Modal, Divider, Menu, Chip, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, Button, LoadingSpinner, EmptyState, GradePicker } from '../../components/common';
import { useSessionStore, useAuthStore } from '../../store';
import { ClimbingSession, Climb, ClimbingType, ClimbFormData, AttemptResult, YDSGrade, BoulderingGrade } from '../../types';
import { format } from 'date-fns';
import { CLIMBING_TYPES, ATTEMPT_RESULTS } from '../../constants';
import { showAlert } from '../../utils/alert';

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
  const [gradeSystem, setGradeSystem] = useState<'yds' | 'v-scale'>('v-scale');
  const [newClimb, setNewClimb] = useState<Partial<ClimbFormData>>({
    climbingType: 'Bouldering',
    grade: 'V0',
    gradeSystem: 'v-scale',
    attempts: '1',
    result: 'Send',
    notes: '',
    rating: 3,
  });
  const [editClimb, setEditClimb] = useState<Partial<ClimbFormData>>({});

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
        console.error('Delete error:', error);
        showAlert('Error', 'Failed to delete session');
      }
    }
  };

  const handleAddClimb = async () => {
    if (!newClimb.grade) {
      showAlert('Error', 'Please select a grade');
      return;
    }

    const climbData: ClimbFormData = {
      name: newClimb.name || '',
      climbingType: newClimb.climbingType || 'Bouldering',
      grade: newClimb.grade || 'V0',
      gradeSystem: newClimb.gradeSystem || 'v-scale',
      attempts: newClimb.attempts || '1',
      result: newClimb.result || 'Send',
      notes: newClimb.notes || '',
      rating: newClimb.rating || 3,
    };

    try {
      await addClimbToSession(sessionId, climbData);
      // Refresh stats for the home screen
      if (user) {
        await fetchStats(user.uid);
      }
      setAddClimbModalVisible(false);
      setNewClimb({
        climbingType: 'Bouldering',
        grade: 'V0',
        gradeSystem: 'v-scale',
        attempts: '1',
        result: 'Send',
        notes: '',
        rating: 3,
      });
    } catch (error) {
      showAlert('Error', 'Failed to add climb');
    }
  };

  const handleEditClimb = (climb: Climb) => {
    setSelectedClimb(climb);
    const gradeSystemForClimb = climb.climbingType === 'Bouldering' ? 'v-scale' : 'yds';
    setGradeSystem(gradeSystemForClimb);
    setEditClimb({
      name: climb.name || '',
      climbingType: climb.climbingType,
      grade: climb.grade as string,
      gradeSystem: gradeSystemForClimb,
      attempts: String(climb.attempts),
      result: climb.result,
      notes: climb.notes || '',
      rating: climb.rating || 3,
    });
    setClimbMenuVisible(null);
    setEditClimbModalVisible(true);
  };

  const handleUpdateClimb = async () => {
    if (!selectedClimb || !editClimb.grade) {
      showAlert('Error', 'Please select a grade');
      return;
    }

    try {
      const success = await updateClimbInSession(selectedClimb.id, editClimb);
      if (success) {
        // Refresh stats
        if (user) {
          await fetchStats(user.uid);
        }
        setEditClimbModalVisible(false);
        setSelectedClimb(null);
        setEditClimb({});
      } else {
        showAlert('Error', 'Failed to update climb');
      }
    } catch (error) {
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
                          📝 {climb.notes}
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
                key={type}
                selected={newClimb.climbingType === type}
                onPress={() => {
                  const newGradeSystem = type === 'Bouldering' ? 'v-scale' : 'yds';
                  setGradeSystem(newGradeSystem);
                  setNewClimb({ ...newClimb, climbingType: type as ClimbingType, gradeSystem: newGradeSystem });
                }}
                style={styles.typeButton}
              >
                {type}
              </Chip>
            ))}
          </View>

          {/* Grade Picker */}
          <Text variant="labelLarge" style={[styles.label, { color: theme.colors.onSurface }]}>
            Grade
          </Text>
          <GradePicker
            gradeSystem={gradeSystem}
            value={newClimb.grade || ''}
            onValueChange={(grade) => setNewClimb({ ...newClimb, grade })}
          />

          {/* Attempts */}
          <Text variant="labelLarge" style={[styles.label, { color: theme.colors.onSurface }]}>
            Attempts
          </Text>
          <View style={styles.attemptsRow}>
            <IconButton
              icon="minus"
              mode="contained"
              onPress={() => {
                const current = parseInt(newClimb.attempts || '1', 10);
                setNewClimb({ ...newClimb, attempts: String(Math.max(1, current - 1)) });
              }}
            />
            <Text variant="headlineSmall" style={{ color: theme.colors.onSurface }}>
              {newClimb.attempts || '1'}
            </Text>
            <IconButton
              icon="plus"
              mode="contained"
              onPress={() => {
                const current = parseInt(newClimb.attempts || '1', 10);
                setNewClimb({ ...newClimb, attempts: String(current + 1) });
              }}
            />
          </View>

          {/* Result */}
          <Text variant="labelLarge" style={[styles.label, { color: theme.colors.onSurface }]}>
            Result
          </Text>
          <View style={styles.typeButtons}>
            {ATTEMPT_RESULTS.map((result) => (
              <Chip
                key={result}
                selected={newClimb.result === result}
                onPress={() => setNewClimb({ ...newClimb, result: result as AttemptResult })}
                style={styles.typeButton}
              >
                {result}
              </Chip>
            ))}
          </View>

          {/* Notes */}
          <Text variant="labelLarge" style={[styles.label, { color: theme.colors.onSurface }]}>
            Notes (optional)
          </Text>
          <TextInput
            mode="outlined"
            placeholder="Beta, conditions, how it felt..."
            value={newClimb.notes || ''}
            onChangeText={(text) => setNewClimb({ ...newClimb, notes: text })}
            multiline
            numberOfLines={2}
            style={styles.notesInput}
          />

          {/* Actions */}
          <View style={styles.modalActions}>
            <Button
              variant="outline"
              onPress={() => setAddClimbModalVisible(false)}
              style={styles.modalButton}
              title="Cancel"
            />
            <Button
              variant="primary"
              onPress={handleAddClimb}
              style={styles.modalButton}
              title="Add Climb"
            />
          </View>
        </Modal>
      </Portal>

      {/* Edit Climb Modal */}
      <Portal>
        <Modal
          visible={editClimbModalVisible}
          onDismiss={() => {
            setEditClimbModalVisible(false);
            setSelectedClimb(null);
            setEditClimb({});
          }}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text variant="titleLarge" style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
              Edit Climb
            </Text>

            {/* Climb Type */}
            <Text variant="labelLarge" style={[styles.label, { color: theme.colors.onSurface }]}>
              Type
            </Text>
            <View style={styles.typeButtons}>
              {CLIMBING_TYPES.map((type) => (
                <Chip
                  key={type}
                  selected={editClimb.climbingType === type}
                  onPress={() => {
                    const newGradeSystem = type === 'Bouldering' ? 'v-scale' : 'yds';
                    setGradeSystem(newGradeSystem);
                    setEditClimb({ ...editClimb, climbingType: type as ClimbingType, gradeSystem: newGradeSystem });
                  }}
                  style={styles.typeButton}
                >
                  {type}
                </Chip>
              ))}
            </View>

            {/* Grade Picker */}
            <Text variant="labelLarge" style={[styles.label, { color: theme.colors.onSurface }]}>
              Grade
            </Text>
            <GradePicker
              gradeSystem={gradeSystem}
              value={editClimb.grade || ''}
              onValueChange={(grade) => setEditClimb({ ...editClimb, grade })}
            />

            {/* Attempts */}
            <Text variant="labelLarge" style={[styles.label, { color: theme.colors.onSurface }]}>
              Attempts
            </Text>
            <View style={styles.attemptsRow}>
              <IconButton
                icon="minus"
                mode="contained"
                onPress={() => {
                  const current = parseInt(editClimb.attempts || '1', 10);
                  setEditClimb({ ...editClimb, attempts: String(Math.max(1, current - 1)) });
                }}
              />
              <Text variant="headlineSmall" style={{ color: theme.colors.onSurface }}>
                {editClimb.attempts || '1'}
              </Text>
              <IconButton
                icon="plus"
                mode="contained"
                onPress={() => {
                  const current = parseInt(editClimb.attempts || '1', 10);
                  setEditClimb({ ...editClimb, attempts: String(current + 1) });
                }}
              />
            </View>

            {/* Result */}
            <Text variant="labelLarge" style={[styles.label, { color: theme.colors.onSurface }]}>
              Result
            </Text>
            <View style={styles.typeButtons}>
              {ATTEMPT_RESULTS.map((result) => (
                <Chip
                  key={result}
                  selected={editClimb.result === result}
                  onPress={() => setEditClimb({ ...editClimb, result: result as AttemptResult })}
                  style={styles.typeButton}
                >
                  {result}
                </Chip>
              ))}
            </View>

            {/* Notes */}
            <Text variant="labelLarge" style={[styles.label, { color: theme.colors.onSurface }]}>
              Notes (optional)
            </Text>
            <TextInput
              mode="outlined"
              placeholder="Beta, conditions, how it felt..."
              value={editClimb.notes || ''}
              onChangeText={(text) => setEditClimb({ ...editClimb, notes: text })}
              multiline
              numberOfLines={2}
              style={styles.notesInput}
            />

            {/* Actions */}
            <View style={styles.modalActions}>
              <Button
                variant="outline"
                onPress={() => {
                  setEditClimbModalVisible(false);
                  setSelectedClimb(null);
                  setEditClimb({});
                }}
                style={styles.modalButton}
                title="Cancel"
              />
              <Button
                variant="primary"
                onPress={handleUpdateClimb}
                style={styles.modalButton}
                title="Save Changes"
              />
            </View>
          </ScrollView>
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
  modal: {
    margin: 20,
    borderRadius: 16,
    padding: 24,
    maxHeight: '85%',
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
  notesInput: {
    marginTop: 4,
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
