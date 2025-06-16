import { supabase } from './supabase';
import { Conversation, Message, User } from '../types';

export const chatService = {
  // Conversations
  async getUserConversations(userId: string): Promise<Conversation[]> {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        last_message:messages!conversations_last_message_id_fkey(*),
        participant_1:users!conversations_participant_1_id_fkey(*),
        participant_2:users!conversations_participant_2_id_fkey(*)
      `)
      .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error) throw new Error(error.message);

    // Process conversations to add other_user and unread_count
    const processedConversations = await Promise.all(
      (data || []).map(async (conv: any) => {
        // Determine the other user
        const otherUser = conv.participant_1_id === userId ? conv.participant_2 : conv.participant_1;
        
        // Get unread message count
        const unreadCount = await this.getUnreadMessageCount(conv.id, userId);
        
        return {
          id: conv.id,
          participant_1_id: conv.participant_1_id,
          participant_2_id: conv.participant_2_id,
          last_message_id: conv.last_message_id,
          last_message_at: conv.last_message_at,
          created_at: conv.created_at,
          updated_at: conv.updated_at,
          other_user: otherUser,
          last_message: conv.last_message,
          unread_count: unreadCount,
        } as Conversation;
      })
    );

    return processedConversations;
  },

  async getOrCreateConversation(user1Id: string, user2Id: string): Promise<Conversation> {
    try {
      // Use the database function to get or create conversation
      const { data, error } = await supabase
        .rpc('get_or_create_conversation', {
          user1_id: user1Id,
          user2_id: user2Id
        });

      if (error) throw new Error(error.message);

      const conversationId = data;

      // Fetch the full conversation with related data
      const { data: conversation, error: fetchError } = await supabase
        .from('conversations')
        .select(`
          *,
          last_message:messages!conversations_last_message_id_fkey(*),
          participant_1:users!conversations_participant_1_id_fkey(*),
          participant_2:users!conversations_participant_2_id_fkey(*)
        `)
        .eq('id', conversationId)
        .single();

      if (fetchError) throw new Error(fetchError.message);

      // Determine the other user
      const otherUser = conversation.participant_1_id === user1Id ? 
        conversation.participant_2 : conversation.participant_1;

      return {
        id: conversation.id,
        participant_1_id: conversation.participant_1_id,
        participant_2_id: conversation.participant_2_id,
        last_message_id: conversation.last_message_id,
        last_message_at: conversation.last_message_at,
        created_at: conversation.created_at,
        updated_at: conversation.updated_at,
        other_user: otherUser,
        last_message: conversation.last_message,
        unread_count: 0,
      };
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  },

  async deleteConversation(conversationId: string): Promise<void> {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (error) throw new Error(error.message);
  },

  // Messages
  async getConversationMessages(conversationId: string, limit: number = 50): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(*)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);

    // Reverse to show oldest first
    return (data || []).reverse().map((message: any) => ({
      id: message.id,
      conversation_id: message.conversation_id,
      sender_id: message.sender_id,
      content: message.content,
      message_type: message.message_type,
      is_read: message.is_read,
      created_at: message.created_at,
      updated_at: message.updated_at,
      sender: message.sender,
    }));
  },

  async sendMessage(conversationId: string, senderId: string, content: string): Promise<Message> {
    if (!content.trim()) {
      throw new Error('Message content cannot be empty');
    }

    if (content.length > 1000) {
      throw new Error('Message is too long (max 1000 characters)');
    }

    const { data, error } = await supabase
      .from('messages')
      .insert([{
        conversation_id: conversationId,
        sender_id: senderId,
        content: content.trim(),
        message_type: 'text',
      }])
      .select(`
        *,
        sender:users!messages_sender_id_fkey(*)
      `)
      .single();

    if (error) throw new Error(error.message);

    return {
      id: data.id,
      conversation_id: data.conversation_id,
      sender_id: data.sender_id,
      content: data.content,
      message_type: data.message_type,
      is_read: data.is_read,
      created_at: data.created_at,
      updated_at: data.updated_at,
      sender: data.sender,
    };
  },

  async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId) // Don't mark own messages as read
      .eq('is_read', false);

    if (error) throw new Error(error.message);
  },

  async getUnreadMessageCount(conversationId: string, userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId) // Don't count own messages
      .eq('is_read', false);

    if (error) throw new Error(error.message);
    return count || 0;
  },

  async getTotalUnreadMessageCount(userId: string): Promise<number> {
    // Get all user's conversations
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('id')
      .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`);

    if (error) throw new Error(error.message);
    if (!conversations || conversations.length === 0) return 0;

    const conversationIds = conversations.map(c => c.id);

    // Count unread messages across all conversations
    const { count, error: countError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', conversationIds)
      .neq('sender_id', userId) // Don't count own messages
      .eq('is_read', false);

    if (countError) throw new Error(countError.message);
    return count || 0;
  },

  // Real-time subscriptions
  subscribeToConversations(userId: string, callback: (conversations: Conversation[]) => void) {
    const subscription = supabase
      .channel(`conversations:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `participant_1_id=eq.${userId}`,
        },
        async () => {
          const conversations = await this.getUserConversations(userId);
          callback(conversations);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `participant_2_id=eq.${userId}`,
        },
        async () => {
          const conversations = await this.getUserConversations(userId);
          callback(conversations);
        }
      )
      .subscribe();

    return subscription;
  },

  subscribeToMessages(conversationId: string, callback: (messages: Message[]) => void) {
    const subscription = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async () => {
          const messages = await this.getConversationMessages(conversationId);
          callback(messages);
        }
      )
      .subscribe();

    return subscription;
  },

  // Search conversations by username
  async searchConversations(userId: string, query: string): Promise<Conversation[]> {
    if (!query.trim()) {
      return this.getUserConversations(userId);
    }

    const conversations = await this.getUserConversations(userId);
    
    return conversations.filter(conv => 
      conv.other_user?.username?.toLowerCase().includes(query.toLowerCase())
    );
  },
}; 