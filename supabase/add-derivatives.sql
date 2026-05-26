-- Video derivatives — same slide content, different language/tone/level.
--
-- A derivative shares slide STRUCTURE (titles, content, bullets) with its
-- parent but has its own narration/TTS/lipsync. variant_label is a short
-- human-readable string ("İngilizce", "İlkokul seviyesi", "Resmi Ton").
--
-- Idempotent.

ALTER TABLE videos
  ADD COLUMN IF NOT EXISTS parent_video_id UUID REFERENCES videos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS variant_label TEXT;

CREATE INDEX IF NOT EXISTS idx_videos_parent
  ON videos (parent_video_id)
  WHERE parent_video_id IS NOT NULL;
