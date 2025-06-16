-- Create playlist covers storage bucket
-- Migration: 20250129000001_create_playlist_covers_bucket.sql

-- Create the playlist-covers bucket
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types, owner)
VALUES (
  'playlist-covers',
  'playlist-covers',
  true,
  false,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  NULL
)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy to allow authenticated users to upload playlist covers
CREATE POLICY "Allow authenticated users to upload playlist covers" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'playlist-covers' AND 
  auth.role() = 'authenticated'
);

-- Create storage policy to allow public access to playlist covers
CREATE POLICY "Allow public access to playlist covers" ON storage.objects
FOR SELECT USING (bucket_id = 'playlist-covers');

-- Create storage policy to allow users to update their own playlist covers
CREATE POLICY "Allow users to update their own playlist covers" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'playlist-covers' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create storage policy to allow users to delete their own playlist covers
CREATE POLICY "Allow users to delete their own playlist covers" ON storage.objects
FOR DELETE USING (
  bucket_id = 'playlist-covers' AND 
  auth.uid()::text = (storage.foldername(name))[1]
); 