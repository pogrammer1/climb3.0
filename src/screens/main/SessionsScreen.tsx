// Sessions List Screen
import React, { useEffect, useCallback } from 'react';
import { StyleSheet, View, FlatList } from 'react-native';
import { Text, useTheme, FAB, Searchbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Card, LoadingSpinner, EmptyState } from '../../components/common';
import { useAuthStore, useSessionStore } from '../../store';
import { ClimbingSession } from '../../types';
import { format } from 'date-fns';

interface SessionsScreenProps {
  navigation: any;
}

export const SessionsScreen: React.FC<SessionsScreenProps> = ({ navigation }) => {
  const theme = useTheme();
  const { user } = useAuthStore();
  const {
    sessions,
    isLoading,
    isLoadingMore,
    hasMore,
    fetchSessions,
    loadMoreSessions,
  } = useSessionStore();

  const [searchQuery, setSearchQuery] = React.useState('');

  // Refresh sessions when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchSessions(user.uid, true);
      }
    }, [user])
  );

  const handleRefresh = useCallback(() => {
    if (user) {
      fetchSessions(user.uid, true);
    }
  }, [user, fetchSessions]);

  const handleLoadMore = useCallback(() => {
    if (user && hasMore && !isLoadingMore) {
      loadMoreSessions(user.uid);
    }
  }, [user, hasMore, isLoadingMore, loadMoreSessions]);

  const filteredSessions = sessions.filter((session) =>
    session.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderSessionItem = ({ item }: { item: ClimbingSession }) => (
    <Card
      style={styles.sessionCard}
      onPress={() => navigation.navigate('SessionDetail', { sessionId: item.id })}
    >
      <View style={styles.sessionHeader}>
        <View style={styles.sessionInfo}>
          <View style={[
            styles.locationBadge,
            { backgroundColor: item.locationType === 'indoor' ? '#048A8120' : '#FF6B3520' }
          ]}>
            <MaterialCommunityIcons
              name={item.locationType === 'indoor' ? 'office-building' : 'terrain'}
              size={16}
              color={item.locationType === 'indoor' ? '#048A81' : '#FF6B35'}
            />
          </View>
          <View style={styles.sessionText}>
            <Text variant="titleMedium" style={{ color: theme.colors.onBackground }}>
              {item.location}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {format(new Date(item.date), 'EEEE, MMM d, yyyy')}
            </Text>
          </View>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.outline} />
      </View>

      <View style={styles.sessionStats}>
        <View style={styles.stat}>
          <MaterialCommunityIcons name="clock-outline" size={16} color={theme.colors.onSurfaceVariant} />
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
            {item.duration} min
          </Text>
        </View>
        <View style={styles.stat}>
          <MaterialCommunityIcons name="trending-up" size={16} color={theme.colors.onSurfaceVariant} />
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
            {item.climbs?.length || 0} climbs
          </Text>
        </View>
        {item.photos && item.photos.length > 0 && (
          <View style={styles.stat}>
            <MaterialCommunityIcons name="image" size={16} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
              {item.photos.length} photos
            </Text>
          </View>
        )}
      </View>

      {item.notes && (
        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}
          numberOfLines={2}
        >
          {item.notes}
        </Text>
      )}
    </Card>
  );

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return <LoadingSpinner size="small" style={styles.footer} />;
  };

  if (isLoading && sessions.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <LoadingSpinner fullScreen message="Loading sessions..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={{ color: theme.colors.onBackground }}>
          My Sessions
        </Text>
      </View>

      <Searchbar
        placeholder="Search by location..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
        inputStyle={styles.searchInput}
      />

      {filteredSessions.length === 0 ? (
        <EmptyState
          icon="calendar-blank"
          title="No Sessions Yet"
          message="Start logging your climbing sessions to track your progress!"
          actionLabel="Log Your First Session"
          onAction={() => navigation.navigate('NewSession')}
        />
      ) : (
        <FlatList
          data={filteredSessions}
          renderItem={renderSessionItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshing={isLoading}
          onRefresh={handleRefresh}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
        />
      )}

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
        onPress={() => navigation.navigate('NewSession')}
      />
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
    padding: 16,
    paddingBottom: 8,
  },
  searchBar: {
    marginHorizontal: 16,
    marginBottom: 8,
    elevation: 0,
  },
  searchInput: {
    fontSize: 14,
  },
  list: {
    padding: 16,
    paddingBottom: 80,
  },
  sessionCard: {
    marginBottom: 12,
    padding: 16,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionText: {
    marginLeft: 12,
    flex: 1,
  },
  sessionStats: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  footer: {
    paddingVertical: 20,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default SessionsScreen;
