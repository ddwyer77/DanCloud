import { supabase } from './supabase';
import { Comment } from '../types';

export const commentService = {
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
    const { data, error } = await supabase
      .from('comments')
      .insert([
        {
          track_id: trackId,
          user_id: userId,
          comment_text: commentText,
        }
      ])
      .select(`
        *,
        user:users(id, username, profile_image_url)
      `)
      .single();

    if (error) throw error;

    // Increment comment count on track
    await supabase
      .from('tracks')
      .update({ comment_count: supabase.raw('comment_count + 1') })
      .eq('id', trackId);

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
    await supabase
      .from('tracks')
      .update({ comment_count: supabase.raw('comment_count - 1') })
      .eq('id', comment.track_id);
  },
}; 