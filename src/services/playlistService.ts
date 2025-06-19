import { supabase } from './supabase';
import { Playlist, PlaylistTrack, CreatePlaylistData, UpdatePlaylistData, Track, User } from '../types';

export const playlistService = {
  // Create a new playlist
  async createPlaylist(playlistData: CreatePlaylistData, userId: string): Promise<Playlist> {
    try {
      let coverImageUrl: string | undefined;

      // Upload cover image if provided
      if (playlistData.coverImageFile) {
        try {
          const fileExt = playlistData.coverImageFile.name?.split('.').pop() || 'jpg';
          const fileName = `${Math.random()}.${fileExt}`;
          const filePath = `playlist-covers/${userId}/${fileName}`;

          // Upload image to Supabase storage
          const formData = new FormData();
          formData.append('file', {
            uri: playlistData.coverImageFile.uri,
            name: playlistData.coverImageFile.name || fileName,
            type: playlistData.coverImageFile.type || 'image/jpeg',
          } as any);

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('playlist-covers')
            .upload(filePath, formData, {
              contentType: playlistData.coverImageFile.type || 'image/jpeg',
            });

          if (uploadError) {
            console.error('Cover image upload error:', uploadError);
            // If bucket doesn't exist, continue without cover image
            if (uploadError.message?.includes('Bucket not found')) {
              console.log('Playlist covers bucket not found, creating playlist without cover image');
              coverImageUrl = undefined;
            } else {
              throw new Error('Failed to upload cover image');
            }
          } else {
            // Get public URL
            const { data: urlData } = supabase.storage
              .from('playlist-covers')
              .getPublicUrl(filePath);

            coverImageUrl = urlData.publicUrl;
          }
        } catch (imageError) {
          console.warn('Cover image upload failed, continuing without image:', imageError);
          coverImageUrl = undefined;
        }
      }

      // Create playlist record
      const { data, error } = await supabase
        .from('playlists')
        .insert([
          {
            user_id: userId,
            title: playlistData.title,
            description: playlistData.description,
            is_public: playlistData.is_public,
            is_collaborative: playlistData.is_collaborative,
            cover_image_url: coverImageUrl,
          },
        ])
        .select(`
          *,
          user:users(id, username, profile_image_url)
        `)
        .single();

      if (error) throw new Error(error.message);

      return {
        ...data,
        tracks: [],
        is_liked: false,
        is_followed: false,
      };
    } catch (error) {
      console.error('Error creating playlist:', error);
      throw error;
    }
  },

  // Get playlist by ID
  async getPlaylistById(playlistId: string, userId?: string): Promise<Playlist> {
    const { data, error } = await supabase
      .from('playlists')
      .select(`
        *,
        user:users(id, username, profile_image_url),
        playlist_likes:playlist_likes(user_id),
        playlist_follows:playlist_follows(user_id)
      `)
      .eq('id', playlistId)
      .single();

    if (error) throw new Error(error.message);
    if (!data) throw new Error('Playlist not found');

    // Get playlist tracks with track details
    const { data: tracksData, error: tracksError } = await supabase
      .from('playlist_tracks')
      .select(`
        *,
        track:tracks(
          *,
          user:users(id, username, profile_image_url),
          likes:likes(user_id),
          reposts:reposts(user_id)
        ),
        added_by_user:users(id, username, profile_image_url)
      `)
      .eq('playlist_id', playlistId)
      .order('position');

    if (tracksError) throw new Error(tracksError.message);

    const tracks: PlaylistTrack[] = (tracksData || []).map(pt => ({
      ...pt,
      track: pt.track ? {
        ...pt.track,
        is_liked: userId ? pt.track.likes?.some((like: any) => like.user_id === userId) || false : false,
        is_reposted: userId ? pt.track.reposts?.some((repost: any) => repost.user_id === userId) || false : false,
      } : undefined,
    }));

    return {
      ...data,
      tracks,
      is_liked: userId ? data.playlist_likes?.some((like: any) => like.user_id === userId) || false : false,
      is_followed: userId ? data.playlist_follows?.some((follow: any) => follow.user_id === userId) || false : false,
    };
  },

  // Get user's playlists
  async getUserPlaylists(userId: string, currentUserId?: string): Promise<Playlist[]> {
    // First, get basic playlists
    let query = supabase
      .from('playlists')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // If viewing someone else's playlists, only show public ones
    if (currentUserId !== userId) {
      query = query.eq('is_public', true);
    }

    const { data: playlists, error } = await query;

    if (error) throw new Error(error.message);
    if (!playlists) return [];

    // Get user info separately
    const { data: user } = await supabase
      .from('users')
      .select('id, username, profile_image_url')
      .eq('id', userId)
      .single();

    // Map playlists with basic structure for now
    return playlists.map(playlist => ({
      ...playlist,
      user: user || null,
      tracks: [],
      is_liked: false,
      is_followed: false,
    }));
  },

  // Get public playlists (for discovery)
  async getPublicPlaylists(limit: number = 20, offset: number = 0, userId?: string): Promise<Playlist[]> {
    const { data, error } = await supabase
      .from('playlists')
      .select(`
        *,
        user:users(id, username, profile_image_url),
        playlist_likes:playlist_likes(user_id),
        playlist_follows:playlist_follows(user_id)
      `)
      .eq('is_public', true)
      .gt('track_count', 0) // Only show playlists with tracks
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(error.message);

    return (data || []).map(playlist => ({
      ...playlist,
      is_liked: userId ? playlist.playlist_likes?.some((like: any) => like.user_id === userId) || false : false,
      is_followed: userId ? playlist.playlist_follows?.some((follow: any) => follow.user_id === userId) || false : false,
    }));
  },

  // Update playlist
  async updatePlaylist(playlistId: string, updates: UpdatePlaylistData, userId: string): Promise<Playlist> {
    try {
      let coverImageUrl: string | undefined;

      // Upload new cover image if provided
      if (updates.coverImageFile) {
        const fileExt = updates.coverImageFile.name?.split('.').pop() || 'jpg';
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `playlist-covers/${userId}/${fileName}`;

        const formData = new FormData();
        formData.append('file', {
          uri: updates.coverImageFile.uri,
          name: updates.coverImageFile.name || fileName,
          type: updates.coverImageFile.type || 'image/jpeg',
        } as any);

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('playlist-covers')
          .upload(filePath, formData, {
            contentType: updates.coverImageFile.type || 'image/jpeg',
          });

        if (uploadError) {
          console.error('Cover image upload error:', uploadError);
          throw new Error('Failed to upload cover image');
        }

        const { data: urlData } = supabase.storage
          .from('playlist-covers')
          .getPublicUrl(filePath);

        coverImageUrl = urlData.publicUrl;
      }

      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.is_public !== undefined) updateData.is_public = updates.is_public;
      if (updates.is_collaborative !== undefined) updateData.is_collaborative = updates.is_collaborative;
      if (coverImageUrl) updateData.cover_image_url = coverImageUrl;

      const { data, error } = await supabase
        .from('playlists')
        .update(updateData)
        .eq('id', playlistId)
        .eq('user_id', userId) // Ensure user owns the playlist
        .select(`
          *,
          user:users(id, username, profile_image_url)
        `)
        .single();

      if (error) throw new Error(error.message);

      return {
        ...data,
        is_liked: false,
        is_followed: false,
      };
    } catch (error) {
      console.error('Error updating playlist:', error);
      throw error;
    }
  },

  // Delete playlist
  async deletePlaylist(playlistId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('playlists')
      .delete()
      .eq('id', playlistId)
      .eq('user_id', userId); // Ensure user owns the playlist

    if (error) throw new Error(error.message);
  },

  // Add track to playlist
  async addTrackToPlaylist(playlistId: string, trackId: string, userId: string): Promise<PlaylistTrack> {
    // Get the current max position
    const { data: maxPositionData } = await supabase
      .from('playlist_tracks')
      .select('position')
      .eq('playlist_id', playlistId)
      .order('position', { ascending: false })
      .limit(1);

    const maxPosition = maxPositionData?.[0]?.position || 0;

    const { data, error } = await supabase
      .from('playlist_tracks')
      .insert([
        {
          playlist_id: playlistId,
          track_id: trackId,
          position: maxPosition + 1,
          added_by: userId,
        },
      ])
      .select(`
        *,
        track:tracks(
          *,
          user:users(id, username, profile_image_url)
        ),
        added_by_user:users(id, username, profile_image_url)
      `)
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('Track is already in this playlist');
      }
      throw new Error(error.message);
    }

    return data;
  },

  // Remove track from playlist
  async removeTrackFromPlaylist(playlistId: string, trackId: string, userId: string): Promise<void> {
    // Check if user owns the playlist or added the track (for collaborative playlists)
    const { data: playlistData } = await supabase
      .from('playlists')
      .select('user_id, is_collaborative')
      .eq('id', playlistId)
      .single();

    if (!playlistData) throw new Error('Playlist not found');

    const canRemove = playlistData.user_id === userId || 
      (playlistData.is_collaborative && playlistData.user_id !== userId);

    if (!canRemove) {
      throw new Error('You do not have permission to remove this track');
    }

    let query = supabase
      .from('playlist_tracks')
      .delete()
      .eq('playlist_id', playlistId)
      .eq('track_id', trackId);

    // If not the playlist owner, only allow removing tracks they added
    if (playlistData.user_id !== userId) {
      query = query.eq('added_by', userId);
    }

    const { error } = await query;

    if (error) throw new Error(error.message);

    // Reorder remaining tracks
    await this.reorderPlaylistTracks(playlistId);
  },

  // Reorder tracks in playlist
  async reorderPlaylistTracks(playlistId: string, trackIds?: string[]): Promise<void> {
    if (trackIds) {
      // Reorder to specific order
      const updates = trackIds.map((trackId, index) => ({
        playlist_id: playlistId,
        track_id: trackId,
        position: index + 1,
      }));

      for (const update of updates) {
        await supabase
          .from('playlist_tracks')
          .update({ position: update.position })
          .eq('playlist_id', update.playlist_id)
          .eq('track_id', update.track_id);
      }
    } else {
      // Just fix gaps in positions
      const { data: tracks } = await supabase
        .from('playlist_tracks')
        .select('id, track_id')
        .eq('playlist_id', playlistId)
        .order('position');

      if (tracks) {
        for (let i = 0; i < tracks.length; i++) {
          await supabase
            .from('playlist_tracks')
            .update({ position: i + 1 })
            .eq('id', tracks[i].id);
        }
      }
    }
  },

  // Get playlist tracks
  async getPlaylistTracks(playlistId: string, userId?: string): Promise<Track[]> {
    const { data, error } = await supabase
      .from('playlist_tracks')
      .select(`
        track:tracks(
          *,
          user:users(id, username, profile_image_url),
          likes:likes(user_id),
          reposts:reposts(user_id)
        )
      `)
      .eq('playlist_id', playlistId)
      .order('position');

    if (error) throw new Error(error.message);

    return (data || [])
      .filter(pt => pt.track) // Filter out any null tracks
      .map(pt => ({
        ...pt.track,
        is_liked: userId ? pt.track.likes?.some((like: any) => like.user_id === userId) || false : false,
        is_reposted: userId ? pt.track.reposts?.some((repost: any) => repost.user_id === userId) || false : false,
      }));
  },

  // Like playlist
  async likePlaylist(playlistId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('playlist_likes')
      .insert([{ playlist_id: playlistId, user_id: userId }]);

    if (error && error.code !== '23505') { // Ignore duplicate key error
      throw new Error(error.message);
    }
  },

  // Unlike playlist
  async unlikePlaylist(playlistId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('playlist_likes')
      .delete()
      .eq('playlist_id', playlistId)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
  },

  // Toggle playlist like
  async togglePlaylistLike(playlistId: string, userId: string): Promise<boolean> {
    const { data: existingLike } = await supabase
      .from('playlist_likes')
      .select('id')
      .eq('playlist_id', playlistId)
      .eq('user_id', userId)
      .single();

    if (existingLike) {
      await this.unlikePlaylist(playlistId, userId);
      return false;
    } else {
      await this.likePlaylist(playlistId, userId);
      return true;
    }
  },

  // Follow playlist
  async followPlaylist(playlistId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('playlist_follows')
      .insert([{ playlist_id: playlistId, user_id: userId }]);

    if (error && error.code !== '23505') { // Ignore duplicate key error
      throw new Error(error.message);
    }
  },

  // Unfollow playlist
  async unfollowPlaylist(playlistId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('playlist_follows')
      .delete()
      .eq('playlist_id', playlistId)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
  },

  // Toggle playlist follow
  async togglePlaylistFollow(playlistId: string, userId: string): Promise<boolean> {
    const { data: existingFollow } = await supabase
      .from('playlist_follows')
      .select('id')
      .eq('playlist_id', playlistId)
      .eq('user_id', userId)
      .single();

    if (existingFollow) {
      await this.unfollowPlaylist(playlistId, userId);
      return false;
    } else {
      await this.followPlaylist(playlistId, userId);
      return true;
    }
  },

  // Search playlists
  async searchPlaylists(query: string, limit: number = 20, userId?: string): Promise<Playlist[]> {
    const { data, error } = await supabase
      .from('playlists')
      .select(`
        *,
        user:users(id, username, profile_image_url),
        playlist_likes:playlist_likes(user_id),
        playlist_follows:playlist_follows(user_id)
      `)
      .eq('is_public', true)
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .order('like_count', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);

    return (data || []).map(playlist => ({
      ...playlist,
      is_liked: userId ? playlist.playlist_likes?.some((like: any) => like.user_id === userId) || false : false,
      is_followed: userId ? playlist.playlist_follows?.some((follow: any) => follow.user_id === userId) || false : false,
    }));
  },

  // Get user's followed playlists
  async getFollowedPlaylists(userId: string): Promise<Playlist[]> {
    const { data, error } = await supabase
      .from('playlist_follows')
      .select(`
        playlist:playlists(
          *,
          user:users(id, username, profile_image_url),
          playlist_likes:playlist_likes(user_id),
          playlist_follows:playlist_follows(user_id)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return (data || [])
      .filter(follow => follow.playlist) // Filter out any null playlists
      .map(follow => ({
        ...follow.playlist,
        is_liked: follow.playlist.playlist_likes?.some((like: any) => like.user_id === userId) || false,
        is_followed: true, // Always true since we're getting followed playlists
      }));
  },

  // Increment playlist play count
  async incrementPlaylistPlayCount(playlistId: string): Promise<void> {
    const { error } = await supabase.rpc('increment_playlist_play_count', {
      playlist_id: playlistId
    });

    if (error) {
      console.error('Error incrementing playlist play count:', error);
      // Don't throw error, just log it
    }
  },
}; 