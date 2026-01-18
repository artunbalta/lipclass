-- Storage Bucket Policies for LipClass
-- Run this SQL in Supabase SQL Editor after creating the buckets

-- ==========================================
-- REFERENCE VIDEOS BUCKET
-- ==========================================

-- Policy: Users can upload their own reference videos
CREATE POLICY "Users can upload own reference videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'reference-videos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can read their own reference videos
CREATE POLICY "Users can read own reference videos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'reference-videos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own reference videos
CREATE POLICY "Users can delete own reference videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'reference-videos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- ==========================================
-- GENERATED VIDEOS BUCKET
-- ==========================================

-- Policy: Anyone can read generated videos (public)
CREATE POLICY "Anyone can read generated videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'generated-videos');

-- Policy: Users can upload their own generated videos
CREATE POLICY "Users can upload own generated videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'generated-videos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own generated videos
CREATE POLICY "Users can delete own generated videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'generated-videos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- ==========================================
-- THUMBNAILS BUCKET
-- ==========================================

-- Policy: Anyone can read thumbnails (public)
CREATE POLICY "Anyone can read thumbnails"
ON storage.objects FOR SELECT
USING (bucket_id = 'thumbnails');

-- Policy: Users can upload their own thumbnails
CREATE POLICY "Users can upload own thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'thumbnails' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own thumbnails
CREATE POLICY "Users can delete own thumbnails"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'thumbnails' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
