-- Migration: Add push_token column to profiles for Expo push notifications
-- Run this in your Supabase SQL editor

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS push_token TEXT DEFAULT NULL;

-- Index for quick lookup when sending notifications
CREATE INDEX IF NOT EXISTS idx_profiles_push_token ON profiles (push_token)
  WHERE push_token IS NOT NULL;

-- ─── HOW TO SEND NOTIFICATIONS FROM THE NEXT.JS API ────────────────────────
--
-- After video generation completes (in /api/generate-video route), add this:
--
--   const { data: profile } = await supabase
--     .from('profiles')
--     .select('push_token')
--     .eq('id', teacherId)
--     .single();
--
--   if (profile?.push_token) {
--     await fetch('https://exp.host/--/api/v2/push/send', {
--       method: 'POST',
--       headers: { 'Content-Type': 'application/json' },
--       body: JSON.stringify({
--         to: profile.push_token,
--         title: 'Ders Hazır! 🎉',
--         body: `"${videoTitle}" dersiniz tamamlandı.`,
--         data: { videoId },
--       }),
--     });
--   }
--
-- ────────────────────────────────────────────────────────────────────────────
