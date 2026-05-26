// Text-to-speech with the teacher's cloned ElevenLabs voice (primary)
// and a fal.ai premade voice (fallback). Extracted from /api/generate-video/route.ts.

import { put } from '@vercel/blob';
import { falRequest } from './fal-client';

/**
 * Remove LaTeX symbols and formatting before sending text to TTS.
 * The cleaning rules are matched character-class so behavior is identical
 * to the original inline version.
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
 * Primary path: ElevenLabs direct with the teacher's cloned voice.
 * Fallback:     fal.ai premade voice.
 */
export async function textToSpeech(
  rawText: string,
  language: 'tr' | 'en'
): Promise<{ audio_url: string }> {
  const text = cleanTextForTts(rawText);

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;

  if (apiKey && voiceId) {
    try {
      return await textToSpeechElevenLabsDirect(text, voiceId, apiKey);
    } catch (err) {
      console.warn('[TTS] ElevenLabs direct call failed, falling back to fal.ai:', err);
    }
  }

  return await textToSpeechFalFallback(text, language);
}

/**
 * ElevenLabs direct TTS with cloned voice → upload mp3 to Vercel Blob → return public URL.
 * VEED lipsync requires a fetchable audio URL.
 */
async function textToSpeechElevenLabsDirect(
  text: string,
  voiceId: string,
  apiKey: string
): Promise<{ audio_url: string }> {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ElevenLabs TTS failed (${res.status}): ${errText}`);
  }

  const audioBuffer = await res.arrayBuffer();
  const pathname = `tts/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.mp3`;

  const blob = await put(pathname, audioBuffer, {
    access: 'public',
    contentType: 'audio/mpeg',
  });

  return { audio_url: blob.url };
}

/**
 * Fallback: fal-ai/elevenlabs premade voice (legacy path).
 */
async function textToSpeechFalFallback(
  text: string,
  language: 'tr' | 'en'
): Promise<{ audio_url: string }> {
  const modelPath = 'fal-ai/elevenlabs/text-to-dialogue/eleven-v3';

  const result = await falRequest<{ audio: { url: string } }>(
    modelPath,
    {
      inputs: [
        {
          text: text,
          voice: 'Adam',
        },
      ],
      language_code: language,
      stability: 0.5,
      use_speaker_boost: true,
    }
  );

  return {
    audio_url: result.audio?.url || '',
  };
}
