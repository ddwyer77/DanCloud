-- Create playlist tables for comprehensive playlisting feature
-- Migration: 20250128000001_create_playlist_tables.sql

-- Playlists table
CREATE TABLE IF NOT EXISTS playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  is_public BOOLEAN DEFAULT true,
  is_collaborative BOOLEAN DEFAULT false,
  track_count INTEGER DEFAULT 0,
  total_duration INTEGER DEFAULT 0, -- in seconds
  play_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  follow_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Playlist tracks junction table (for track ordering)
CREATE TABLE IF NOT EXISTS playlist_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE NOT NULL,
  track_id UUID REFERENCES tracks(id) ON DELETE CASCADE NOT NULL,
  position INTEGER NOT NULL, -- order in playlist
  added_by UUID REFERENCES users(id), -- for collaborative playlists
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(playlist_id, track_id)
);

-- Playlist likes
CREATE TABLE IF NOT EXISTS playlist_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, playlist_id)
);

-- Playlist follows (for following public playlists)
CREATE TABLE IF NOT EXISTS playlist_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, playlist_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_playlists_is_public ON playlists(is_public);
CREATE INDEX IF NOT EXISTS idx_playlists_created_at ON playlists(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist_id ON playlist_tracks(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_position ON playlist_tracks(playlist_id, position);
CREATE INDEX IF NOT EXISTS idx_playlist_likes_playlist_id ON playlist_likes(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_likes_user_id ON playlist_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_playlist_follows_playlist_id ON playlist_follows(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_follows_user_id ON playlist_follows(user_id);

-- Functions to update playlist counts
CREATE OR REPLACE FUNCTION update_playlist_track_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE playlists 
    SET track_count = track_count + 1,
        updated_at = NOW()
    WHERE id = NEW.playlist_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE playlists 
    SET track_count = track_count - 1,
        updated_at = NOW()
    WHERE id = OLD.playlist_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_playlist_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE playlists 
    SET like_count = like_count + 1,
        updated_at = NOW()
    WHERE id = NEW.playlist_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE playlists 
    SET like_count = like_count - 1,
        updated_at = NOW()
    WHERE id = OLD.playlist_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_playlist_follow_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE playlists 
    SET follow_count = follow_count + 1,
        updated_at = NOW()
    WHERE id = NEW.playlist_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE playlists 
    SET follow_count = follow_count - 1,
        updated_at = NOW()
    WHERE id = OLD.playlist_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER playlist_track_count_trigger
  AFTER INSERT OR DELETE ON playlist_tracks
  FOR EACH ROW EXECUTE FUNCTION update_playlist_track_count();

CREATE TRIGGER playlist_like_count_trigger
  AFTER INSERT OR DELETE ON playlist_likes
  FOR EACH ROW EXECUTE FUNCTION update_playlist_like_count();

CREATE TRIGGER playlist_follow_count_trigger
  AFTER INSERT OR DELETE ON playlist_follows
  FOR EACH ROW EXECUTE FUNCTION update_playlist_follow_count();

-- Function to update playlist total duration
CREATE OR REPLACE FUNCTION update_playlist_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE playlists 
    SET total_duration = (
      SELECT COALESCE(SUM(t.duration), 0)
      FROM playlist_tracks pt
      JOIN tracks t ON pt.track_id = t.id
      WHERE pt.playlist_id = NEW.playlist_id
    ),
    updated_at = NOW()
    WHERE id = NEW.playlist_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE playlists 
    SET total_duration = (
      SELECT COALESCE(SUM(t.duration), 0)
      FROM playlist_tracks pt
      JOIN tracks t ON pt.track_id = t.id
      WHERE pt.playlist_id = OLD.playlist_id
    ),
    updated_at = NOW()
    WHERE id = OLD.playlist_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER playlist_duration_trigger
  AFTER INSERT OR DELETE ON playlist_tracks
  FOR EACH ROW EXECUTE FUNCTION update_playlist_duration();

-- RLS Policies

-- Enable RLS
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_follows ENABLE ROW LEVEL SECURITY;

-- Playlists policies
CREATE POLICY "Users can view public playlists" ON playlists
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view their own playlists" ON playlists
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Collaborative playlist members can view" ON playlists
  FOR SELECT USING (
    is_collaborative = true AND 
    is_public = true
  );

CREATE POLICY "Users can insert their own playlists" ON playlists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own playlists" ON playlists
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own playlists" ON playlists
  FOR DELETE USING (auth.uid() = user_id);

-- Playlist tracks policies
CREATE POLICY "Users can view tracks in accessible playlists" ON playlist_tracks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM playlists p 
      WHERE p.id = playlist_tracks.playlist_id 
      AND (p.is_public = true OR p.user_id = auth.uid())
    )
  );

CREATE POLICY "Playlist owners can manage tracks" ON playlist_tracks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM playlists p 
      WHERE p.id = playlist_tracks.playlist_id 
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Collaborative playlist contributors can add tracks" ON playlist_tracks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM playlists p 
      WHERE p.id = playlist_tracks.playlist_id 
      AND p.is_collaborative = true 
      AND p.is_public = true
    )
  );

-- Playlist likes policies
CREATE POLICY "Users can view playlist likes" ON playlist_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can like playlists" ON playlist_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own likes" ON playlist_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Playlist follows policies
CREATE POLICY "Users can view playlist follows" ON playlist_follows
  FOR SELECT USING (true);

CREATE POLICY "Users can follow playlists" ON playlist_follows
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unfollow their own follows" ON playlist_follows
  FOR DELETE USING (auth.uid() = user_id); 