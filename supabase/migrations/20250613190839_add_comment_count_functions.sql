-- Missing RPC functions for comment count management
-- These functions are called by the comment service but are missing from the schema

-- Function to increment comment count for a track
CREATE OR REPLACE FUNCTION increment_comment_count(track_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE tracks 
  SET comments_count = COALESCE(comments_count, 0) + 1,
      updated_at = NOW()
  WHERE id = track_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement comment count for a track
CREATE OR REPLACE FUNCTION decrement_comment_count(track_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE tracks 
  SET comments_count = GREATEST(COALESCE(comments_count, 0) - 1, 0),
      updated_at = NOW()
  WHERE id = track_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION increment_comment_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_comment_count(UUID) TO authenticated;
