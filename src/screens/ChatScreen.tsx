import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../contexts/AuthContext';
import { chatService } from '../services/chatService';
import { useAudioPlayer, AUDIO_PLAYER_HEIGHT } from '../contexts/AudioPlayerContext';
import { Message, Conversation } from '../types';
import MessageBubble from '../components/MessageBubble';
import MessageInput from '../components/MessageInput';

const ChatScreen = ({ navigation, route }: any) => {
  const { conversation: initialConversation } = route.params;
  const { user } = useAuth();
  const { currentTrack } = useAudioPlayer();
  
  const [conversation, setConversation] = useState<Conversation>(initialConversation);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const flatListRef = useRef<FlatList>(null);

  const loadMessages = useCallback(async () => {
    try {
      const msgs = await chatService.getConversationMessages(conversation.id);
      setMessages(msgs);
      
      // Mark messages as read
      if (user?.id) {
        await chatService.markMessagesAsRead(conversation.id, user.id);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [conversation.id, user?.id]);

  const handleSendMessage = useCallback(async (content: string) => {
    if (!user?.id) return;
    
    setSending(true);
    try {
      const newMessage = await chatService.sendMessage(conversation.id, user.id, content);
      // Message will be added via real-time subscription
      
      // Scroll to bottom after sending
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      throw error; // Re-throw to let MessageInput handle the error
    } finally {
      setSending(false);
    }
  }, [conversation.id, user?.id]);

  const scrollToBottom = useCallback(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: false });
    }
  }, [messages.length]);

  useEffect(() => {
    loadMessages();
    
    // Set up real-time subscription for messages
    const sub = chatService.subscribeToMessages(conversation.id, (updatedMessages) => {
      setMessages(updatedMessages);
      
      // Mark messages as read when they arrive
      if (user?.id) {
        chatService.markMessagesAsRead(conversation.id, user.id);
      }
    });
    
    setSubscription(sub);
    
    return () => {
      if (sub) {
        sub.unsubscribe();
      }
    };
  }, [conversation.id, user?.id, loadMessages]);

  // Scroll to bottom when messages are loaded
  useEffect(() => {
    if (!loading && messages.length > 0) {
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [loading, scrollToBottom, messages.length]);

  const renderMessage = useCallback(({ item, index }: { item: Message; index: number }) => {
    const isOwnMessage = item.sender_id === user?.id;
    const prevMessage = index > 0 ? messages[index - 1] : null;
    const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
    
    // Show timestamp for first message, last message, or if there's a gap > 5 minutes
    const showTimestamp = 
      index === 0 || 
      index === messages.length - 1 ||
      !prevMessage ||
      !nextMessage ||
      (new Date(item.created_at).getTime() - new Date(prevMessage.created_at).getTime() > 5 * 60 * 1000);

    return (
      <MessageBubble
        message={item}
        isOwnMessage={isOwnMessage}
        showTimestamp={showTimestamp}
      />
    );
  }, [messages, user?.id]);

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Image
        source={{
          uri: conversation.other_user?.profile_image_url || 'https://via.placeholder.com/80',
        }}
        style={styles.emptyAvatar}
      />
      <Text style={styles.emptyTitle}>
        Start a conversation with {conversation.other_user?.username}
      </Text>
      <Text style={styles.emptySubtitle}>
        Send a message to get the conversation started
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Image
            source={{
              uri: conversation.other_user?.profile_image_url || 'https://via.placeholder.com/32',
            }}
            style={styles.headerAvatar}
          />
          <Text style={styles.headerTitle} numberOfLines={1}>
            {conversation.other_user?.username || 'Chat'}
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate('UserProfile', { 
            userId: conversation.other_user?.id 
          })}
        >
          <Ionicons name="person-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          ListEmptyComponent={!loading ? renderEmptyState : null}
          contentContainerStyle={[
            styles.messagesList,
            messages.length === 0 && styles.emptyContainer,
            currentTrack && { paddingBottom: AUDIO_PLAYER_HEIGHT }
          ]}
          onContentSizeChange={scrollToBottom}
          showsVerticalScrollIndicator={false}
        />

        {/* Message Input */}
        <MessageInput
          onSend={handleSendMessage}
          disabled={sending}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    marginRight: 8,
    padding: 4,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },
  profileButton: {
    marginLeft: 8,
    padding: 4,
  },
  content: {
    flex: 1,
  },
  messagesList: {
    paddingVertical: 8,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
    backgroundColor: '#f0f0f0',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default ChatScreen; 