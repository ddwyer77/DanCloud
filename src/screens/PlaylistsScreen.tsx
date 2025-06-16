import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Image,
  AlertButton,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { playlistService } from '../services/playlistService';
import { useAuth } from '../contexts/AuthContext';
import { Playlist } from '../types';
import { colors, typography, spacing, borderRadius, shadows } from '../styles/theme';
import { AUDIO_PLAYER_HEIGHT } from '../contexts/AudioPlayerContext';

type TabType = 'created' | 'liked' | 'followed';

export default function PlaylistsScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('created');
  const [createdPlaylists, setCreatedPlaylists] = useState<Playlist[]>([]);
  const [likedPlaylists, setLikedPlaylists] = useState<Playlist[]>([]);
  const [followedPlaylists, setFollowedPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPlaylists = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const [created, followed] = await Promise.all([
        playlistService.getUserPlaylists(user.id, user.id),
        playlistService.getFollowedPlaylists(user.id),
      ]);

      setCreatedPlaylists(created);
      setFollowedPlaylists(followed);
      
      // For liked playlists, we would need to add this to the playlist service
      // For now, we can show followed playlists in the liked tab
      setLikedPlaylists(followed.filter(p => p.is_liked));
      
    } catch (error) {
      console.error('Error loading playlists:', error);
      Alert.alert('Error', 'Failed to load playlists');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPlaylists();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadPlaylists();
    }, [user])
  );

  const renderPlaylistItem = (playlist: Playlist) => (
    <TouchableOpacity
      key={playlist.id}
      style={styles.playlistItem}
      onPress={() => navigation.navigate('PlaylistDetail', { playlistId: playlist.id })}
    >
      <View style={styles.playlistCover}>
        {playlist.cover_image_url ? (
          <Image
            source={{ uri: playlist.cover_image_url }}
            style={styles.coverImage}
          />
        ) : (
          <View style={styles.defaultCover}>
            <Ionicons name="musical-notes" size={24} color={colors.gray400} />
          </View>
        )}
      </View>
      
      <View style={styles.playlistInfo}>
        <Text style={styles.playlistTitle} numberOfLines={1}>
          {playlist.title}
        </Text>
        <Text style={styles.playlistMeta}>
          {playlist.track_count} tracks • {formatDuration(playlist.total_duration)}
        </Text>
        <Text style={styles.playlistAuthor}>
          by {playlist.user?.username || 'Unknown'}
        </Text>
      </View>
      
      <View style={styles.playlistActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handlePlayPlaylist(playlist)}
        >
          <Ionicons name="play" size={20} color={colors.primary} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handlePlaylistOptions(playlist)}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.gray600} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const handlePlayPlaylist = async (playlist: Playlist) => {
    try {
      // This will be implemented when we integrate with AudioPlayerContext
      console.log('Playing playlist:', playlist.title);
    } catch (error) {
      console.error('Error playing playlist:', error);
      Alert.alert('Error', 'Failed to play playlist');
    }
  };

  const handlePlaylistOptions = (playlist: Playlist) => {
    const isOwner = playlist.user_id === user?.id;
    
    const options: AlertButton[] = [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Share', onPress: () => console.log('Share playlist') },
    ];

    if (isOwner) {
      options.unshift(
        { text: 'Edit', onPress: () => navigation.navigate('EditPlaylist', { playlistId: playlist.id }) },
        { text: 'Delete', style: 'destructive', onPress: () => handleDeletePlaylist(playlist) }
      );
    } else {
      options.unshift(
        { text: playlist.is_followed ? 'Unfollow' : 'Follow', onPress: () => handleToggleFollow(playlist) }
      );
    }

    Alert.alert(playlist.title, 'Choose an action', options);
  };

  const handleDeletePlaylist = (playlist: Playlist) => {
    Alert.alert(
      'Delete Playlist',
      `Are you sure you want to delete "${playlist.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await playlistService.deletePlaylist(playlist.id, user!.id);
              await loadPlaylists();
            } catch (error) {
              console.error('Error deleting playlist:', error);
              Alert.alert('Error', 'Failed to delete playlist');
            }
          },
        },
      ]
    );
  };

  const handleToggleFollow = async (playlist: Playlist) => {
    try {
      await playlistService.togglePlaylistFollow(playlist.id, user!.id);
      await loadPlaylists();
    } catch (error) {
      console.error('Error toggling follow:', error);
      Alert.alert('Error', 'Failed to update follow status');
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getCurrentPlaylists = (): Playlist[] => {
    switch (activeTab) {
      case 'created':
        return createdPlaylists;
      case 'liked':
        return likedPlaylists;
      case 'followed':
        return followedPlaylists;
      default:
        return createdPlaylists;
    }
  };

  const renderTabButton = (tab: TabType, title: string, count: number) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
      onPress={() => setActiveTab(tab)}
    >
      <Text style={[styles.tabButtonText, activeTab === tab && styles.activeTabButtonText]}>
        {title} ({count})
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Playlists</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate('CreatePlaylist')}
        >
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        {renderTabButton('created', 'Created', createdPlaylists.length)}
        {renderTabButton('liked', 'Liked', likedPlaylists.length)}
        {renderTabButton('followed', 'Following', followedPlaylists.length)}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: AUDIO_PLAYER_HEIGHT + spacing.lg }
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.centerContent}>
            <Text style={styles.loadingText}>Loading playlists...</Text>
          </View>
        ) : getCurrentPlaylists().length === 0 ? (
          <View style={styles.centerContent}>
            <Ionicons name="musical-notes-outline" size={64} color={colors.gray400} />
            <Text style={styles.emptyTitle}>
              {activeTab === 'created' ? 'No playlists yet' : 
               activeTab === 'liked' ? 'No liked playlists' : 
               'No followed playlists'}
            </Text>
            <Text style={styles.emptyDescription}>
              {activeTab === 'created' ? 'Create your first playlist to get started' : 
               activeTab === 'liked' ? 'Like some playlists to see them here' : 
               'Follow some playlists to see them here'}
            </Text>
            {activeTab === 'created' && (
              <TouchableOpacity
                style={styles.createPlaylistButton}
                onPress={() => navigation.navigate('CreatePlaylist')}
              >
                <Text style={styles.createPlaylistButtonText}>Create Playlist</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          getCurrentPlaylists().map(renderPlaylistItem)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  createButton: {
    padding: spacing.sm,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.base,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabButton: {
    borderBottomColor: colors.primary,
  },
  tabButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
  },
  activeTabButtonText: {
    color: colors.primary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.base,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  playlistCover: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.base,
    marginRight: spacing.md,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  defaultCover: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistInfo: {
    flex: 1,
  },
  playlistTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  playlistMeta: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  playlistAuthor: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
  },
  playlistActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: spacing.sm,
    marginLeft: spacing.xs,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing['4xl'],
  },
  loadingText: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginTop: spacing.base,
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: typography.lineHeight.relaxed,
  },
  createPlaylistButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  createPlaylistButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
}); 