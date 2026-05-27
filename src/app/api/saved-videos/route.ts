// GET  /api/saved-videos        → list of saved video IDs
// POST /api/saved-videos { video_id } → toggle (add/remove), returns { saved: boolean }

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await sb
    .from('profiles')
    .select('saved_videos')
    .eq('id', user.id)
    .single();

  return NextResponse.json({ savedVideoIds: (data?.saved_videos ?? []) as string[] });
}

export async function POST(request: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const videoId = body?.video_id;
  if (!videoId) return NextResponse.json({ error: 'video_id required' }, { status: 400 });

  const { data: profile } = await sb
    .from('profiles')
    .select('saved_videos')
    .eq('id', user.id)
    .single();

  const current: string[] = profile?.saved_videos ?? [];
  const isSaved = current.includes(videoId);
  const updated = isSaved
    ? current.filter((id) => id !== videoId)
    : [...current, videoId];

  await sb.from('profiles').update({ saved_videos: updated }).eq('id', user.id);

  return NextResponse.json({ saved: !isSaved });
}
