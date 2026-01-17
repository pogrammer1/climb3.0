// NotificationProvider - Initialize and manage notifications
import React, { useEffect, useCallback, useRef } from 'react';
import { useAuthStore, useMessageStore, useMatchStore, useNotificationStore } from '../../store';

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { user } = useAuthStore();
  const { conversations, totalUnreadCount } = useMessageStore();
  const { pendingRequests } = useMatchStore();
  const { 
    checkPermission, 
    setUnreadMessageCount, 
    setPendingRequestCount,
    notifyNewMessage,
    notifyConnectionRequest,
  } = useNotificationStore();
  
  // Track previous values to detect new notifications
  const prevUnreadCount = useRef(0);
  const prevPendingCount = useRef(0);
  const prevConversations = useRef(conversations);
  
  // Initialize notification permission check
  useEffect(() => {
    checkPermission();
  }, []);
  
  // Sync unread message count
  useEffect(() => {
    const currentCount = totalUnreadCount || 0;
    setUnreadMessageCount(currentCount);
    
    // Detect new messages
    if (currentCount > prevUnreadCount.current && prevUnreadCount.current > 0) {
      // Find the conversation with new messages
      const changedConvo = conversations.find((c, i) => {
        const prevConvo = prevConversations.current.find(pc => pc.id === c.id);
        if (!prevConvo) return false;
        
        // Get current user's unread count
        const currentUserParticipant = c.participants?.find(
          (p: any) => p.unreadCount !== undefined
        );
        const prevUserParticipant = prevConvo.participants?.find(
          (p: any) => p.unreadCount !== undefined
        );
        
        // Check if unread count increased
        return (currentUserParticipant?.unreadCount || 0) > (prevUserParticipant?.unreadCount || 0);
      });
      
      if (changedConvo && changedConvo.lastMessage) {
        const senderName = changedConvo.participants?.find(
          (p: any) => p.displayName && changedConvo.lastMessage?.senderId !== user?.uid
        )?.displayName || 'Someone';
        
        notifyNewMessage(senderName, changedConvo.lastMessage.text || 'Sent an image');
      }
    }
    
    prevUnreadCount.current = currentCount;
    prevConversations.current = conversations;
  }, [totalUnreadCount, conversations]);
  
  // Sync pending connection requests count
  useEffect(() => {
    const currentCount = pendingRequests?.length || 0;
    setPendingRequestCount(currentCount);
    
    // Detect new connection requests
    if (currentCount > prevPendingCount.current && prevPendingCount.current >= 0) {
      const newRequest = pendingRequests[0]; // Most recent request
      if (newRequest && newRequest.userId) {
        // Get requester name from profile if available
        notifyConnectionRequest(newRequest.initiatedBy === user?.uid ? 'Someone' : 'A climber');
      }
    }
    
    prevPendingCount.current = currentCount;
  }, [pendingRequests]);
  
  return <>{children}</>;
};

export default NotificationProvider;
