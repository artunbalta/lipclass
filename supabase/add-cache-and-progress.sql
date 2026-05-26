-- PR for server-side finalize + content hash cache.
--
-- content_hash       : sha256 of (topic|description|language|tone|problem*|sourceOnly|sortedSourceIds)
--                      Used to dedup slide generation across video creations of the same teacher.
-- generation_progress: live progress writes from the server-side finalize pipeline.
--                      Editor subscribes to this row via Supabase Realtime so it can render
--                      stage / percentage / per-slide counters without polling.
--
-- Idempotent: safe to run multiple times.

ALTER TABLE videos
  ADD COLUMN IF NOT EXISTS content_hash TEXT,
  ADD COLUMN IF NOT EXISTS generation_progress JSONB;

-- Cache lookup index: teacher_id + content_hash with slides present.
CREATE INDEX IF NOT EXISTS idx_videos_content_hash
  ON videos (teacher_id, content_hash)
  WHERE content_hash IS NOT NULL AND slides_data IS NOT NULL;

-- Make sure videos table is broadcast to Realtime so the editor can subscribe
-- to UPDATEs on generation_progress. (No-op if already added.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'videos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE videos;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Realtime publication may not exist in self-hosted setups; ignore.
  RAISE NOTICE 'supabase_realtime publication not present, skipping ADD TABLE.';
END $$;
