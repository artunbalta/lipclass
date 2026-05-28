// POST /api/teacher/voice-clone/test
//
// Re-renders the approval test sentence with a custom message OR refreshes
// the default one (if the signed URL expired). Used when the teacher wants
// to hear a different sample before committing.
//
//   body: { text?: string }   // optional custom sentence, otherwise default

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin, SupabaseClient } from '@supabase/supabase-js';
import { renderTestSentence } from '../route';

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

  const admin = adminClient();
  const { data: prof } = await admin
    .from('profiles')
    .select('voice_pending_voice_id, elevenlabs_voice_id')
    .eq('id', user.id)
    .single();

  // Prefer the pending voice — the test endpoint exists primarily to drive
  // the approval flow. Fall back to the active voice when the teacher just
  // wants to re-hear their current clone.
  const voiceId = prof?.voice_pending_voice_id || prof?.elevenlabs_voice_id;
  if (!voiceId) {
    return NextResponse.json({ error: 'No voice clone to test' }, { status: 400 });
  }

  try {
    const url = await renderTestSentence(admin, user.id, voiceId);
    await admin
      .from('profiles')
      .update({ voice_pending_test_audio_url: url })
      .eq('id', user.id);
    return NextResponse.json({ testAudioUrl: url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[VoiceClone:test] ${user.id} failed:`, msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
