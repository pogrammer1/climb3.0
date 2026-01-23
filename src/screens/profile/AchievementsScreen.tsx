// Achievements Screen - Display all achievements with categories
import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, Pressable } from 'react-native';
import { Text, useTheme, Chip, Portal, Modal, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, LoadingSpinner, AchievementBadge } from '../../components/common';
import { useAuthStore, useAchievementStore } from '../../store';
import { AchievementProgress, AchievementCategory } from '../../types';
import { ACHIEVEMENT_DEFINITIONS } from '../../services/achievementService';

interface AchievementsScreenProps {
  navigation: any;
  route?: {
    params?: {
      userId?: string;
    };
  };
}

type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum';

const TIER_ORDER: AchievementTier[] = ['platinum', 'gold', 'silver', 'bronze'];
const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  climbing_hours: 'Climbing Hours',
  sessions_logged: 'Sessions',
  connections_made: 'Connections',
  messages_sent: 'Messages',
  app_usage: 'App Usage',
  grades_climbed: 'Grades Climbed',
  years_experience: 'Experience',
};

const TIER_COLORS: Record<AchievementTier, string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#E5E4E2',
};

export const AchievementsScreen: React.FC<AchievementsScreenProps> = ({ navigation, route }) => {
  const theme = useTheme();
  const { user } = useAuthStore();
  const { achievements, fetchAchievements, isLoading } = useAchievementStore();
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'all'>('all');
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementProgress | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const userId = route?.params?.userId || user?.uid;

  useEffect(() => {
    if (userId) {
      fetchAchievements(userId);
    }
  }, [userId]);

  // Get all achievements with progress, sorted by category and tier
  const getAllAchievements = (): AchievementProgress[] => {
    const achievementMap = new Map<string, AchievementProgress>();
    
    // Add all existing progress
    achievements.forEach((a) => {
      achievementMap.set(a.achievementId, a);
    });
    
    // Add remaining locked achievements from definitions
    ACHIEVEMENT_DEFINITIONS.forEach((def) => {
      if (!achievementMap.has(def.id)) {
        achievementMap.set(def.id, {
          achievementId: def.id,
          definition: def,
          currentProgress: 0,
          percentComplete: 0,
          isUnlocked: false,
        });
      }
    });
    
    return Array.from(achievementMap.values());
  };

  const allAchievements = getAllAchievements();
  
  // Filter by category
  const filteredAchievements = selectedCategory === 'all'
    ? allAchievements
    : allAchievements.filter((a) => a.definition.category === selectedCategory);

  // Group by category
  const groupedAchievements = filteredAchievements.reduce((acc, achievement) => {
    const category = achievement.definition.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(achievement);
    return acc;
  }, {} as Record<AchievementCategory, AchievementProgress[]>);

  // Sort achievements within each category by tier (platinum first) and unlock status
  Object.keys(groupedAchievements).forEach((category) => {
    groupedAchievements[category as AchievementCategory].sort((a, b) => {
      // Unlocked first
      if (a.isUnlocked !== b.isUnlocked) {
        return a.isUnlocked ? -1 : 1;
      }
      // Then by tier (platinum first)
      const tierA = TIER_ORDER.indexOf(a.definition.tier);
      const tierB = TIER_ORDER.indexOf(b.definition.tier);
      return tierA - tierB;
    });
  });

  // Stats
  const totalUnlocked = allAchievements.filter((a) => a.isUnlocked).length;
  const totalAchievements = allAchievements.length;
  const completionPercentage = Math.round((totalUnlocked / totalAchievements) * 100);

  const handleAchievementPress = (achievement: AchievementProgress) => {
    setSelectedAchievement(achievement);
    setModalVisible(true);
  };

  const renderAchievementCard = (achievement: AchievementProgress) => {
    const { definition, isUnlocked, percentComplete, currentProgress, unlockedAt } = achievement;
    const tierColor = TIER_COLORS[definition.tier];

    return (
      <Pressable
        key={achievement.achievementId}
        onPress={() => handleAchievementPress(achievement)}
        style={({ pressed }) => [
          styles.achievementCard,
          {
            backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.surface,
            borderColor: isUnlocked ? tierColor : theme.colors.outlineVariant,
            opacity: isUnlocked ? 1 : 0.7,
          },
        ]}
      >
        <AchievementBadge
          achievement={achievement}
          size="large"
          isUnlocked={isUnlocked}
        />
        <View style={styles.cardContent}>
          <Text
            variant="titleSmall"
            style={{ color: theme.colors.onSurface, fontWeight: '600' }}
            numberOfLines={1}
          >
            {definition.name}
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
            numberOfLines={2}
          >
            {definition.description}
          </Text>
          
          {!isUnlocked && (
            <View style={styles.progressRow}>
              <View style={[styles.progressBar, { backgroundColor: theme.colors.surfaceVariant }]}>
                <View
                  style={[
                    styles.progressFill,
                    { backgroundColor: tierColor, width: `${percentComplete}%` },
                  ]}
                />
              </View>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 8 }}>
                {Math.round(currentProgress)}/{definition.requirement.target}
              </Text>
            </View>
          )}
          
          {isUnlocked && unlockedAt && (
            <View style={styles.unlockedRow}>
              <MaterialCommunityIcons name="check-circle" size={14} color={tierColor} />
              <Text variant="labelSmall" style={{ color: tierColor, marginLeft: 4 }}>
                {unlockedAt.toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color={theme.colors.onSurfaceVariant}
        />
      </Pressable>
    );
  };

  const renderCategorySection = (category: AchievementCategory, achievements: AchievementProgress[]) => {
    const unlockedInCategory = achievements.filter((a) => a.isUnlocked).length;
    
    return (
      <View key={category} style={styles.categorySection}>
        <View style={styles.categoryHeader}>
          <Text variant="titleMedium" style={{ color: theme.colors.onBackground }}>
            {CATEGORY_LABELS[category]}
          </Text>
          <Text variant="labelMedium" style={{ color: theme.colors.primary }}>
            {unlockedInCategory}/{achievements.length}
          </Text>
        </View>
        {achievements.map(renderAchievementCard)}
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.outline }]}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleLarge" style={{ flex: 1, color: theme.colors.onBackground }}>
          Achievements
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Stats Card */}
        <Card style={styles.statsCard}>
          <View style={styles.statsContent}>
            <View style={styles.statCircle}>
              <Text variant="headlineMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                {completionPercentage}%
              </Text>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Complete
              </Text>
            </View>
            <View style={styles.statsDetails}>
              <View style={styles.statRow}>
                <MaterialCommunityIcons name="trophy" size={20} color={TIER_COLORS.gold} />
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginLeft: 8 }}>
                  {totalUnlocked} of {totalAchievements} achievements unlocked
                </Text>
              </View>
              <View style={styles.tierLegend}>
                {TIER_ORDER.map((tier) => (
                  <View key={tier} style={styles.tierItem}>
                    <View style={[styles.tierDot, { backgroundColor: TIER_COLORS[tier] }]} />
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, textTransform: 'capitalize' }}>
                      {tier}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </Card>

        {/* Category Filter */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          <Chip
            selected={selectedCategory === 'all'}
            onPress={() => setSelectedCategory('all')}
            style={styles.filterChip}
          >
            All
          </Chip>
          {(Object.keys(CATEGORY_LABELS) as AchievementCategory[]).map((category) => (
            <Chip
              key={category}
              selected={selectedCategory === category}
              onPress={() => setSelectedCategory(category)}
              style={styles.filterChip}
            >
              {CATEGORY_LABELS[category]}
            </Chip>
          ))}
        </ScrollView>

        {/* Achievements by Category */}
        {selectedCategory === 'all' ? (
          (Object.keys(groupedAchievements) as AchievementCategory[]).map((category) =>
            renderCategorySection(category, groupedAchievements[category])
          )
        ) : (
          groupedAchievements[selectedCategory] && 
          renderCategorySection(selectedCategory, groupedAchievements[selectedCategory])
        )}
      </ScrollView>

      {/* Achievement Detail Modal */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          {selectedAchievement && (
            <View style={styles.modalContent}>
              <AchievementBadge
                achievement={selectedAchievement}
                size="large"
                isUnlocked={selectedAchievement.isUnlocked}
              />
              
              <Text
                variant="headlineSmall"
                style={[styles.modalTitle, { color: theme.colors.onSurface }]}
              >
                {selectedAchievement.definition.name}
              </Text>
              
              <Text
                variant="bodyMedium"
                style={[styles.modalDescription, { color: theme.colors.onSurfaceVariant }]}
              >
                {selectedAchievement.definition.description}
              </Text>

              <View style={[styles.modalDivider, { backgroundColor: theme.colors.outline }]} />

              <View style={styles.modalStats}>
                <View style={styles.modalStatItem}>
                  <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    Category
                  </Text>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                    {CATEGORY_LABELS[selectedAchievement.definition.category]}
                  </Text>
                </View>
                <View style={styles.modalStatItem}>
                  <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    Tier
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={{ color: TIER_COLORS[selectedAchievement.definition.tier], textTransform: 'capitalize', fontWeight: '600' }}
                  >
                    {selectedAchievement.definition.tier}
                  </Text>
                </View>
              </View>

              {!selectedAchievement.isUnlocked && (
                <View style={styles.modalProgress}>
                  <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
                    Progress
                  </Text>
                  <View style={[styles.modalProgressBar, { backgroundColor: theme.colors.surfaceVariant }]}>
                    <View
                      style={[
                        styles.modalProgressFill,
                        {
                          backgroundColor: TIER_COLORS[selectedAchievement.definition.tier],
                          width: `${selectedAchievement.percentComplete}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginTop: 4 }}>
                    {Math.round(selectedAchievement.currentProgress)} / {selectedAchievement.definition.requirement.target}
                  </Text>
                </View>
              )}

              {selectedAchievement.isUnlocked && selectedAchievement.unlockedAt && (
                <View style={styles.unlockedBanner}>
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={24}
                    color={TIER_COLORS[selectedAchievement.definition.tier]}
                  />
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginLeft: 8 }}>
                    Unlocked on {selectedAchievement.unlockedAt.toLocaleDateString()}
                  </Text>
                </View>
              )}
            </View>
          )}
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
    paddingRight: 16,
    borderBottomWidth: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  statsCard: {
    margin: 16,
  },
  statsContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    marginRight: 16,
  },
  statsDetails: {
    flex: 1,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tierLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tierItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tierDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 4,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterChip: {
    marginRight: 8,
  },
  categorySection: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  unlockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  modal: {
    margin: 20,
    borderRadius: 16,
    padding: 24,
    maxHeight: '80%',
  },
  modalContent: {
    alignItems: 'center',
  },
  modalTitle: {
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  modalDescription: {
    marginTop: 8,
    textAlign: 'center',
  },
  modalDivider: {
    height: 1,
    width: '100%',
    marginVertical: 16,
  },
  modalStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  modalStatItem: {
    alignItems: 'center',
  },
  modalProgress: {
    width: '100%',
    marginTop: 16,
    alignItems: 'center',
  },
  modalProgressBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  modalProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  unlockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
});

export default AchievementsScreen;
