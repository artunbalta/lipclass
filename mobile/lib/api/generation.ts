// Mobile generation client — mirrors the web's two-phase pipeline:
//   PHASE 1: generateSlidesOnly() — fast LLM call, ~10s, saves slides_data
//            and sets status='slides_ready'.
//   PHASE 2: finalizeVideoServer() — POSTs to web's /api/videos/[id]/finalize.
//            Heavy work (TTS + lipsync + Manim + Bunny) runs on the server,
//            mobile subscribes to Supabase Realtime for progress.
//
// Replaces the old monolithic generateVideo() — kept as a deprecated alias
// pointing at the new server-side flow so existing screens still compile.

import { updateVideo } from './videos';
import type { Slide, SlidesData } from '@/types';
import { supabase } from '../supabase/client';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? '';

export type GenerationProgress =
  | { stage: 'idle' }
  | { stage: 'generating_slides'; progress: number }
  | { stage: 'queued'; progress: number }
  | { stage: 'creating_audio'; progress: number; currentSlide?: number; totalSlides?: number }
  | { stage: 'creating_lipsync'; progress: number; currentSlide?: number; totalSlides?: number }
  | { stage: 'creating_animations'; progress: number }
  | { stage: 'ingesting_bunny'; progress: number }
  | { stage: 'saving'; progress: number }
  | { stage: 'completed' }
  | { stage: 'failed'; error: string };

export interface GenerateSlidesOptions {
  videoId: string;
  teacherId: string;
  topic: string;
  description: string;
  prompt: string;
  language?: 'tr' | 'en';
  tone?: 'formal' | 'friendly' | 'energetic';
  includesProblemSolving?: boolean;
  problemCount?: number;
  difficulty?: string;
  sourceOnly?: boolean;
  sourceDocumentIds?: string[];
  onProgress?: (progress: GenerationProgress) => void;
}

export interface FinalizeOptions {
  videoId: string;
  referenceVideoUrl?: string;
  /** Defaults to true (only re-run dirty slides). */
  incremental?: boolean;
  onProgress?: (progress: GenerationProgress) => void;
}

