// Slide-based Lesson Generation Service
// Pipeline: LLM (10 slides) → TTS (per slide) → Lipsync (per slide) → Save to DB

import { updateVideo } from './videos';
import type { Slide, SlidesData } from '@/types';

export type GenerationProgress =
  | { stage: 'idle' }
  | { stage: 'generating_slides'; progress: number }
  | { stage: 'creating_audio'; progress: number; currentSlide?: number; totalSlides?: number }
  | { stage: 'creating_lipsync'; progress: number; currentSlide?: number; totalSlides?: number }
  | { stage: 'saving'; progress: number }
  | { stage: 'completed' }
  | { stage: 'failed'; error: string };

export interface GenerationOptions {
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
  referenceVideoUrl?: string; // Teacher's reference video for lipsync
  sourceOnly?: boolean;       // RAG-only mode: only use teacher's documents
  sourceDocumentIds?: string[]; // Selected document IDs for RAG
  onProgress?: (progress: GenerationProgress) => void;
}

/**
 * Generate slide-based lesson using full AI pipeline:
 * 1. LLM generates 10 structured slides with narration text
 * 2. TTS converts each slide's narration to audio
 * 3. Lipsync syncs teacher's reference video to each slide's audio
 * 4. Save slides_data to database
 */
export async function generateVideo(options: GenerationOptions): Promise<SlidesData> {
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
    referenceVideoUrl,
    sourceOnly,
    sourceDocumentIds,
    onProgress,
  } = options;

  try {
    // Update video status to processing
    await updateVideo(videoId, { status: 'processing' } as any);

    // ━━━ Stage 0: RAG Context Retrieval (optional) ━━━
    let ragContext: string | undefined;

    if (sourceDocumentIds && sourceDocumentIds.length > 0) {
      onProgress?.({ stage: 'generating_slides', progress: 1 });

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
          const ragData = await ragResponse.json();
          ragContext = ragData.context;
          console.log(`[Generation] RAG context retrieved (${ragContext?.length || 0} chars)`);
        } else {
          console.warn('[Generation] RAG retrieval failed, continuing without context');
        }
      } catch (ragError) {
        console.warn('[Generation] RAG retrieval error:', ragError);
      }
    }

    // ━━━ Stage 1: Generate slides with LLM (0-10%) ━━━
    onProgress?.({ stage: 'generating_slides', progress: 2 });

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
      }),
    });

    if (!slidesResponse.ok) {
      const err = await slidesResponse.json().catch(() => ({}));
      throw new Error(err?.error || 'Slayt içeriği oluşturulamadı');
    }

    const { slides } = (await slidesResponse.json()) as { slides: Slide[] };

    if (!slides || slides.length === 0) {
      throw new Error('LLM slayt üretemedi');
    }

    console.log(`[Generation] ${slides.length} slides generated`);
    onProgress?.({ stage: 'generating_slides', progress: 10 });

    // ━━━ Stage 2: Generate TTS for all slides (10-25%) ━━━
    onProgress?.({ stage: 'creating_audio', progress: 10, currentSlide: 0, totalSlides: slides.length });

    const ttsBatchResponse = await fetch('/api/generate-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        step: 'tts_batch',
        slides: slides.map((s) => ({
          slideNumber: s.slideNumber,
          narrationText: s.narrationText,
        })),
        language,
      }),
    });

    if (!ttsBatchResponse.ok) {
      const err = await ttsBatchResponse.json().catch(() => ({}));
      throw new Error(err?.error || 'Ses dosyaları oluşturulamadı');
    }

    const { audioResults } = (await ttsBatchResponse.json()) as {
      audioResults: Array<{ slideNumber: number; audio_url: string }>;
    };

    console.log(`[Generation] TTS completed for ${audioResults.length} slides`);
    onProgress?.({ stage: 'creating_audio', progress: 25, currentSlide: slides.length, totalSlides: slides.length });

    // Merge audio URLs into slides
    const slidesWithAudio: Slide[] = slides.map((slide) => {
      const audioResult = audioResults.find((a) => a.slideNumber === slide.slideNumber);
      return {
        ...slide,
        audioUrl: audioResult?.audio_url || '',
      };
    });

    // ━━━ Stage 3: Lipsync for each slide (25-93%) ━━━
    // Each slide gets its own lipsync video (reference video + TTS audio → synced lips)
    if (referenceVideoUrl) {
      const slidesWithAudioCount = slidesWithAudio.filter((s) => s.audioUrl).length;
      let lipsyncDone = 0;

      for (let i = 0; i < slidesWithAudio.length; i++) {
        const slide = slidesWithAudio[i];
        if (!slide.audioUrl) {
          console.log(`[Lipsync] Slide ${slide.slideNumber} skipped (no audio)`);
          continue;
        }

        onProgress?.({
          stage: 'creating_lipsync',
          progress: 25 + (lipsyncDone / slidesWithAudioCount) * 68,
          currentSlide: i + 1,
          totalSlides: slidesWithAudio.length,
        });

        try {
          console.log(`[Lipsync] Starting slide ${slide.slideNumber}...`);

          const lipsyncResponse = await fetch('/api/generate-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              step: 'lipsync',
              video_url: referenceVideoUrl,
              audio_url: slide.audioUrl,
            }),
          });

          if (lipsyncResponse.ok) {
            const { video_url } = (await lipsyncResponse.json()) as { video_url: string };
            if (video_url) {
              slide.videoUrl = video_url;
              console.log(`[Lipsync] Slide ${slide.slideNumber} completed`);
            }
          } else {
            const err = await lipsyncResponse.json().catch(() => ({}));
            console.error(`[Lipsync] Slide ${slide.slideNumber} failed:`, err?.error || lipsyncResponse.statusText);
          }
        } catch (err) {
          console.error(`[Lipsync] Slide ${slide.slideNumber} error:`, err);
          // Continue - slide will fall back to reference video loop in player
        }

        lipsyncDone++;
        onProgress?.({
          stage: 'creating_lipsync',
          progress: 25 + (lipsyncDone / slidesWithAudioCount) * 68,
          currentSlide: i + 1,
          totalSlides: slidesWithAudio.length,
        });
      }

      const successCount = slidesWithAudio.filter((s) => s.videoUrl).length;
      console.log(`[Generation] Lipsync completed: ${successCount}/${slidesWithAudioCount} slides`);
    } else {
      console.log('[Generation] No reference video - skipping lipsync');
    }

    const slidesData: SlidesData = { slides: slidesWithAudio };

    // ━━━ Stage 4: Bunny Stream Ingestion (93-97%) — only if enabled ━━━
    let videoProvider: 'fal' | 'bunny' = 'fal';
    let bunnyIngestionStatus: 'pending' | 'success' | 'failed' | null = null;

    try {
      const bunnyCheckResponse = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'bunny_ingest_batch',
          slides: slidesData.slides.map((s) => ({
            slideNumber: s.slideNumber,
            videoUrl: s.videoUrl,
          })),
          videoTitle: topic,
        }),
      });

      if (bunnyCheckResponse.ok) {
        const { ingestionResults } = (await bunnyCheckResponse.json()) as {
          ingestionResults: Array<{
            slideNumber: number;
            bunnyVideoGuid: string;
            bunnyEmbedUrl: string;
            status: 'success' | 'failed' | 'skipped';
          }>;
        };

        // Merge Bunny data into slides
        for (const result of ingestionResults) {
          const slide = slidesData.slides.find((s) => s.slideNumber === result.slideNumber);
          if (slide && result.status === 'success') {
            slide.bunnyVideoGuid = result.bunnyVideoGuid;
            slide.bunnyEmbedUrl = result.bunnyEmbedUrl;
          }
        }

        const successCount = ingestionResults.filter((r) => r.status === 'success').length;
        const totalIngested = ingestionResults.filter((r) => r.status !== 'skipped').length;

        if (successCount > 0) {
          videoProvider = 'bunny';
          bunnyIngestionStatus = successCount === totalIngested ? 'success' : 'pending';
          console.log(`[Generation] Bunny ingestion: ${successCount}/${totalIngested} slides`);
        } else if (totalIngested > 0) {
          bunnyIngestionStatus = 'failed';
          console.warn('[Generation] Bunny ingestion: all slides failed');
        }
      } else {
        // Bunny not enabled or request failed — this is fine, fall back to fal
        const errBody = await bunnyCheckResponse.json().catch(() => ({}));
        console.log(`[Generation] Bunny ingestion skipped: ${errBody?.error || bunnyCheckResponse.statusText}`);
      }
    } catch (bunnyError) {
      console.warn('[Generation] Bunny ingestion error (non-fatal):', bunnyError);
      // Non-fatal — video still works via fal URLs
    }

    onProgress?.({ stage: 'saving', progress: 97 });

    // ━━━ Stage 5: Save to database (97-100%) ━━━
    onProgress?.({ stage: 'saving', progress: 98 });

    await updateVideo(videoId, {
      slidesData,
      status: 'published',
      duration: slides.length * 30, // Rough estimate: ~30 sec per slide
      videoProvider,
      bunnyIngestionStatus,
    } as any);

    console.log('[Generation] Slides saved to database');
    onProgress?.({ stage: 'completed' });

    return slidesData;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';

    // Update video status to failed
    try {
      await updateVideo(videoId, { status: 'failed' } as any);
    } catch (updateError) {
      console.error('Failed to update video status:', updateError);
    }

    onProgress?.({ stage: 'failed', error: errorMessage });
    throw error;
  }
}
