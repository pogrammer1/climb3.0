// Achievement Badge Component - Displays achievement icons and badges
import React from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { Text, useTheme, Tooltip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AchievementProgress, AchievementDefinition } from '../../types';

interface AchievementBadgeProps {
  achievement: AchievementProgress | AchievementDefinition;
  size?: 'small' | 'medium' | 'large';
  showProgress?: boolean;
  showName?: boolean;
  onPress?: () => void;
  isUnlocked?: boolean;
}

export const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  achievement,
  size = 'medium',
  showProgress = false,
  showName = false,
  onPress,
  isUnlocked: isUnlockedProp,
}) => {
  const theme = useTheme();
  
  // Handle both AchievementProgress and AchievementDefinition
  const definition = 'definition' in achievement ? achievement.definition : achievement;
  const isUnlocked = isUnlockedProp ?? ('isUnlocked' in achievement ? achievement.isUnlocked : false);
  const progress = 'percentComplete' in achievement ? achievement.percentComplete : 0;
  
  const dimensions = {
    small: { badge: 36, icon: 18, fontSize: 10 },
    medium: { badge: 48, icon: 24, fontSize: 12 },
    large: { badge: 64, icon: 32, fontSize: 14 },
  };
  
  const { badge: badgeSize, icon: iconSize, fontSize } = dimensions[size];
  
  const tierColors = {
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFD700',
    platinum: '#E5E4E2',
  };
  
  const badgeColor = isUnlocked ? tierColors[definition.tier] : theme.colors.surfaceDisabled;
  const iconColor = isUnlocked ? '#FFFFFF' : theme.colors.onSurfaceDisabled;
  
  const renderBadge = () => (
    <View
      style={[
        styles.badge,
        {
          width: badgeSize,
          height: badgeSize,
          borderRadius: badgeSize / 2,
          backgroundColor: badgeColor,
          opacity: isUnlocked ? 1 : 0.5,
        },
      ]}
    >
      <MaterialCommunityIcons
        name={definition.icon as any}
        size={iconSize}
        color={iconColor}
      />
      {!isUnlocked && showProgress && (
        <View
          style={[
            styles.progressOverlay,
            {
              width: badgeSize,
              height: badgeSize * (1 - progress / 100),
              borderRadius: badgeSize / 2,
            },
          ]}
        />
      )}
    </View>
  );
  
  const content = (
    <View style={styles.container}>
      {onPress ? (
        <Pressable onPress={onPress}>
          {renderBadge()}
        </Pressable>
      ) : (
        renderBadge()
      )}
      {showName && (
        <Text
          variant="labelSmall"
          style={[
            styles.name,
            { 
              color: isUnlocked ? theme.colors.onSurface : theme.colors.onSurfaceDisabled,
              fontSize,
            },
          ]}
          numberOfLines={2}
        >
          {definition.name}
        </Text>
      )}
    </View>
  );
  
  return content;
};

interface AchievementBadgeListProps {
  achievements: AchievementProgress[];
  maxDisplay?: number;
  size?: 'small' | 'medium' | 'large';
  onSeeAll?: () => void;
}

export const AchievementBadgeList: React.FC<AchievementBadgeListProps> = ({
  achievements,
  maxDisplay = 5,
  size = 'medium',
  onSeeAll,
}) => {
  const theme = useTheme();
  const unlockedAchievements = achievements.filter(a => a.isUnlocked);
  const displayAchievements = unlockedAchievements.slice(0, maxDisplay);
  const remainingCount = unlockedAchievements.length - maxDisplay;
  
  const badgeSize = size === 'small' ? 36 : size === 'medium' ? 48 : 64;
  
  if (unlockedAchievements.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          No achievements yet
        </Text>
      </View>
    );
  }
  
  return (
    <View style={styles.listContainer}>
      {displayAchievements.map((achievement) => (
        <View key={achievement.achievementId} style={styles.badgeItem}>
          <AchievementBadge
            achievement={achievement}
            size={size}
            isUnlocked={true}
          />
        </View>
      ))}
      {remainingCount > 0 && (
        <Pressable onPress={onSeeAll}>
          <View
            style={[
              styles.moreButton,
              {
                width: badgeSize,
                height: badgeSize,
                borderRadius: badgeSize / 2,
                backgroundColor: theme.colors.primaryContainer,
              },
            ]}
          >
            <Text
              variant="labelSmall"
              style={{ color: theme.colors.onPrimaryContainer, fontWeight: 'bold' }}
            >
              +{remainingCount}
            </Text>
          </View>
        </Pressable>
      )}
    </View>
  );
};

interface AchievementCardProps {
  achievement: AchievementProgress;
  onPress?: () => void;
}

export const AchievementCard: React.FC<AchievementCardProps> = ({
  achievement,
  onPress,
}) => {
  const theme = useTheme();
  const { definition, isUnlocked, percentComplete, currentProgress } = achievement;
  
  const tierColors = {
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFD700',
    platinum: '#E5E4E2',
  };
  
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.surface,
          borderColor: isUnlocked ? tierColors[definition.tier] : theme.colors.outline,
          opacity: isUnlocked ? 1 : 0.8,
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
          style={{ color: theme.colors.onSurface }}
        >
          {definition.name}
        </Text>
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          {definition.description}
        </Text>
        {!isUnlocked && (
          <View style={styles.progressContainer}>
            <View
              style={[
                styles.progressBar,
                { backgroundColor: theme.colors.surfaceVariant },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: tierColors[definition.tier],
                    width: `${percentComplete}%`,
                  },
                ]}
              />
            </View>
            <Text
              variant="labelSmall"
              style={{ color: theme.colors.onSurfaceVariant, marginLeft: 8 }}
            >
              {Math.round(currentProgress)}/{definition.requirement.target}
            </Text>
          </View>
        )}
        {isUnlocked && achievement.unlockedAt && (
          <Text
            variant="labelSmall"
            style={{ color: tierColors[definition.tier], marginTop: 4 }}
          >
            ✓ Unlocked {achievement.unlockedAt.toLocaleDateString()}
          </Text>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  progressOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
  },
  name: {
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 80,
  },
  listContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  badgeItem: {
    marginRight: 4,
  },
  moreButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 8,
  },
  card: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  progressContainer: {
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
});

export default AchievementBadge;
