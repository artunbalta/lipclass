// POST /api/videos/[id]/like
//
//   body: { liked: boolean }
//
// Toggles the like state for the authenticated user on this video. The
// underlying storage is video_analytics.liked — we update the most recent
// session row, or create one if the user hasn't started watching yet.
//
// The videos.like_count column is intentionally NOT touched here: RLS gives
// videos.UPDATE only to the teacher who owns the row, and the teacher
// analytics route already computes like rates from video_analytics directly.
// Keeping a single source of truth avoids inconsistency.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 10;

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, ctx: Params) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: videoId } = await ctx.params;
  if (!videoId) {
    return NextResponse.json({ error: 'videoId required' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const desired = typeof body?.liked === 'boolean' ? body.liked : null;
  if (desired === null) {
    return NextResponse.json({ error: 'liked (boolean) required' }, { status: 400 });
  }

  // Find this user's most recent analytics row for the video.
  const { data: existing, error: readErr } = await sb
    .from('video_analytics')
    .select('id, liked')
    .eq('user_id', user.id)
    .eq('video_id', videoId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (readErr) {
    return NextResponse.json({ error: readErr.message }, { status: 500 });
  }

  if (existing) {
    const { error: updateErr } = await sb
      .from('video_analytics')
      .update({ liked: desired })
      .eq('id', existing.id)
      .eq('user_id', user.id);
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  } else {
    // No prior session yet — create one with the like already set. The
    // increment_view_on_analytics trigger fires here too, which is fine:
    // explicit engagement counts as a view.
    const { error: insertErr } = await sb.from('video_analytics').insert({
      video_id: videoId,
      user_id: user.id,
      watched_duration: 0,
      completed: false,
      liked: desired,
    });
    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ liked: desired });
}

// GET /api/videos/[id]/like — { liked: boolean }
//
// Returns whether the current user has the most-recent analytics row with
// liked=true. Used to hydrate the heart button on watch page load.
export async function GET(_req: NextRequest, ctx: Params) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ liked: false });

  const { id: videoId } = await ctx.params;
  if (!videoId) return NextResponse.json({ liked: false });

  const { data } = await sb
    .from('video_analytics')
    .select('liked')
    .eq('user_id', user.id)
    .eq('video_id', videoId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ liked: !!data?.liked });
}
