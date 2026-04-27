import { updateVideo } from './videos';
import type { SlidesData } from '@/types';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? '';

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
  referenceVideoUrl?: string;
  sourceOnly?: boolean;
  sourceDocumentIds?: string[];
  onProgress?: (progress: GenerationProgress) => void;
}

async function apiPost(body: object): Promise<Response> {
  return fetch(`${API_BASE}/api/generate-video`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

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
    await updateVideo(videoId, { status: 'processing' } as any);

    // Optional RAG context retrieval
    let ragContext: string | undefined;
    if (sourceDocumentIds && sourceDocumentIds.length > 0) {
      onProgress?.({ stage: 'generating_slides', progress: 1 });
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

    // Stage 1 — Generate slides
    onProgress?.({ stage: 'generating_slides', progress: 5 });

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
    });

    if (!slidesRes.ok) {
      const err = await slidesRes.text();
      throw new Error(err || 'Slayt oluşturma başarısız');
    }

    const slidesData: SlidesData = await slidesRes.json();
    onProgress?.({ stage: 'creating_audio', progress: 10, totalSlides: slidesData.slides.length });

    // Stage 2 — TTS per slide
    const slidesWithAudio = [];
    for (let i = 0; i < slidesData.slides.length; i++) {
      const slide = slidesData.slides[i];
      onProgress?.({
        stage: 'creating_audio',
        progress: 10 + Math.round((i / slidesData.slides.length) * 40),
        currentSlide: i + 1,
        totalSlides: slidesData.slides.length,
      });

      try {
        const audioRes = await apiPost({
          step: 'tts',
          videoId,
          slideIndex: i,
          narrationText: slide.narrationText,
          language,
        });
        if (audioRes.ok) {
          const audioData = await audioRes.json();
          slidesWithAudio.push({ ...slide, audioUrl: audioData.audioUrl });
        } else {
          slidesWithAudio.push(slide);
        }
      } catch {
        slidesWithAudio.push(slide);
      }
    }

    // Stage 3 — Lipsync (if reference video)
    const finalSlides = [];
    if (referenceVideoUrl) {
      onProgress?.({ stage: 'creating_lipsync', progress: 50, totalSlides: slidesWithAudio.length });

      for (let i = 0; i < slidesWithAudio.length; i++) {
        const slide = slidesWithAudio[i];
        onProgress?.({
          stage: 'creating_lipsync',
          progress: 50 + Math.round((i / slidesWithAudio.length) * 40),
          currentSlide: i + 1,
          totalSlides: slidesWithAudio.length,
        });

        if (slide.audioUrl) {
          try {
            const lipRes = await apiPost({
              step: 'lipsync',
              videoId,
              slideIndex: i,
              audioUrl: slide.audioUrl,
              referenceVideoUrl,
            });
            if (lipRes.ok) {
              const lipData = await lipRes.json();
              finalSlides.push({ ...slide, videoUrl: lipData.videoUrl, bunnyEmbedUrl: lipData.bunnyEmbedUrl });
              continue;
            }
          } catch {
            // Fall through
          }
        }
        finalSlides.push(slide);
      }
    } else {
      finalSlides.push(...slidesWithAudio);
    }

    // Stage 4 — Save
    onProgress?.({ stage: 'saving', progress: 92 });

    const finalSlidesData: SlidesData = { slides: finalSlides };
    await updateVideo(videoId, {
      slidesData: finalSlidesData,
      status: 'published',
    } as any);

    onProgress?.({ stage: 'completed' });
    return finalSlidesData;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Bilinmeyen hata';
    await updateVideo(videoId, { status: 'failed' } as any).catch(() => {});
    onProgress?.({ stage: 'failed', error: msg });
    throw error;
  }
}
