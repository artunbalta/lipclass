// Schools (multi-tenant root) — thin wrapper around Supabase queries.
//
// Used by:
//   - settings pages: link a teacher/student to their school
//   - future school-admin dashboard: enumerate members
//
// Slug normalisation lives here (and matches the SQL definition in
// add-schools.sql) so app code and DB stay in sync.

import { createClient } from '@/lib/supabase/client';
import type { School } from '@/types';

function normalizeSlug(name: string): string {
  return name.trim().toLowerCase();
}

interface SchoolRow {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  district: string | null;
  plan: string | null;
  max_teachers: number | null;
  created_at: string;
}

function mapSchool(row: SchoolRow): School {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    city: row.city || undefined,
    district: row.district || undefined,
    plan: row.plan || undefined,
    maxTeachers: row.max_teachers ?? undefined,
    createdAt: new Date(row.created_at),
  };
}

/**
 * Find an existing school by display name (case/whitespace insensitive).
 * Returns null when no row matches — caller can then offer to create one.
 */
export async function findSchoolByName(name: string): Promise<School | null> {
  const slug = normalizeSlug(name);
  if (!slug) return null;

  const sb = createClient();
  const { data, error } = await sb
    .from('schools')
    .select('id, name, slug, city, district, plan, max_teachers, created_at')
    .eq('slug', slug)
    .maybeSingle();

  if (error || !data) return null;
  return mapSchool(data as SchoolRow);
}

/**
 * Create a school if a row with the same slug doesn't already exist; either
 * way return the (existing or new) row. This is what the registration /
 * settings flow calls when the teacher types a school name.
 *
 * Race-safe: relies on the UNIQUE constraint on schools.slug. If two clients
 * call concurrently, the second one's INSERT will conflict and we re-read.
 */
export async function upsertSchoolByName(name: string): Promise<School | null> {
  const display = name.trim();
  const slug = normalizeSlug(display);
  if (!slug) return null;

  const existing = await findSchoolByName(display);
  if (existing) return existing;

  const sb = createClient();
  const { data, error } = await sb
    .from('schools')
    .insert({ name: display, slug })
    .select('id, name, slug, city, district, plan, max_teachers, created_at')
    .maybeSingle();

  if (error) {
    // Duplicate slug — another client beat us. Re-read.
    if (error.code === '23505') {
      return findSchoolByName(display);
    }
    console.error('[schools] upsert failed:', error.message);
    return null;
  }
  if (!data) return null;
  return mapSchool(data as SchoolRow);
}

/**
 * Bind the current user's profile to a school. Called immediately after
 * upsertSchoolByName from settings / onboarding.
 */
export async function linkProfileToSchool(
  userId: string,
  schoolId: string,
  displayName: string,
): Promise<{ ok: boolean; error?: string }> {
  const sb = createClient();
  const { error } = await sb
    .from('profiles')
    .update({ school_id: schoolId, school: displayName })
    .eq('id', userId);
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
