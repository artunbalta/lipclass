-- Per-teacher voice cloning (ElevenLabs IVC).
--
-- Pipeline:
--   1. Teacher uploads reference video → status='extracting_audio'
--   2. Modal extracts mp3 → status='cloning_voice'
--   3. ElevenLabs IVC creates voice_id → status='awaiting_approval'
--   4. Teacher hears test sentence and approves → status='ready'
--                                       rejects → clone deleted, status='none'
--
-- The new clone is ONLY persisted to profiles.elevenlabs_voice_id after the
-- teacher approves the test sentence. Until then, the previous clone (if any)
-- stays active so video generation never breaks mid-flow.
--
-- voice_last_used_at tracks the last TTS call that used this teacher's clone.
-- A nightly cron deletes ElevenLabs voices that haven't been used in 30 days,
-- but only sets elevenlabs_voice_id=null on the profile (next render kicks
-- off a fresh clone if the reference video is still there).
--
-- Idempotent: safe to run multiple times.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS elevenlabs_voice_id TEXT,
  ADD COLUMN IF NOT EXISTS voice_sample_url TEXT,
  ADD COLUMN IF NOT EXISTS voice_consent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS voice_consent_version TEXT,
  ADD COLUMN IF NOT EXISTS voice_last_used_at TIMESTAMPTZ,
  -- Holds the in-flight clone awaiting teacher approval; promoted to
  -- elevenlabs_voice_id when the teacher accepts the test sentence.
  ADD COLUMN IF NOT EXISTS voice_pending_voice_id TEXT,
  ADD COLUMN IF NOT EXISTS voice_pending_test_audio_url TEXT;

-- reference_video_status legal values:
--   'none' | 'uploading' | 'extracting_audio' | 'cloning_voice'
--   | 'awaiting_approval' | 'ready' | 'failed'
-- Stored as TEXT (no enum) to make adding states cheap.

CREATE INDEX IF NOT EXISTS idx_profiles_voice_last_used
  ON profiles (voice_last_used_at)
  WHERE elevenlabs_voice_id IS NOT NULL;

-- Per-video override: 'teacher' (use cloned voice), 'robot' (generic TTS).
-- Default 'teacher' when teacher has a ready clone, otherwise the application
-- code falls back to 'robot' automatically.
ALTER TABLE videos
  ADD COLUMN IF NOT EXISTS voice_mode TEXT DEFAULT 'teacher'
    CHECK (voice_mode IN ('teacher', 'robot'));

-- ── Storage bucket for extracted voice samples ─────────────────────────────
-- Private — only the owner and service_role can read. Signed URLs handed to
-- ElevenLabs for the /voices/add call expire in 1h.

INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-samples', 'voice-samples', false)
ON CONFLICT (id) DO NOTHING;

-- Teachers can upload to their own folder (uid/...)
DROP POLICY IF EXISTS "teacher_own_voice_sample_write" ON storage.objects;
CREATE POLICY "teacher_own_voice_sample_write"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'voice-samples'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "teacher_own_voice_sample_read" ON storage.objects;
CREATE POLICY "teacher_own_voice_sample_read"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'voice-samples'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "teacher_own_voice_sample_delete" ON storage.objects;
CREATE POLICY "teacher_own_voice_sample_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'voice-samples'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Service role gets full access for the Modal extractor and the cleanup cron.
DROP POLICY IF EXISTS "service_role_voice_sample_all" ON storage.objects;
CREATE POLICY "service_role_voice_sample_all"
ON storage.objects FOR ALL
USING (
  bucket_id = 'voice-samples'
  AND auth.jwt() ->> 'role' = 'service_role'
);

-- ── Realtime: make sure UPDATE on profiles is broadcast ────────────────────
-- The reference page subscribes to profile updates to render live status
-- (extracting_audio → cloning_voice → awaiting_approval → ready).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'supabase_realtime publication not present, skipping.';
END $$;

COMMENT ON COLUMN profiles.elevenlabs_voice_id IS
  'ElevenLabs IVC voice_id; promoted from voice_pending_voice_id after teacher approves the test sentence.';
COMMENT ON COLUMN profiles.voice_pending_voice_id IS
  'In-flight clone awaiting teacher approval. Active elevenlabs_voice_id stays unchanged until approval.';
COMMENT ON COLUMN profiles.voice_last_used_at IS
  'Touched by tts.ts every time this clone is used. Cron deletes clones idle for 30+ days.';
COMMENT ON COLUMN videos.voice_mode IS
  '"teacher" → use profiles.elevenlabs_voice_id; "robot" → skip ElevenLabs, use fal.ai fallback.';
