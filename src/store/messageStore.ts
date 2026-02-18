// Message Store - Messaging state management
import { create } from 'zustand';
import {
  getOrCreateConversation,
  getUserConversations,
  sendMessage as sendMessageService,
  getMessages,
  markMessagesAsRead,
  subscribeToMessages,
  subscribeToConversations,
  getTotalUnreadCount,
} from '../services/messageService';
import { Conversation, Message } from '../types';
import { DocumentSnapshot, Unsubscribe } from 'firebase/firestore';
import { getApiErrorMessage, getErrorMessage } from '../utils';

interface MessageState {
  // State
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  totalUnreadCount: number;
  isLoading: boolean;
  isLoadingMessages: boolean;
  isSending: boolean;
  error: string | null;
  messagesLastDoc: DocumentSnapshot | null;
  hasMoreMessages: boolean;
  
  // Subscriptions
  conversationUnsubscribe: Unsubscribe | null;
  messagesUnsubscribe: Unsubscribe | null;
  
  // Actions
  fetchConversations: (userId: string) => Promise<void>;
  subscribeToUserConversations: (userId: string) => void;
  openConversation: (conversationId: string) => Promise<void>;
  startConversation: (userId: string, otherUserId: string, otherUserName: string, otherUserPhoto: string | null) => Promise<Conversation | null>;
  subscribeToCurrentMessages: (conversationId: string) => void;
  sendMessage: (conversationId: string, senderId: string, text: string, imageUrl?: string) => Promise<boolean>;
  loadMoreMessages: () => Promise<void>;
  markAsRead: (conversationId: string, userId: string) => Promise<void>;
  fetchUnreadCount: (userId: string) => Promise<void>;
  closeConversation: () => void;
  cleanup: () => void;
  setError: (error: string | null) => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  // Initial state
  conversations: [],
  currentConversation: null,
  messages: [],
  totalUnreadCount: 0,
  isLoading: false,
  isLoadingMessages: false,
  isSending: false,
  error: null,
  messagesLastDoc: null,
  hasMoreMessages: false,
  conversationUnsubscribe: null,
  messagesUnsubscribe: null,
  
  // Actions
  fetchConversations: async (userId) => {
    set({ isLoading: true, error: null });
    
    try {
      const result = await getUserConversations(userId);
      
      if (result.success && result.data) {
        set({ conversations: result.data });
      } else {
        set({ error: getApiErrorMessage(result, 'Failed to fetch conversations') });
      }
    } catch (error) {
      set({ error: getErrorMessage(error, 'Failed to fetch conversations') });
    } finally {
      set({ isLoading: false });
    }
  },
  
  subscribeToUserConversations: (userId) => {
    // Unsubscribe from previous listener
    const { conversationUnsubscribe } = get();
    if (conversationUnsubscribe) {
      conversationUnsubscribe();
    }
    
    const unsubscribe = subscribeToConversations(userId, (conversations) => {
      // Calculate total unread count from conversations
      let totalUnread = 0;
      conversations.forEach((conversation) => {
        const userParticipant = conversation.participantsMap?.[userId];
        if (userParticipant) {
          totalUnread += userParticipant.unreadCount || 0;
        }
      });

      set({ conversations, totalUnreadCount: totalUnread });
    });
    
    set({ conversationUnsubscribe: unsubscribe });
  },
  
  openConversation: async (conversationId) => {
    set({ isLoadingMessages: true, error: null, messages: [] });
    
    try {
      // Find conversation in list
      const { conversations } = get();
      const conversation = conversations.find((c) => c.id === conversationId);
      
      if (conversation) {
        set({ currentConversation: conversation });
      }
      
      // Fetch initial messages
      const result = await getMessages(conversationId);
      
      if (result.success && result.data) {
        set({
          messages: result.data.items,
          hasMoreMessages: result.data.hasMore,
          messagesLastDoc: result.data.lastDoc as DocumentSnapshot | null,
        });
      }
    } catch (error) {
      set({ error: getErrorMessage(error, 'Failed to open conversation') });
    } finally {
      set({ isLoadingMessages: false });
    }
  },
  
