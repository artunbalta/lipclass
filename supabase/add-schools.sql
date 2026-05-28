-- Multi-tenant foundation: schools table + profiles.school_id FK.
--
-- The original schema stored profiles.school as free-form TEXT, which made
-- "show me all teachers/students at THIS school" queries unreliable (typos,
-- abbreviations, casing). This migration:
--
--   1. Creates a schools table keyed by a stable UUID.
--   2. Adds profiles.school_id as a nullable FK.
--   3. Backfills schools from existing distinct profiles.school text values
--      (case-folded for grouping). The original profiles.school column is
--      LEFT IN PLACE for now so the UI keeps rendering — it becomes a
--      display-only mirror; school_id is the source of truth.
--   4. Opens RLS so school members can see their school row and each other
--      (read-only). Write access to schools is teacher-or-service-role for
--      simplicity until we add a 'school_admin' role in a later sprint.
--
-- Idempotent: safe to run multiple times.

CREATE TABLE IF NOT EXISTS schools (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Canonical display name (we keep the original casing of the first teacher
  -- who registered the school for now).
  name         TEXT NOT NULL,
  -- Normalised key used for matching new teachers to existing schools
  -- (lower + trim). Unique so duplicates can't appear.
  slug         TEXT NOT NULL UNIQUE,
  -- City / district / education board — all optional. Filled in later via
  -- school admin onboarding when we ship that flow.
  city         TEXT,
  district     TEXT,
  -- Plan / billing scaffolding kept nullable for now. Future sprint wires
  -- iyzico subscription state here.
  plan         TEXT,
  max_teachers INTEGER,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schools_slug ON schools(slug);

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_school_id ON profiles(school_id);

-- ── Backfill ───────────────────────────────────────────────────────────────
-- For every distinct non-empty profiles.school text, ensure a schools row
-- with the matching slug exists, then point profiles.school_id at it.
--
-- We DO NOT remove profiles.school here — that's a follow-up cleanup once
-- the UI has fully migrated to reading via JOIN.

WITH distinct_schools AS (
  SELECT
    btrim(school)                            AS display_name,
    lower(btrim(school))                     AS slug
  FROM profiles
  WHERE school IS NOT NULL AND btrim(school) <> ''
  GROUP BY 1, 2
),
inserted AS (
  INSERT INTO schools (name, slug)
  SELECT display_name, slug FROM distinct_schools
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
  RETURNING id, slug
)
UPDATE profiles p
SET school_id = i.id
FROM inserted i
WHERE lower(btrim(p.school)) = i.slug
  AND p.school_id IS NULL;

-- ── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can resolve the school they belong to. We don't
-- expose plan/max_teachers in any public query yet (UI selects specific
-- columns), but if you later add a public school directory be careful.
DROP POLICY IF EXISTS "Members can read their school" ON schools;
CREATE POLICY "Members can read their school"
  ON schools FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.school_id = schools.id
    )
  );

-- During onboarding the user creates/joins their school. Allow INSERT by
-- authenticated users (slug uniqueness prevents duplicates); UPDATE/DELETE
-- stays service-role-only until 'school_admin' exists.
DROP POLICY IF EXISTS "Authenticated can create school" ON schools;
CREATE POLICY "Authenticated can create school"
  ON schools FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ── profiles policies: extend so members can see each other ────────────────
-- Existing "Users can view their own profile" stays. Add a new policy that
-- lets profile-A read profile-B when both belong to the same school.
-- Avoids leaking other schools' members.

DROP POLICY IF EXISTS "Members can view profiles in same school" ON profiles;
CREATE POLICY "Members can view profiles in same school"
  ON profiles FOR SELECT
  USING (
    school_id IS NOT NULL
    AND school_id IN (
      SELECT school_id FROM profiles
      WHERE id = auth.uid() AND school_id IS NOT NULL
    )
  );

COMMENT ON TABLE schools IS
  'Multi-tenant root. Every teacher / student profile may belong to at most one school via profiles.school_id.';
COMMENT ON COLUMN schools.slug IS
  'Lowercased / trimmed name used to dedupe when teachers register independently. Future onboarding presents existing schools by slug match.';
COMMENT ON COLUMN profiles.school_id IS
  'Foreign key to schools. Backfilled from the legacy profiles.school text column. NULL means independent / unaffiliated user.';
