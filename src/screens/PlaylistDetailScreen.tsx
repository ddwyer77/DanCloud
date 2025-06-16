import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { playlistService } from '../services/playlistService';
import { useAuth } from '../contexts/AuthContext';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { Playlist, Track } from '../types';
import { colors, typography, spacing, borderRadius, shadows } from '../styles/theme';
import { AUDIO_PLAYER_HEIGHT } from '../contexts/AudioPlayerContext';

interface RouteParams {
  playlistId: string;
}

export default function PlaylistDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { playlistId } = route.params as RouteParams;
  const { user } = useAuth();
  const { playPlaylist, currentPlaylist, isPlaying, currentTrack } = useAudioPlayer();
  
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPlaylist = async () => {
    try {
      setLoading(true);
      const playlistData = await playlistService.getPlaylistById(playlistId, user?.id);
      setPlaylist(playlistData);
    } catch (error) {
      console.error('Error loading playlist:', error);
      Alert.alert('Error', 'Failed to load playlist');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPlaylist();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadPlaylist();
    }, [playlistId])
  );

  const handlePlayPlaylist = async () => {
    if (!playlist || !playlist.tracks || playlist.tracks.length === 0) {
      Alert.alert('Error', 'This playlist is empty');
      return;
    }

    try {
      await playPlaylist(playlist);
    } catch (error) {
      console.error('Error playing playlist:', error);
      Alert.alert('Error', 'Failed to play playlist');
    }
  };

  const handlePlayTrack = async (track: Track, index: number) => {
    if (!playlist || !playlist.tracks) return;

    try {
      const tracks = playlist.tracks.map(pt => pt.track!).filter(Boolean);
      await playPlaylist(playlist, index);
    } catch (error) {
      console.error('Error playing track:', error);
      Alert.alert('Error', 'Failed to play track');
    }
  };

  const handleToggleLike = async () => {
    if (!playlist || !user) return;

    try {
      await playlistService.togglePlaylistLike(playlist.id, user.id);
      await loadPlaylist();
    } catch (error) {
      console.error('Error toggling like:', error);
      Alert.alert('Error', 'Failed to update like status');
    }
  };

  const handleToggleFollow = async () => {
    if (!playlist || !user) return;

    try {
      await playlistService.togglePlaylistFollow(playlist.id, user.id);
      await loadPlaylist();
    } catch (error) {
      console.error('Error toggling follow:', error);
      Alert.alert('Error', 'Failed to update follow status');
    }
  };

  const handleRemoveTrack = async (trackId: string) => {
    if (!playlist || !user) return;

    Alert.alert(
      'Remove Track',
      'Are you sure you want to remove this track from the playlist?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await playlistService.removeTrackFromPlaylist(playlist.id, trackId, user.id);
              await loadPlaylist();
            } catch (error) {
              console.error('Error removing track:', error);
              Alert.alert('Error', 'Failed to remove track');
            }
          },
        },
      ]
    );
  };

  const handleMoreOptions = () => {
    if (!playlist || !user) return;

    const isOwner = playlist.user_id === user.id;
    const options = [
      { text: 'Cancel', style: 'cancel' as const },
      { text: 'Share Playlist', onPress: () => console.log('Share playlist') },
    ];

    if (isOwner) {
      options.unshift(
        { text: 'Edit Playlist', onPress: () => navigation.navigate('EditPlaylist', { playlistId: playlist.id }) },
        { text: 'Add Tracks', onPress: () => navigation.navigate('AddToPlaylist', { playlistId: playlist.id }) }
      );
    }

    Alert.alert(playlist.title, 'Choose an action', options);
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPlaylistDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours} hr ${minutes} min`;
    }
    return `${minutes} min`;
  };

  const isCurrentPlaylist = currentPlaylist?.id === playlist?.id;
  const isPlaylistPlaying = isCurrentPlaylist && isPlaying;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading playlist...</Text>
      </View>
    );
  }

  if (!playlist) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Playlist not found</Text>
      </View>
    );
  }

  const tracks = playlist.tracks?.map(pt => pt.track!).filter(Boolean) || [];

  return (
    <View style={styles.container}>
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
        {/* Playlist Header */}
        <View style={styles.playlistHeader}>
          <View style={styles.playlistCover}>
            {playlist.cover_image_url ? (
              <Image
                source={{ uri: playlist.cover_image_url }}
                style={styles.coverImage}
              />
            ) : (
              <View style={styles.defaultCover}>
                <Ionicons name="musical-notes" size={48} color={colors.gray400} />
              </View>
            )}
          </View>

          <View style={styles.playlistInfo}>
            <Text style={styles.playlistTitle}>{playlist.title}</Text>
            {playlist.description && (
              <Text style={styles.playlistDescription}>{playlist.description}</Text>
            )}
            <Text style={styles.playlistMeta}>
              by {playlist.user?.username || 'Unknown'} • {playlist.track_count} tracks • {formatPlaylistDuration(playlist.total_duration)}
            </Text>
            <Text style={styles.playlistStats}>
              {playlist.like_count} likes • {playlist.follow_count} followers • {playlist.play_count} plays
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.playButton, !tracks.length && styles.playButtonDisabled]}
            onPress={handlePlayPlaylist}
            disabled={!tracks.length}
          >
            <Ionicons 
              name={isPlaylistPlaying ? "pause" : "play"} 
              size={24} 
              color={colors.white} 
            />
            <Text style={styles.playButtonText}>
              {isPlaylistPlaying ? 'Pause' : 'Play'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleToggleLike}
          >
            <Ionicons 
              name={playlist.is_liked ? "heart" : "heart-outline"}
              size={24} 
              color={playlist.is_liked ? colors.danger : colors.gray600} 
            />
          </TouchableOpacity>

          {playlist.user_id !== user?.id && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleToggleFollow}
            >
              <Ionicons 
                name={playlist.is_followed ? "bookmark" : "bookmark-outline"}
                size={24} 
                color={playlist.is_followed ? colors.primary : colors.gray600} 
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleMoreOptions}
          >
            <Ionicons name="ellipsis-horizontal" size={24} color={colors.gray600} />
          </TouchableOpacity>
        </View>

        {/* Track List */}
        <View style={styles.trackList}>
          <Text style={styles.trackListTitle}>Tracks</Text>
          
          {tracks.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="musical-notes-outline" size={48} color={colors.gray400} />
              <Text style={styles.emptyStateTitle}>No tracks yet</Text>
              <Text style={styles.emptyStateDescription}>
                {playlist.user_id === user?.id 
                  ? 'Add some tracks to your playlist' 
                  : 'This playlist is empty'}
              </Text>
            </View>
          ) : (
            tracks.map((track, index) => {
              const isCurrentTrack = currentTrack?.id === track.id && isCurrentPlaylist;
              const isTrackPlaying = isCurrentTrack && isPlaying;

              return (
                <TouchableOpacity
                  key={track.id}
                  style={[styles.trackItem, isCurrentTrack && styles.currentTrackItem]}
                  onPress={() => handlePlayTrack(track, index)}
                >
                  <View style={styles.trackNumber}>
                    {isTrackPlaying ? (
                      <View style={styles.playingIndicator}>
                        <View style={[styles.playingBar, styles.playingBar1]} />
                        <View style={[styles.playingBar, styles.playingBar2]} />
                        <View style={[styles.playingBar, styles.playingBar3]} />
                      </View>
                    ) : (
                      <Text style={[styles.trackNumberText, isCurrentTrack && styles.currentTrackNumberText]}>
                        {index + 1}
                      </Text>
                    )}
                  </View>

                  <View style={styles.trackCover}>
                    {track.cover_image_url ? (
                      <Image
                        source={{ uri: track.cover_image_url }}
                        style={styles.trackCoverImage}
                      />
                    ) : (
                      <View style={styles.defaultTrackCover}>
                        <Ionicons name="musical-note" size={16} color={colors.gray400} />
                      </View>
                    )}
                  </View>

                  <View style={styles.trackInfo}>
                    <Text style={[styles.trackTitle, isCurrentTrack && styles.currentTrackTitle]} numberOfLines={1}>
                      {track.title}
                    </Text>
                    <Text style={styles.trackArtist} numberOfLines={1}>
                      {track.user?.username || 'Unknown Artist'}
                    </Text>
                  </View>

                  <Text style={styles.trackDuration}>
                    {formatDuration(track.duration)}
                  </Text>

                  {playlist.user_id === user?.id && (
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemoveTrack(track.id)}
                    >
                      <Ionicons name="remove-circle" size={20} color={colors.danger} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.base,
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  errorText: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: spacing.lg,
  },
  playlistHeader: {
    padding: spacing.base,
    alignItems: 'center',
  },
  playlistCover: {
    width: 200,
    height: 200,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.base,
    overflow: 'hidden',
    ...shadows.lg,
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
    alignItems: 'center',
  },
  playlistTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  playlistDescription: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
    lineHeight: typography.lineHeight.relaxed,
  },
  playlistMeta: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  playlistStats: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.lg,
    gap: spacing.base,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    marginRight: spacing.base,
  },
  playButtonDisabled: {
    backgroundColor: colors.gray400,
  },
  playButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    marginLeft: spacing.sm,
  },
  actionButton: {
    padding: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundSecondary,
  },
  trackList: {
    paddingHorizontal: spacing.base,
  },
  trackListTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.base,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['4xl'],
  },
  emptyStateTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginTop: spacing.base,
    marginBottom: spacing.sm,
  },
  emptyStateDescription: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.lineHeight.relaxed,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.base,
    marginBottom: spacing.xs,
  },
  currentTrackItem: {
    backgroundColor: colors.primaryLight + '20',
  },
  trackNumber: {
    width: 32,
    alignItems: 'center',
    marginRight: spacing.md,
  },
  trackNumberText: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
  },
  currentTrackNumberText: {
    color: colors.primary,
  },
  playingIndicator: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 16,
    gap: 2,
  },
  playingBar: {
    width: 3,
    backgroundColor: colors.primary,
    borderRadius: 1,
  },
  playingBar1: {
    height: 8,
    // Add animation here if needed
  },
  playingBar2: {
    height: 16,
  },
  playingBar3: {
    height: 12,
  },
  trackCover: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    marginRight: spacing.md,
    overflow: 'hidden',
  },
  trackCoverImage: {
    width: '100%',
    height: '100%',
  },
  defaultTrackCover: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  trackTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  currentTrackTitle: {
    color: colors.primary,
  },
  trackArtist: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  trackDuration: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    marginRight: spacing.md,
  },
  removeButton: {
    padding: spacing.sm,
  },
}); 