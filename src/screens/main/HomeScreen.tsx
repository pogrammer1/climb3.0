// Home Screen - Dashboard
import React, { useEffect, useCallback } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl } from 'react-native';
import { Text, useTheme, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Card, Avatar, Button, LoadingSpinner } from '../../components/common';
import { useAuthStore, useSessionStore, useMatchStore } from '../../store';

interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const theme = useTheme();
  const { user, profile } = useAuthStore();
  const { sessions, stats, isLoading: sessionsLoading, fetchSessions, fetchStats } = useSessionStore();
  const { pendingRequests, fetchPendingRequests } = useMatchStore();

  const [refreshing, setRefreshing] = React.useState(false);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchSessions(user.uid);
        fetchStats(user.uid);
        fetchPendingRequests(user.uid);
      }
    }, [user])
  );

  const onRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    await Promise.all([
      fetchSessions(user.uid, true),
      fetchStats(user.uid),
      fetchPendingRequests(user.uid),
    ]);
    setRefreshing(false);
  };

  const QuickActionCard = ({
    icon,
    title,
    subtitle,
    onPress,
    color,
  }: {
    icon: string;
    title: string;
    subtitle: string;
    onPress: () => void;
    color: string;
  }) => (
    <Card style={styles.actionCard} onPress={onPress}>
      <View style={[styles.actionIconContainer, { backgroundColor: color + '20' }]}>
        <MaterialCommunityIcons name={icon as any} size={28} color={color} />
      </View>
      <Text variant="titleMedium" style={styles.actionTitle}>
        {title}
      </Text>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {subtitle}
      </Text>
    </Card>
  );

  const StatCard = ({ label, value, icon }: { label: string; value: string | number; icon: string }) => (
    <View style={styles.statCard}>
      <MaterialCommunityIcons name={icon as any} size={24} color={theme.colors.primary} />
      <Text variant="headlineSmall" style={[styles.statValue, { color: theme.colors.onBackground }]}>
        {value}
      </Text>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {label}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text variant="headlineSmall" style={{ color: theme.colors.onBackground }}>
              Hey, {profile?.displayName || 'Climber'}! 👋
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Ready to climb?
            </Text>
          </View>
          <Avatar
            source={profile?.photoURL}
            name={profile?.displayName || ''}
            size={48}
            onPress={() => navigation.navigate('Profile')}
          />
        </View>

        {/* Pending Requests Banner */}
        {pendingRequests.length > 0 && (
          <Card
            style={StyleSheet.flatten([styles.requestsBanner, { backgroundColor: theme.colors.primaryContainer }])}
            onPress={() => navigation.navigate('MatchRequests')}
          >
            <View style={styles.bannerContent}>
              <MaterialCommunityIcons name="account-multiple" size={24} color={theme.colors.onPrimaryContainer} />
              <View style={styles.bannerText}>
                <Text variant="titleMedium" style={{ color: theme.colors.onPrimaryContainer }}>
                  {pendingRequests.length} new connection request{pendingRequests.length > 1 ? 's' : ''}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer }}>
                  Tap to view
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.onPrimaryContainer} />
            </View>
          </Card>
        )}

        {/* Quick Actions */}
        <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
          Quick Actions
        </Text>
        <View style={styles.actionsGrid}>
          <QuickActionCard
            icon="plus-circle"
            title="Log Session"
            subtitle="Record your climb"
            onPress={() => navigation.navigate('NewSession')}
            color={theme.colors.primary}
          />
          <QuickActionCard
            icon="account-search"
            title="Find Climbers"
            subtitle="Meet new partners"
            onPress={() => navigation.navigate('Discover')}
            color="#048A81"
          />
          <QuickActionCard
            icon="message-text"
            title="Messages"
            subtitle="Chat with climbers"
            onPress={() => navigation.navigate('Messages')}
            color="#2E4057"
          />
          <QuickActionCard
            icon="history"
            title="Sessions"
            subtitle="View history"
            onPress={() => navigation.navigate('Sessions')}
            color="#FF8C5A"
          />
        </View>

        {/* Stats Overview */}
        <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
          Your Stats
        </Text>
        <Card style={styles.statsContainer}>
          <View style={styles.statsGrid}>
            <StatCard
              label="Sessions"
              value={stats?.totalSessions || 0}
              icon="calendar-check"
            />
            <StatCard
              label="Climbs"
              value={stats?.totalClimbs || 0}
              icon="trending-up"
            />
            <StatCard
              label="Hours"
              value={Math.round((stats?.totalDuration || 0) / 60)}
              icon="clock-outline"
            />
          </View>
        </Card>

        {/* Recent Sessions */}
        <View style={styles.sectionHeader}>
          <Text variant="titleLarge" style={{ color: theme.colors.onBackground }}>
            Recent Sessions
          </Text>
          <Button
            title="View All"
            onPress={() => navigation.navigate('Sessions')}
            variant="text"
            size="small"
          />
        </View>

        {sessionsLoading ? (
          <LoadingSpinner message="Loading sessions..." />
        ) : sessions.length > 0 ? (
          sessions.slice(0, 3).map((session) => (
            <Card
              key={session.id}
              style={styles.sessionCard}
              onPress={() => navigation.navigate('SessionDetail', { sessionId: session.id })}
            >
              <View style={styles.sessionHeader}>
                <View>
                  <Text variant="titleMedium" style={{ color: theme.colors.onBackground }}>
                    {session.location}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {new Date(session.date).toLocaleDateString()} • {session.duration} min
                  </Text>
                </View>
                <View style={[styles.locationBadge, { backgroundColor: session.locationType === 'indoor' ? '#048A8120' : '#FF6B3520' }]}>
                  <Text variant="labelSmall" style={{ color: session.locationType === 'indoor' ? '#048A81' : '#FF6B35' }}>
                    {session.locationType === 'indoor' ? '🏢 Indoor' : '⛰️ Outdoor'}
                  </Text>
                </View>
              </View>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={2}>
                {session.notes || `${session.climbs?.length || 0} climbs logged`}
              </Text>
            </Card>
          ))
        ) : (
          <Card style={styles.emptyCard}>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
              No sessions yet. Start logging your climbs! 🧗
            </Text>
            <Button
              title="Log Your First Session"
              onPress={() => navigation.navigate('NewSession')}
              style={styles.emptyButton}
            />
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerLeft: {
    flex: 1,
  },
  requestsBanner: {
    marginBottom: 24,
    padding: 16,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerText: {
    flex: 1,
    marginLeft: 12,
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 24,
  },
  actionCard: {
    width: '46%',
    margin: '2%',
    padding: 16,
    alignItems: 'center',
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    textAlign: 'center',
    marginBottom: 4,
  },
  statsContainer: {
    marginBottom: 24,
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statCard: {
    alignItems: 'center',
  },
  statValue: {
    fontWeight: 'bold',
    marginVertical: 4,
  },
  sessionCard: {
    marginBottom: 12,
    padding: 16,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  locationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
  },
  emptyButton: {
    marginTop: 16,
  },
});

export default HomeScreen;
