// Server-side cache for LLM-generated slides.
//
// Looks up previously generated slides_data by (teacher_id, content_hash) so
// we can skip the LLM call when a teacher creates a new video with identical
// inputs. Returns just the slide content — caller is responsible for copying
// it into the new video row.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { SlidesData } from '@/types';

let _adminClient: SupabaseClient | null = null;

function adminClient(): SupabaseClient {
  if (_adminClient) return _adminClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase admin credentials missing (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
  }
  _adminClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _adminClient;
}

/**
 * Look up an existing slides_data for (teacherId, contentHash).
 * Returns null when no cached row exists or admin client isn't configured.
 *
 * Errors are swallowed and logged — cache should never block generation.
 */
export async function findCachedSlides(
  teacherId: string,
  contentHash: string
): Promise<SlidesData | null> {
  try {
    const sb = adminClient();
    const { data, error } = await sb
      .from('videos')
      .select('slides_data')
      .eq('teacher_id', teacherId)
      .eq('content_hash', contentHash)
      .not('slides_data', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('[SlideCache] lookup error:', error.message);
      return null;
    }

    const row = data as { slides_data?: SlidesData } | null;
    if (!row || !row.slides_data || !Array.isArray(row.slides_data.slides)) {
      return null;
    }

    // Strip media URLs from the cached copy — the new video will re-run TTS/lipsync
    // against its own reference video. We only reuse the *content* (title, body,
    // bullets, narration text).
    const sanitizedSlides = row.slides_data.slides.map((s) => ({
      slideNumber: s.slideNumber,
      title: s.title,
      content: s.content,
      bulletPoints: s.bulletPoints || [],
      narrationText: s.narrationText || '',
    }));

    return { slides: sanitizedSlides };
  } catch (err) {
    console.warn('[SlideCache] lookup threw, treating as miss:', err);
    return null;
  }
}
