-- Adds a column to store Expo push notification tokens for each user
-- Allows app to save device token and send push notifications

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS expo_push_token TEXT; 