import { supabase } from './supabase';
import { Tweet } from '../types';

export const tweetService = {
  // Fetch tweets for the main timeline, newest first
  async getTweets(userId?: string, limit = 20, offset = 0): Promise<Tweet[]> {
    let query = supabase
      .from('tweets')
      .select(`
        *,
        user:users(id, username, profile_image_url),
        original_tweet:original_tweet_id (
          id, content, image_url,
          user:users(id, username, profile_image_url)
        ),
        likes:tweet_likes(user_id),
        reposts:tweet_reposts(user_id)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (offset > 0) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return (data || []).map((tweet: any) => ({
      ...tweet,
      is_liked: userId ? tweet.likes?.some((l: any) => l.user_id === userId) : false,
      is_reposted: userId ? tweet.reposts?.some((r: any) => r.user_id === userId) : false,
    }));
  },

  // Create a new tweet (text only)
  async createTweet(
    content: string,
    userId: string,
    imageFile?: { uri: string; name?: string; type?: string },
    isRepost = false,
    originalTweetId?: string
  ): Promise<Tweet> {
    let imageUrl: string | null = null;

    if (imageFile) {
      // Ensure bucket exists via dashboard; we reuse IMAGES bucket under tweets/
      const fileName = `${userId}-${Date.now()}-${imageFile.name || 'tweet-img.jpg'}`;
      const filePath = `tweets/${fileName}`;

      const { error: uploadErr } = await supabase.storage
        .from('images')
        .upload(filePath, {
          uri: imageFile.uri,
          type: imageFile.type || 'image/jpeg',
          name: imageFile.name || fileName,
        } as any, {
          contentType: imageFile.type || 'image/jpeg',
        });

      if (uploadErr) throw new Error(uploadErr.message);

      const { data: publicUrl } = supabase.storage.from('images').getPublicUrl(filePath);
      imageUrl = publicUrl.publicUrl;
    }

    const { data, error } = await supabase
      .from('tweets')
      .insert([
        {
          content,
          user_id: userId,
          image_url: imageUrl,
          is_repost: isRepost,
          original_tweet_id: originalTweetId || null,
        },
      ])
      .select(`*, user:users(id, username, profile_image_url)`) // return joined user data
      .single();

    if (error) throw new Error(error.message);
    return data as Tweet;
  },

  // Like / Unlike a tweet (toggle), returns new like status (true if liked after op)
  async toggleLike(tweetId: string, userId: string): Promise<boolean> {
    // Check if like exists
    const { data: existing } = await supabase
      .from('tweet_likes')
      .select('id')
      .eq('tweet_id', tweetId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      const { error: deleteError } = await supabase
        .from('tweet_likes')
        .delete()
        .eq('id', existing.id);
      if (deleteError) throw new Error(deleteError.message);
      return false;
    } else {
      const { error: insertError } = await supabase
        .from('tweet_likes')
        .insert({ tweet_id: tweetId, user_id: userId });
      if (insertError) throw new Error(insertError.message);
      return true;
    }
  },

  // Repost / Undo repost (toggle)
  async toggleRepost(tweetId: string, userId: string): Promise<boolean> {
    const { data: existing } = await supabase
      .from('tweet_reposts')
      .select('id')
      .eq('tweet_id', tweetId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      const { error: deleteError } = await supabase
        .from('tweet_reposts')
        .delete()
        .eq('id', existing.id);
      if (deleteError) throw new Error(deleteError.message);
      return false;
    } else {
      const { error: insertError } = await supabase
        .from('tweet_reposts')
        .insert({ tweet_id: tweetId, user_id: userId });
      if (insertError) throw new Error(insertError.message);
      return true;
    }
  },

  // Fetch a single tweet by ID (along with user and like/repost status)
  async getTweetById(tweetId: string, currentUserId?: string): Promise<Tweet | null> {
    const { data, error } = await supabase
      .from('tweets')
      .select(`
        *,
        user:users(id, username, profile_image_url),
        original_tweet:original_tweet_id (
          id, content, image_url, created_at,
          user:users(id, username, profile_image_url)
        ),
        likes:tweet_likes(user_id),
        reposts:tweet_reposts(user_id)
      `)
      .eq('id', tweetId)
      .single();

    if (error) throw new Error(error.message);
    if (!data) return null;

    return {
      ...data,
      is_liked: currentUserId ? data.likes?.some((l: any) => l.user_id === currentUserId) : false,
      is_reposted: currentUserId ? data.reposts?.some((r: any) => r.user_id === currentUserId) : false,
    } as Tweet;
  },

  // Fetch comments for a tweet (newest first)
  async getComments(tweetId: string, limit = 50): Promise<import("../types").TweetComment[]> {
    const { data, error } = await supabase
      .from('tweet_comments')
      // join the related user via the user_id foreign key
      .select(
        `id, tweet_id, content, created_at, user_id,
         user:user_id (id, username, profile_image_url)`
      )
      .eq('tweet_id', tweetId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return (data as any) as import("../types").TweetComment[];
  },

  // Create a comment on a tweet and return the inserted comment with joined user info
  async createComment(tweetId: string, userId: string, content: string) {
    const { data, error } = await supabase
      .from('tweet_comments')
      .insert({ tweet_id: tweetId, user_id: userId, content })
      .select(
        `id, tweet_id, content, created_at, user_id,
         user:user_id (id, username, profile_image_url)`
      )
      .single();

    if (error) throw new Error(error.message);
    return data as any;
  },

  // Create a quote tweet (repost with comment / image)
  async quoteTweet(
    originalTweetId: string,
    content: string,
    userId: string,
    imageFile?: { uri: string; name?: string; type?: string }
  ): Promise<Tweet> {
    // Reuse createTweet but mark as repost and reference original
    return this.createTweet(content, userId, imageFile, true, originalTweetId);
  },
}; 