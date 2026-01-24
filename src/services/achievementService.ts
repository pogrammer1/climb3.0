// Achievement Service - Handles achievement tracking and awarding
import {
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { COLLECTIONS } from '../constants';
import {
  AchievementDefinition,
  UserAchievement,
  AchievementProgress,
  UserAchievementStats,
  ApiResponse,
} from '../types';

// Achievement definitions - Easy to add new achievements here
export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // Climbing Hours Achievements (5, 10, 50, 100)
  {
    id: 'climbing_hours_5',
    category: 'climbing_hours',
    name: 'Getting Started',
    description: 'Log 5 hours of climbing',
    icon: 'clock-outline',
    color: '#CD7F32', // bronze
    tier: 'bronze',
    requirement: { type: 'count', target: 5, unit: 'hours' },
    order: 1,
  },
  {
    id: 'climbing_hours_10',
    category: 'climbing_hours',
    name: 'Dedicated Climber',
    description: 'Log 10 hours of climbing',
    icon: 'clock',
    color: '#C0C0C0', // silver
    tier: 'silver',
    requirement: { type: 'count', target: 10, unit: 'hours' },
    order: 2,
  },
  {
    id: 'climbing_hours_50',
    category: 'climbing_hours',
    name: 'Half Century',
    description: 'Log 50 hours of climbing',
    icon: 'clock-check',
    color: '#FFD700', // gold
    tier: 'gold',
    requirement: { type: 'count', target: 50, unit: 'hours' },
    order: 3,
  },
  {
    id: 'climbing_hours_100',
    category: 'climbing_hours',
    name: 'Century Club',
    description: 'Log 100 hours of climbing',
    icon: 'clock-star-four-points',
    color: '#E5E4E2', // platinum
    tier: 'platinum',
    requirement: { type: 'count', target: 100, unit: 'hours' },
    order: 4,
  },

  // Sessions Logged Achievements (1, 5, 10, 25)
  {
    id: 'sessions_1',
    category: 'sessions_logged',
    name: 'First Session',
    description: 'Log your first climbing session',
    icon: 'notebook-outline',
    color: '#CD7F32',
    tier: 'bronze',
    requirement: { type: 'count', target: 1, unit: 'sessions' },
    order: 1,
  },
  {
    id: 'sessions_5',
    category: 'sessions_logged',
    name: 'Getting Regular',
    description: 'Log 5 climbing sessions',
    icon: 'notebook',
    color: '#C0C0C0',
    tier: 'silver',
    requirement: { type: 'count', target: 5, unit: 'sessions' },
    order: 2,
  },
  {
    id: 'sessions_10',
    category: 'sessions_logged',
    name: 'Session Pro',
    description: 'Log 10 climbing sessions',
    icon: 'notebook-check',
    color: '#FFD700',
    tier: 'gold',
    requirement: { type: 'count', target: 10, unit: 'sessions' },
    order: 3,
  },
  {
    id: 'sessions_25',
    category: 'sessions_logged',
    name: 'Dedicated Logger',
    description: 'Log 25 climbing sessions',
    icon: 'notebook-multiple',
    color: '#E5E4E2',
    tier: 'platinum',
    requirement: { type: 'count', target: 25, unit: 'sessions' },
    order: 4,
  },

  // Connections Made Achievements (1, 3, 5, 10)
  {
    id: 'connections_1',
    category: 'connections_made',
    name: 'First Connection',
    description: 'Connect with your first climbing partner',
    icon: 'account-plus-outline',
    color: '#CD7F32',
    tier: 'bronze',
    requirement: { type: 'count', target: 1, unit: 'connections' },
    order: 1,
  },
  {
    id: 'connections_3',
    category: 'connections_made',
    name: 'Growing Network',
    description: 'Connect with 3 climbing partners',
    icon: 'account-group-outline',
    color: '#C0C0C0',
    tier: 'silver',
    requirement: { type: 'count', target: 3, unit: 'connections' },
    order: 2,
  },
  {
    id: 'connections_5',
    category: 'connections_made',
    name: 'Community Builder',
    description: 'Connect with 5 climbing partners',
    icon: 'account-group',
    color: '#FFD700',
    tier: 'gold',
    requirement: { type: 'count', target: 5, unit: 'connections' },
    order: 3,
  },
  {
    id: 'connections_10',
    category: 'connections_made',
    name: 'Social Climber',
    description: 'Connect with 10 climbing partners',
    icon: 'account-supervisor-circle',
    color: '#E5E4E2',
    tier: 'platinum',
    requirement: { type: 'count', target: 10, unit: 'connections' },
    order: 4,
  },

  // App Usage/Login Achievements (1, 3, 7, 30)
  {
    id: 'app_days_1',
    category: 'app_usage',
    name: 'Welcome!',
    description: 'Start using the app',
    icon: 'calendar-check-outline',
    color: '#CD7F32',
    tier: 'bronze',
    requirement: { type: 'count', target: 1, unit: 'days' },
    order: 1,
  },
  {
    id: 'app_days_3',
    category: 'app_usage',
    name: 'Getting Started',
    description: 'Use the app for 3 days',
    icon: 'calendar-today',
    color: '#C0C0C0',
    tier: 'silver',
    requirement: { type: 'count', target: 3, unit: 'days' },
    order: 2,
  },
  {
    id: 'app_days_7',
    category: 'app_usage',
    name: 'Week Warrior',
    description: 'Use the app for 7 days',
    icon: 'calendar-star',
    color: '#FFD700',
    tier: 'gold',
    requirement: { type: 'count', target: 7, unit: 'days' },
    order: 3,
  },
  {
    id: 'app_days_30',
    category: 'app_usage',
    name: 'Monthly Regular',
    description: 'Use the app for 30 days',
    icon: 'calendar-month-outline',
    color: '#E5E4E2',
    tier: 'platinum',
    requirement: { type: 'count', target: 30, unit: 'days' },
    order: 4,
  },

  // Messages Sent Achievements
  {
    id: 'messages_10',
    category: 'messages_sent',
    name: 'Starting Conversations',
    description: 'Send 10 messages',
    icon: 'message-outline',
    color: '#CD7F32',
    tier: 'bronze',
    requirement: { type: 'count', target: 10, unit: 'messages' },
    order: 1,
  },
  {
    id: 'messages_50',
    category: 'messages_sent',
    name: 'Active Communicator',
    description: 'Send 50 messages',
    icon: 'message-text',
    color: '#C0C0C0',
    tier: 'silver',
    requirement: { type: 'count', target: 50, unit: 'messages' },
    order: 2,
  },
  {
    id: 'messages_100',
    category: 'messages_sent',
    name: 'Social Butterfly',
    description: 'Send 100 messages',
    icon: 'message-star',
    color: '#FFD700',
    tier: 'gold',
    requirement: { type: 'count', target: 100, unit: 'messages' },
    order: 3,
  },
];

