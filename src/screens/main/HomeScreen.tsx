// Home Screen - Dashboard
import React, { useEffect, useCallback } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl, Pressable } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Card, Avatar, Button, LoadingSpinner, NotificationBanner } from '../../components/common';
import { useAuthStore, useSessionStore, useMatchStore, useMessageStore } from '../../store';

interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const theme = useTheme();
  const { user, profile } = useAuthStore();
  const { sessions, stats, isLoading: sessionsLoading, fetchSessions, fetchStats } = useSessionStore();
  const { pendingRequests, fetchPendingRequests } = useMatchStore();
  const { fetchUnreadCount, subscribeToUserConversations } = useMessageStore();

  const [refreshing, setRefreshing] = React.useState(false);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchSessions(user.uid);
        fetchStats(user.uid);
        fetchPendingRequests(user.uid);
        fetchUnreadCount(user.uid);
      }
    }, [user])
  );

  // Subscribe to conversations for real-time unread count updates
  useEffect(() => {
    if (user) {
      subscribeToUserConversations(user.uid);
    }
  }, [user]);

  const onRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    await Promise.all([
      fetchSessions(user.uid, true),
      fetchStats(user.uid),
      fetchPendingRequests(user.uid),
      fetchUnreadCount(user.uid),
    ]);
    setRefreshing(false);
  };

  // Modern Quick Action Button
  const QuickAction = ({
    icon,
    label,
    onPress,
    color,
  }: {
    icon: string;
    label: string;
    onPress: () => void;
    color: string;
  }) => (
    <Pressable 
      onPress={onPress} 
      style={({ pressed }) => [
        styles.quickAction,
        { opacity: pressed ? 0.7 : 1 }
      ]}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: color }]}>
        <MaterialCommunityIcons name={icon as any} size={22} color="#fff" />
      </View>
      <Text variant="labelSmall" style={[styles.quickActionLabel, { color: theme.colors.onSurface }]}>
        {label}
      </Text>
    </Pressable>
  );

  // Stat Item for inline stats bar
  const StatItem = ({ label, value, icon }: { label: string; value: string | number; icon: string }) => (
    <View style={styles.statItem}>
      <MaterialCommunityIcons name={icon as any} size={18} color={theme.colors.primary} />
      <Text variant="titleMedium" style={[styles.statValue, { color: theme.colors.onSurface }]}>
        {value}
      </Text>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
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
        {/* Header with Stats Bar */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <Text variant="titleLarge" style={[styles.greeting, { color: theme.colors.onBackground }]}>
                Hey, {profile?.displayName || 'Climber'}!
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                On Belay?
              </Text>
            </View>
            <Avatar
              source={profile?.photoURL}
              name={profile?.displayName || ''}
              size={44}
              onPress={() => navigation.navigate('Profile')}
            />
          </View>
          
          {/* Inline Stats Bar Section */}
          <View style={[styles.statsBar, { backgroundColor: theme.colors.surface }]}>
            <StatItem
              label="Sessions"
              value={stats?.totalSessions || 0}
              icon="calendar-check"
            />
            <View style={[styles.statDivider, { backgroundColor: theme.colors.outline }]} />
            <StatItem
              label="Climbs"
              value={stats?.totalClimbs || 0}
              icon="trending-up"
            />
            <View style={[styles.statDivider, { backgroundColor: theme.colors.outline }]} />
            <StatItem
              label="Hours"
              value={Math.round((stats?.totalDuration || 0) / 60)}
              icon="clock-outline"
            />
          </View>
        </View>

        {/* Notification Permission Banner */} 
        <NotificationBanner />

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

        {/* Quick Actions - Horizontal Row */}
        <View style={styles.quickActionsContainer}>
          <QuickAction
            icon="plus"
            label="Log Session"
            onPress={() => navigation.navigate('NewSession')}
            color="#007e8f"
          />
          <QuickAction
            icon="account-search"
            label="Find Climbers"
            onPress={() => navigation.navigate('Discover')}
            color="#00749e"
          />
          <QuickAction
            icon="message-text"
            label="Messages"
            onPress={() => navigation.navigate('Messages')}
            color="#0451b5"
          />
          <QuickAction
            icon="history"
            label="History"
            onPress={() => navigation.navigate('Sessions')}
            color="#1414c2"
          />
        </View>

        {/* Recent Sessions Section */}
        <View style={styles.sectionHeader}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
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
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    variant="titleMedium"
                    style={{ color: theme.colors.onBackground }}
                    numberOfLines={2} // default is one, maybe increase if needed in future for longer names
                    ellipsizeMode="tail" // for extremely long names but will change prob 
                  >
                    {session.location}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {new Date(session.date).toLocaleDateString()} • {session.duration} mins
                  </Text>
                </View>
                <View style={[styles.locationBadge, { backgroundColor: session.locationType === 'indoor' ? '#048A8120' : '#FF6B3520' }]}>
                  <Text variant="labelSmall" style={{ color: session.locationType === 'indoor' ? '#048A81' : '#FF6B35' }}>
                    {session.locationType === 'indoor' ? '🏢' : '⛰️'}
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
              No sessions yet. Start logging your climbs! 
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
    paddingBottom: 32,
  },
  header: {
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontWeight: '600',
    marginBottom: 2,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontWeight: '700',
    marginVertical: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
  },
  requestsBanner: {
    marginBottom: 20,
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
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quickAction: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionLabel: {
    textAlign: 'center',
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: '600',
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
