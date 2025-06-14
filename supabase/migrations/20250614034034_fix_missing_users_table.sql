-- Fix missing users table and other essential tables
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  tracks_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tracks table if it doesn't exist
CREATE TABLE IF NOT EXISTS tracks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  audio_url TEXT NOT NULL,
  cover_image_url TEXT,
  duration INTEGER DEFAULT 0,
  genre TEXT,
  tags TEXT[],
  plays_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  reposts_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  snippet_start_time INTEGER DEFAULT 0,
  snippet_end_time INTEGER DEFAULT 30,
  play_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create other essential tables
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, track_id)
);

CREATE TABLE IF NOT EXISTS reposts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, track_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reposts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies (only if they don't exist)
DO $$ 
BEGIN
  -- Users policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can view all profiles') THEN
    CREATE POLICY "Users can view all profiles" ON users FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can update own profile') THEN
    CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
  END IF;

  -- Tracks policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tracks' AND policyname = 'Users can view public tracks') THEN
    CREATE POLICY "Users can view public tracks" ON tracks FOR SELECT USING (is_public = true OR auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tracks' AND policyname = 'Users can insert own tracks') THEN
    CREATE POLICY "Users can insert own tracks" ON tracks FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Create essential functions
CREATE OR REPLACE FUNCTION increment_play_count(track_uuid UUID)
RETURNS void AS $$
BEGIN
    UPDATE tracks SET play_count = COALESCE(play_count, 0) + 1 WHERE id = track_uuid;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION increment_play_count(UUID) TO authenticated;
