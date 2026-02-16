// Messages/Conversations List Screen
import React, { useEffect, useCallback } from 'react';
import { StyleSheet, View, FlatList, Pressable } from 'react-native';
import { Text, useTheme, Badge } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, Avatar, LoadingSpinner, EmptyState } from '../../components/common';
import { useAuthStore, useMessageStore } from '../../store';
import { Conversation } from '../../types';
import { format, isToday, isYesterday } from 'date-fns';

interface MessagesScreenProps {
  navigation: any;
}

export const MessagesScreen: React.FC<MessagesScreenProps> = ({ navigation }) => {
  const theme = useTheme();
  const { user } = useAuthStore();
  const {
    conversations,
    isLoading,
    fetchConversations,
    subscribeToUserConversations,
    cleanup,
  } = useMessageStore();

  // Refresh conversations when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchConversations(user.uid);
      }
    }, [user])
  );

  useEffect(() => {
    if (user) {
      subscribeToUserConversations(user.uid);
    }
    // Don't cleanup here - HomeScreen manages the subscription lifecycle
  }, [user]);

  const handleRefresh = useCallback(() => {
    if (user) {
      fetchConversations(user.uid);
    }
  }, [user, fetchConversations]);

  const handleOpenConversation = (conversation: Conversation) => {
    navigation.navigate('Chat', { conversationId: conversation.id });
  };

  const formatMessageTime = (date: Date | null) => {
    if (!date) return '';
    
    if (isToday(date)) {
      return format(date, 'h:mm a');
    }
    if (isYesterday(date)) {
      return 'Yesterday';
    }
    return format(date, 'MMM d');
  };

  const getOtherParticipant = (conversation: Conversation) => {
    const participantsMap = conversation.participantsMap || {};
    const otherUserId = Object.keys(participantsMap).find((id) => id !== user?.uid);
    if (otherUserId) {
      return participantsMap[otherUserId];
    }
    return { displayName: 'Unknown', photoURL: null };
  };

  const getUnreadCount = (conversation: Conversation) => {
    const participantsMap = conversation.participantsMap || {};
    if (user) {
      return participantsMap[user.uid]?.unreadCount || 0;
    }
    return 0;
  };

  const renderConversationItem = ({ item }: { item: Conversation }) => {
    const otherParticipant = getOtherParticipant(item);
    const unreadCount = getUnreadCount(item);
    const lastMessage = item.lastMessage;

    return (
      <Pressable
        onPress={() => handleOpenConversation(item)}
        style={({ pressed }) => [
          styles.conversationItem,
          { backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.surface },
        ]}
      >
        <Avatar
          source={otherParticipant.photoURL}
          name={otherParticipant.displayName}
          size={56}
        />
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text
              variant="titleMedium"
              style={[
                { color: theme.colors.onBackground },
                unreadCount > 0 && styles.unreadText,
              ]}
              numberOfLines={1}
            >
              {otherParticipant.displayName}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {formatMessageTime(item.lastMessageAt)}
            </Text>
          </View>
          <View style={styles.messagePreview}>
            <Text
              variant="bodyMedium"
              style={[
                { color: theme.colors.onSurfaceVariant, flex: 1 },
                unreadCount > 0 && styles.unreadText,
              ]}
              numberOfLines={1}
            >
              {lastMessage?.senderId === user?.uid ? 'You: ' : ''}
              {lastMessage?.text || 'Start a conversation'}
            </Text>
            {unreadCount > 0 && (
              <Badge style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
                {unreadCount}
              </Badge>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  const renderSeparator = () => (
    <View style={[styles.separator, { backgroundColor: theme.colors.outline }]} />
  );

  if (isLoading && conversations.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <LoadingSpinner fullScreen message="Loading conversations..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={{ color: theme.colors.onBackground }}>
          Messages
        </Text>
      </View>

      {conversations.length === 0 ? (
        <EmptyState
          icon="message-text-outline"
          title="No Messages Yet"
          message="Connect with other climbers to start chatting about beta, trips, and more!"
          actionLabel="Find Climbers"
          onAction={() => navigation.navigate('Discover')}
        />
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversationItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshing={isLoading}
          onRefresh={handleRefresh}
          ItemSeparatorComponent={renderSeparator}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  list: {
    flexGrow: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  conversationContent: {
    flex: 1,
    marginLeft: 12,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  messagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unreadText: {
    fontWeight: '600',
  },
  badge: {
    marginLeft: 8,
  },
  separator: {
    height: 1,
    marginLeft: 84,
  },
});

export default MessagesScreen;
