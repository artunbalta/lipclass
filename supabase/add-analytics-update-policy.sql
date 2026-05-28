-- video_analytics needs UPDATE policy so the student can keep their session
-- row in sync (watched_duration, completed, liked) while watching.
--
-- The original schema only granted INSERT + SELECT. The watch page POSTs to
-- /api/video-analytics on mount, then PATCHes the same row every few seconds
-- and on slide changes; without this policy the PATCH silently no-ops.
--
-- Idempotent.

DROP POLICY IF EXISTS "Users update own analytics" ON video_analytics;
CREATE POLICY "Users update own analytics"
  ON video_analytics FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
