import { supabase } from '../config/supabase';
import { Notification } from '../types';

export const notificationService = {
  // Get user notifications
  async getUserNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        related_user:users!notifications_related_user_id_fkey(id, username, profile_image_url),
        related_track:tracks!notifications_related_track_id_fkey(id, title, cover_image_url)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return data || [];
  },

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) throw new Error(error.message);
  },

  // Mark all notifications as read
  async markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw new Error(error.message);
  },

  // Get unread notification count
  async getUnreadCount(userId: string): Promise<number> {
    const { data, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw new Error(error.message);
    return data?.length || 0;
  },

  // Delete notification
  async deleteNotification(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) throw new Error(error.message);
  },

  // Create notification (used internally by other services)
  async createNotification(notification: {
    type: 'follow' | 'like' | 'comment' | 'repost';
    user_id: string;
    related_user_id: string;
    message: string;
    related_track_id?: string;
  }): Promise<void> {
    // Don't create notification if user is notifying themselves
    if (notification.user_id === notification.related_user_id) {
      return;
    }

    const { error } = await supabase
      .from('notifications')
      .insert([{
        ...notification,
        is_read: false,
      }]);

    if (error) throw new Error(error.message);
  },
}; 