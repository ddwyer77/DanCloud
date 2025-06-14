-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.increment_play_count(UUID);

-- Create function to increment play count
CREATE OR REPLACE FUNCTION public.increment_play_count(track_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE tracks 
  SET play_count = COALESCE(play_count, 0) + 1
  WHERE id = track_uuid;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.increment_play_count(UUID) TO authenticated;
