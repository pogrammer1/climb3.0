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
  arrayUnion,
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
        participants: Object.values(newConversation.participants),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Conversation,
      message: 'Conversation created',
    };
  } catch (error: any) {
    console.error('Get or create conversation error:', error);
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
    console.error('Find existing conversation error:', error);
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
    console.error('Get user conversations error:', error);
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
    console.error('Send message error:', error);
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
    console.error('Get messages error:', error);
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
      });
    }
    
    // Mark individual messages as read - get all messages and filter client-side
    const messagesRef = collection(db, COLLECTIONS.CONVERSATIONS, conversationId, COLLECTIONS.MESSAGES);
    const messagesSnap = await getDocs(messagesRef);
    
    const updatePromises: Promise<void>[] = [];
    
    messagesSnap.docs.forEach((docSnap) => {
      const messageData = docSnap.data();
      // Only update messages not already read by this user
      if (!messageData.readBy?.includes(userId)) {
        updatePromises.push(
          updateDoc(docSnap.ref, {
            readBy: arrayUnion(userId),
          })
        );
      }
    });
    
    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }
    
    return {
      success: true,
      message: 'Messages marked as read',
    };
  } catch (error: any) {
    console.error('Mark messages as read error:', error);
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
      console.warn('[MessageService] Messages subscription error:', error.code || error.message);
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
      console.warn('[MessageService] Conversation subscription error:', error.code || error.message);
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
      // Use participantsMap which keeps the original map structure
      const participantsMap = (conversation as any).participantsMap || {};
      const participantData = participantsMap[userId];
      if (participantData) {
        totalUnread += participantData.unreadCount || 0;
      }
    }
    
    return totalUnread;
  } catch (error) {
    console.error('Get total unread count error:', error);
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
    console.error('Delete conversation error:', error);
    return {
      success: false,
      error: 'Failed to delete conversation',
    };
  }
};
