// POST /api/teacher/voice-clone/approve
//
// Teacher has listened to the test sentence and made a decision.
//
//   body: { decision: 'approve' | 'reject' }
//
// approve: promote voice_pending_voice_id → elevenlabs_voice_id (atomically).
//          The OLD voice (if any) is deleted from ElevenLabs only AFTER the
//          DB row reflects the promotion, so a crash between the two ops
//          leaves the new voice still usable.
//
// reject:  delete the pending voice from ElevenLabs, clear pending columns,
//          set status='ready' if there's still an active clone, otherwise
//          'none'. Reference video is kept — teacher can retry.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin, SupabaseClient } from '@supabase/supabase-js';
import { deleteVoice } from '@/lib/llm/elevenlabs';

export const maxDuration = 30;

function adminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase admin credentials missing');
  return createAdmin(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const decision = body?.decision;
  if (decision !== 'approve' && decision !== 'reject') {
    return NextResponse.json(
      { error: 'decision must be "approve" or "reject"' },
      { status: 400 },
    );
  }

  const admin = adminClient();
  const { data: prof } = await admin
    .from('profiles')
    .select('elevenlabs_voice_id, voice_pending_voice_id, reference_video_status')
    .eq('id', user.id)
    .single();

  if (!prof?.voice_pending_voice_id) {
    return NextResponse.json(
      { error: 'No pending voice clone to act on' },
      { status: 400 },
    );
  }

  if (decision === 'approve') {
    const oldVoiceId = prof.elevenlabs_voice_id;
    const newVoiceId = prof.voice_pending_voice_id;

    // Promote first, then delete the old voice. This ordering guarantees the
    // active clone is always something ElevenLabs can serve.
    const { error: updateErr } = await admin
      .from('profiles')
      .update({
        elevenlabs_voice_id: newVoiceId,
        voice_pending_voice_id: null,
        voice_pending_test_audio_url: null,
        reference_video_status: 'ready',
        voice_last_used_at: new Date().toISOString(),
      })
      .eq('id', user.id);
    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    if (oldVoiceId && oldVoiceId !== newVoiceId) {
      // Best-effort — losing this only burns one ElevenLabs slot; the cron
      // job catches orphans by name pattern anyway.
      await deleteVoice(oldVoiceId).catch((e) =>
        console.warn(`[VoiceClone] old voice ${oldVoiceId} not deleted:`, e),
      );
    }

    return NextResponse.json({ status: 'ready', voiceId: newVoiceId });
  }

  // ── reject ───────────────────────────────────────────────────────────────
  await deleteVoice(prof.voice_pending_voice_id).catch(() => {});

  // Remove the test sample mp3 — keep the source voice-sample.mp3 so a
  // retry doesn't re-extract from the video.
  await admin.storage
    .from('voice-samples')
    .remove([`${user.id}/test.mp3`])
    .catch(() => {});

  const fallbackStatus = prof.elevenlabs_voice_id ? 'ready' : 'none';

  await admin
    .from('profiles')
    .update({
      voice_pending_voice_id: null,
      voice_pending_test_audio_url: null,
      reference_video_status: fallbackStatus,
    })
    .eq('id', user.id);

  return NextResponse.json({ status: fallbackStatus });
}