/**
 * Get achievement definition by ID
 */
export const getAchievementDefinition = (achievementId: string): AchievementDefinition | undefined => {
  return ACHIEVEMENT_DEFINITIONS.find(a => a.id === achievementId);
};

/**
 * Get all achievement definitions grouped by category
 */
export const getAchievementsByCategory = (): Record<string, AchievementDefinition[]> => {
  const grouped: Record<string, AchievementDefinition[]> = {};
  
  ACHIEVEMENT_DEFINITIONS.forEach(achievement => {
    if (!grouped[achievement.category]) {
      grouped[achievement.category] = [];
    }
    grouped[achievement.category].push(achievement);
  });
  
  // Sort by order within each category
  Object.keys(grouped).forEach(category => {
    grouped[category].sort((a, b) => a.order - b.order);
  });
  
  return grouped;
};

/**
 * Get user's unlocked achievements from Firestore
 */
export const getUserAchievements = async (userId: string): Promise<ApiResponse<UserAchievement[]>> => {
  try {
    const achievementsRef = collection(db, COLLECTIONS.PROFILES, userId, 'achievements');
    const querySnapshot = await getDocs(achievementsRef);
    
    const achievements: UserAchievement[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      achievements.push({
        id: docSnap.id,
        odUserId: userId,
        achievementId: data.achievementId,
        unlockedAt: data.unlockedAt?.toDate() || new Date(),
        progress: data.progress || 0,
        notified: data.notified || false,
      });
    });
    
    return { success: true, data: achievements };
  } catch (error: any) {
    console.error('Get user achievements error:', error);
    return { success: false, error: 'Failed to fetch achievements' };
  }
};

