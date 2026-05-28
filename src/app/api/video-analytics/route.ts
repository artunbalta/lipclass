// Engagement tracking for students.
//
//   POST  /api/video-analytics       — start a new watch session, returns { sessionId, alreadyLiked }
//   PATCH /api/video-analytics       — update session { sessionId, watchedDuration?, completed?, liked? }
//
// One row per watch session. The `videos.view_count` trigger fires on every
// INSERT, so reopening the page bumps the view counter. If you ever need
// "unique viewers" rather than session counts, swap the insert for an upsert
// on (user_id, video_id) here — DB constraint is not required because the
// trigger uses NEW.video_id which stays correct in either case.
//
// `liked` is per-session for now (matches existing analytics route assumptions).
// `alreadyLiked` is computed as "any prior row by this user on this video has
// liked=true" so the heart button starts in the right state on page load.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 10;

export async function POST(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const videoId: string | undefined = body?.videoId;
  if (!videoId) {
    return NextResponse.json({ error: 'videoId required' }, { status: 400 });
  }

  // Read current like state across all prior sessions so the UI hydrates
  // correctly. One round-trip is fine; this isn't a hot path.
  const [{ data: prior }, { data: inserted, error: insertErr }] = await Promise.all([
    sb
      .from('video_analytics')
      .select('liked')
      .eq('user_id', user.id)
      .eq('video_id', videoId)
      .eq('liked', true)
      .limit(1),
    sb
      .from('video_analytics')
      .insert({
        video_id: videoId,
        user_id: user.id,
        watched_duration: 0,
        completed: false,
        liked: false,
      })
      .select('id')
      .single(),
  ]);

  if (insertErr) {
    console.error('[video-analytics POST] insert failed:', insertErr);
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({
    sessionId: inserted.id,
    alreadyLiked: (prior?.length ?? 0) > 0,
  });
}

export async function PATCH(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (typeof body.watchedDuration === 'number' && body.watchedDuration >= 0) {
    update.watched_duration = Math.round(body.watchedDuration);
  }
  if (typeof body.completed === 'boolean') {
    update.completed = body.completed;
  }
  if (typeof body.liked === 'boolean') {
    update.liked = body.liked;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true, noop: true });
  }

  // RLS guarantees user_id=auth.uid() — the .eq('user_id') is belt-and-suspenders
  // so an honest server bug can't update someone else's row.
  const { error } = await sb
    .from('video_analytics')
    .update(update)
    .eq('id', body.sessionId)
    .eq('user_id', user.id);

  if (error) {
    console.error('[video-analytics PATCH] failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
