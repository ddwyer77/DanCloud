import { supabase } from './supabase';
import { User, Follower } from '../types';

export const userService = {
  // Get user by ID
  async getUserById(userId: string): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  // Get user by username
  async getUserByUsername(username: string): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  // Get user profile (alias for getUserById for compatibility)
  async getUserProfile(userId: string): Promise<User> {
    return this.getUserById(userId);
  },

  // Update user profile
  async updateProfile(userId: string, updates: Partial<User>): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  // Upload profile image
  async uploadProfileImage(userId: string, imageFile: any): Promise<string> {
    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `profile-images/${fileName}`;

      console.log('=== PROFILE IMAGE UPLOAD DEBUG ===');
      console.log('Image file URI:', imageFile.uri);
      console.log('Image file name:', imageFile.name);
      console.log('Image file type:', imageFile.type);

      // Use the same approach as working audio upload - pass file object directly
      // Supabase's React Native client can handle file URIs properly
      let imageFileObject: any;
      
      try {
        // For React Native with Supabase, we can pass the file object directly
        // Supabase's React Native client can handle file URIs
        imageFileObject = {
          uri: imageFile.uri,
          type: imageFile.type || 'image/jpeg',
          name: imageFile.name || fileName,
        };
        
        console.log('Using file object for upload (same as audio):', imageFileObject);
        
      } catch (error) {
        console.error('Failed to prepare image file:', error);
        throw new Error('Failed to prepare the selected image file for upload. Please try selecting the file again.');
      }

      // Upload image to Supabase Storage using file object directly
      const { data, error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, imageFileObject, {
          contentType: imageFile.type || 'image/jpeg',
          upsert: true, // Allow overwriting existing files
        });

      console.log('Supabase upload response:', { data, error: uploadError });
      console.log('=== END PROFILE IMAGE UPLOAD DEBUG ===');

      if (uploadError) throw new Error(uploadError.message);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      console.log('Generated public URL:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error) {
      console.error('Profile image upload error:', error);
      throw error;
    }
  },

  // Follow user
  async followUser(followerId: string, followingId: string): Promise<void> {
    // Check if already following
    const { data: existingFollow } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .single();

    if (existingFollow) {
      throw new Error('Already following this user');
    }

    // Create follow relationship
    const { error } = await supabase
      .from('follows')
      .insert([{ follower_id: followerId, following_id: followingId }]);

    if (error) throw new Error(error.message);

    // Update follower counts
    await this.updateFollowerCounts(followerId, followingId);

    // Create notification
    await this.createNotification({
      type: 'follow',
      user_id: followingId,
      related_user_id: followerId,
      message: 'started following you',
    });
  },

  // Unfollow user
  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);

    if (error) throw new Error(error.message);

    // Update follower counts
    await this.updateFollowerCounts(followerId, followingId);
  },

  // Toggle follow status (follow if not following, unfollow if following)
  async toggleFollow(followerId: string, followingId: string): Promise<boolean> {
    const isCurrentlyFollowing = await this.isFollowing(followerId, followingId);
    
    if (isCurrentlyFollowing) {
      await this.unfollowUser(followerId, followingId);
      return false;
    } else {
      await this.followUser(followerId, followingId);
      return true;
    }
  },

  // Check if user is following another user
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .single();

    return !!data && !error;
  },

  // Get user followers
  async getUserFollowers(userId: string): Promise<Follower[]> {
    const { data, error } = await supabase
      .from('follows')
      .select(`
        id,
        created_at,
        follower:users!follows_follower_id_fkey(*)
      `)
      .eq('following_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map(item => ({
      id: item.id,
      created_at: item.created_at,
      follower: Array.isArray(item.follower) ? item.follower[0] : item.follower,
      user: Array.isArray(item.follower) ? item.follower[0] : item.follower,
    }));
  },

  // Get users that a user is following
  async getUserFollowing(userId: string): Promise<Follower[]> {
    const { data, error } = await supabase
      .from('follows')
      .select(`
        id,
        created_at,
        user:users!follows_following_id_fkey(*)
      `)
      .eq('follower_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map(item => ({
      id: item.id,
      created_at: item.created_at,
      user: Array.isArray(item.user) ? item.user[0] : item.user,
      follower: Array.isArray(item.user) ? item.user[0] : item.user,
    }));
  },

  // Update follower counts
  async updateFollowerCounts(followerId: string, followingId: string): Promise<void> {
    // Update follower count for the user being followed
    const { data: followerCount } = await supabase
      .from('follows')
      .select('id', { count: 'exact' })
      .eq('following_id', followingId);

    await supabase
      .from('users')
      .update({ follower_count: followerCount?.length || 0 })
      .eq('id', followingId);

    // Update following count for the follower
    const { data: followingCount } = await supabase
      .from('follows')
      .select('id', { count: 'exact' })
      .eq('follower_id', followerId);

    await supabase
      .from('users')
      .update({ following_count: followingCount?.length || 0 })
      .eq('id', followerId);
  },

  // Create notification
  async createNotification(notification: {
    type: 'follow' | 'like' | 'comment' | 'repost';
    user_id: string;
    related_user_id: string;
    message: string;
    related_track_id?: string;
  }): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .insert([notification]);

    if (error) throw new Error(error.message);
  },

  // Search users
  async searchUsers(query: string, limit: number = 20): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .or(`username.ilike.%${query}%,bio.ilike.%${query}%`)
      .limit(limit);

    if (error) throw new Error(error.message);
    return data || [];
  },
}; 