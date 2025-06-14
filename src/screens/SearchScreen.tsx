import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useAudioPlayer, AUDIO_PLAYER_HEIGHT } from '../contexts/AudioPlayerContext';
import { trackService } from '../services/trackService';
import { userService } from '../services/userService';
import { Track, User } from '../types';

const SearchScreen = ({ navigation }: any) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    tracks: Track[];
    users: User[];
  }>({ tracks: [], users: [] });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'tracks' | 'users'>('tracks');
  const { user } = useAuth();
  const { currentTrack, playTrack } = useAudioPlayer();

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const debounceTimer = setTimeout(() => {
        performSearch();
      }, 500);

      return () => clearTimeout(debounceTimer);
    } else {
      setSearchResults({ tracks: [], users: [] });
    }
  }, [searchQuery]);

  const performSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const [tracks, users] = await Promise.all([
        trackService.searchTracks(searchQuery.trim()),
        userService.searchUsers(searchQuery.trim()),
      ]);

      setSearchResults({ tracks, users });
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTrackPress = (track: Track) => {
    playTrack(track);
  };

  const handleUserPress = (searchUser: User) => {
    navigation.navigate('UserProfile', { userId: searchUser.id });
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderTrackItem = ({ item }: { item: Track }) => (
    <TouchableOpacity
      style={styles.trackItem}
      onPress={() => handleTrackPress(item)}
    >
      <Image
        source={{
          uri: item.cover_image_url || 'https://via.placeholder.com/60',
        }}
        style={styles.trackImage}
      />
      
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.trackArtist} numberOfLines={1}>
          {item.user?.username || 'Unknown Artist'}
        </Text>
        <View style={styles.trackMeta}>
          <Text style={styles.trackDuration}>
            {formatDuration(item.duration || 0)}
          </Text>
          <Text style={styles.trackStats}>
            {item.like_count || 0} likes • {item.play_count || 0} plays
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.playButton}
        onPress={() => handleTrackPress(item)}
      >
        <Ionicons
          name={currentTrack?.id === item.id ? 'pause' : 'play'}
          size={20}
          color="#007AFF"
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => handleUserPress(item)}
    >
      <Image
        source={{
          uri: item.profile_image_url || 'https://via.placeholder.com/50',
        }}
        style={styles.userImage}
      />
      
      <View style={styles.userInfo}>
        <Text style={styles.username} numberOfLines={1}>
          {item.username}
        </Text>
        <Text style={styles.displayName} numberOfLines={1}>
          {item.username}
        </Text>
        <Text style={styles.userStats}>
          {item.follower_count || 0} followers
        </Text>
      </View>

      <TouchableOpacity style={styles.followButton}>
        <Text style={styles.followButtonText}>View</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      {searchQuery.trim().length === 0 ? (
        <>
          <Ionicons name="search-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>Search for tracks and artists</Text>
          <Text style={styles.emptySubtext}>
            Find your favorite music and discover new artists
          </Text>
        </>
      ) : (
        <>
          <Ionicons name="search-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No results found</Text>
          <Text style={styles.emptySubtext}>
            Try searching with different keywords
          </Text>
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search</Text>
        <TouchableOpacity 
          style={styles.notificationsButton}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Ionicons name="notifications-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tracks, artists..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={performSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tab Selector */}
      {searchQuery.trim().length > 0 && (
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'tracks' && styles.activeTab]}
            onPress={() => setActiveTab('tracks')}
          >
            <Text style={[styles.tabText, activeTab === 'tracks' && styles.activeTabText]}>
              Tracks ({searchResults.tracks.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'users' && styles.activeTab]}
            onPress={() => setActiveTab('users')}
          >
            <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>
              Artists ({searchResults.users.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Results */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : (
        <>
          {activeTab === 'tracks' ? (
            <FlatList
              data={searchResults.tracks}
              keyExtractor={(item) => item.id}
              renderItem={renderTrackItem}
              ListEmptyComponent={renderEmptyState}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.listContent,
                currentTrack && { paddingBottom: AUDIO_PLAYER_HEIGHT }
              ]}
            />
          ) : (
            <FlatList
              data={searchResults.users}
              keyExtractor={(item) => item.id}
              renderItem={renderUserItem}
              ListEmptyComponent={renderEmptyState}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.listContent,
                currentTrack && { paddingBottom: AUDIO_PLAYER_HEIGHT }
              ]}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  notificationsButton: {
    marginLeft: 'auto',
  },
  searchContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    marginLeft: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  listContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  trackImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  trackArtist: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  trackMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackDuration: {
    fontSize: 12,
    color: '#999',
    marginRight: 12,
  },
  trackStats: {
    fontSize: 12,
    color: '#999',
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  userImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  displayName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  userStats: {
    fontSize: 12,
    color: '#999',
  },
  followButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  followButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
});

export default SearchScreen; 