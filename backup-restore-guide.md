# DanCloud Data Backup & Recovery Guide

## The Problem
When running `supabase db reset --linked`, all data is lost including:
- User authentication records
- User profiles  
- Uploaded tracks and files
- All user-generated content

## Prevention Strategy

### 1. Always Backup Before Database Operations

**Before any database reset or major migration:**

```bash
# Backup all data
supabase db dump --linked --data-only > backup-$(date +%Y%m%d-%H%M%S).sql

# Backup specific tables
supabase db dump --linked --data-only --table=auth.users > auth-backup.sql
supabase db dump --linked --data-only --table=public.users > users-backup.sql
supabase db dump --linked --data-only --table=public.tracks > tracks-backup.sql
```

### 2. Use Local Development Database

**For development, use local database instead of production:**

```bash
# Start local Supabase
supabase start

# Use local database for development
supabase db reset --local

# Only push to production when ready
supabase db push --linked
```

### 3. Enhanced Seed File

Create comprehensive seed data with test accounts and sample content.

## Recovery Steps (Current Situation)

### Step 1: Recreate Your Test Accounts

Since the auth records were deleted, you need to register again:

1. **Open your app**
2. **Go to Register screen**
3. **Create new accounts with these credentials:**

**Primary Test Account:**
- Email: `ddwyer77@gmail.com`
- Username: `ddwyer77`
- Password: `[your-choice]`

**Secondary Test Account:**
- Email: `clipmodego@gmail.com` 
- Username: `clipmode`
- Password: `[your-choice]`

**Third Test Account:**
- Email: `dannydwyermusic@gmail.com`
- Username: `dannymusic`
- Password: `[your-choice]`

### Step 2: The app will automatically create user profiles

The migration `20250126000002_create_specific_user_profile.sql` should handle profile creation, but if it doesn't work, the registration process will create them.

### Step 3: Re-upload Test Content

You'll need to re-upload any test tracks and content through the app.

## Future-Proof Development Workflow

### Safe Database Development Process:

1. **Always backup first:**
   ```bash
   supabase db dump --linked --data-only > backup-$(date +%Y%m%d).sql
   ```

2. **Test migrations locally:**
   ```bash
   supabase db reset --local
   supabase db push --local
   ```

3. **Only push to production when tested:**
   ```bash
   supabase db push --linked
   ```

4. **If something goes wrong, restore:**
   ```bash
   # Restore from backup
   psql "your-connection-string" < backup-file.sql
   ```

## Emergency Recovery Commands

If you ever lose data again:

```bash
# 1. Create full backup of current state (even if broken)
supabase db dump --linked > emergency-backup.sql

# 2. Reset and restore from known good backup
supabase db reset --linked
supabase db push --linked
psql "your-connection-string" < your-backup-file.sql

# 3. Re-run seed data
supabase db push --linked --include-seed
```

## Recommended Development Setup

### Use Environment-Specific Databases:

1. **Local Development**: `supabase start` (local database)
2. **Staging**: Separate Supabase project for testing
3. **Production**: Your main project (never reset this!)

### Regular Backup Schedule:

```bash
# Add to your development routine
# Daily backup before major changes
supabase db dump --linked --data-only > backups/daily-$(date +%Y%m%d).sql
```

## Storage/Files Recovery

For uploaded files (audio, images), you'll also need to backup the Supabase Storage buckets:

```bash
# List storage objects
supabase storage ls --linked audio
supabase storage ls --linked images

# Download all files (manual process)
# Unfortunately, there's no bulk download command yet
```

## Key Takeaways

1. ✅ **Never run `supabase db reset --linked` without backup**
2. ✅ **Use local development database for testing**
3. ✅ **Always backup before major changes**
4. ✅ **Keep comprehensive seed data**
5. ✅ **Test migrations locally first**

This will prevent future data loss and make recovery much easier! 