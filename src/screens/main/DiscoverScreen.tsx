// Discover Screen - Find and match with other climbers
import React, { useEffect, useCallback, useState } from 'react';
import { StyleSheet, View, FlatList, Image } from 'react-native';
import { Text, useTheme, Chip, Searchbar, IconButton, Modal, Portal } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, Avatar, Button, LoadingSpinner, EmptyState, ChipSelector } from '../../components/common';
import { useAuthStore, useMatchStore } from '../../store';
import { ClimberProfile, ClimberSearchFilters } from '../../types';
import { CLIMBING_TYPES, EXPERIENCE_LEVELS } from '../../constants';

interface DiscoverScreenProps {
  navigation: any;
}

export const DiscoverScreen: React.FC<DiscoverScreenProps> = ({ navigation }) => {
  const theme = useTheme();
  const { user, profile: myProfile } = useAuthStore();
  const {
    discoveredClimbers,
    isLoading,
    isLoadingMore,
    hasMore,
    filters,
    fetchClimbers,
    loadMoreClimbers,
    setFilters,
    sendRequest,
    getCompatibilityScore,
  } = useMatchStore();

  const [showFilters, setShowFilters] = useState(false);
  const [tempFilters, setTempFilters] = useState<ClimberSearchFilters>(filters);
  const [sendingRequestTo, setSendingRequestTo] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchClimbers(user.uid, true);
    }
  }, [user]);

  const handleRefresh = useCallback(() => {
    if (user) {
      fetchClimbers(user.uid, true);
    }
  }, [user, fetchClimbers]);

  const handleLoadMore = useCallback(() => {
    if (user && hasMore && !isLoadingMore) {
      loadMoreClimbers(user.uid);
    }
  }, [user, hasMore, isLoadingMore, loadMoreClimbers]);

  const handleApplyFilters = () => {
    setFilters(tempFilters);
    setShowFilters(false);
    if (user) {
      fetchClimbers(user.uid, true);
    }
  };

  const handleClearFilters = () => {
    setTempFilters({});
    setFilters({});
    setShowFilters(false);
    if (user) {
      fetchClimbers(user.uid, true);
    }
  };

  const handleSendRequest = async (targetUserId: string) => {
    if (!user) return;
    setSendingRequestTo(targetUserId);
    await sendRequest(user.uid, targetUserId);
    setSendingRequestTo(null);
  };

  const handleViewProfile = (climber: ClimberProfile) => {
    navigation.navigate('ClimberProfile', { climberId: climber.uid });
  };

  const renderClimberCard = ({ item }: { item: ClimberProfile }) => {
    const compatibilityScore = myProfile ? getCompatibilityScore(myProfile, item) : 0;

    return (
      <Card style={styles.climberCard}>
        <View style={styles.cardHeader}>
          <Avatar
            source={item.photoURL}
            name={item.displayName}
            size={64}
          />
          <View style={styles.headerInfo}>
            <Text variant="titleLarge" style={{ color: theme.colors.onBackground }}>
              {item.displayName}
            </Text>
            <View style={styles.locationRow}>
              {item.location && (
                <>
                  <MaterialCommunityIcons name="map-marker" size={14} color={theme.colors.onSurfaceVariant} />
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
                    {item.location.city}, {item.location.state}
                  </Text>
                </>
              )}
              {item.distance !== undefined && (
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 8 }}>
                  • {item.distance} km away
                </Text>
              )}
            </View>
          </View>
          {compatibilityScore > 0 && (
            <View style={[styles.compatBadge, { backgroundColor: theme.colors.primaryContainer }]}>
              <Text variant="labelSmall" style={{ color: theme.colors.onPrimaryContainer }}>
                {compatibilityScore}% match
              </Text>
            </View>
          )}
        </View>

        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurfaceVariant, marginVertical: 12 }}
          numberOfLines={2}
        >
          {item.bio || 'No bio yet'}
        </Text>

        <View style={styles.tagsContainer}>
          <Chip compact style={styles.tag}>
            {item.experienceLevel}
          </Chip>
          {item.yearsClimbing > 0 && (
            <Chip compact style={styles.tag}>
              {item.yearsClimbing} yrs
            </Chip>
          )}
          {item.highestGradeYDS && (
            <Chip compact style={styles.tag}>
              {item.highestGradeYDS}
            </Chip>
          )}
          {item.highestGradeBouldering && (
            <Chip compact style={styles.tag}>
              {item.highestGradeBouldering}
            </Chip>
          )}
        </View>

        <View style={styles.climbingTypes}>
          {item.climbingTypes.slice(0, 3).map((type) => (
            <View key={type} style={[styles.typeBadge, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {type}
              </Text>
            </View>
          ))}
          {item.climbingTypes.length > 3 && (
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              +{item.climbingTypes.length - 3} more
            </Text>
          )}
        </View>

        <View style={styles.cardActions}>
          <Button
            title="View Profile"
            onPress={() => handleViewProfile(item)}
            variant="outline"
            size="small"
            style={styles.actionButton}
          />
          <Button
            title="Connect"
            onPress={() => handleSendRequest(item.uid)}
            loading={sendingRequestTo === item.uid}
            size="small"
            style={styles.actionButton}
          />
        </View>
      </Card>
    );
  };

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return <LoadingSpinner size="small" style={styles.footer} />;
  };

  const activeFiltersCount =
    (tempFilters.experienceLevels?.length || 0) +
    (tempFilters.climbingTypes?.length || 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={{ color: theme.colors.onBackground }}>
          Discover Climbers
        </Text>
        <IconButton
          icon="filter-variant"
          mode={activeFiltersCount > 0 ? 'contained' : 'outlined'}
          onPress={() => setShowFilters(true)}
        />
      </View>

      {activeFiltersCount > 0 && (
        <View style={styles.activeFilters}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''} active
          </Text>
          <Button
            title="Clear"
            onPress={handleClearFilters}
            variant="text"
            size="small"
          />
        </View>
      )}

      {isLoading && discoveredClimbers.length === 0 ? (
        <LoadingSpinner fullScreen message="Finding climbers near you..." />
      ) : discoveredClimbers.length === 0 ? (
        <EmptyState
          icon="account-search"
          title="No Climbers Found"
          message="Try adjusting your filters or check back later for new climbers in your area."
        />
      ) : (
        <FlatList
          data={discoveredClimbers}
          renderItem={renderClimberCard}
          keyExtractor={(item) => item.uid}
          contentContainerStyle={styles.list}
          refreshing={isLoading}
          onRefresh={handleRefresh}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Filters Modal */}
      <Portal>
        <Modal
          visible={showFilters}
          onDismiss={() => setShowFilters(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          <Text variant="titleLarge" style={[styles.modalTitle, { color: theme.colors.onBackground }]}>
            Filter Climbers
          </Text>

          <ChipSelector
            label="Experience Level"
            options={EXPERIENCE_LEVELS}
            selectedValues={tempFilters.experienceLevels || []}
            onSelect={(values) => setTempFilters({ ...tempFilters, experienceLevels: values as any })}
          />

          <ChipSelector
            label="Climbing Types"
            options={CLIMBING_TYPES}
            selectedValues={tempFilters.climbingTypes || []}
            onSelect={(values) => setTempFilters({ ...tempFilters, climbingTypes: values as any })}
          />

          <View style={styles.modalActions}>
            <Button
              title="Clear All"
              onPress={handleClearFilters}
              variant="outline"
              style={styles.modalButton}
            />
            <Button
              title="Apply Filters"
              onPress={handleApplyFilters}
              style={styles.modalButton}
            />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  activeFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  list: {
    padding: 16,
    paddingTop: 8,
  },
  climberCard: {
    marginBottom: 16,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  compatBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  tag: {
    height: 28,
  },
  climbingTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
  footer: {
    paddingVertical: 20,
  },
  modal: {
    margin: 20,
    padding: 20,
    borderRadius: 12,
    maxHeight: '80%',
  },
  modalTitle: {
    marginBottom: 20,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    minWidth: 120,
  },
});

export default DiscoverScreen;
