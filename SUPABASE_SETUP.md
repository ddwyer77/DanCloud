# DanCloud Supabase Setup Guide

This guide will help you set up Supabase as the backend for your DanCloud music sharing app.

## Prerequisites

- A Supabase account (sign up at [supabase.com](https://supabase.com))
- Your DanCloud React Native app

## Step 1: Create a New Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Fill in your project details:
   - **Name**: DanCloud
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose the region closest to your users
5. Click "Create new project"
6. Wait for the project to be set up (this takes a few minutes)

## Step 2: Get Your Project Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (something like `https://your-project-id.supabase.co`)
   - **Anon public key** (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

## Step 3: Configure Environment Variables

1. Open your `.env` file in the DanCloud project root
2. Replace the placeholder values with your actual Supabase credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 4: Set Up the Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the entire contents of `supabase-schema.sql` and paste it into the editor
4. Click "Run" to execute the schema

This will create all the necessary tables:
- `users` - User profiles and authentication
- `tracks` - Music tracks and metadata
- `follows` - User follow relationships
- `likes` - Track likes
- `reposts` - Track reposts
- `comments` - Track comments
- `notifications` - User notifications

## Step 5: Storage Buckets (Automated ✅)

The storage buckets and policies are automatically created when you run the SQL schema in Step 4! The schema creates:

- **Audio bucket** (`audio`) - For storing music tracks (max 50MB per file)
- **Images bucket** (`images`) - For storing cover art and profile images (max 10MB per file)
- **Storage policies** - Secure access controls for file uploads and downloads

You can verify the buckets were created by going to **Storage** in your Supabase dashboard.

## Step 6: Configure Authentication

1. Go to **Authentication** → **Settings**
2. Under **Site URL**, add your app's URL (for development, you can use `http://localhost:19006`)
3. Under **Redirect URLs**, add any additional URLs your app might use

### Enable Email Authentication
1. In **Authentication** → **Providers**
2. Make sure **Email** is enabled
3. Configure any additional providers you want (Google, Apple, etc.)

## Step 7: Test Your Setup

1. Start your React Native app:
   ```bash
   npx expo start
   ```

2. Try to register a new user account
3. Check your Supabase dashboard:
   - **Authentication** → **Users** should show your new user
   - **Table Editor** → **users** should show the user profile

## Step 8: Optional - Set Up Real-time Subscriptions

If you want real-time features (like live notifications), enable real-time:

1. Go to **Database** → **Replication**
2. Enable replication for tables you want to be real-time:
   - `notifications`
   - `comments`
   - `likes`

## Troubleshooting

### Common Issues

1. **"Missing Supabase environment variables" error**
   - Make sure your `.env` file is in the project root
   - Restart your Expo development server after adding environment variables

2. **Authentication not working**
   - Check that your Site URL is correctly configured in Step 6
   - Verify your API keys are correct
   - Make sure email authentication is enabled

3. **File uploads failing**
   - Verify storage buckets were created automatically (check Supabase Dashboard → Storage)
   - If buckets are missing, re-run the SQL schema from Step 4

4. **Database queries failing**
   - Verify the schema was applied correctly
   - Check Row Level Security policies

### Getting Help

- Check the [Supabase Documentation](https://supabase.com/docs)
- Visit the [Supabase Discord](https://discord.supabase.com)
- Review your browser's developer console for error messages

## Security Notes

- Never commit your `.env` file to version control
- The anon key is safe to use in client-side code
- Row Level Security (RLS) policies protect your data
- Always validate user input on both client and server side

## Next Steps

Once your Supabase backend is set up:

1. Test all app features (registration, login, uploading tracks, etc.)
2. Consider setting up database backups
3. Monitor usage in the Supabase dashboard
4. Set up proper error logging and monitoring

Your DanCloud app should now be fully connected to Supabase! 🎉 