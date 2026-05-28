// Server-side finalize pipeline.
//
// Moves orchestration off the browser. Single entry point that:
//   1. Reads the video row (slides_data) from Supabase
//   2. Runs TTS for slides that need it (sequential to respect ElevenLabs rate)
//   3. Runs lipsync in parallel batches (default 4 concurrent — was 1)
//   4. Runs Manim animation in parallel across all slides
//   5. Bunny Stream ingestion (optional)
//   6. Writes final slides_data + status='published'
//
// At every stage we write a progress object to videos.generation_progress so
// the editor can subscribe via Supabase Realtime and render live updates.
// If the tab closes mid-finalize, the work continues server-side until either
// completion or the Vercel function's 300s ceiling (whichever comes first).
//
// KNOWN LIMIT: this runs inside a single Vercel function and is bounded by
// maxDuration=300s. With parallel lipsync (4 concurrent × ~60s) total time
// is ~2-3 min, comfortably under the cap. For true durability beyond 300s
// (e.g. >15 slides, very slow VEED), move to Inngest/Trigger.dev in a
// follow-up PR — function signatures stay the same.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Slide, SlidesData } from '@/types';
import { textToSpeech } from './tts';
import { createLipsyncVideo } from './lipsync';
import { generateManimCode, renderManimAnimation } from './manim';
import { pLimit } from './p-limit';

const LIPSYNC_CONCURRENCY = parseInt(process.env.LIPSYNC_CONCURRENCY || '4', 10) || 4;

let _admin: SupabaseClient | null = null;
function adminClient(): SupabaseClient {
  if (_admin) return _admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase admin credentials missing for finalize');
  _admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  return _admin;
}

export type FinalizeStage =
  | 'queued'
  | 'creating_audio'
  | 'creating_lipsync'
  | 'creating_animations'
  | 'ingesting_bunny'
  | 'saving'
  | 'completed'
  | 'failed';

interface ProgressPayload {
  stage: FinalizeStage;
  progress: number;             // 0-100
  currentSlide?: number;
  totalSlides?: number;
  error?: string;
  updatedAt: string;
}

async function writeProgress(videoId: string, payload: Omit<ProgressPayload, 'updatedAt'>): Promise<void> {
  try {
    const sb = adminClient();
    await sb
      .from('videos')
      .update({ generation_progress: { ...payload, updatedAt: new Date().toISOString() } })
      .eq('id', videoId);
  } catch (err) {
    console.warn('[Finalize] writeProgress failed:', err);
  }
}

export interface FinalizeServerOptions {
  videoId: string;
  topic: string;
  language: 'tr' | 'en';
  referenceVideoUrl?: string;
  /**
   * incremental=true (default): only slides without audio OR with narration
   * dirty get TTS+lipsync. Saves cost when teacher only edited one slide.
   */
  incremental?: boolean;
  /**
   * bunnyEnabled defaults to env VIDEO_DELIVERY_PROVIDER === 'bunny'.
   * Passed through to skip the Bunny step if not configured.
   */
  bunnyEnabled?: boolean;
}

