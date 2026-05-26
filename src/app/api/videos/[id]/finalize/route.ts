// POST /api/videos/[id]/finalize
//
// Kicks off the server-side finalize pipeline (TTS + lipsync + Manim + Bunny).
// Returns 202 Accepted immediately; the heavy work runs detached on the
// same Vercel function instance (bounded by maxDuration). The editor
// subscribes to videos.generation_progress via Supabase Realtime for live
// status — no client orchestration needed anymore.
//
// Auth: validates the caller is the video's teacher (via SSR cookies).

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { finalizeServerSide } from '@/lib/llm/finalize';
import { isBunnyEnabled } from '@/lib/config/bunny-config';

export const maxDuration = 300;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: videoId } = await context.params;

  if (!videoId) {
    return NextResponse.json({ error: 'videoId required' }, { status: 400 });
  }

  const sb = await createClient();
  if (!sb) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  // ── Auth: caller must own this video ─────────────────────────────────────
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: video, error: readErr } = await sb
    .from('videos')
    .select('id, teacher_id, status, slides_data, topic, language')
    .eq('id', videoId)
    .maybeSingle();

  if (readErr) {
    return NextResponse.json({ error: readErr.message }, { status: 500 });
  }
  if (!video) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  }
  if (video.teacher_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!video.slides_data || !Array.isArray(video.slides_data.slides) || video.slides_data.slides.length === 0) {
    return NextResponse.json({ error: 'Video has no slides yet — generate slides first' }, { status: 400 });
  }

  // Body params (all optional)
  const body = await request.json().catch(() => ({}));
  const incremental = body.incremental !== false; // default true
  const referenceVideoUrl: string | undefined = body.referenceVideoUrl;

  // Mark progress as queued immediately so the editor sees something
  await sb.from('videos').update({
    generation_progress: {
      stage: 'queued',
      progress: 0,
      updatedAt: new Date().toISOString(),
    },
  }).eq('id', videoId);

  // Fire-and-forget. Function stays alive until done or Vercel kills it at 300s.
  void finalizeServerSide({
    videoId,
    topic: video.topic,
    language: (video.language as 'tr' | 'en') || 'tr',
    referenceVideoUrl,
    incremental,
    bunnyEnabled: isBunnyEnabled(),
  }).catch((err) => {
    console.error(`[Finalize endpoint] Detached task threw for ${videoId}:`, err);
  });

  return NextResponse.json(
    { videoId, stage: 'queued', message: 'Finalize started; subscribe to videos.generation_progress for updates.' },
    { status: 202 }
  );
}
