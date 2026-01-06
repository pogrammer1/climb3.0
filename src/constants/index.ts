// App-wide constants
export const APP_NAME = 'ClimbApp';
export const APP_VERSION = '1.0.0';

// Climbing grades (Yosemite Decimal System)
export const CLIMBING_GRADES_YDS = [
  '5.5', '5.6', '5.7', '5.8', '5.9',
  '5.10a', '5.10b', '5.10c', '5.10d',
  '5.11a', '5.11b', '5.11c', '5.11d',
  '5.12a', '5.12b', '5.12c', '5.12d',
  '5.13a', '5.13b', '5.13c', '5.13d',
  '5.14a', '5.14b', '5.14c', '5.14d',
  '5.15a', '5.15b', '5.15c', '5.15d',
] as const;

// Bouldering grades (V-Scale)
export const BOULDERING_GRADES = [
  'VB', 'V0', 'V1', 'V2', 'V3', 'V4', 'V5',
  'V6', 'V7', 'V8', 'V9', 'V10', 'V11', 'V12',
  'V13', 'V14', 'V15', 'V16', 'V17',
] as const;

// Climbing types
export const CLIMBING_TYPES = [
  'Sport',
  'Trad',
  'Bouldering',
  'Top Rope',
  'Lead',
  'Multi-pitch',
  'Alpine',
  'Ice',
  'Mixed',
] as const;

// Session attempt results
export const ATTEMPT_RESULTS = [
  'Send',
  'Flash',
  'Onsight',
  'Redpoint',
  'Project',
  'Fell',
  'Hung',
] as const;

// Experience levels
export const EXPERIENCE_LEVELS = [
  'Beginner',
  'Intermediate',
  'Advanced',
  'Expert',
] as const;

// Climbing preferences
export const CLIMBING_PREFERENCES = [
  'Indoor Only',
  'Outdoor Only',
  'Both Indoor and Outdoor',
] as const;

// Partner preferences
export const PARTNER_PREFERENCES = [
  'Looking for belay partner',
  'Looking for climbing buddy',
  'Looking for mentor',
  'Looking to mentor',
  'Looking for project partner',
  'Open to all',
] as const;

// Days of the week
export const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

// Time preferences
export const TIME_PREFERENCES = [
  'Early Morning (5-8am)',
  'Morning (8-11am)',
  'Midday (11am-2pm)',
  'Afternoon (2-5pm)',
  'Evening (5-8pm)',
  'Night (8pm+)',
] as const;

// Firestore collection names
export const COLLECTIONS = {
  USERS: 'users',
  PROFILES: 'profiles',
  SESSIONS: 'sessions',
  CLIMBS: 'climbs',
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
  MATCHES: 'matches',
  NOTIFICATIONS: 'notifications',
} as const;

// Pagination limits
export const PAGINATION = {
  SESSIONS_PER_PAGE: 20,
  CLIMBERS_PER_PAGE: 20,
  MESSAGES_PER_PAGE: 50,
} as const;

// Storage paths
export const STORAGE_PATHS = {
  PROFILE_IMAGES: 'profile-images',
  SESSION_IMAGES: 'session-images',
} as const;

// Match status
export const MATCH_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
} as const;

// API timeouts
export const TIMEOUTS = {
  DEFAULT: 10000,
  UPLOAD: 60000,
} as const;
