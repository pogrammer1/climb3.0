// Chat Screen - Real-time messaging
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { StyleSheet, View, FlatList, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { Text, useTheme, TextInput, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Avatar, LoadingSpinner } from '../../components/common';
import { useAuthStore, useMessageStore } from '../../store';
import { Message } from '../../types';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';

interface ChatScreenProps {
  navigation: any;
  route: {
    params: {
      conversationId: string;
    };
  };
}

export const ChatScreen: React.FC<ChatScreenProps> = ({ navigation, route }) => {
  const { conversationId } = route.params;
  const theme = useTheme();
  const { user } = useAuthStore();
  const {
    currentConversation,
    messages,
    isLoadingMessages,
    isSending,
    openConversation,
    subscribeToCurrentMessages,
    sendMessage,
    markAsRead,
    closeConversation,
  } = useMessageStore();

  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    openConversation(conversationId);
    subscribeToCurrentMessages(conversationId);

    return () => {
      closeConversation();
    };
  }, [conversationId]);

  useEffect(() => {
    if (user && conversationId) {
      markAsRead(conversationId, user.uid);
    }
  }, [messages, user, conversationId]);

  const getOtherParticipant = () => {
    if (!currentConversation || !user) return { displayName: 'Chat', photoURL: null };
    
    const participantsMap = (currentConversation as any).participants;
    if (typeof participantsMap === 'object' && !Array.isArray(participantsMap)) {
      const otherUserId = Object.keys(participantsMap).find((id) => id !== user.uid);
      if (otherUserId) {
        return participantsMap[otherUserId];
      }
    }
    return { displayName: 'Chat', photoURL: null };
  };

  const otherParticipant = getOtherParticipant();

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || !user || isSending) return;

    const text = inputText.trim();
    setInputText('');
    await sendMessage(conversationId, user.uid, text);
  }, [inputText, user, conversationId, isSending, sendMessage]);

  const formatMessageDate = (date: Date): string => {
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
  };

  const formatMessageTime = (date: Date): string => {
    return format(date, 'h:mm a');
  };

  const shouldShowDateSeparator = (currentMessage: Message, previousMessage?: Message): boolean => {
    if (!previousMessage) return true;
    return !isSameDay(new Date(currentMessage.createdAt), new Date(previousMessage.createdAt));
  };

  const renderDateSeparator = (date: Date) => (
    <View style={styles.dateSeparator}>
      <View style={[styles.dateLine, { backgroundColor: theme.colors.outline }]} />
      <Text variant="labelSmall" style={[styles.dateText, { color: theme.colors.onSurfaceVariant }]}>
        {formatMessageDate(date)}
      </Text>
      <View style={[styles.dateLine, { backgroundColor: theme.colors.outline }]} />
    </View>
  );

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isOwnMessage = item.senderId === user?.uid;
    const previousMessage = messages[index - 1];
    const showDateSeparator = shouldShowDateSeparator(item, previousMessage);

    return (
      <>
        {showDateSeparator && renderDateSeparator(new Date(item.createdAt))}
        <View
          style={[
            styles.messageContainer,
            isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer,
          ]}
        >
          <View
            style={[
              styles.messageBubble,
              isOwnMessage
                ? [styles.ownMessage, { backgroundColor: theme.colors.primary }]
                : [styles.otherMessage, { backgroundColor: theme.colors.surfaceVariant }],
            ]}
          >
            <Text
              style={[
                styles.messageText,
                { color: isOwnMessage ? theme.colors.onPrimary : theme.colors.onSurfaceVariant },
              ]}
            >
              {item.text}
            </Text>
            <Text
              style={[
                styles.messageTime,
                { color: isOwnMessage ? theme.colors.onPrimary + '99' : theme.colors.onSurfaceVariant + '99' },
              ]}
            >
              {formatMessageTime(new Date(item.createdAt))}
            </Text>
          </View>
        </View>
      </>
    );
  };

  if (isLoadingMessages && messages.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <LoadingSpinner fullScreen message="Loading messages..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.outline }]}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Pressable style={styles.headerContent} onPress={() => {}}>
          <Avatar
            source={otherParticipant.photoURL}
            name={otherParticipant.displayName}
            size={40}
          />
          <View style={styles.headerText}>
            <Text variant="titleMedium" style={{ color: theme.colors.onBackground }}>
              {otherParticipant.displayName}
            </Text>
          </View>
        </Pressable>
        <IconButton icon="dots-vertical" onPress={() => {}} />
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          inverted={false}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Input */}
        <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface }]}>
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            style={[styles.input, { backgroundColor: theme.colors.surfaceVariant }]}
            mode="outlined"
            outlineStyle={{ borderRadius: 24 }}
            multiline
            maxLength={1000}
            right={
              <TextInput.Icon
                icon="send"
                disabled={!inputText.trim() || isSending}
                onPress={handleSend}
                color={inputText.trim() ? theme.colors.primary : theme.colors.outline}
              />
            }
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 12,
  },
  content: {
    flex: 1,
  },
  messagesList: {
    padding: 16,
    flexGrow: 1,
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dateLine: {
    flex: 1,
    height: 1,
  },
  dateText: {
    marginHorizontal: 12,
  },
  messageContainer: {
    marginVertical: 4,
  },
  ownMessageContainer: {
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  ownMessage: {
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  input: {
    maxHeight: 100,
  },
});

export default ChatScreen;