  startConversation: async (userId, otherUserId, otherUserName, otherUserPhoto) => {
    set({ isLoading: true, error: null });
    
    try {
      const result = await getOrCreateConversation(userId, otherUserId, otherUserName, otherUserPhoto);
      
      if (result.success && result.data) {
        // Add to conversations if not already there
        set((state) => {
          const exists = state.conversations.some((c) => c.id === result.data!.id);
          return {
            conversations: exists ? state.conversations : [result.data!, ...state.conversations],
            currentConversation: result.data,
          };
        });
        return result.data;
      }
      set({ error: getApiErrorMessage(result, 'Failed to start conversation') });
      return null;
    } catch (error) {
      set({ error: getErrorMessage(error, 'Failed to start conversation') });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
  
  subscribeToCurrentMessages: (conversationId) => {
    // Unsubscribe from previous listener
    const { messagesUnsubscribe } = get();
    if (messagesUnsubscribe) {
      messagesUnsubscribe();
    }
    
    const unsubscribe = subscribeToMessages(conversationId, (messages) => {
      set({ messages });
    });
    
    set({ messagesUnsubscribe: unsubscribe });
  },
  
  sendMessage: async (conversationId, senderId, text, imageUrl) => {
    if (!text.trim() && !imageUrl) return false;
    
    set({ isSending: true });
    
    try {
      const result = await sendMessageService(conversationId, senderId, text, imageUrl);
      
      if (result.success && result.data) {
        // Message will be added via real-time subscription
        return true;
      }
      set({ error: getApiErrorMessage(result, 'Failed to send message') });
      return false;
    } catch (error) {
      set({ error: getErrorMessage(error, 'Failed to send message') });
      return false;
    } finally {
      set({ isSending: false });
    }
  },
  
  loadMoreMessages: async () => {
    const { currentConversation, messagesLastDoc, hasMoreMessages, isLoadingMessages } = get();
    if (!currentConversation || !hasMoreMessages || isLoadingMessages || !messagesLastDoc) return;
    
    set({ isLoadingMessages: true });
    
    try {
      const result = await getMessages(currentConversation.id, messagesLastDoc);
      
      if (result.success && result.data) {
        set((state) => ({
          messages: [...result.data!.items, ...state.messages],
          hasMoreMessages: result.data!.hasMore,
          messagesLastDoc: result.data!.lastDoc as DocumentSnapshot | null,
        }));
      }
    } catch (error) {
      set({ error: getErrorMessage(error, 'Failed to load more messages') });
    } finally {
      set({ isLoadingMessages: false });
    }
  },
  
  markAsRead: async (conversationId, userId) => {
    try {
      const result = await markMessagesAsRead(conversationId, userId);
      if (!result.success) {
        set({ error: getApiErrorMessage(result, 'Failed to mark messages as read') });
      }
    } catch (error) {
      set({ error: getErrorMessage(error, 'Failed to mark messages as read') });
    }
  },
  
  fetchUnreadCount: async (userId) => {
    try {
      const count = await getTotalUnreadCount(userId);
      set({ totalUnreadCount: count });
    } catch (error) {
      set({ error: getErrorMessage(error, 'Failed to fetch unread count') });
    }
  },
  
  closeConversation: () => {
    const { messagesUnsubscribe } = get();
    if (messagesUnsubscribe) {
      messagesUnsubscribe();
    }
    
    set({
      currentConversation: null,
      messages: [],
      messagesUnsubscribe: null,
      messagesLastDoc: null,
      hasMoreMessages: false,
    });
  },
  
  cleanup: () => {
    const { conversationUnsubscribe, messagesUnsubscribe } = get();
    
    if (conversationUnsubscribe) {
      conversationUnsubscribe();
    }
    if (messagesUnsubscribe) {
      messagesUnsubscribe();
    }
    
    set({
      conversations: [],
      currentConversation: null,
      messages: [],
      conversationUnsubscribe: null,
      messagesUnsubscribe: null,
      totalUnreadCount: 0,
    });
  },
  
  setError: (error) => {
    set({ error });
  },
}));
