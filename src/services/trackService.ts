import { supabase } from './supabase';
import { Track, TrackUploadData, UploadProgress, Comment, User } from '../types';

export const trackService = {
  // Test file reading capability
  async testFileReading(fileUri: string): Promise<{ success: boolean; size: number; error?: string }> {
    try {
      console.log('Testing file reading for URI:', fileUri);
      
      const response = await fetch(fileUri);
      console.log('Test fetch response status:', response.status);
      console.log('Test fetch response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        return { success: false, size: 0, error: `HTTP ${response.status}` };
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const size = arrayBuffer.byteLength;
      
      console.log('Test file reading successful, size:', size);
      return { success: true, size };
      
    } catch (error) {
      console.error('Test file reading failed:', error);
      return { success: false, size: 0, error: (error as Error).message };
    }
  },

  // Get all tracks for feed
  async getFeedTracks(userId?: string, limit: number = 20, offset: number = 0): Promise<Track[]> {
    let query = supabase
      .from('tracks')
      .select(`
        *,
        user:users(id, username, profile_image_url),
        likes:likes(user_id),
        reposts:reposts(user_id)
      `)
      .eq('is_public', true)
      .limit(limit)
      .order('created_at', { ascending: false });

    if (offset > 0) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error } = await query;
    
    if (error) throw new Error(error.message);
    
    return (data || []).map(track => ({
      ...track,
      comment_count: (track as any).comments_count || 0,
      is_liked: userId ? track.likes?.some((like: any) => like.user_id === userId) || false : false,
      is_reposted: userId ? track.reposts?.some((repost: any) => repost.user_id === userId) || false : false,
    }));
  },

  // Get randomized tracks for FYP (For You Page)
  async getFYPTracks(userId?: string, limit: number = 20, offset: number = 0): Promise<Track[]> {
    // Get random tracks using a random order
    // Note: This is a simple implementation. For better performance at scale,
    // consider using a more sophisticated randomization algorithm
    let query = supabase
      .from('tracks')
      .select(`
        *,
        user:users(id, username, profile_image_url),
        likes:likes(user_id),
        reposts:reposts(user_id)
      `)
      .eq('is_public', true)
      .limit(limit * 3) // Get more tracks to randomize from
      .order('created_at', { ascending: false });

    const { data, error } = await query;
    
    if (error) throw new Error(error.message);
    
    // Randomize the tracks
    const tracks = (data || []).map(track => ({
      ...track,
      comment_count: (track as any).comments_count || 0,
      is_liked: userId ? track.likes?.some((like: any) => like.user_id === userId) || false : false,
      is_reposted: userId ? track.reposts?.some((repost: any) => repost.user_id === userId) || false : false,
    }));

    // Shuffle the tracks array
    const shuffled = tracks.sort(() => Math.random() - 0.5);
    
    // Return the requested slice
    return shuffled.slice(offset, offset + limit);
  },

  // Get feed tracks including reposts (shows both original tracks and reposts in timeline)
  async getFeedWithReposts(userId?: string, limit: number = 20, offset: number = 0): Promise<(Track & { reposted_by?: User, is_repost?: boolean })[]> {
    // Get original tracks
    const { data: originalTracks, error: tracksError } = await supabase
      .from('tracks')
      .select(`
        *,
        user:users(id, username, profile_image_url),
        likes:likes(user_id),
        reposts:reposts(user_id)
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (tracksError) throw new Error(tracksError.message);

    // Get reposts with track and user info
    const { data: repostData, error: repostsError } = await supabase
      .from('reposts')
      .select(`
        *,
        user:users(id, username, profile_image_url),
        track:tracks(
          *,
          user:users(id, username, profile_image_url),
          likes:likes(user_id),
          reposts:reposts(user_id)
        )
      `)
      .order('created_at', { ascending: false });

    if (repostsError) throw new Error(repostsError.message);

    // Format original tracks
    const formattedTracks = (originalTracks || []).map(track => ({
      ...track,
      comment_count: (track as any).comments_count || 0,
      is_liked: userId ? track.likes?.some((like: any) => like.user_id === userId) || false : false,
      is_reposted: userId ? track.reposts?.some((repost: any) => repost.user_id === userId) || false : false,
      is_repost: false,
      created_at: track.created_at, // Use original track creation time for sorting
    }));

    // Format reposts as track entries
    const formattedReposts = (repostData || [])
      .filter(repost => repost.track && repost.track.is_public) // Only include public tracks
      .map(repost => ({
        ...repost.track,
        comment_count: (repost.track as any).comments_count || 0,
        is_liked: userId ? repost.track.likes?.some((like: any) => like.user_id === userId) || false : false,
        is_reposted: userId ? repost.track.reposts?.some((repost_check: any) => repost_check.user_id === userId) || false : false,
        is_repost: true,
        reposted_by: repost.user,
        created_at: repost.created_at, // Use repost creation time for sorting
        // Add unique identifier for reposts
        repost_id: repost.id,
      }));

    // Combine and sort by creation time (most recent first)
    const allFeedItems = [...formattedTracks, ...formattedReposts]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(offset, offset + limit);

    return allFeedItems;
  },

  // Get track by ID (alias for compatibility)
  async getTrack(trackId: string, userId?: string): Promise<Track> {
    return this.getTrackById(trackId, userId);
  },

  // Get track by ID
  async getTrackById(trackId: string, userId?: string): Promise<Track> {
    const { data, error } = await supabase
      .from('tracks')
      .select(`
        *,
        user:users(id, username, profile_image_url),
        likes:likes(user_id),
        reposts:reposts(user_id)
      `)
      .eq('id', trackId)
      .single();

    if (error) throw new Error(error.message);
    if (!data) throw new Error('Track not found');

    return {
      ...data,
      comment_count: (data as any).comments_count || 0,
      is_liked: userId ? data.likes?.some((like: any) => like.user_id === userId) || false : false,
      is_reposted: userId ? data.reposts?.some((repost: any) => repost.user_id === userId) || false : false,
    };
  },

  // Get tracks by user
  async getUserTracks(userId: string): Promise<Track[]> {
    const { data, error } = await supabase
      .from('tracks')
      .select(`
        *,
        user:users(id, username, profile_image_url)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map(track => ({
      ...track,
      comment_count: (track as any).comments_count || 0,
    }));
  },

  // Upload track
  async uploadTrack(
    trackData: TrackUploadData, 
    userId: string, 
    onProgress?: (progress: UploadProgress) => void
  ): Promise<Track> {
    try {
      if (onProgress) {
        onProgress({ progress: 0, isUploading: true });
      }

      // Upload audio file
      const audioFileName = `${userId}-${Date.now()}.mp3`;
      const audioPath = `tracks/${audioFileName}`;

      if (onProgress) {
        onProgress({ progress: 25, isUploading: true });
      }

      // For React Native, we need to handle the file differently
      console.log('=== UPLOAD DEBUG ===');
      console.log('Audio file URI:', trackData.audioFile.uri);
      console.log('Audio file name:', trackData.audioFile.name);
      console.log('Audio file type:', trackData.audioFile.type);
      
      // In React Native, DocumentPicker returns a file URI that needs to be converted to a blob
      // We need to read the file content properly
      let audioBlob: any;
      
      try {
        // For React Native with Supabase, we can pass the file object directly
        // Supabase's React Native client can handle file URIs
        audioBlob = {
          uri: trackData.audioFile.uri,
          type: trackData.audioFile.type || 'audio/mpeg',
          name: trackData.audioFile.name || audioFileName,
        };
        
        console.log('Using file object for upload:', audioBlob);
        
      } catch (error) {
        console.error('Failed to prepare audio file:', error);
        throw new Error('Failed to prepare the selected audio file for upload. Please try selecting the file again.');
      }
      
      console.log('=== END UPLOAD DEBUG ===');

      const { error: audioError } = await supabase.storage
        .from('audio')
        .upload(audioPath, audioBlob, {
          contentType: trackData.audioFile.type || 'audio/mpeg',
        });

      if (audioError) throw new Error(audioError.message);

      const { data: audioUrl } = supabase.storage
        .from('audio')
        .getPublicUrl(audioPath);

      if (onProgress) {
        onProgress({ progress: 50, isUploading: true });
      }

      // Upload cover art if provided
      let coverImageUrl = null;
      if (trackData.coverArtFile) {
        const coverFileName = `${userId}-${Date.now()}.jpg`;
        const coverPath = `covers/${coverFileName}`;

        // Use the same approach for cover art
        let coverBlob: any;
        try {
          // For React Native with Supabase, use file object directly
          coverBlob = {
            uri: trackData.coverArtFile!.uri,
            type: trackData.coverArtFile!.type || 'image/jpeg',
            name: trackData.coverArtFile!.name || coverFileName,
          };
        } catch (error) {
          console.error('Failed to prepare cover art file:', error);
          throw new Error('Failed to prepare the selected cover art file for upload. Please try selecting the file again.');
        }

        const { error: coverError } = await supabase.storage
          .from('images')
          .upload(coverPath, coverBlob, {
            contentType: trackData.coverArtFile.type || 'image/jpeg',
          });

        if (coverError) throw new Error(coverError.message);

        const { data: coverUrl } = supabase.storage
          .from('images')
          .getPublicUrl(coverPath);

        coverImageUrl = coverUrl.publicUrl;
      }

      if (onProgress) {
        onProgress({ progress: 75, isUploading: true });
      }

      // Create track record
      const { data, error } = await supabase
        .from('tracks')
        .insert([{
          title: trackData.title,
          description: trackData.description,
          audio_url: audioUrl.publicUrl,
          cover_image_url: coverImageUrl,
          user_id: userId,
          duration: 0, // Will be updated when audio is processed
          tags: trackData.tags || [],
          snippet_start_time: Math.round(trackData.snippetStartTime || 0),
          snippet_end_time: Math.round(trackData.snippetEndTime || 30),
        }])
        .select(`
          *,
          user:users(id, username, profile_image_url)
        `)
        .single();

      if (error) throw new Error(error.message);

      if (onProgress) {
        onProgress({ progress: 100, isUploading: false });
      }

      return data;
    } catch (error) {
      if (onProgress) {
        onProgress({ progress: 0, isUploading: false });
      }
      throw error;
    }
  },

  // Delete track
  async deleteTrack(trackId: string, userId: string): Promise<void> {
    // Verify ownership
    const { data: track } = await supabase
      .from('tracks')
      .select('user_id, audio_url, cover_image_url')
      .eq('id', trackId)
      .single();

    if (!track || track.user_id !== userId) {
      throw new Error('Unauthorized to delete this track');
    }

    // Delete from storage
    if (track.audio_url) {
      const audioPath = track.audio_url.split('/').pop();
      if (audioPath) {
        await supabase.storage.from('audio').remove([`tracks/${audioPath}`]);
      }
    }

    if (track.cover_image_url) {
      const coverPath = track.cover_image_url.split('/').pop();
      if (coverPath) {
        await supabase.storage.from('images').remove([`covers/${coverPath}`]);
      }
    }

    // Delete track record
    const { error } = await supabase
      .from('tracks')
      .delete()
      .eq('id', trackId);

    if (error) throw new Error(error.message);
  },

  // Like track
  async likeTrack(trackId: string, userId: string): Promise<void> {
    // Check if already liked
    const { data: existingLike } = await supabase
      .from('likes')
      .select('id')
      .eq('track_id', trackId)
      .eq('user_id', userId)
      .single();

    if (existingLike) {
      throw new Error('Track already liked');
    }

    // Create like
    const { error } = await supabase
      .from('likes')
      .insert([{ track_id: trackId, user_id: userId }]);

    if (error) throw new Error(error.message);

    // Update like count
    await this.updateTrackCounts(trackId);

    // Create notification
    const { data: track } = await supabase
      .from('tracks')
      .select('user_id, title')
      .eq('id', trackId)
      .single();

    if (track && track.user_id !== userId) {
      await supabase
        .from('notifications')
        .insert([{
          type: 'like',
          user_id: track.user_id,
          related_user_id: userId,
          related_track_id: trackId,
          message: `liked your track "${track.title}"`,
        }]);
    }
  },

  // Unlike track
  async unlikeTrack(trackId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('track_id', trackId)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);

    // Update like count
    await this.updateTrackCounts(trackId);
  },

  // Toggle like (returns new like status)
  async toggleLike(trackId: string, userId: string): Promise<boolean> {
    // Check if already liked
    const { data: existingLike } = await supabase
      .from('likes')
      .select('id')
      .eq('track_id', trackId)
      .eq('user_id', userId)
      .single();

    if (existingLike) {
      // Unlike
      await this.unlikeTrack(trackId, userId);
      return false;
    } else {
      // Like
      await this.likeTrack(trackId, userId);
      return true;
    }
  },

  // Repost track
  async repostTrack(trackId: string, userId: string): Promise<void> {
    // Check if already reposted
    const { data: existingRepost } = await supabase
      .from('reposts')
      .select('id')
      .eq('track_id', trackId)
      .eq('user_id', userId)
      .single();

    if (existingRepost) {
      throw new Error('Track already reposted');
    }

    // Create repost
    const { error } = await supabase
      .from('reposts')
      .insert([{ track_id: trackId, user_id: userId }]);

    if (error) throw new Error(error.message);

    // Update repost count
    await this.updateTrackCounts(trackId);

    // Create notification
    const { data: track } = await supabase
      .from('tracks')
      .select('user_id, title')
      .eq('id', trackId)
      .single();

    if (track && track.user_id !== userId) {
      await supabase
        .from('notifications')
        .insert([{
          type: 'repost',
          user_id: track.user_id,
          related_user_id: userId,
          related_track_id: trackId,
          message: `reposted your track "${track.title}"`,
        }]);
    }
  },

  // Unrepost track
  async unrepostTrack(trackId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('reposts')
      .delete()
      .eq('track_id', trackId)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);

    // Update repost count
    await this.updateTrackCounts(trackId);
  },

  // Toggle repost (returns new repost status)
  async toggleRepost(trackId: string, userId: string): Promise<boolean> {
    // Check if already reposted
    const { data: existingRepost } = await supabase
      .from('reposts')
      .select('id')
      .eq('track_id', trackId)
      .eq('user_id', userId)
      .single();

    if (existingRepost) {
      // Unrepost
      await this.unrepostTrack(trackId, userId);
      return false;
    } else {
      // Repost
      await this.repostTrack(trackId, userId);
      return true;
    }
  },

  // Get track comments
  async getTrackComments(trackId: string): Promise<Comment[]> {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        user:users(id, username, profile_image_url)
      `)
      .eq('track_id', trackId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  },

  // Add comment
  async addComment(trackId: string, userId: string, content: string): Promise<Comment> {
    const { data, error } = await supabase
      .from('comments')
      .insert([{
        track_id: trackId,
        user_id: userId,
        content,
      }])
      .select(`
        *,
        user:users(id, username, profile_image_url)
      `)
      .single();

    if (error) throw new Error(error.message);

    // Update comment count
    await this.updateTrackCounts(trackId);

    // Create notification
    const { data: track } = await supabase
      .from('tracks')
      .select('user_id, title')
      .eq('id', trackId)
      .single();

    if (track && track.user_id !== userId) {
      await supabase
        .from('notifications')
        .insert([{
          type: 'comment',
          user_id: track.user_id,
          related_user_id: userId,
          related_track_id: trackId,
          message: `commented on your track "${track.title}"`,
        }]);
    }

    return data;
  },

  // Update track counts
  async updateTrackCounts(trackId: string): Promise<void> {
    // Get current counts from related tables
    const { data: likes } = await supabase
      .from('likes')
      .select('id', { count: 'exact' })
      .eq('track_id', trackId);

    const { data: reposts } = await supabase
      .from('reposts')
      .select('id', { count: 'exact' })
      .eq('track_id', trackId);

    // Update comment count
    const { data: comments } = await supabase
      .from('comments')
      .select('id', { count: 'exact' })
      .eq('track_id', trackId);

    await supabase
      .from('tracks')
      .update({
        like_count: likes?.length || 0,
        repost_count: reposts?.length || 0,
        comments_count: comments?.length || 0,
      })
      .eq('id', trackId);
  },

  // Search tracks
  async searchTracks(query: string, limit: number = 20): Promise<Track[]> {
    const { data, error } = await supabase
      .from('tracks')
      .select(`
        *,
        user:users(id, username, profile_image_url)
      `)
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .limit(limit)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map(track => ({
      ...track,
      comment_count: (track as any).comments_count || 0,
    }));
  },

  // Increment play count
  async incrementPlayCount(trackId: string): Promise<void> {
    const { error } = await supabase.rpc('increment_play_count', {
      track_uuid: trackId
    });

    if (error) throw new Error(error.message);
  },

  // Update track details with optional cover image
  async updateTrackWithCover(
    trackId: string,
    updates: {
      title?: string;
      description?: string | null;
      tags?: string[];
    },
    coverImageFile?: { uri: string; name?: string; type?: string },
    userId?: string
  ): Promise<Track> {
    try {
      let coverImageUrl = null;

      // Upload new cover image if provided
      if (coverImageFile && userId) {
        const coverFileName = `${userId}-${Date.now()}.jpg`;
        const coverPath = `covers/${coverFileName}`;

        const coverBlob = {
          uri: coverImageFile.uri,
          type: coverImageFile.type || 'image/jpeg',
          name: coverImageFile.name || coverFileName,
        };

        const { error: coverError } = await supabase.storage
          .from('images')
          .upload(coverPath, coverBlob, {
            contentType: coverImageFile.type || 'image/jpeg',
          });

        if (coverError) throw new Error(coverError.message);

        const { data: coverUrl } = supabase.storage
          .from('images')
          .getPublicUrl(coverPath);

        coverImageUrl = coverUrl.publicUrl;
      }

      // Update track with new data
      const updateData: any = {
        title: updates.title,
        description: updates.description,
        tags: updates.tags,
        updated_at: new Date().toISOString(),
      };

      // Only update cover image if a new one was uploaded
      if (coverImageUrl) {
        updateData.cover_image_url = coverImageUrl;
      }

      const { data, error } = await supabase
        .from('tracks')
        .update(updateData)
        .eq('id', trackId)
        .select(`
          *,
          user:users(id, username, profile_image_url),
          likes:likes(user_id),
          reposts:reposts(user_id)
        `)
        .single();

      if (error) {
        console.error('Error updating track:', error);
        throw new Error(error.message);
      }

      // Format the response to match Track type
      const track: Track = {
        ...data,
        like_count: data.likes?.length || 0,
        repost_count: data.reposts?.length || 0,
        comment_count: (data as any).comments_count || 0,
        is_liked: false,
        is_reposted: false,
      };

      return track;
    } catch (error: any) {
      console.error('Error in updateTrackWithCover:', error);
      throw new Error(error.message || 'Failed to update track');
    }
  },

  // Update track details
  async updateTrack(
    trackId: string,
    updates: {
      title?: string;
      description?: string | null;
      tags?: string[];
    }
  ): Promise<Track> {
    try {
      const { data, error } = await supabase
        .from('tracks')
        .update({
          title: updates.title,
          description: updates.description,
          tags: updates.tags,
          updated_at: new Date().toISOString(),
        })
        .eq('id', trackId)
        .select(`
          *,
          user:users(id, username, profile_image_url),
          likes:likes(user_id),
          reposts:reposts(user_id)
        `)
        .single();

      if (error) {
        console.error('Error updating track:', error);
        throw new Error(error.message);
      }

      // Format the response to match Track type
      const track: Track = {
        ...data,
        like_count: data.likes?.length || 0,
        repost_count: data.reposts?.length || 0,
        comment_count: (data as any).comments_count || 0,
        is_liked: false,
        is_reposted: false,
      };

      return track;
    } catch (error: any) {
      console.error('Error in updateTrack:', error);
      throw new Error(error.message || 'Failed to update track');
    }
  },
}; 