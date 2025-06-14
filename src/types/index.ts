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
} 