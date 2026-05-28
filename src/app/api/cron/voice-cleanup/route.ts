// GET /api/cron/voice-cleanup
//
// Nightly job that reclaims ElevenLabs voice slots from inactive teachers.
//
// A clone is considered idle when voice_last_used_at is older than 30 days
// (or NULL — never touched after creation). For each such row we:
//   1. Delete the ElevenLabs voice (ignored if 404).
//   2. NULL out profiles.elevenlabs_voice_id.
//   3. Leave reference_video_status='ready' but the next /api/teacher/voice-clone
//      run can re-create the clone from the existing reference video.
//
// Triggered by Vercel Cron (see vercel.json) — auth is the CRON_SECRET header
// pattern Vercel injects on scheduled invocations.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { deleteVoice } from '@/lib/llm/elevenlabs';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const IDLE_DAYS = 30;

export async function GET(req: NextRequest) {
  // Vercel Cron sends a Bearer token sourced from CRON_SECRET env. Local
  // / manual invocations require the same header.
  const auth = req.headers.get('authorization') ?? '';
  const expected = process.env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: 'Supabase admin credentials missing' }, { status: 503 });
  }
  if (!process.env.ELEVENLABS_API_KEY) {
    return NextResponse.json({ error: 'ELEVENLABS_API_KEY missing' }, { status: 503 });
  }

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const cutoff = new Date(Date.now() - IDLE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // Idle = has an ElevenLabs voice AND (never used OR last used before cutoff)
  const { data: idle, error } = await admin
    .from('profiles')
    .select('id, elevenlabs_voice_id, voice_last_used_at')
    .not('elevenlabs_voice_id', 'is', null)
    .or(`voice_last_used_at.is.null,voice_last_used_at.lt.${cutoff}`)
    .limit(100); // small batch — cron runs daily, won't accumulate

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const candidates = idle ?? [];
  const reclaimed: string[] = [];
  const failures: Array<{ id: string; reason: string }> = [];

  for (const row of candidates) {
    try {
      // Skip rows that became active between the SELECT and DELETE — last_used
      // could have been touched mid-flight. Re-read to be safe.
      const { data: fresh } = await admin
        .from('profiles')
        .select('elevenlabs_voice_id, voice_last_used_at')
        .eq('id', row.id)
        .single();

      if (!fresh?.elevenlabs_voice_id) continue;
      if (
        fresh.voice_last_used_at &&
        new Date(fresh.voice_last_used_at).getTime() >
          Date.now() - IDLE_DAYS * 24 * 60 * 60 * 1000
      ) {
        continue;
      }

      await deleteVoice(fresh.elevenlabs_voice_id);

      await admin
        .from('profiles')
        .update({
          elevenlabs_voice_id: null,
          // Keep reference_video_status='ready' or whatever it was — the user
          // still has a usable voice sample on file and can reclone.
        })
        .eq('id', row.id);

      reclaimed.push(row.id);
    } catch (err) {
      failures.push({
        id: row.id,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    checked: candidates.length,
    reclaimed: reclaimed.length,
    failures,
    cutoff,
  });
}