/**
 * Get user's achievement stats from their profile and sessions
 */
export const getUserAchievementStats = async (userId: string): Promise<ApiResponse<UserAchievementStats>> => {
  try {
    // Get profile for basic stats
    const profileRef = doc(db, COLLECTIONS.PROFILES, userId);
    const profileSnap = await getDoc(profileRef);
    const profileData = profileSnap.data();

    // If server-side aggregated public stats exist on the profile, use them (preferred)
    const publicStats = profileData?.publicStats;
    if (publicStats) {
      const totalHoursClimbed = publicStats.totalHoursClimbed || 0;
      const totalSessions = publicStats.totalSessions || 0;
      const totalConnections = publicStats.totalConnections || 0;
      const totalMessagesSent = publicStats.totalMessagesSent || 0;
      const highestVGrade = publicStats.highestVGrade || 0;
      const highestYDSGrade = publicStats.highestYDSGrade || '';
      const yearsClimbing = publicStats.yearsClimbing || 0;

      const createdAt = profileData?.createdAt?.toDate ? profileData.createdAt.toDate() : profileData?.createdAt || new Date();
      const daysActive = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

      return {
        success: true,
        data: {
          totalHoursClimbed: Math.round(totalHoursClimbed * 10) / 10,
          totalSessions,
          totalConnections,
          totalMessagesSent,
          daysActive: Math.max(1, daysActive),
          highestVGrade,
          highestYDSGrade,
          yearsClimbing,
        },
      };
    }

    // Get sessions for climbing stats (fallback when no aggregated stats exist)
    const sessionsQuery = query(
      collection(db, COLLECTIONS.SESSIONS),
      where('userId', '==', userId)
    );
    const sessionsSnap = await getDocs(sessionsQuery);

    let totalHoursClimbed = 0;
    let totalSessions = sessionsSnap.size;

    sessionsSnap.forEach((docSnap) => {
      const session = docSnap.data();
      totalHoursClimbed += (session.duration || 0) / 60; // Convert minutes to hours
    });

    // Get connections count
    const matchesQuery = query(
      collection(db, COLLECTIONS.MATCHES),
      where('userId', '==', userId),
      where('status', '==', 'accepted')
    );
    const matchesSnap = await getDocs(matchesQuery);

    const matchesQuery2 = query(
      collection(db, COLLECTIONS.MATCHES),
      where('matchedUserId', '==', userId),
      where('status', '==', 'accepted')
    );
    const matchesSnap2 = await getDocs(matchesQuery2);

    const totalConnections = matchesSnap.size + matchesSnap2.size;

    // Get messages sent count
    const statsRef = doc(db, COLLECTIONS.PROFILES, userId, 'stats', 'messaging');
    const statsSnap = await getDoc(statsRef);
    const statsData = statsSnap.data();
    
    // Parse V grade to number
    const vGradeStr = profileData?.highestGradeBouldering || 'VB';
    let highestVGrade = 0;
    if (vGradeStr.startsWith('V') && vGradeStr !== 'VB') {
      highestVGrade = parseInt(vGradeStr.substring(1)) || 0;
    }
    
    // Calculate days active
    const createdAt = profileData?.createdAt?.toDate() || new Date();
    const daysActive = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      success: true,
      data: {
        totalHoursClimbed: Math.round(totalHoursClimbed * 10) / 10,
        totalSessions,
        totalConnections,
        totalMessagesSent: statsData?.messagesSent || 0,
        daysActive: Math.max(1, daysActive),
        highestVGrade,
        highestYDSGrade: profileData?.highestGradeYDS || '',
        yearsClimbing: profileData?.yearsClimbing || 0,
      },
    };
  } catch (error: any) {
    console.error('Get user achievement stats error:', error);
    return { 
      success: false, 
      error: 'Failed to fetch achievement stats',
    };
  }
};

/**
 * Check and award new achievements based on user stats
 */
