// Slide-based Lesson Generation — client-side helpers.
//
// PHASE 1 (~10s) — generateSlidesOnly()
//   LLM → 10 slides. Persist to DB with status='slides_ready'. Teacher edits.
//
// PHASE 2 — Server orchestration.
//   The editor POSTs to /api/videos/[id]/finalize which runs TTS + lipsync +
//   Manim + Bunny on the server (see src/lib/llm/finalize.ts). Progress is
//   broadcast via Supabase Realtime on videos.generation_progress.
//
// Editor helpers (still client-side):
//   regenerateSlide()    — re-run LLM for ONE slide via /api/generate-video
//   persistSlideEdits()  — save edits to slides_data JSONB

import { updateVideo, saveSlidesData } from './videos';
import type { Slide, SlidesData } from '@/types';

export type GenerationProgress =
  | { stage: 'idle' }
  | { stage: 'generating_slides'; progress: number }
  | { stage: 'creating_audio'; progress: number; currentSlide?: number; totalSlides?: number }
  | { stage: 'creating_lipsync'; progress: number; currentSlide?: number; totalSlides?: number }
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

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1 — generate slides only (fast, ~10s)
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
        const ragResponse = await fetch('/api/generate-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            step: 'rag_retrieve',
            query: `${topic} ${description}`,
            teacherId,
            documentIds: sourceDocumentIds,
          }),
        });
        if (ragResponse.ok) {
          const data = await ragResponse.json();
          ragContext = data.context;
        }
      } catch (err) {
        console.warn('[Generation] RAG retrieval failed, continuing without context:', err);
      }
    }

    onProgress?.({ stage: 'generating_slides', progress: 20 });

    const slidesResponse = await fetch('/api/generate-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
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
        // Cache scope — server uses (teacherId, hash) to dedup LLM calls.
        teacherId,
        documentIds: sourceDocumentIds,
      }),
    });

    if (!slidesResponse.ok) {
      const err = await slidesResponse.json().catch(() => ({}));
      throw new Error(err?.error || 'Slayt içeriği oluşturulamadı');
    }

    const { slides, contentHash, cached } = (await slidesResponse.json()) as {
      slides: Slide[];
      contentHash?: string;
      cached?: boolean;
    };
    if (!slides || slides.length === 0) throw new Error('LLM slayt üretemedi');

    if (cached) console.log('[Generation] Used cached slides (skipped LLM call)');

    const slidesData: SlidesData = { slides };

    await updateVideo(videoId, {
      slidesData,
      status: 'slides_ready',
      contentHash,
    } as Parameters<typeof updateVideo>[1]);

    onProgress?.({ stage: 'generating_slides', progress: 100 });
    onProgress?.({ stage: 'completed' });

    return slidesData;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Bilinmeyen hata';
    try {
      await updateVideo(videoId, { status: 'failed' } as Parameters<typeof updateVideo>[1]);
    } catch (e) {
      console.error('[Generation] Failed to mark video failed:', e);
    }
    onProgress?.({ stage: 'failed', error: msg });
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 2 was here; finalize is now server-side at /api/videos/[id]/finalize
// → /lib/llm/finalize.ts. The editor POSTs to that endpoint and subscribes
// to videos.generation_progress via Supabase Realtime for live updates.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Editor: per-slide actions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Re-run the LLM for ONE slide. Returns the new slide object;
 * caller is responsible for replacing it in slides_data and persisting.
 */
export async function regenerateSlide(input: {
  topic: string;
  description?: string;
  language?: 'tr' | 'en';
  tone?: 'formal' | 'friendly' | 'energetic';
  slideNumber: number;
  totalSlides: number;
  currentSlide: Slide;
  siblingTitles: string[];
  feedback?: string;
}): Promise<Slide> {
  const {
    topic,
    description,
    language = 'tr',
    tone = 'friendly',
    slideNumber,
    totalSlides,
    currentSlide,
    siblingTitles,
    feedback,
  } = input;

  const resp = await fetch('/api/generate-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      step: 'regenerate_slide',
      topic,
      description,
      language,
      tone,
      slideNumber,
      totalSlides,
      currentSlide: {
        title: currentSlide.title,
        content: currentSlide.content,
        bulletPoints: currentSlide.bulletPoints,
        narrationText: currentSlide.narrationText,
      },
      siblingTitles,
      feedback,
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error || 'Slayt yeniden üretilemedi');
  }

  const { slide } = (await resp.json()) as { slide: Slide };

  // Preserve old media URLs only if narration text is identical; otherwise
  // the audio/lipsync are now stale and should regenerate at finalize time.
  const narrationChanged = slide.narrationText !== currentSlide.narrationText;
  return {
    ...slide,
    audioUrl: narrationChanged ? undefined : currentSlide.audioUrl,
    videoUrl: narrationChanged ? undefined : currentSlide.videoUrl,
    bunnyVideoGuid: narrationChanged ? undefined : currentSlide.bunnyVideoGuid,
    bunnyEmbedUrl: narrationChanged ? undefined : currentSlide.bunnyEmbedUrl,
    // Animation is content-driven, not narration-driven — regenerate on finalize
    animationUrl: undefined,
    editedAt: new Date().toISOString(),
    narrationDirtyAt: narrationChanged ? new Date().toISOString() : currentSlide.narrationDirtyAt,
  };
}

/**
 * After an edit, persist only the slides_data JSONB.
 * Convenience wrapper so editor pages don't import saveSlidesData directly.
 */
export async function persistSlideEdits(videoId: string, slidesData: SlidesData) {
  return saveSlidesData(videoId, slidesData);
}

/**
 * Ask the LLM to produce a 4-option quiz from a topic (and optional source slide).
 * Returns the quiz payload; caller is responsible for wrapping it in a Slide
 * with slideType='quiz' and inserting it into slides_data.
 */
export async function generateQuizForSlide(input: {
  topic: string;
  language?: 'tr' | 'en';
  sourceSlide?: { title: string; content: string; bulletPoints: string[] };
  difficulty?: 'easy' | 'medium' | 'hard';
}): Promise<{
  question: string;
  options: [string, string, string, string];
  correctAnswer: 0 | 1 | 2 | 3;
  explanation?: string;
}> {
  const resp = await fetch('/api/generate-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      step: 'generate_quiz',
      topic: input.topic,
      language: input.language || 'tr',
      sourceSlide: input.sourceSlide,
      difficulty: input.difficulty,
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error || 'Quiz oluşturulamadı');
  }

  const { quiz } = await resp.json();
  return quiz;
}
