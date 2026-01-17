// Notification Store - Global state for notifications
import { create } from 'zustand';
import {
  getNotificationPermission,
  requestNotificationPermission,
  showMessageNotification,
  showConnectionRequestNotification,
  showConnectionAcceptedNotification,
} from '../services/notificationService';

interface NotificationStore {
  // Permission state
  permission: NotificationPermission | 'unsupported';
  
  // Badge counts
  unreadMessageCount: number;
  pendingRequestCount: number;
  
  // Combined badge count
  totalBadgeCount: number;
  
  // Actions
  checkPermission: () => void;
  requestPermission: () => Promise<NotificationPermission | 'unsupported'>;
  
  // Update badge counts
  setUnreadMessageCount: (count: number) => void;
  setPendingRequestCount: (count: number) => void;
  
  // Trigger notifications
  notifyNewMessage: (senderName: string, messagePreview: string, onNavigate?: () => void) => void;
  notifyConnectionRequest: (climberName: string, onNavigate?: () => void) => void;
  notifyConnectionAccepted: (climberName: string, onNavigate?: () => void) => void;
  
  // Clear specific notification types
  clearMessageNotifications: () => void;
  clearConnectionNotifications: () => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  permission: 'default',
  unreadMessageCount: 0,
  pendingRequestCount: 0,
  totalBadgeCount: 0,
  
  checkPermission: () => {
    const permission = getNotificationPermission();
    set({ permission });
  },
  
  requestPermission: async () => {
    const permission = await requestNotificationPermission();
    set({ permission });
    return permission;
  },
  
  setUnreadMessageCount: (count) => {
    set((state) => ({
      unreadMessageCount: count,
      totalBadgeCount: count + state.pendingRequestCount,
    }));
    
    // Update document title with badge
    updateDocumentTitle(count + get().pendingRequestCount);
  },
  
  setPendingRequestCount: (count) => {
    set((state) => ({
      pendingRequestCount: count,
      totalBadgeCount: state.unreadMessageCount + count,
    }));
    
    // Update document title with badge
    updateDocumentTitle(get().unreadMessageCount + count);
  },
  
  notifyNewMessage: (senderName, messagePreview, onNavigate) => {
    // Only show notification if page is not focused
    if (document.hidden) {
      showMessageNotification(senderName, messagePreview, onNavigate);
    }
    
    // Always update badge count (will be synced from message store)
  },
  
  notifyConnectionRequest: (climberName, onNavigate) => {
    // Only show notification if page is not focused
    if (document.hidden) {
      showConnectionRequestNotification(climberName, onNavigate);
    }
  },
  
  notifyConnectionAccepted: (climberName, onNavigate) => {
    // Only show notification if page is not focused
    if (document.hidden) {
      showConnectionAcceptedNotification(climberName, onNavigate);
    }
  },
  
  clearMessageNotifications: () => {
    set({ unreadMessageCount: 0 });
    set((state) => ({
      totalBadgeCount: state.pendingRequestCount,
    }));
    updateDocumentTitle(get().pendingRequestCount);
  },
  
  clearConnectionNotifications: () => {
    set({ pendingRequestCount: 0 });
    set((state) => ({
      totalBadgeCount: state.unreadMessageCount,
    }));
    updateDocumentTitle(get().unreadMessageCount);
  },
}));

/**
 * Update document title with badge count
 */
const originalTitle = typeof document !== 'undefined' ? document.title : 'Belay';

const updateDocumentTitle = (count: number) => {
  if (typeof document === 'undefined') return;
  
  if (count > 0) {
    document.title = `(${count}) ${originalTitle}`;
  } else {
    document.title = originalTitle;
  }
};

export default useNotificationStore;
