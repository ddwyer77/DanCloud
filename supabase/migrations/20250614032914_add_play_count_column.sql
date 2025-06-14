-- Add play_count column to tracks table
ALTER TABLE tracks 
ADD COLUMN IF NOT EXISTS play_count INTEGER DEFAULT 0;

-- Update existing tracks to have default play count
UPDATE tracks 
SET play_count = 0 
WHERE play_count IS NULL;
