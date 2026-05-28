// ElevenLabs API client — thin wrapper around the endpoints we use for
// per-teacher voice cloning. Kept separate from tts.ts so the cloning
// pipeline and the TTS hot path don't share state.

const ELEVENLABS_API = 'https://api.elevenlabs.io/v1';

function apiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error('ELEVENLABS_API_KEY is not configured');
  return key;
}

/**
 * Instant Voice Cloning — POST /voices/add (multipart).
 * The sample audio URL must be publicly fetchable from ElevenLabs's side
 * (signed Supabase URL is fine). Returns the new voice_id.
 *
 * NOTE: ElevenLabs's /voices/add expects file uploads, not URLs. We download
 * the signed MP3 server-side and forward it as a multipart blob.
 */
export async function cloneVoiceFromUrl(opts: {
  audioUrl: string;
  name: string;
  description?: string;
  labels?: Record<string, string>;
}): Promise<{ voiceId: string }> {
  const audioRes = await fetch(opts.audioUrl);
  if (!audioRes.ok) {
    throw new Error(`Cannot fetch voice sample (${audioRes.status})`);
  }
  const audioBlob = await audioRes.blob();
  if (audioBlob.size < 10_000) {
    throw new Error('Voice sample appears empty or corrupted');
  }

  const form = new FormData();
  form.append('name', opts.name.slice(0, 100));
  if (opts.description) {
    form.append('description', opts.description.slice(0, 500));
  }
  form.append('files', audioBlob, 'voice-sample.mp3');
  if (opts.labels) {
    form.append('labels', JSON.stringify(opts.labels));
  }

  const res = await fetch(`${ELEVENLABS_API}/voices/add`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey() },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    // ElevenLabs returns 401 for invalid key, 400 for too-short audio, 402
    // when subscription is over slot limit — surface those verbatim.
    throw new Error(`ElevenLabs clone failed (${res.status}): ${text.slice(0, 400)}`);
  }

  const data = (await res.json()) as { voice_id?: string };
  if (!data.voice_id) {
    throw new Error('ElevenLabs clone returned no voice_id');
  }
  return { voiceId: data.voice_id };
}

/**
 * Synthesize one TTS clip with a given voice. Returns raw MP3 bytes — the
 * caller uploads to its preferred storage (Vercel Blob for production TTS,
 * Supabase Storage for the approval test sample).
 */
export async function synthesizeMp3(opts: {
  voiceId: string;
  text: string;
  stability?: number;
  similarityBoost?: number;
}): Promise<ArrayBuffer> {
  const res = await fetch(
    `${ELEVENLABS_API}/text-to-speech/${opts.voiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey(),
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: opts.text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: opts.stability ?? 0.5,
          similarity_boost: opts.similarityBoost ?? 0.8,
          use_speaker_boost: true,
        },
      }),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ElevenLabs TTS failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.arrayBuffer();
}

/**
 * Delete a voice. Idempotent — 404 (already gone) is treated as success.
 */
export async function deleteVoice(voiceId: string): Promise<void> {
  const res = await fetch(`${ELEVENLABS_API}/voices/${voiceId}`, {
    method: 'DELETE',
    headers: { 'xi-api-key': apiKey() },
  });
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    console.warn(`[ElevenLabs] delete voice ${voiceId} failed (${res.status}): ${text.slice(0, 200)}`);
  }
}

export function isElevenLabsConfigured(): boolean {
  return !!process.env.ELEVENLABS_API_KEY;
}