async function apiPost(body: object): Promise<Response> {
  return fetch(`${API_BASE}/api/generate-video`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1 — generate slides only
// ─────────────────────────────────────────────────────────────────────────────

export async function generateSlidesOnly(options: GenerateSlidesOptions): Promise<SlidesData> {
  const {
    videoId,
    teacherId,
    topic,
    description,
    prompt,
    language = 'tr',
    tone = 'friendly',
    includesProblemSolving = false,
    problemCount,
    difficulty,
    sourceOnly,
    sourceDocumentIds,
    onProgress,
  } = options;

  try {
    onProgress?.({ stage: 'generating_slides', progress: 5 });

    // Optional RAG context retrieval
    let ragContext: string | undefined;
    if (sourceDocumentIds && sourceDocumentIds.length > 0) {
      try {
        const ragRes = await apiPost({
          step: 'rag_retrieve',
          query: `${topic} ${description}`,
          teacherId,
          documentIds: sourceDocumentIds,
        });
        if (ragRes.ok) {
          const ragData = await ragRes.json();
          ragContext = ragData.context;
        }
      } catch {
        // Continue without context
      }
    }

    onProgress?.({ stage: 'generating_slides', progress: 20 });

    const slidesRes = await apiPost({
      step: 'slides',
      topic,
      description,
      prompt,
      language,
      tone,
      includesProblemSolving,
      problemCount,
      difficulty,
      ragContext,
      sourceOnly,
      teacherId,
      documentIds: sourceDocumentIds,
    });

    if (!slidesRes.ok) {
      const err = await slidesRes.json().catch(() => ({}));
      throw new Error(err?.error || 'Slayt içeriği oluşturulamadı');
    }

    const { slides, contentHash } = (await slidesRes.json()) as {
      slides: Slide[];
      contentHash?: string;
      cached?: boolean;
    };
    if (!slides || slides.length === 0) throw new Error('LLM slayt üretemedi');

    const slidesData: SlidesData = { slides };

    await updateVideo(videoId, {
      slidesData,
      status: 'slides_ready',
      contentHash,
    } as any);

    onProgress?.({ stage: 'generating_slides', progress: 100 });
    onProgress?.({ stage: 'completed' });
    return slidesData;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Bilinmeyen hata';
    try {
      await updateVideo(videoId, { status: 'failed' } as any);
    } catch {
      // ignore
    }
    onProgress?.({ stage: 'failed', error: msg });
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 2 — server-side finalize + Realtime progress
// ─────────────────────────────────────────────────────────────────────────────

interface ServerProgressRow {
  stage: GenerationProgress['stage'];
  progress: number;
  currentSlide?: number;
  totalSlides?: number;
  error?: string;
  updatedAt?: string;
}

/**
 * Kick off server-side finalize and return a `cleanup` function that the
 * caller must invoke when they're done listening (or when their screen
 * unmounts) to remove the Realtime channel.
 */
export async function finalizeVideoServer(
  options: FinalizeOptions
): Promise<{ cleanup: () => void }> {
  const { videoId, referenceVideoUrl, incremental = true, onProgress } = options;

  const channel = supabase
    .channel(`video-${videoId}-finalize`)
    .on(
      // @ts-expect-error supabase-js typing for postgres_changes is loose in RN
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'videos', filter: `id=eq.${videoId}` },
      (payload: { new: Record<string, unknown> }) => {
        const newRow = payload.new as { generation_progress?: ServerProgressRow | null; status?: string };
        if (newRow.generation_progress) {
          const p = newRow.generation_progress;
          onProgress?.({
            stage: p.stage,
            progress: p.progress,
            currentSlide: p.currentSlide,
            totalSlides: p.totalSlides,
            ...(p.error ? { error: p.error } : {}),
          } as GenerationProgress);
        }
        if (newRow.status === 'published') {
          onProgress?.({ stage: 'completed' });
        }
      }
    )
    .subscribe();

  const cleanup = () => {
    supabase.removeChannel(channel);
  };

  try {
    const resp = await fetch(`${API_BASE}/api/videos/${videoId}/finalize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referenceVideoUrl, incremental }),
    });

    if (!resp.ok && resp.status !== 202) {
      const err = await resp.json().catch(() => ({}));
      cleanup();
      throw new Error(err?.error || 'Finalize başlatılamadı');
    }
  } catch (err) {
    cleanup();
    throw err;
  }

  return { cleanup };
}

/**
 * Subscribe to a video's progress without kicking off finalize. Useful when
 * mobile re-opens a video that's already being processed elsewhere.
 */
export function subscribeProgress(
  videoId: string,
  onProgress: (p: GenerationProgress) => void
): () => void {
  const channel = supabase
    .channel(`video-${videoId}-watch`)
    .on(
      // @ts-expect-error supabase-js typing for postgres_changes is loose in RN
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'videos', filter: `id=eq.${videoId}` },
      (payload: { new: Record<string, unknown> }) => {
        const newRow = payload.new as { generation_progress?: ServerProgressRow | null; status?: string };
        if (newRow.generation_progress) {
          onProgress(newRow.generation_progress as GenerationProgress);
        }
        if (newRow.status === 'published') {
          onProgress({ stage: 'completed' });
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Deprecated: one-shot pipeline. Now does slides → server finalize on behalf.
// Kept so older screens (e.g. mobile/app/(teacher)/create.tsx) still compile.
// ─────────────────────────────────────────────────────────────────────────────

export interface GenerationOptions extends GenerateSlidesOptions {
  referenceVideoUrl?: string;
}

export async function generateVideo(options: GenerationOptions): Promise<SlidesData> {
  const slides = await generateSlidesOnly(options);

  const { cleanup } = await finalizeVideoServer({
    videoId: options.videoId,
    referenceVideoUrl: options.referenceVideoUrl,
    incremental: true,
    onProgress: (p) => {
      options.onProgress?.(p);
      if (p.stage === 'completed' || p.stage === 'failed') {
        // Stop listening once we hit a terminal state
        setTimeout(cleanup, 100);
      }
    },
  });

  return slides;
}
