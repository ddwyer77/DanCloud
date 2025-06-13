-- Add missing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

-- If avatar_url exists but profile_image_url doesn't, copy the data
UPDATE users SET profile_image_url = avatar_url WHERE profile_image_url IS NULL AND avatar_url IS NOT NULL;

-- Add any other potentially missing columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT; 