export interface User {
  id: string;
  email: string;
  username: string;
  profile_image_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
  follower_count?: number;
  following_count?: number;
}

export interface Track {
  id: string;
  user_id: string;
  audio_url: string;
  cover_image_url?: string;
  title: string;
  description?: string;
  duration: number;
  like_count: number;
  repost_count: number;
  comment_count: number;
  play_count: number;
  tags?: string[];
  created_at: string;
  updated_at: string;
  user?: User;
  is_liked?: boolean;
  is_reposted?: boolean;
  reposted_by?: User;
  snippet_start_time?: number;
  snippet_end_time?: number;
}

export interface Comment {
  id: string;
  track_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface Like {
  id: string;
  track_id: string;
  user_id: string;
  created_at: string;
  user?: User;
}

export interface Repost {
  id: string;
  track_id: string;
  user_id: string;
  created_at: string;
  user?: User;
}

export interface Follower {
  id: string;
  created_at: string;
  user?: User;
  follower?: User;
}

export interface Notification {
  id: string;
  user_id: string;
  from_user_id: string;
  type: 'follow' | 'like' | 'comment' | 'repost';
  message: string;
  track_id?: string;
  read: boolean;
  created_at: string;
  from_user?: User;
  track?: Track;
}

// Chat-related types
export interface Conversation {
  id: string;
  participant_1_id: string;
  participant_2_id: string;
  last_message_id?: string;
  last_message_at?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  other_user?: User;
  last_message?: Message;
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text';
  is_read: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  sender?: User;
}

export interface AuthUser {
  id: string;
  email: string;
  user_metadata: {
    username?: string;
  };
}

export interface UploadProgress {
  progress: number;
  isUploading: boolean;
  error?: string;
}

export interface TrackUploadData {
  title: string;
  description?: string;
  tags: string[];
  audioFile: {
    uri: string;
    name: string;
    type: string;
  };
  coverArtFile?: {
    uri: string;
    name: string;
    type: string;
  };
  snippetStartTime?: number;
  snippetEndTime?: number;
}

// Playlist-related types
export interface Playlist {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  cover_image_url?: string;
  is_public: boolean;
  is_collaborative: boolean;
  track_count: number;
  total_duration: number; // in seconds
  play_count: number;
  like_count: number;
  follow_count: number;
  created_at: string;
  updated_at: string;
  user?: User;
  tracks?: PlaylistTrack[];
  is_liked?: boolean;
  is_followed?: boolean;
}

export interface PlaylistTrack {
  id: string;
  playlist_id: string;
  track_id: string;
  position: number;
  added_by?: string;
  created_at: string;
  track?: Track;
  added_by_user?: User;
}

export interface PlaylistLike {
  id: string;
  user_id: string;
  playlist_id: string;
  created_at: string;
  user?: User;
}

export interface PlaylistFollow {
  id: string;
  user_id: string;
  playlist_id: string;
  created_at: string;
  user?: User;
}

export interface CreatePlaylistData {
  title: string;
  description?: string;
  is_public: boolean;
  is_collaborative: boolean;
  coverImageFile?: {
    uri: string;
    name: string;
    type: string;
  };
}

export interface UpdatePlaylistData {
  title?: string;
  description?: string;
  is_public?: boolean;
  is_collaborative?: boolean;
  coverImageFile?: {
    uri: string;
    name: string;
    type: string;
  };
}

// Tweet-related types
export interface Tweet {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at?: string;
  like_count: number;
  comment_count: number;
  repost_count: number;
  is_repost?: boolean;
  original_tweet_id?: string | null;
  reply_to_tweet_id?: string | null;
  image_url?: string | null;
  user?: User;
  is_liked?: boolean;
  is_reposted?: boolean;
  original_tweet?: Tweet;
}

export interface TweetLike {
  id: string;
  user_id: string;
  tweet_id: string;
  created_at: string;
  user?: User;
}

export interface TweetRepost {
  id: string;
  user_id: string;
  tweet_id: string;
  created_at: string;
  user?: User;
}

export interface TweetComment {
  id: string;
  user_id: string;
  tweet_id: string;
  content: string;
  created_at: string;
  updated_at?: string;
  user?: User;
} 