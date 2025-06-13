import { supabase } from './supabase';
import { Comment } from '../types';

export const commentService = {
  // Debug function to check auth context
  async debugAuthContext(): Promise<any> {
    try {
      const { data, error } = await supabase.rpc('debug_auth_context');
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error calling debug_auth_context:', error);
      return null;
    }
  },

  // Get comments for a track
  async getTrackComments(trackId: string): Promise<Comment[]> {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        user:users(id, username, profile_image_url)
      `)
      .eq('track_id', trackId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Add comment to track
  async addComment(trackId: string, userId: string, commentText: string): Promise<Comment> {
    // Debug: Log the values being used
    console.log('=== COMMENT DEBUG INFO ===');
    console.log('trackId:', trackId);
    console.log('userId:', userId);
    console.log('userId type:', typeof userId);
    console.log('commentText:', commentText);
    
    // Debug: Get current auth context
    try {
      const authContext = await this.debugAuthContext();
      console.log('Auth context:', authContext);
      
      // Get current session to see auth.uid() value
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Session user ID:', session?.user?.id);
      console.log('Session user ID type:', typeof session?.user?.id);
      console.log('ID comparison:', userId === session?.user?.id);
      console.log('ID comparison (string):', userId.toString() === session?.user?.id?.toString());
    } catch (debugError) {
      console.error('Debug error:', debugError);
    }
    
    console.log('=== END DEBUG INFO ===');

    const { data, error } = await supabase
      .from('comments')
      .insert([
        {
          track_id: trackId,
          user_id: userId,
          content: commentText,
        }
      ])
      .select(`
        *,
        user:users(id, username, profile_image_url)
      `)
      .single();

    if (error) {
      console.error('Comment insert error:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }

    // Increment comment count on track
    const { error: updateError } = await supabase.rpc('increment_comment_count', {
      track_id: trackId
    });

    if (updateError) {
      console.warn('RPC increment_comment_count failed, using fallback:', updateError);
      // Fallback: manually increment comment count using correct column name
      const { data: track } = await supabase
        .from('tracks')
        .select('comments_count')
        .eq('id', trackId)
        .single();
      
      if (track) {
        await supabase
          .from('tracks')
          .update({ comments_count: (track.comments_count || 0) + 1 })
          .eq('id', trackId);
      }
    }

    return data;
  },

  // Delete comment
  async deleteComment(commentId: string, userId: string): Promise<void> {
    // Get comment to verify ownership and get track_id
    const { data: comment, error: fetchError } = await supabase
      .from('comments')
      .select('track_id')
      .eq('id', commentId)
      .eq('user_id', userId)
      .single();

    if (fetchError) throw fetchError;
    if (!comment) throw new Error('Comment not found or unauthorized');

    // Delete comment
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', userId);

    if (error) throw error;

    // Decrement comment count on track
    const { error: updateError } = await supabase.rpc('decrement_comment_count', {
      track_id: comment.track_id
    });

    if (updateError) {
      console.warn('RPC decrement_comment_count failed, using fallback:', updateError);
      // Fallback: manually decrement comment count using correct column name
      const { data: track } = await supabase
        .from('tracks')
        .select('comments_count')
        .eq('id', comment.track_id)
        .single();
      
      if (track) {
        await supabase
          .from('tracks')
          .update({ comments_count: Math.max((track.comments_count || 0) - 1, 0) })
          .eq('id', comment.track_id);
      }
    }
  },
}; 