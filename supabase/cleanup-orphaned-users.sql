-- Clean up orphaned users (in auth.users but not in profiles)
-- This can happen if trigger fails during signup
-- Run this in Supabase SQL Editor if needed

-- Find orphaned users
SELECT u.id, u.email, u.created_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- If you want to delete orphaned users (USE WITH CAUTION):
-- First, manually verify these users should be deleted
-- Then uncomment and run:

-- DELETE FROM auth.users
-- WHERE id IN (
--   SELECT u.id
--   FROM auth.users u
--   LEFT JOIN profiles p ON u.id = p.id
--   WHERE p.id IS NULL
-- );
