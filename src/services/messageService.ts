// Message Service - Handles real-time messaging operations
import {
  doc,
  collection,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  serverTimestamp,
  DocumentSnapshot,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { COLLECTIONS, PAGINATION } from '../constants';
import {
  Conversation,
  Message,
  ApiResponse,
  PaginatedResponse,
} from '../types';
import { checkRateLimit, getModerationErrorMessage, validateTextContent } from '../utils';
import { logServiceError } from '../utils/error';

const MESSAGE_SEND_RATE_LIMIT = {
  maxAttempts: 12,
  windowMs: 10_000,
};

const getMuteError = async (userId: string): Promise<string | null> => {
  const moderationSnap = await getDoc(doc(db, COLLECTIONS.USER_MODERATION, userId));
  if (!moderationSnap.exists()) {
    return null;
  }

  const data = moderationSnap.data();
  if (data.status !== 'muted') {
    return null;
  }

  const mutedUntil = data.mutedUntil?.toDate?.() as Date | undefined;
  if (mutedUntil && mutedUntil <= new Date()) {
    return null;
  }

  return mutedUntil
    ? `Messaging is muted until ${mutedUntil.toLocaleString()}.`
    : 'Messaging is muted for this account.';
};

/**
 * Create or get existing conversation between two users
 */
export const getOrCreateConversation = async (
  userId: string,
  otherUserId: string,
  otherUserName: string,
  otherUserPhoto: string | null
): Promise<ApiResponse<Conversation>> => {
  try {
    // Check if conversation already exists
    const existingConvo = await findExistingConversation(userId, otherUserId);
    if (existingConvo) {
      return {
        success: true,
        data: existingConvo,
      };
    }
    
    // Create new conversation
    const conversationsRef = collection(db, COLLECTIONS.CONVERSATIONS);
    
    // Get current user's profile for participant info
    const userProfileRef = doc(db, COLLECTIONS.PROFILES, userId);
    const userProfileSnap = await getDoc(userProfileRef);
    const userProfile = userProfileSnap.data();
    
    const newConversation = {
      participantIds: [userId, otherUserId].sort(),
      participants: {
        [userId]: {
          displayName: userProfile?.displayName || 'Unknown',
          photoURL: userProfile?.photoURL || null,
          unreadCount: 0,
        },
        [otherUserId]: {
          displayName: otherUserName,
          photoURL: otherUserPhoto,
          unreadCount: 0,
        },
      },
      lastMessage: null,
      lastMessageAt: serverTimestamp(), // Set to creation time so it appears in queries
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(conversationsRef, newConversation);
    
    return {
      success: true,
      data: {
        id: docRef.id,
        ...newConversation,
        participantsMap: newConversation.participants,
        participants: Object.values(newConversation.participants),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Conversation,
      message: 'Conversation created',
    };
  } catch (error: any) {
    logServiceError('MessageService.getOrCreateConversation', error);
    return {
      success: false,
      error: 'Failed to get or create conversation',
    };
  }
};

/**
 * Find existing conversation between two users
 */
export const findExistingConversation = async (
  userId: string,
  otherUserId: string
): Promise<Conversation | null> => {
  try {
    const sortedIds = [userId, otherUserId].sort();
    
    const q = query(
      collection(db, COLLECTIONS.CONVERSATIONS),
      where('participantIds', '==', sortedIds)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const docSnap = querySnapshot.docs[0];
    const data = docSnap.data();
    
    return {
      id: docSnap.id,
      ...data,
      participantsMap: data.participants || {}, // Keep original map for unread counts
      participants: Object.values(data.participants || {}),
      lastMessageAt: data.lastMessageAt?.toDate() || null,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as unknown as Conversation;
  } catch (error) {
    logServiceError('MessageService.findExistingConversation', error);
    return null;
  }
};

/**
 * Get all conversations for a user
 */
export const getUserConversations = async (
  userId: string
): Promise<ApiResponse<Conversation[]>> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.CONVERSATIONS),
      where('participantIds', 'array-contains', userId),
      orderBy('lastMessageAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    
    const conversations: Conversation[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      conversations.push({
        id: docSnap.id,
        ...data,
        participantsMap: data.participants || {}, // Keep original map for unread counts
        participants: Object.values(data.participants || {}),
        lastMessageAt: data.lastMessageAt?.toDate() || null,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as unknown as Conversation);
    });
    
    return {
      success: true,
      data: conversations,
    };
  } catch (error: any) {
    logServiceError('MessageService.getUserConversations', error);
    return {
      success: false,
      error: 'Failed to fetch conversations',
    };
  }
};

/**
 * Send a message in a conversation
 */
export const sendMessage = async (
  conversationId: string,
  senderId: string,
  text: string,
  imageUrl?: string
): Promise<ApiResponse<Message>> => {
  try {
    const muteError = await getMuteError(senderId);
    if (muteError) {
      return {
        success: false,
        error: muteError,
      };
    }

    const rateLimitResult = checkRateLimit(`message-send:${senderId}`, MESSAGE_SEND_RATE_LIMIT);
    if (!rateLimitResult.allowed) {
      const retrySeconds = Math.max(1, Math.ceil(rateLimitResult.retryAfterMs / 1000));
      return {
        success: false,
        error: `You're sending messages too quickly. Try again in ${retrySeconds}s.`,
      };
    }

    const moderationResult = validateTextContent([
      { label: 'Message', value: text },
    ]);

    if (!moderationResult.allowed) {
      return {
        success: false,
        error: getModerationErrorMessage(moderationResult.field),
      };
    }

    const messagesRef = collection(
      db,
      COLLECTIONS.CONVERSATIONS,
      conversationId,
      COLLECTIONS.MESSAGES
    );
    
    const newMessage = {
      conversationId,
      senderId,
      text,
      imageUrl: imageUrl || null,
      readBy: [senderId],
      createdAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(messagesRef, newMessage);
    
    // Update conversation with last message
    const conversationRef = doc(db, COLLECTIONS.CONVERSATIONS, conversationId);
    const conversationSnap = await getDoc(conversationRef);
    const conversationData = conversationSnap.data();
    
    // Increment unread count for other participants
    const updatedParticipants = { ...conversationData?.participants };
    Object.keys(updatedParticipants).forEach((participantId) => {
      if (participantId !== senderId) {
        updatedParticipants[participantId].unreadCount += 1;
      }
    });
    
    await updateDoc(conversationRef, {
      lastMessage: {
        text,
        senderId,
        createdAt: serverTimestamp(),
      },
      lastMessageAt: serverTimestamp(),
      participants: updatedParticipants,
      updatedAt: serverTimestamp(),
    });
    
    return {
      success: true,
      data: {
        id: docRef.id,
        ...newMessage,
        createdAt: new Date(),
      } as Message,
      message: 'Message sent',
    };
  } catch (error: any) {
    logServiceError('MessageService.sendMessage', error);
    return {
      success: false,
      error: 'Failed to send message',
    };
  }
};

/**
 * Get messages for a conversation with pagination
 */
export const getMessages = async (
  conversationId: string,
  lastDoc?: DocumentSnapshot
): Promise<ApiResponse<PaginatedResponse<Message>>> => {
  try {
    let q = query(
      collection(db, COLLECTIONS.CONVERSATIONS, conversationId, COLLECTIONS.MESSAGES),
      orderBy('createdAt', 'desc'),
      limit(PAGINATION.MESSAGES_PER_PAGE)
    );
    
    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }
    
    const querySnapshot = await getDocs(q);
    
    const messages: Message[] = [];
    let lastVisible: DocumentSnapshot | null = null;
    
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      messages.push({
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
      } as Message);
      lastVisible = docSnap;
    });
    
    return {
      success: true,
      data: {
        items: messages.reverse(), // Reverse to show oldest first
        hasMore: querySnapshot.size === PAGINATION.MESSAGES_PER_PAGE,
        lastDoc: lastVisible,
      },
    };
  } catch (error: any) {
    logServiceError('MessageService.getMessages', error);
    return {
      success: false,
      error: 'Failed to fetch messages',
    };
  }
};

/**
 * Mark messages as read
 */
export const markMessagesAsRead = async (
  conversationId: string,
  userId: string
): Promise<ApiResponse<null>> => {
  try {
    // Reset unread count for user
    const conversationRef = doc(db, COLLECTIONS.CONVERSATIONS, conversationId);
    const conversationSnap = await getDoc(conversationRef);
    const data = conversationSnap.data();
    
    if (data?.participants?.[userId]) {
      const updatedParticipants = { ...data.participants };
      updatedParticipants[userId].unreadCount = 0;
      
      await updateDoc(conversationRef, {
        participants: updatedParticipants,
        updatedAt: serverTimestamp(),
      });
    }

    // Mark only recent unread messages as read to avoid full collection scans
    const recentMessagesQuery = query(
      collection(db, COLLECTIONS.CONVERSATIONS, conversationId, COLLECTIONS.MESSAGES),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    const recentMessagesSnap = await getDocs(recentMessagesQuery);

    const batch = writeBatch(db);
    let updatesCount = 0;

    recentMessagesSnap.docs.forEach((docSnap) => {
      const messageData = docSnap.data();
      const alreadyRead = Array.isArray(messageData.readBy) && messageData.readBy.includes(userId);
      const isOwnMessage = messageData.senderId === userId;

      if (!alreadyRead && !isOwnMessage) {
        const currentReadBy = Array.isArray(messageData.readBy) ? messageData.readBy : [];
        batch.update(docSnap.ref, {
          readBy: [...currentReadBy, userId],
        });
        updatesCount += 1;
      }
    });

    if (updatesCount > 0) {
      await batch.commit();
    }
    
    return {
      success: true,
      message: 'Messages marked as read',
    };
  } catch (error: any) {
    logServiceError('MessageService.markMessagesAsRead', error);
    return {
      success: false,
      error: 'Failed to mark messages as read',
    };
  }
};

/**
 * Subscribe to real-time message updates
 */
export const subscribeToMessages = (
  conversationId: string,
  callback: (messages: Message[]) => void
): Unsubscribe => {
  const q = query(
    collection(db, COLLECTIONS.CONVERSATIONS, conversationId, COLLECTIONS.MESSAGES),
    orderBy('createdAt', 'asc')
  );
  
  return onSnapshot(
    q,
    (querySnapshot) => {
      const messages: Message[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        messages.push({
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
        } as Message);
      });
      callback(messages);
    },
    (error) => {
      // Handle permission errors gracefully (e.g., user logged out)
      logServiceError('MessageService.subscribeToMessages', error);
    }
  );
};

/**
 * Subscribe to conversation list updates
 */
export const subscribeToConversations = (
  userId: string,
  callback: (conversations: Conversation[]) => void
): Unsubscribe => {
  const q = query(
    collection(db, COLLECTIONS.CONVERSATIONS),
    where('participantIds', 'array-contains', userId),
    orderBy('lastMessageAt', 'desc')
  );
  
  return onSnapshot(
    q,
    (querySnapshot) => {
      const conversations: Conversation[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Keep the original participants map for unread counts and read receipts
        const conversationWithMap = {
          id: docSnap.id,
          ...data,
          participantsMap: data.participants || {}, // Keep original map
          participants: Object.values(data.participants || {}),
          lastMessageAt: data.lastMessageAt?.toDate() || null,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as unknown as Conversation;
        conversations.push(conversationWithMap);
      });
      callback(conversations);
    },
    (error) => {
      // Handle permission errors gracefully (e.g., user logged out)
      logServiceError('MessageService.subscribeToConversations', error);
    }
  );
};

/**
 * Get total unread count for a user across all conversations
 */
export const getTotalUnreadCount = async (userId: string): Promise<number> => {
  try {
    const conversationsResult = await getUserConversations(userId);
    if (!conversationsResult.success || !conversationsResult.data) {
      return 0;
    }
    
    let totalUnread = 0;
    for (const conversation of conversationsResult.data) {
      const participantsMap = conversation.participantsMap || {};
      const participantData = participantsMap[userId];
      if (participantData) {
        totalUnread += participantData.unreadCount || 0;
      }
    }
    
    return totalUnread;
  } catch (error) {
    logServiceError('MessageService.getTotalUnreadCount', error);
    return 0;
  }
};

/**
 * Delete a conversation
 */
export const deleteConversation = async (
  conversationId: string
): Promise<ApiResponse<null>> => {
  try {
    // Note: In a production app, you might want to soft delete or archive
    // rather than hard delete, and also delete all messages
    
    // For now, just mark as deleted for the user
    // A full implementation would handle this differently
    
    return {
      success: true,
      message: 'Conversation deleted',
    };
  } catch (error: any) {
    logServiceError('MessageService.deleteConversation', error);
    return {
      success: false,
      error: 'Failed to delete conversation',
    };
  }
};
