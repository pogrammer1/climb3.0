// TypeScript type definitions for the app

import { CLIMBING_GRADES_YDS, BOULDERING_GRADES, CLIMBING_TYPES, ATTEMPT_RESULTS, EXPERIENCE_LEVELS, MATCH_STATUS } from '../constants';

// User types
export interface User {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  createdAt: Date;
  lastLoginAt: Date;
}

// Profile types
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  bio: string;
  location: Location | null;
  experienceLevel: ExperienceLevel;
  climbingTypes: ClimbingType[];
  highestGradeYDS: YDSGrade | null;
  highestGradeBouldering: BoulderingGrade | null;
  preferredClimbingStyle: string;
  partnerPreferences: string[];
  availableDays: string[];
  availableTimes: string[];
  homeGym: string | null;
  city: string | null;
  favoriteOutdoorAreas: string[];
  yearsClimbing: number;
  certifications: string[];
  isProfileComplete: boolean;
  isSearchable: boolean;
  // Email notification preferences
  emailNotifications: boolean;
  emailNotificationTypes: EmailNotificationType[];
  createdAt: Date;
  updatedAt: Date;
}

// Email notification types
export type EmailNotificationType = 'messages' | 'connections' | 'reminders';

export interface EmailNotificationPreferences {
  enabled: boolean;
  types: EmailNotificationType[];
}

export interface Location {
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  country: string;
}

// Climbing session types
export interface ClimbingSession {
  id: string;
  userId: string;
  date: Date;
  location: string;
  locationType: 'indoor' | 'outdoor';
  duration: number; // in minutes
  notes: string;
  photos: string[];
  climbs: Climb[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Climb {
  id: string;
  sessionId: string;
  name: string;
  grade: YDSGrade | BoulderingGrade;
  gradeSystem: 'yds' | 'v-scale';
  climbingType: ClimbingType;
  result: AttemptResult;
  attempts: number;
  notes: string;
  rating: number; // 1-5 stars
  photos: string[];
}

// Match types
export interface ClimberMatch {
  id: string;
  userId: string;
  matchedUserId: string;
  status: MatchStatus;
  initiatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClimberProfile extends UserProfile {
  distance?: number; // calculated field
  matchScore?: number; // calculated compatibility score
}

// Messaging types
export interface Conversation {
  id: string;
  participantIds: string[];
  participants: ConversationParticipant[];
  participantsMap?: ConversationParticipantMap;
  lastMessage: Message | null;
  lastMessageAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationParticipant {
  displayName: string;
  photoURL: string | null;
  unreadCount: number;
}

export type ConversationParticipantMap = Record<string, ConversationParticipant>;

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  imageUrl: string | null;
  readBy: string[];
  status?: MessageStatus;
  createdAt: Date;
}

// Notification types
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read: boolean;
  createdAt: Date;
}

export type NotificationType = 
  | 'match_request'
  | 'match_accepted'
  | 'new_message'
  | 'session_reminder'
  | 'profile_view';

// Type aliases from constants
export type YDSGrade = typeof CLIMBING_GRADES_YDS[number];
export type BoulderingGrade = typeof BOULDERING_GRADES[number];
export type ClimbingType = typeof CLIMBING_TYPES[number];
export type AttemptResult = typeof ATTEMPT_RESULTS[number];
export type ExperienceLevel = typeof EXPERIENCE_LEVELS[number];
export type MatchStatus = typeof MATCH_STATUS[keyof typeof MATCH_STATUS];

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Pagination types
export interface PaginatedResponse<T> {
  items: T[];
  hasMore: boolean;
  lastDoc: unknown; // Firestore document snapshot
  total?: number;
}

// Filter types
export interface ClimberSearchFilters {
  location?: Location;
  maxDistance?: number; // in km
  experienceLevels?: ExperienceLevel[];
  climbingTypes?: ClimbingType[];
  availableDays?: string[];
  minGrade?: string;
  maxGrade?: string;
  homeGym?: string; // Filter by home gym name
  city?: string; // Filter by city name
}

export interface SessionFilters {
  startDate?: Date;
  endDate?: Date;
  locationType?: 'indoor' | 'outdoor' | 'all';
  climbingTypes?: ClimbingType[];
}

// Form types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface SignupFormData {
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
}

export interface ProfileFormData {
  displayName: string;
  bio: string;
  experienceLevel: ExperienceLevel;
  climbingTypes: ClimbingType[];
  highestGradeYDS: YDSGrade | null;
  highestGradeBouldering: BoulderingGrade | null;
  homeGym: string;
  city: string;
  yearsClimbing: string;
  partnerPreferences: string[];
  availableDays: string[];
  availableTimes: string[];
  emailNotifications: boolean;
  emailNotificationTypes: EmailNotificationType[];
}

export interface SessionFormData {
  date: Date;
  location: string;
  locationType: 'indoor' | 'outdoor';
  duration: string;
  notes: string;
}

export interface ClimbFormData {
  name: string;
  grade: string;
  gradeSystem: 'yds' | 'v-scale';
  climbingType: ClimbingType;
  result: AttemptResult;
  attempts: string;
  notes: string;
  rating: number;
}

// Schedule/Availability types
export interface TimeSlot {
  startTime: string; // Format: "HH:MM" (24-hour)
  endTime: string;   // Format: "HH:MM" (24-hour)
}

export interface DayAvailability {
  day: DayOfWeek;
  slots: TimeSlot[];
  isAvailable: boolean;
}

export interface WeeklySchedule {
  id: string;
  userId: string;
  schedule: DayAvailability[];
  preferredGyms: string[];
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduleOverlap {
  day: DayOfWeek;
  overlappingSlots: TimeSlot[];
}

export interface ConnectionScheduleMatch {
  connectionId: string;
  connectionProfile: UserProfile;
  overlaps: ScheduleOverlap[];
  totalOverlapMinutes: number;
}

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

// Achievement System Types
export type AchievementCategory = 
  | 'climbing_hours'
  | 'sessions_logged'
  | 'connections_made'
  | 'messages_sent'
  | 'app_usage'
  | 'grades_climbed'
  | 'years_experience';

export interface AchievementDefinition {
  id: string;
  category: AchievementCategory;
  name: string;
  description: string;
  icon: string; // MaterialCommunityIcons name
  color: string; // hex color
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  requirement: {
    type: 'count' | 'value' | 'milestone';
    target: number;
    unit?: string; // e.g., 'hours', 'sessions', 'V-grade'
  };
  order: number; // display order within category
}

export interface UserAchievement {
  id: string;
  odUserId: string;
  achievementId: string;
  unlockedAt: Date;
  progress: number; // current progress towards the achievement
  notified: boolean; // whether user has been notified of unlock
}

export interface AchievementProgress {
  achievementId: string;
  definition: AchievementDefinition;
  currentProgress: number;
  isUnlocked: boolean;
  unlockedAt?: Date;
  percentComplete: number;
}

export interface UserAchievementStats {
  totalHoursClimbed: number;
  totalSessions: number;
  totalConnections: number;
  totalMessagesSent: number;
  daysActive: number;
  highestVGrade: number; // numeric value of V grade (e.g., V5 = 5)
  highestYDSGrade: string;
  yearsClimbing: number;
}
