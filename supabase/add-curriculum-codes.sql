-- MEB kazanım support.
-- Each video can be tagged with one or more MEB curriculum codes
-- (e.g. '8.2.1.1') so we can report curriculum coverage per teacher / school.
--
-- Idempotent.

ALTER TABLE videos
  ADD COLUMN IF NOT EXISTS curriculum_codes TEXT[] DEFAULT '{}'::TEXT[];

-- GIN index for fast "videos containing code X" lookups.
CREATE INDEX IF NOT EXISTS idx_videos_curriculum_codes
  ON videos USING GIN (curriculum_codes);
