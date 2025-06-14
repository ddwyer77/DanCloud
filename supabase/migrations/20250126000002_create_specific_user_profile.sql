-- Create specific user profile for the authenticated user
-- This migration handles the immediate issue of the missing user profile

-- Create the user profile directly
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
DECLARE
    user_record RECORD;
BEGIN
    SELECT * INTO user_record 
    FROM public.users 
    WHERE id = 'd41c9925-6479-4941-820e-1386bdcb308a';
    
    IF FOUND THEN
        RAISE NOTICE 'SUCCESS: User profile created - Email: %, Username: %, Display Name: %', 
                     user_record.email, user_record.username, user_record.display_name;
    ELSE
        RAISE NOTICE 'ERROR: Failed to create user profile';
    END IF;
END $$; 