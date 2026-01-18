-- Check if email exists in auth.users or profiles
-- Run this in Supabase SQL Editor to debug email conflicts

-- Check in auth.users
SELECT id, email, created_at, email_confirmed_at, raw_user_meta_data
FROM auth.users
WHERE email = 'artun.balta@ug.bilkent.edu.tr';  -- Your email here

-- Check in profiles
SELECT id, email, name, role, created_at
FROM profiles
WHERE email = 'artun.balta@ug.bilkent.edu.tr';  -- Your email here

-- Check for orphaned users (in auth.users but not in profiles)
SELECT u.id, u.email, u.created_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- Check for duplicate emails in profiles (should not exist)
SELECT email, COUNT(*) as count
FROM profiles
GROUP BY email
HAVING COUNT(*) > 1;
