// Voice clone lifecycle endpoints.
//
//   POST   /api/teacher/voice-clone        → start extraction + cloning
//   DELETE /api/teacher/voice-clone        → KVKK silme — wipe clone + sample
//   GET    /api/teacher/voice-clone        → current status snapshot
//
// The POST handler runs fire-and-forget:
//   1. Set profiles.reference_video_status='extracting_audio'
//   2. Call Modal → mp3 in voice-samples bucket (signed URL)
//   3. Set status='cloning_voice'
//   4. Call ElevenLabs IVC → voice_id
//   5. Stash in profiles.voice_pending_voice_id + render a test sentence
//   6. Set status='awaiting_approval'
//   7. (later) /approve promotes pending → active OR /test re-renders OR
//      DELETE wipes it.
//
// Until the teacher approves the test sentence, the previous voice_id (if any)
// keeps serving video generation, so we never break in-flight finalize jobs.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin, SupabaseClient } from '@supabase/supabase-js';
import {
  cloneVoiceFromUrl,
  deleteVoice,
  isElevenLabsConfigured,
  synthesizeMp3,
} from '@/lib/llm/elevenlabs';

export const maxDuration = 300; // Modal (~3 min) + ElevenLabs (~60s) + test (~10s)

function adminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase admin credentials missing');
  return createAdmin(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Short sentence that uses every Turkish vowel + a couple of common consonants
// so the teacher can sanity-check the clone without listening to a long clip.
const TEST_SENTENCE_TR =
  'Merhaba, ben senin yapay zeka destekli sesin. Birazdan derslerini benimle anlatabilirsin.';
const TEST_SENTENCE_EN =
  "Hello, I'm your AI voice. In a moment, you'll be able to narrate your lessons with me.";

interface VoiceCloneStatus {
  status: string;
  hasActiveClone: boolean;
  hasPendingClone: boolean;
  pendingTestAudioUrl: string | null;
  consentAt: string | null;
  lastUsedAt: string | null;
}

interface VoiceProfileRow {
  reference_video_status: string | null;
  elevenlabs_voice_id: string | null;
  voice_pending_voice_id: string | null;
  voice_pending_test_audio_url: string | null;
  voice_consent_at: string | null;
  voice_last_used_at: string | null;
}

async function readStatus(
  admin: SupabaseClient,
  userId: string,
): Promise<VoiceCloneStatus> {
  const { data } = await admin
    .from('profiles')
    .select(
      'reference_video_status, elevenlabs_voice_id, voice_pending_voice_id, ' +
        'voice_pending_test_audio_url, voice_consent_at, voice_last_used_at',
    )
    .eq('id', userId)
    .single<VoiceProfileRow>();

  return {
    status: data?.reference_video_status ?? 'none',
    hasActiveClone: !!data?.elevenlabs_voice_id,
    hasPendingClone: !!data?.voice_pending_voice_id,
    pendingTestAudioUrl: data?.voice_pending_test_audio_url ?? null,
    consentAt: data?.voice_consent_at ?? null,
    lastUsedAt: data?.voice_last_used_at ?? null,
  };
}

// ── GET ──────────────────────────────────────────────────────────────────────

export async function GET() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const status = await readStatus(adminClient(), user.id);
  return NextResponse.json(status);
}

// ── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!isElevenLabsConfigured()) {
    return NextResponse.json(
      { error: 'Voice cloning is not configured on this server (ELEVENLABS_API_KEY missing).' },
      { status: 503 },
    );
  }
  if (!process.env.MODAL_AUDIO_EXTRACT_URL) {
    return NextResponse.json(
      { error: 'Audio extractor is not configured (MODAL_AUDIO_EXTRACT_URL missing).' },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const { referenceVideoUrl, consent } = body as {
    referenceVideoUrl?: string;
    consent?: boolean;
  };

  if (!referenceVideoUrl) {
    return NextResponse.json({ error: 'referenceVideoUrl is required' }, { status: 400 });
  }
  if (consent !== true) {
    return NextResponse.json(
      { error: 'KVKK voice cloning consent is required' },
      { status: 400 },
    );
  }

  const admin = adminClient();

  // Block parallel clones — if one is already running for this teacher, refuse.
  const { data: prof } = await admin
    .from('profiles')
    .select('reference_video_status')
    .eq('id', user.id)
    .single();
  const blockingStates = new Set(['extracting_audio', 'cloning_voice']);
  if (prof?.reference_video_status && blockingStates.has(prof.reference_video_status)) {
    return NextResponse.json(
      { error: 'A clone is already being prepared. Please wait for it to finish.' },
      { status: 409 },
    );
  }

  // Persist consent + new reference URL, flip status BEFORE the long job so
  // the realtime subscriber sees "extracting_audio" without polling.
  await admin
    .from('profiles')
    .update({
      voice_consent_at: new Date().toISOString(),
      voice_consent_version: 'v1',
      reference_video_url: referenceVideoUrl,
      reference_video_status: 'extracting_audio',
      // Clear any stale pending state from a previous failed attempt.
      voice_pending_voice_id: null,
      voice_pending_test_audio_url: null,
    })
    .eq('id', user.id);

  // Fire-and-forget — caller subscribes to profiles realtime channel.
  void runVoiceClonePipeline(user.id, referenceVideoUrl, admin).catch((err) => {
    console.error(`[VoiceClone] Pipeline failed for ${user.id}:`, err);
  });

  return NextResponse.json(
    {
      stage: 'extracting_audio',
      message: 'Sesin hazırlanıyor — yaklaşık 1-2 dakika sürer.',
    },
    { status: 202 },
  );
}

// ── DELETE (KVKK right-to-erasure) ───────────────────────────────────────────

export async function DELETE() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = adminClient();
  const { data: prof } = await admin
    .from('profiles')
    .select('elevenlabs_voice_id, voice_pending_voice_id')
    .eq('id', user.id)
    .single();

  // Delete both active and pending ElevenLabs voices.
  if (prof?.elevenlabs_voice_id) {
    await deleteVoice(prof.elevenlabs_voice_id).catch(() => {});
  }
  if (prof?.voice_pending_voice_id) {
    await deleteVoice(prof.voice_pending_voice_id).catch(() => {});
  }

  // Remove the extracted voice sample from storage.
  await admin.storage
    .from('voice-samples')
    .remove([`${user.id}/voice.mp3`, `${user.id}/test.mp3`])
    .catch(() => {});

  await admin
    .from('profiles')
    .update({
      elevenlabs_voice_id: null,
      voice_pending_voice_id: null,
      voice_pending_test_audio_url: null,
      voice_sample_url: null,
      voice_last_used_at: null,
      reference_video_status: 'none',
    })
    .eq('id', user.id);

  return NextResponse.json({ ok: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// Background pipeline
// ─────────────────────────────────────────────────────────────────────────────

async function runVoiceClonePipeline(
  teacherId: string,
  referenceVideoUrl: string,
  admin: SupabaseClient,
): Promise<void> {
  try {
    // ── 1. Modal: extract audio ────────────────────────────────────────────
    const extractRes = await fetch(process.env.MODAL_AUDIO_EXTRACT_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        video_url: referenceVideoUrl,
        teacher_id: teacherId,
      }),
      signal: AbortSignal.timeout(240_000),
    });

    if (!extractRes.ok) {
      throw new Error(`Audio extractor returned HTTP ${extractRes.status}`);
    }

    const extract = (await extractRes.json()) as {
      audio_url: string | null;
      duration_seconds: number;
      error: string | null;
    };
    if (extract.error || !extract.audio_url) {
      throw new Error(extract.error || 'Audio extraction returned no URL');
    }

    await admin
      .from('profiles')
      .update({
        voice_sample_url: extract.audio_url,
        reference_video_status: 'cloning_voice',
      })
      .eq('id', teacherId);

    // ── 2. ElevenLabs IVC ──────────────────────────────────────────────────
    const { data: profile } = await admin
      .from('profiles')
      .select('name, language')
      .eq('id', teacherId)
      .single();

    const cloneName = `LipClass-${(profile?.name || 'Teacher').slice(0, 32)}-${teacherId.slice(0, 8)}`;
    const { voiceId: pendingVoiceId } = await cloneVoiceFromUrl({
      audioUrl: extract.audio_url,
      name: cloneName,
      description: `LipClass teacher voice (teacherId=${teacherId})`,
      labels: { source: 'lipclass', teacher_id: teacherId },
    });

    // ── 3. Render the approval test sentence ───────────────────────────────
    //
    // Storing the pending voice_id BEFORE rendering the test means that even
    // if the test rendering fails, the cleanup DELETE can still find and
    // remove the voice.
    await admin
      .from('profiles')
      .update({
        voice_pending_voice_id: pendingVoiceId,
      })
      .eq('id', teacherId);

    const testUrl = await renderTestSentence(admin, teacherId, pendingVoiceId);

    await admin
      .from('profiles')
      .update({
        voice_pending_test_audio_url: testUrl,
        reference_video_status: 'awaiting_approval',
      })
      .eq('id', teacherId);

    await admin.from('notifications').insert({
      user_id: teacherId,
      type: 'general',
      title: 'Ses örneğin hazır 🎙️',
      body: 'Onayla ve derslerinde kendi sesini kullanmaya başla.',
      link: '/dashboard/teacher/reference',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[VoiceClone] FAILED for ${teacherId}:`, msg);

    // If a pending clone got created before the error, kill it so we don't
    // burn an ElevenLabs slot for a half-finished voice.
    const { data: stale } = await admin
      .from('profiles')
      .select('voice_pending_voice_id')
      .eq('id', teacherId)
      .single();
    if (stale?.voice_pending_voice_id) {
      await deleteVoice(stale.voice_pending_voice_id).catch(() => {});
    }

    await admin
      .from('profiles')
      .update({
        voice_pending_voice_id: null,
        voice_pending_test_audio_url: null,
        reference_video_status: 'failed',
      })
      .eq('id', teacherId);

    await admin.from('notifications').insert({
      user_id: teacherId,
      type: 'general',
      title: 'Ses klonlama başarısız',
      body: msg.slice(0, 200),
      link: '/dashboard/teacher/reference',
    });
  }
}

// Render the approval test sentence and persist it to voice-samples/{id}/test.mp3.
// Exported for /test re-renders.
export async function renderTestSentence(
  admin: SupabaseClient,
  teacherId: string,
  voiceId: string,
): Promise<string> {
  const { data: profile } = await admin
    .from('profiles')
    .select('language, name')
    .eq('id', teacherId)
    .single();

  const language = (profile?.language as 'tr' | 'en' | null) ?? 'tr';
  const baseSentence = language === 'en' ? TEST_SENTENCE_EN : TEST_SENTENCE_TR;
  // Personalise the test sentence with the teacher's first name when we have one.
  const firstName = (profile?.name || '').split(' ')[0]?.trim();
  const sentence = firstName
    ? language === 'en'
      ? `Hello, I'm ${firstName} — your AI voice. In a moment, you'll be able to narrate your lessons with me.`
      : `Merhaba, ben ${firstName} — yapay zeka destekli sesin. Birazdan derslerini benimle anlatabilirsin.`
    : baseSentence;

  const mp3 = await synthesizeMp3({ voiceId, text: sentence });
  const storagePath = `${teacherId}/test.mp3`;
  const { error } = await admin.storage
    .from('voice-samples')
    .upload(storagePath, Buffer.from(mp3), {
      contentType: 'audio/mpeg',
      upsert: true,
    });
  if (error) {
    throw new Error(`Test sample upload failed: ${error.message}`);
  }

  const { data: signed, error: signErr } = await admin.storage
    .from('voice-samples')
    .createSignedUrl(storagePath, 7 * 24 * 3600); // 7 days — survives approval delay

  if (signErr || !signed?.signedUrl) {
    throw new Error(`Test sample sign failed: ${signErr?.message ?? 'unknown'}`);
  }
  return signed.signedUrl;
}