export const checkAndAwardAchievements = async (
  userId: string,
  stats: UserAchievementStats
): Promise<ApiResponse<AchievementProgress[]>> => {
  try {
    // Get existing achievements
    const existingResult = await getUserAchievements(userId);
    const existingIds = new Set(
      existingResult.data?.map(a => a.achievementId) || []
    );
    
    const progressList: AchievementProgress[] = [];
    const newAchievements: string[] = [];
    
    for (const definition of ACHIEVEMENT_DEFINITIONS) {
      let currentProgress = 0;
      
      // Calculate progress based on category
      switch (definition.category) {
        case 'climbing_hours':
          currentProgress = stats.totalHoursClimbed;
          break;
        case 'sessions_logged':
          currentProgress = stats.totalSessions;
          break;
        case 'connections_made':
          currentProgress = stats.totalConnections;
          break;
        case 'messages_sent':
          currentProgress = stats.totalMessagesSent;
          break;
        case 'app_usage':
          currentProgress = stats.daysActive;
          break;
        case 'grades_climbed':
          currentProgress = stats.highestVGrade;
          break;
        case 'years_experience':
          currentProgress = stats.yearsClimbing;
          break;
      }
      
      const isUnlocked = currentProgress >= definition.requirement.target;
      const wasAlreadyUnlocked = existingIds.has(definition.id);
      
      // Award new achievement if just unlocked
      if (isUnlocked && !wasAlreadyUnlocked) {
        await awardAchievement(userId, definition.id, currentProgress);
        newAchievements.push(definition.id);
      }
      
      progressList.push({
        achievementId: definition.id,
        definition,
        currentProgress,
        isUnlocked: isUnlocked || wasAlreadyUnlocked,
        unlockedAt: wasAlreadyUnlocked 
          ? existingResult.data?.find(a => a.achievementId === definition.id)?.unlockedAt
          : isUnlocked ? new Date() : undefined,
        percentComplete: Math.min(100, (currentProgress / definition.requirement.target) * 100),
      });
    }
    
    return { success: true, data: progressList };
  } catch (error: any) {
    console.error('Check and award achievements error:', error);
    return { success: false, error: 'Failed to check achievements' };
  }
};

/**
 * Award a specific achievement to user
 */
export const awardAchievement = async (
  userId: string,
  achievementId: string,
  progress: number
): Promise<ApiResponse<UserAchievement>> => {
  try {
    const achievementRef = doc(
      db, 
      COLLECTIONS.PROFILES, 
      userId, 
      'achievements', 
      achievementId
    );
    
    const achievementData = {
      achievementId,
      progress,
      unlockedAt: serverTimestamp(),
      notified: false,
    };
    
    await setDoc(achievementRef, achievementData);
    
    return {
      success: true,
      data: {
        id: achievementId,
        odUserId: userId,
        achievementId,
        progress,
        unlockedAt: new Date(),
        notified: false,
      },
    };
  } catch (error: any) {
    console.error('Award achievement error:', error);
    return { success: false, error: 'Failed to award achievement' };
  }
};

/**
 * Mark achievement as notified
 */
export const markAchievementNotified = async (
  userId: string,
  achievementId: string
): Promise<ApiResponse<null>> => {
  try {
    const achievementRef = doc(
      db, 
      COLLECTIONS.PROFILES, 
      userId, 
      'achievements', 
      achievementId
    );
    
    await updateDoc(achievementRef, { notified: true });
    
    return { success: true };
  } catch (error: any) {
    console.error('Mark achievement notified error:', error);
    return { success: false, error: 'Failed to update achievement' };
  }
};

/**
 * Increment message sent count for user stats
 */
export const incrementMessageCount = async (userId: string): Promise<void> => {
  try {
    const statsRef = doc(db, COLLECTIONS.PROFILES, userId, 'stats', 'messaging');
    const statsSnap = await getDoc(statsRef);
    
    if (statsSnap.exists()) {
      const currentCount = statsSnap.data().messagesSent || 0;
      await updateDoc(statsRef, { messagesSent: currentCount + 1 });
    } else {
      await setDoc(statsRef, { messagesSent: 1 });
    }
  } catch (error) {
    console.error('Increment message count error:', error);
  }
};
