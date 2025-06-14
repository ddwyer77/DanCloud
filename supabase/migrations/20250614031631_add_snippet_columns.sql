-- Add snippet columns to tracks table for FYP feature
ALTER TABLE tracks 
ADD COLUMN IF NOT EXISTS snippet_start_time INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS snippet_end_time INTEGER DEFAULT 30;

-- Update existing tracks to have default snippet values (first 30 seconds)
UPDATE tracks 
SET snippet_start_time = 0, snippet_end_time = 30 
WHERE snippet_start_time IS NULL OR snippet_end_time IS NULL;
