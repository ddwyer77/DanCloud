export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          username: string;
          bio: string | null;
          profile_image_url: string | null;
          follower_count: number;
          following_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          username: string;
          bio?: string | null;
          profile_image_url?: string | null;
          follower_count?: number;
          following_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          username?: string;
          bio?: string | null;
          profile_image_url?: string | null;
          follower_count?: number;
          following_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      tracks: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          audio_url: string;
          cover_image_url: string | null;
          duration: number;
          user_id: string;
          like_count: number;
          repost_count: number;
          comment_count: number;
          play_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          audio_url: string;
          cover_image_url?: string | null;
          duration: number;
          user_id: string;
          like_count?: number;
          repost_count?: number;
          comment_count?: number;
          play_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          audio_url?: string;
          cover_image_url?: string | null;
          duration?: number;
          user_id?: string;
          like_count?: number;
          repost_count?: number;
          comment_count?: number;
          play_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      follows: {
        Row: {
          id: string;
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          follower_id?: string;
          following_id?: string;
          created_at?: string;
        };
      };
      likes: {
        Row: {
          id: string;
          user_id: string;
          track_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          track_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          track_id?: string;
          created_at?: string;
        };
      };
      reposts: {
        Row: {
          id: string;
          user_id: string;
          track_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          track_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          track_id?: string;
          created_at?: string;
        };
      };
      comments: {
        Row: {
          id: string;
          content: string;
          user_id: string;
          track_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          content: string;
          user_id: string;
          track_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          content?: string;
          user_id?: string;
          track_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          type: 'follow' | 'like' | 'comment' | 'repost';
          message: string;
          user_id: string;
          from_user_id: string;
          track_id: string | null;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          type: 'follow' | 'like' | 'comment' | 'repost';
          message: string;
          user_id: string;
          from_user_id: string;
          track_id?: string | null;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          type?: 'follow' | 'like' | 'comment' | 'repost';
          message?: string;
          user_id?: string;
          from_user_id?: string;
          track_id?: string | null;
          read?: boolean;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
} 