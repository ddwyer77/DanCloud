-- Debug: Check if we have auth users without profiles
DO $$
DECLARE
    auth_user_record RECORD;
BEGIN
    -- Loop through auth users and create profiles if missing
    FOR auth_user_record IN 
        SELECT au.id, au.email, au.raw_user_meta_data
        FROM auth.users au
        LEFT JOIN public.users pu ON au.id = pu.id
        WHERE pu.id IS NULL
    LOOP
        RAISE NOTICE 'Creating profile for user: % with email: %', auth_user_record.id, auth_user_record.email;
        
        INSERT INTO public.users (id, email, username)
        VALUES (
            auth_user_record.id,
            auth_user_record.email,
            COALESCE(
                auth_user_record.raw_user_meta_data->>'username',
                split_part(auth_user_record.email, '@', 1)
            )
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            username = COALESCE(EXCLUDED.username, users.username);
    END LOOP;
END $$; 