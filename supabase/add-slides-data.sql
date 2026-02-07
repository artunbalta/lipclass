-- Add slides_data column to videos table for slide-based lesson content
-- Run this migration on Supabase SQL Editor

ALTER TABLE videos ADD COLUMN IF NOT EXISTS slides_data JSONB;

-- Optional: Add a comment for documentation
COMMENT ON COLUMN videos.slides_data IS 'Slide-based lesson content: { slides: [{ slideNumber, title, content, bulletPoints, narrationText, audioUrl }] }';
