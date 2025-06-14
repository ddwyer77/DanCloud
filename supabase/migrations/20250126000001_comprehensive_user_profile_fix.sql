-- Comprehensive User Profile Fix
-- This migration ensures all auth users have corresponding profiles and the trigger works properly

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure users table exists with correct structure
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

-- Create or replace the trigger function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_username TEXT;
BEGIN
  -- Generate a unique username from email
  user_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );
  
  -- Ensure username is unique by appending numbers if needed
  WHILE EXISTS (SELECT 1 FROM public.users WHERE username = user_username) LOOP
    user_username := user_username || '_' || floor(random() * 1000)::text;
  END LOOP;
  
  -- Insert the new user profile
  INSERT INTO public.users (id, email, username, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    user_username,
    COALESCE(NEW.raw_user_meta_data->>'display_name', user_username)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = COALESCE(EXCLUDED.username, users.username),
    display_name = COALESCE(EXCLUDED.display_name, users.display_name);
    
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth operation
    RAISE WARNING 'Failed to create user profile for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the trigger to ensure it's active
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view all profiles" ON users;
CREATE POLICY "Users can view all profiles" ON users 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users 
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON users;
CREATE POLICY "Users can insert own profile" ON users 
  FOR INSERT WITH CHECK (
    auth.uid() = id OR 
    auth.role() = 'service_role' OR
    current_setting('role') = 'service_role'
  );

-- Backfill: Create profiles for ALL existing auth users that don't have profiles
DO $$
DECLARE
    auth_user_record RECORD;
    user_username TEXT;
    counter INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting backfill of missing user profiles...';
    
    FOR auth_user_record IN 
        SELECT au.id, au.email, au.raw_user_meta_data, au.created_at
        FROM auth.users au
        LEFT JOIN public.users pu ON au.id = pu.id
        WHERE pu.id IS NULL
    LOOP
        -- Generate username
        user_username := COALESCE(
            auth_user_record.raw_user_meta_data->>'username',
            split_part(auth_user_record.email, '@', 1)
        );
        
        -- Ensure username uniqueness
        WHILE EXISTS (SELECT 1 FROM public.users WHERE username = user_username) LOOP
            user_username := user_username || '_' || floor(random() * 1000)::text;
        END LOOP;
        
        -- Insert the profile
        INSERT INTO public.users (id, email, username, display_name, created_at)
        VALUES (
            auth_user_record.id,
            auth_user_record.email,
            user_username,
            COALESCE(auth_user_record.raw_user_meta_data->>'display_name', user_username),
            auth_user_record.created_at
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            username = COALESCE(EXCLUDED.username, users.username),
            display_name = COALESCE(EXCLUDED.display_name, users.display_name);
            
        counter := counter + 1;
        RAISE NOTICE 'Created profile for user: % (%) - Total: %', 
                     auth_user_record.email, auth_user_record.id, counter;
    END LOOP;
    
    RAISE NOTICE 'Backfill complete. Created % user profiles.', counter;
END $$;

-- Verify the specific user mentioned in the issue
DO $$
DECLARE
    target_user_id UUID := 'd41c9925-6479-4941-820e-1386bdcb308a';
BEGIN
    IF EXISTS (SELECT 1 FROM public.users WHERE id = target_user_id) THEN
        RAISE NOTICE 'SUCCESS: User profile exists for ID: %', target_user_id;
    ELSE
        RAISE NOTICE 'WARNING: User profile still missing for ID: %', target_user_id;
    END IF;
END $$;

-- Create a helper function for manually fixing missing profiles
CREATE OR REPLACE FUNCTION public.ensure_user_profile(user_id UUID)
RETURNS boolean AS $$
DECLARE
    auth_user_record RECORD;
    user_username TEXT;
BEGIN
    -- Check if profile already exists
    IF EXISTS (SELECT 1 FROM public.users WHERE id = user_id) THEN
        RETURN true;
    END IF;
    
    -- Get auth user data
    SELECT id, email, raw_user_meta_data, created_at 
    INTO auth_user_record
    FROM auth.users 
    WHERE id = user_id;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Generate username
    user_username := COALESCE(
        auth_user_record.raw_user_meta_data->>'username',
        split_part(auth_user_record.email, '@', 1)
    );
    
    -- Ensure username uniqueness
    WHILE EXISTS (SELECT 1 FROM public.users WHERE username = user_username) LOOP
        user_username := user_username || '_' || floor(random() * 1000)::text;
    END LOOP;
    
    -- Create the profile
    INSERT INTO public.users (id, email, username, display_name, created_at)
    VALUES (
        auth_user_record.id,
        auth_user_record.email,
        user_username,
        COALESCE(auth_user_record.raw_user_meta_data->>'display_name', user_username),
        auth_user_record.created_at
    );
    
    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to create profile for user %: %', user_id, SQLERRM;
        RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the helper function
GRANT EXECUTE ON FUNCTION public.ensure_user_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile(UUID) TO service_role; 