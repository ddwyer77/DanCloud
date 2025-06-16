import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { playlistService } from '../services/playlistService';
import { useAuth } from '../contexts/AuthContext';
import { Playlist } from '../types';
import { colors, typography, spacing, borderRadius, shadows } from '../styles/theme';
import { supabase } from '../services/supabase';

interface RouteParams {
  trackId: string;
  trackTitle?: string;
}

export default function AddToPlaylistScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { trackId, trackTitle } = route.params as RouteParams;
  const { user } = useAuth();
  
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addingToPlaylist, setAddingToPlaylist] = useState<string | null>(null);

  useEffect(() => {
    loadUserPlaylists();
  }, []);

  const loadUserPlaylists = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Simplified query to avoid relationship issues
      const { data: playlists, error } = await supabase
        .from('playlists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error:', error);
        // If playlists table doesn't exist, show empty state
        if (error.message.includes('relation "playlists" does not exist')) {
          console.log('Playlists table not found - showing empty state');
          setPlaylists([]);
          return;
        }
        throw error;
      }

      if (playlists) {
        // Map to expected format with mock user data
                 const formattedPlaylists = playlists.map((playlist: any) => ({
          ...playlist,
          user: {
            id: user.id,
            username: user.username || 'Unknown',
            profile_image_url: user.profile_image_url || null,
          },
          tracks: [],
          is_liked: false,
          is_followed: false,
        }));
        setPlaylists(formattedPlaylists);
      } else {
        setPlaylists([]);
      }
    } catch (error) {
      console.error('Error loading playlists:', error);
      // Show empty state instead of error alert for now
      setPlaylists([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserPlaylists();
    setRefreshing(false);
  };

  const handleAddToPlaylist = async (playlist: Playlist) => {
    if (!user) return;

    try {
      setAddingToPlaylist(playlist.id);
      await playlistService.addTrackToPlaylist(playlist.id, trackId, user.id);
      
      Alert.alert(
        'Success',
        `"${trackTitle || 'Track'}" has been added to "${playlist.title}"`,
        [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]
      );
    } catch (error) {
      console.error('Error adding track to playlist:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add track to playlist';
      Alert.alert('Error', errorMessage);
    } finally {
      setAddingToPlaylist(null);
    }
  };

  const handleCreateNewPlaylist = () => {
    navigation.navigate('CreatePlaylist');
  };

  const renderPlaylistItem = ({ item: playlist }: { item: Playlist }) => (
    <TouchableOpacity
      style={styles.playlistItem}
      onPress={() => handleAddToPlaylist(playlist)}
      disabled={addingToPlaylist === playlist.id}
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
          {playlist.track_count} tracks
          {playlist.is_public ? ' • Public' : ' • Private'}
        </Text>
      </View>
      
      <View style={styles.playlistActions}>
        {addingToPlaylist === playlist.id ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Ionicons name="add" size={24} color={colors.primary} />
        )}
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Add to Playlist</Text>
      <View style={styles.headerSpacer} />
    </View>
  );

  const renderCreateNewButton = () => (
    <TouchableOpacity
      style={styles.createNewButton}
      onPress={handleCreateNewPlaylist}
    >
      <View style={styles.createNewIcon}>
        <Ionicons name="add" size={24} color={colors.primary} />
      </View>
      <Text style={styles.createNewText}>Create New Playlist</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading playlists...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      
      {trackTitle && (
        <View style={styles.trackInfo}>
          <Text style={styles.trackTitle} numberOfLines={1}>
            Adding: {trackTitle}
          </Text>
        </View>
      )}

      {renderCreateNewButton()}

      <FlatList
        data={playlists}
        keyExtractor={(item) => item.id}
        renderItem={renderPlaylistItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="musical-notes-outline" size={48} color={colors.gray400} />
            <Text style={styles.emptyTitle}>No Playlists Yet</Text>
            <Text style={styles.emptySubtitle}>
              Create your first playlist to get started
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
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
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing.md,
  },
  headerSpacer: {
    width: 32,
  },
  trackInfo: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  trackTitle: {
    fontSize: typography.fontSize.base,
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  createNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  createNewIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  createNewText: {
    fontSize: typography.fontSize.base,
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  playlistCover: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
    marginRight: spacing.md,
  },
  coverImage: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.sm,
  },
  defaultCover: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.sm,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistInfo: {
    flex: 1,
  },
  playlistTitle: {
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: 2,
  },
  playlistMeta: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  playlistActions: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
}); 