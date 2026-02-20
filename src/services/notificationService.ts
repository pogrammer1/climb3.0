// Notification Service - Handles browser/push notifications
import { logServiceError } from '../utils/error';

/**
 * Check if browser notifications are supported
 */
export const isNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

/**
 * Get current notification permission status
 */
export const getNotificationPermission = (): NotificationPermission | 'unsupported' => {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission;
};

/**
 * Request permission to show notifications
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission | 'unsupported'> => {
  if (!isNotificationSupported()) {
    console.warn('Notifications not supported in this browser');
    return 'unsupported';
  }
  
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    logServiceError('NotificationService.requestNotificationPermission', error);
    return 'denied';
  }
};

/**
 * Show a browser notification
 */
export const showNotification = (
  title: string,
  options?: {
    body?: string;
    icon?: string;
    tag?: string;
    data?: any;
    onClick?: () => void;
  }
): Notification | null => {
  if (!isNotificationSupported()) {
    console.warn('Notifications not supported');
    return null;
  }
  
  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted');
    return null;
  }
  
  try {
    const notification = new Notification(title, {
      body: options?.body,
      icon: options?.icon || '/favicon.png',
      tag: options?.tag,
      data: options?.data,
    });
    
    if (options?.onClick) {
      notification.onclick = () => {
        window.focus();
        notification.close();
        options.onClick?.();
      };
    }
    
    // Auto-close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);
    
    return notification;
  } catch (error) {
    logServiceError('NotificationService.showNotification', error);
    return null;
  }
};

/**
 * Show a new message notification
 */
export const showMessageNotification = (
  senderName: string,
  messagePreview: string,
  onClickNavigate?: () => void
): void => {
  showNotification(`New message from ${senderName}`, {
    body: messagePreview.length > 100 ? messagePreview.substring(0, 100) + '...' : messagePreview,
    tag: 'message', // Tag groups similar notifications
    onClick: onClickNavigate,
  });
};

/**
 * Show a connection request notification
 */
export const showConnectionRequestNotification = (
  climberName: string,
  onClickNavigate?: () => void
): void => {
  showNotification('New Connection Request', {
    body: `${climberName} wants to connect with you!`,
    tag: 'connection-request',
    onClick: onClickNavigate,
  });
};

/**
 * Show a connection accepted notification
 */
export const showConnectionAcceptedNotification = (
  climberName: string,
  onClickNavigate?: () => void
): void => {
  showNotification('Connection Accepted!', {
    body: `${climberName} accepted your connection request. You can now message them!`,
    tag: 'connection-accepted',
    onClick: onClickNavigate,
  });
};

// Export types
export interface NotificationState {
  permission: NotificationPermission | 'unsupported';
  unreadMessages: number;
  pendingConnectionRequests: number;
}
