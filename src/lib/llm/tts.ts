// Text-to-speech with the teacher's cloned ElevenLabs voice (primary)
// and a fal.ai premade voice (fallback).
//
// Resolution order for the voice_id used in synthesis:
//   1. opts.voiceMode === 'robot' → skip ElevenLabs entirely, use fal fallback.
//   2. opts.teacherId is set AND profiles.elevenlabs_voice_id exists → use it.
//   3. ELEVENLABS_VOICE_ID env var → legacy shared voice (kept for backwards
//      compat with teachers that haven't migrated to per-teacher cloning).
//   4. Fal fallback.
//
// The resolver caches per-teacher lookups for 5 minutes so a 10-slide finalize
// run hits the DB once, not ten times. The cache is also invalidated by the
// approve/delete endpoints via touchVoiceCache(teacherId) — exported below.

import { put } from '@vercel/blob';
import { createClient } from '@supabase/supabase-js';
import { falRequest } from './fal-client';
import { synthesizeMp3 } from './elevenlabs';

const CACHE_TTL_MS = 5 * 60 * 1000;
const voiceCache = new Map<string, { voiceId: string | null; cachedAt: number }>();

export type VoiceMode = 'teacher' | 'robot';

interface TextToSpeechOptions {
  teacherId?: string;
  voiceMode?: VoiceMode; // default 'teacher' — only 'robot' opts out
}

export function touchVoiceCache(teacherId: string): void {
  voiceCache.delete(teacherId);
}

async function resolveTeacherVoiceId(teacherId: string): Promise<string | null> {
  const cached = voiceCache.get(teacherId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.voiceId;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin
    .from('profiles')
    .select('elevenlabs_voice_id, reference_video_status')
    .eq('id', teacherId)
    .single();

  if (error) {
    console.warn(`[TTS] voice lookup failed for ${teacherId}:`, error.message);
    voiceCache.set(teacherId, { voiceId: null, cachedAt: Date.now() });
    return null;
  }

  // Only use the voice when the teacher has explicitly approved it.
  const voiceId =
    data?.elevenlabs_voice_id && data?.reference_video_status === 'ready'
      ? (data.elevenlabs_voice_id as string)
      : null;

  voiceCache.set(teacherId, { voiceId, cachedAt: Date.now() });
  return voiceId;
}

async function touchLastUsedAt(teacherId: string): Promise<void> {
  // Non-blocking — used by the 30-day inactivity cron to know which clones
  // can be reclaimed. Failure is non-fatal.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;

  try {
    const admin = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    await admin
      .from('profiles')
      .update({ voice_last_used_at: new Date().toISOString() })
      .eq('id', teacherId);
  } catch (err) {
    console.warn('[TTS] touchLastUsedAt failed:', err);
  }
}

/**
 * Remove LaTeX symbols and formatting before sending text to TTS.
 */
export function cleanTextForTts(text: string): string {
  return text
    .replace(/\$\$/g, '')
    .replace(/\$/g, '')
    .replace(/\\(text|frac|sqrt|cdot|times|hat|vec|bar|mathbf|mathrm|leq|geq|neq|approx|infty|alpha|beta|theta|pi|sigma|delta|gamma|omega)/g, '')
    .replace(/\\/g, '')
    .replace(/{/g, '').replace(/}/g, '')
    .replace(/\[/g, '').replace(/\]/g, '')
    .replace(/\*/g, '')
    .replace(/_/g, ' ')
    .replace(/\^/g, '')
    .trim();
}

/**
 * Convert text to speech.
 * Primary path: ElevenLabs with the teacher's cloned voice (or the legacy
 * shared voice). Fallback: fal.ai premade voice.
 */
export async function textToSpeech(
  rawText: string,
  language: 'tr' | 'en',
  options: TextToSpeechOptions = {},
): Promise<{ audio_url: string }> {
  const text = cleanTextForTts(rawText);
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceMode: VoiceMode = options.voiceMode ?? 'teacher';

  // 'robot' mode: bypass ElevenLabs entirely. This is the toggle the teacher
  // can flip per-video from the Create form.
  if (voiceMode === 'robot') {
    return textToSpeechFalFallback(text, language);
  }

  // Resolve per-teacher voice; legacy fallback to shared env var.
  let voiceId: string | undefined;
  if (apiKey && options.teacherId) {
    const perTeacher = await resolveTeacherVoiceId(options.teacherId);
    voiceId = perTeacher ?? process.env.ELEVENLABS_VOICE_ID;
  } else if (apiKey) {
    voiceId = process.env.ELEVENLABS_VOICE_ID;
  }

  if (apiKey && voiceId) {
    try {
      const result = await textToSpeechElevenLabsDirect(text, voiceId);
      // Touch only when we actually used a per-teacher voice — env-shared
      // voices don't need lifecycle tracking.
      if (options.teacherId && voiceId !== process.env.ELEVENLABS_VOICE_ID) {
        void touchLastUsedAt(options.teacherId);
      }
      return result;
    } catch (err) {
      console.warn('[TTS] ElevenLabs direct call failed, falling back to fal.ai:', err);
    }
  }

  return textToSpeechFalFallback(text, language);
}

async function textToSpeechElevenLabsDirect(
  text: string,
  voiceId: string,
): Promise<{ audio_url: string }> {
  const audioBuffer = await synthesizeMp3({ voiceId, text });
  const pathname = `tts/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.mp3`;
  const blob = await put(pathname, audioBuffer, {
    access: 'public',
    contentType: 'audio/mpeg',
  });
  return { audio_url: blob.url };
}

async function textToSpeechFalFallback(
  text: string,
  language: 'tr' | 'en',
): Promise<{ audio_url: string }> {
  const modelPath = 'fal-ai/elevenlabs/text-to-dialogue/eleven-v3';
  const result = await falRequest<{ audio: { url: string } }>(modelPath, {
    inputs: [{ text, voice: 'Adam' }],
    language_code: language,
    stability: 0.5,
    use_speaker_boost: true,
  });
  return { audio_url: result.audio?.url || '' };
}
