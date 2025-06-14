-- Seed file for DanCloud
-- This creates essential data for development

-- Create a test user profile for the existing authenticated user
-- This handles the case where a user exists in auth but not in public.users
INSERT INTO public.users (
    id, 
    email, 
    username, 
    display_name,
    bio,
    created_at
) VALUES (
    'd41c9925-6479-4941-820e-1386bdcb308a',
    'ddwyer77@gmail.com',
    'ddwyer77',
    'Daniel Dwyer',
    'DanCloud creator and developer',
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name,
    bio = EXCLUDED.bio;

-- Verify the user was created
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.users WHERE id = 'd41c9925-6479-4941-820e-1386bdcb308a') THEN
        RAISE NOTICE 'SUCCESS: User profile created for ddwyer77@gmail.com';
    ELSE
        RAISE NOTICE 'ERROR: Failed to create user profile';
    END IF;
END $$; 