export async function finalizeServerSide(opts: FinalizeServerOptions): Promise<void> {
  const { videoId, topic, language, referenceVideoUrl, incremental = true, bunnyEnabled } = opts;

  const sb = adminClient();

  try {
    // ── Load current slides_data ───────────────────────────────────────────
    const { data: videoRow, error: readErr } = await sb
      .from('videos')
      .select('slides_data, teacher_id, voice_mode')
      .eq('id', videoId)
      .maybeSingle();

    if (readErr) throw new Error(`Cannot read video: ${readErr.message}`);
    if (!videoRow?.slides_data?.slides?.length) throw new Error('Video has no slides to finalize');

    const workingSlides: Slide[] = videoRow.slides_data.slides.map((s: Slide) => ({ ...s }));
    const totalSlides = workingSlides.length;
    const teacherId: string | undefined = videoRow.teacher_id;
    // Default to 'teacher' so legacy rows (NULL voice_mode) keep using the
    // cloned voice when available — robot must be opted INTO explicitly.
    const voiceMode: 'teacher' | 'robot' =
      videoRow.voice_mode === 'robot' ? 'robot' : 'teacher';

    await sb.from('videos').update({
      status: 'processing',
      slides_approved_at: new Date().toISOString(),
    }).eq('id', videoId);

    // ── TTS ────────────────────────────────────────────────────────────────
    const ttsTargets = workingSlides.filter((s) => {
      if (!incremental) return true;
      if (!s.audioUrl) return true;
      if (s.narrationDirtyAt) return true;
      return false;
    });

    await writeProgress(videoId, {
      stage: 'creating_audio',
      progress: 5,
      currentSlide: 0,
      totalSlides: ttsTargets.length,
    });

    let ttsDone = 0;
    for (const slide of ttsTargets) {
      if (!slide.narrationText || slide.narrationText.trim() === '') {
        ttsDone++;
        continue;
      }
      try {
        const { audio_url } = await textToSpeech(slide.narrationText, language, {
          teacherId,
          voiceMode,
        });
        if (audio_url) {
          slide.audioUrl = audio_url;
          slide.narrationDirtyAt = undefined;
          // Force lipsync regen since audio changed
          slide.videoUrl = undefined;
          slide.bunnyVideoGuid = undefined;
          slide.bunnyEmbedUrl = undefined;
        }
      } catch (err) {
        console.error(`[Finalize] TTS failed for slide ${slide.slideNumber}:`, err);
      }
      ttsDone++;
      await writeProgress(videoId, {
        stage: 'creating_audio',
        progress: 5 + Math.round((ttsDone / Math.max(ttsTargets.length, 1)) * 15),
        currentSlide: ttsDone,
        totalSlides: ttsTargets.length,
      });
    }

    // ── Lipsync (parallel, concurrency-limited) + Manim (parallel) ─────────
    const runLipsyncParallel = async () => {
      if (!referenceVideoUrl) {
        console.log('[Finalize] No reference video — skipping lipsync');
        return;
      }

      const targets = workingSlides.filter((s) => s.audioUrl && !s.videoUrl);
      if (targets.length === 0) return;

      const limit = pLimit(LIPSYNC_CONCURRENCY);
      let done = 0;

      await writeProgress(videoId, {
        stage: 'creating_lipsync',
        progress: 25,
        currentSlide: 0,
        totalSlides: targets.length,
      });

      await Promise.all(
        targets.map((slide) =>
          limit(async () => {
            try {
              const { video_url } = await createLipsyncVideo(referenceVideoUrl, slide.audioUrl!);
              if (video_url) slide.videoUrl = video_url;
            } catch (err) {
              console.error(`[Finalize] Lipsync failed for slide ${slide.slideNumber}:`, err);
            }
            done++;
            await writeProgress(videoId, {
              stage: 'creating_lipsync',
              progress: 25 + Math.round((done / targets.length) * 50),
              currentSlide: done,
              totalSlides: targets.length,
            });
          })
        )
      );
    };

    const runManimParallel = async () => {
      // Intent-aware filter: when the outline pipeline produced an intent,
      // only fire Manim for slides that actually need motion. This eliminates
      // the wasted ~40-60% of calls that the legacy SKIP path used to swallow.
      // Slides created before the intent system (intent undefined) keep the
      // legacy LLM-judged SKIP behavior for backwards compat.
      const eligible = workingSlides.filter((slide) => {
        if (incremental && slide.animationUrl) return false;
        if (slide.intent) return slide.intent.visualNeed === 'animation';
        return true; // legacy
      });

      const skipped = workingSlides.length - eligible.length;
      if (skipped > 0) {
        console.log(`[Finalize] Manim: ${eligible.length} eligible / ${skipped} skipped via intent`);
      }

      const tasks = eligible.map(async (slide) => {
        try {
          const manimCode = await generateManimCode(
            {
              slideNumber: slide.slideNumber,
              title: slide.title,
              content: slide.content,
              bulletPoints: slide.bulletPoints,
            },
            topic,
            language
          );

          if (!manimCode || manimCode.trim().toUpperCase() === 'SKIP') return;

          const animationUrl = await renderManimAnimation(manimCode, slide.slideNumber, videoId);
          if (animationUrl) slide.animationUrl = animationUrl;
        } catch (err) {
          console.error(`[Finalize] Manim error for slide ${slide.slideNumber}:`, err);
        }
      });
      await Promise.all(tasks);
    };

    await Promise.all([runLipsyncParallel(), runManimParallel()]);

    // ── Bunny ingestion (optional) ─────────────────────────────────────────
    let videoProvider: 'fal' | 'bunny' = 'fal';
    let bunnyIngestionStatus: 'pending' | 'success' | 'failed' | null = null;

    if (bunnyEnabled) {
      await writeProgress(videoId, { stage: 'ingesting_bunny', progress: 80 });
      try {
        const { ingestFromUrl } = await import('@/lib/api/bunny-stream');
        const targets = workingSlides.filter((s) => s.videoUrl && !s.bunnyVideoGuid);

        for (const slide of targets) {
          try {
            const title = `${topic} - Slide ${slide.slideNumber}`;
            const r = await ingestFromUrl(slide.videoUrl!, title);
            if (r.status === 'success') {
              slide.bunnyVideoGuid = r.guid;
              slide.bunnyEmbedUrl = r.hlsUrl;
            }
          } catch (err) {
            console.error(`[Finalize] Bunny ingestion failed for slide ${slide.slideNumber}:`, err);
          }
        }

        const ok = workingSlides.filter((s) => s.bunnyVideoGuid).length;
        const total = workingSlides.filter((s) => s.videoUrl).length;
        if (ok > 0) {
          videoProvider = 'bunny';
          bunnyIngestionStatus = ok === total ? 'success' : 'pending';
        } else if (total > 0) {
          bunnyIngestionStatus = 'failed';
        }
      } catch (err) {
        console.warn('[Finalize] Bunny path failed:', err);
      }
    }

    // ── Save ───────────────────────────────────────────────────────────────
    await writeProgress(videoId, { stage: 'saving', progress: 95 });

    const finalSlides: SlidesData = { slides: workingSlides };

    await sb
      .from('videos')
      .update({
        slides_data: finalSlides,
        status: 'published',
        duration: workingSlides.length * 30,
        video_provider: videoProvider,
        bunny_ingestion_status: bunnyIngestionStatus,
      })
      .eq('id', videoId);

    await writeProgress(videoId, { stage: 'completed', progress: 100 });
    console.log(`[Finalize] Video ${videoId} completed`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Finalize] Video ${videoId} FAILED:`, msg);
    try {
      await sb.from('videos').update({ status: 'failed' }).eq('id', videoId);
    } catch (e) {
      console.error('[Finalize] Could not mark video failed:', e);
    }
    await writeProgress(videoId, { stage: 'failed', progress: 0, error: msg });
  }
}
