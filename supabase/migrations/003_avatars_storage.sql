-- Migration 003: Create avatars storage bucket with RLS policies
-- Users can upload/read/delete their own avatars, public read for all.

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload avatars to their own folder
CREATE POLICY "Users can upload own avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own avatars
CREATE POLICY "Users can update own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own avatars
CREATE POLICY "Users can delete own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Public read for all avatars (bucket is public)
CREATE POLICY "Public read avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');
