import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../contexts/AuthContext';
import { chatService } from '../services/chatService';
import { Conversation } from '../types';
import ConversationItem from '../components/ConversationItem';

const InboxScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [subscription, setSubscription] = useState<any>(null);

  const loadConversations = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const convs = await chatService.getUserConversations(user.id);
      setConversations(convs);
      setFilteredConversations(convs);
    } catch (error) {
      console.error('Error loading conversations:', error);
      Alert.alert('Error', 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    
    if (!user?.id) return;
    
    try {
      const searchResults = await chatService.searchConversations(user.id, query);
      setFilteredConversations(searchResults);
    } catch (error) {
      console.error('Error searching conversations:', error);
      setFilteredConversations(conversations);
    }
  }, [user?.id, conversations]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  }, [loadConversations]);

  const handleConversationPress = useCallback((conversation: Conversation) => {
    navigation.navigate('Chat', { conversation });
  }, [navigation]);

  const handleDeleteConversation = useCallback(async (conversationId: string) => {
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await chatService.deleteConversation(conversationId);
              await loadConversations();
            } catch (error) {
              console.error('Error deleting conversation:', error);
              Alert.alert('Error', 'Failed to delete conversation');
            }
          },
        },
      ]
    );
  }, [loadConversations]);

  useEffect(() => {
    if (user?.id) {
      loadConversations();
      
      // Set up real-time subscription
      const sub = chatService.subscribeToConversations(user.id, (updatedConversations) => {
        setConversations(updatedConversations);
        if (!searchQuery) {
          setFilteredConversations(updatedConversations);
        }
      });
      
      setSubscription(sub);
      
      return () => {
        if (sub) {
          sub.unsubscribe();
        }
      };
    }
  }, [user?.id, loadConversations, searchQuery]);

  const renderConversationItem = useCallback(({ item }: { item: Conversation }) => (
    <ConversationItem
      conversation={item}
      onPress={() => handleConversationPress(item)}
      onDelete={() => handleDeleteConversation(item.id)}
    />
  ), [handleConversationPress, handleDeleteConversation]);

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubbles-outline" size={64} color="#C7C7CC" />
      <Text style={styles.emptyStateTitle}>No Messages Yet</Text>
      <Text style={styles.emptyStateSubtitle}>
        Start a conversation by visiting someone's profile
      </Text>
    </View>
  );

  const renderSearchEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="search-outline" size={64} color="#C7C7CC" />
      <Text style={styles.emptyStateTitle}>No Results</Text>
      <Text style={styles.emptyStateSubtitle}>
        No conversations match your search
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations"
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Ionicons
              name="close-circle"
              size={20}
              color="#8E8E93"
              style={styles.clearIcon}
              onPress={() => handleSearch('')}
            />
          )}
        </View>
      </View>

      {/* Conversations List */}
      <FlatList
        data={filteredConversations}
        keyExtractor={(item) => item.id}
        renderItem={renderConversationItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={searchQuery ? renderSearchEmpty : renderEmptyState}
        contentContainerStyle={
          filteredConversations.length === 0 ? styles.emptyContainer : undefined
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#000000',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 8,
    height: 36,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    paddingVertical: 0,
  },
  clearIcon: {
    marginLeft: 8,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default InboxScreen; 