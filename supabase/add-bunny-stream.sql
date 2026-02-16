-- Add Bunny Stream delivery support to videos table.
-- Per-slide Bunny GUIDs are stored inside slides_data JSONB (each slide has its own video).
-- These top-level columns track the overall ingestion status for the lesson.

ALTER TABLE videos ADD COLUMN IF NOT EXISTS video_provider TEXT DEFAULT 'fal';
ALTER TABLE videos ADD COLUMN IF NOT EXISTS bunny_ingestion_status TEXT DEFAULT NULL;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS bunny_ingestion_error TEXT DEFAULT NULL;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS bunny_ingested_at TIMESTAMPTZ DEFAULT NULL;

-- Index for quick lookups by provider
CREATE INDEX IF NOT EXISTS idx_videos_video_provider ON videos(video_provider);

COMMENT ON COLUMN videos.video_provider IS 'Video delivery provider: fal (default) or bunny';
COMMENT ON COLUMN videos.bunny_ingestion_status IS 'Bunny ingestion status: pending, success, failed, or null';
COMMENT ON COLUMN videos.bunny_ingestion_error IS 'Error message if Bunny ingestion failed';
COMMENT ON COLUMN videos.bunny_ingested_at IS 'Timestamp when Bunny ingestion completed';
