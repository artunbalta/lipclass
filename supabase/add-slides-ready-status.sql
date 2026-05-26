-- Slides-first / approval workflow.
--
-- Adds a new 'slides_ready' state between 'draft' and 'processing':
--   draft         → row created, no slides yet
--   slides_ready  → LLM produced slides; teacher reviewing/editing
--   processing    → finalize approved: TTS + lipsync + Manim running
--   published     → all media ready
--   failed        → generation error
--
-- `slides_approved_at` records when the teacher clicked "Onayla ve Üret",
-- so analytics can separate "time-to-slides" from "time-to-publish".
--
-- IMPORTANT (Postgres): ALTER TYPE ... ADD VALUE cannot run inside a
-- transaction that also uses the new value. Run this file standalone
-- (Supabase SQL editor or psql) before deploying code that references
-- 'slides_ready'.

ALTER TYPE video_status ADD VALUE IF NOT EXISTS 'slides_ready' BEFORE 'processing';

ALTER TABLE videos
  ADD COLUMN IF NOT EXISTS slides_approved_at TIMESTAMP WITH TIME ZONE;

-- Index to find videos currently awaiting teacher approval
CREATE INDEX IF NOT EXISTS idx_videos_status_slides_ready
  ON videos (teacher_id, created_at DESC)
  WHERE status = 'slides_ready';
