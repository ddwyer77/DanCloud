-- Enhanced Seed file for DanCloud
-- This creates comprehensive test data for development

-- Create test user profiles
-- Note: These are just profile records. Auth records must be created through registration.

INSERT INTO public.users (
    id, 
    email, 
    username, 
    display_name,
    bio,
    created_at
) VALUES 
-- Primary developer account
(
    'd41c9925-6479-4941-820e-1386bdcb308a',
    'ddwyer77@gmail.com',
    'ddwyer77',
    'Daniel Dwyer',
    'DanCloud creator and developer',
    NOW()
),
-- Test account 1
(
    '11111111-1111-1111-1111-111111111111',
    'clipmodego@gmail.com',
    'clipmode',
    'Clip Mode',
    'Music producer and beat maker',
    NOW()
),
-- Test account 2
(
    '22222222-2222-2222-2222-222222222222',
    'dannydwyermusic@gmail.com',
    'dannymusic',
    'Danny Music',
    'Singer songwriter and performer',
    NOW()
),
-- Test account 3
(
    '33333333-3333-3333-3333-333333333333',
    'testuser@example.com',
    'testuser',
    'Test User',
    'Just here to test the app',
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name,
    bio = EXCLUDED.bio;

-- Create some sample tracks (optional - for testing)
INSERT INTO public.tracks (
    id,
    user_id,
    title,
    description,
    audio_url,
    genre,
    tags,
    is_public,
    created_at
) VALUES
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'd41c9925-6479-4941-820e-1386bdcb308a',
    'Sample Track 1',
    'This is a sample track for testing',
    'https://example.com/sample1.mp3',
    'Electronic',
    ARRAY['test', 'sample', 'electronic'],
    true,
    NOW()
),
(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '11111111-1111-1111-1111-111111111111',
    'Beat Drop',
    'Heavy bass track with sick drops',
    'https://example.com/sample2.mp3',
    'Hip Hop',
    ARRAY['beats', 'hiphop', 'bass'],
    true,
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description;

-- Verify the users were created
DO $$
DECLARE
    user_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM public.users;
    RAISE NOTICE 'SUCCESS: Created % user profiles in seed data', user_count;
    
    -- List created users
    FOR user_record IN 
        SELECT username, email FROM public.users ORDER BY created_at
    LOOP
        RAISE NOTICE 'User: % (email: %)', user_record.username, user_record.email;
    END LOOP;
END $$; 