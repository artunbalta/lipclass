// Step-based video generation dispatcher.
//
// This route was previously a single 1600-line file containing prompts, LLM
// clients, TTS, lipsync, Manim, Bunny ingestion, and HTTP handling all mixed
// together. It has been refactored into focused modules under /lib/llm/ and
// existing /lib/api/ helpers. The HTTP surface (steps, payloads, responses)
// is unchanged, so the mobile app and editor continue to work without changes.
//
// Step routing:
//   rag_retrieve         → /lib/api/rag.ts
//   slides               → /lib/llm/slides.ts            (generateSlides)
//   regenerate_slide     → /lib/llm/slides.ts            (regenerateSingleSlide)
//   tts_slide / tts_batch → /lib/llm/tts.ts              (textToSpeech)
//   lipsync              → /lib/llm/lipsync.ts           (createLipsyncVideo)
//   manim_code           → /lib/llm/manim.ts             (generateManimCode)
//   manim_render         → /lib/llm/manim.ts             (renderManimAnimation)
//   bunny_ingest_batch   → /lib/api/bunny-stream.ts      (ingestFromUrl)
//   demo_content         → inline (small one-off prompt for landing page demo)

import { NextRequest, NextResponse } from 'next/server';

import { retrieveContext, isRagConfigured } from '@/lib/api/rag';
import { isBunnyEnabled } from '@/lib/config/bunny-config';
import { ingestFromUrl } from '@/lib/api/bunny-stream';

import { falRequest } from '@/lib/llm/fal-client';
import { generateSlides, regenerateSingleSlide, generateQuiz } from '@/lib/llm/slides';
import { textToSpeech } from '@/lib/llm/tts';
import { createLipsyncVideo } from '@/lib/llm/lipsync';
import { generateManimCode, renderManimAnimation } from '@/lib/llm/manim';
import { computeSlidesHash } from '@/lib/llm/content-hash';
import { findCachedSlides } from '@/lib/api/slide-cache';

// 5 minutes — needed for lipsync polling and Manim render calls
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      topic,
      description,
      prompt = '',
      language = 'tr',
      tone = 'friendly',
      includesProblemSolving = false,
      problemCount,
      difficulty,
      step,
      ragContext,
      sourceOnly,
      teacherId,
      documentIds,
      query,
    } = body;

    // ── Step: rag_retrieve ─────────────────────────────────────────────────
    if (step === 'rag_retrieve') {
      if (!query || !teacherId) {
        return NextResponse.json({ error: 'query and teacherId are required' }, { status: 400 });
      }
      if (!isRagConfigured()) {
        return NextResponse.json({ error: 'RAG services are not configured' }, { status: 503 });
      }

      const context = await retrieveContext(query, teacherId, documentIds || undefined, 8);
      return NextResponse.json({ context });
    }

    // ── Step: slides ───────────────────────────────────────────────────────
    if (step === 'slides') {
      if (!topic || !description) {
        return NextResponse.json({ error: 'Topic and description are required' }, { status: 400 });
      }

      // Cache key — same inputs produce same slides, so we can reuse prior LLM
      // output when teacher creates another video with identical parameters.
      const contentHash = computeSlidesHash({
        topic,
        description,
        language,
        tone,
        includesProblemSolving,
        problemCount,
        difficulty,
        sourceOnly,
        sourceDocumentIds: documentIds,
        extraPrompt: prompt,
      });

      // Cache check — only when teacherId is provided and caller didn't opt out.
      const { forceRegenerate } = body as { forceRegenerate?: boolean };
      if (teacherId && !forceRegenerate) {
        const cached = await findCachedSlides(teacherId, contentHash);
        if (cached) {
          console.log(`[Slides] cache hit (teacher=${teacherId} hash=${contentHash.slice(0, 8)}…)`);
          return NextResponse.json({
            slides: cached.slides,
            contentHash,
            cached: true,
            stage: 'slides_complete',
          });
        }
      }

      const slidesResult = await generateSlides({
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

      return NextResponse.json({
        slides: slidesResult.slides,
        contentHash,
        cached: false,
        stage: 'slides_complete',
      });
    }

    // ── Step: tts_slide ────────────────────────────────────────────────────
    if (step === 'tts_slide') {
      const { narrationText, slideNumber } = body;
      if (!narrationText) {
        return NextResponse.json({ error: 'narrationText is required for TTS' }, { status: 400 });
      }

      const ttsResult = await textToSpeech(narrationText, language);
      return NextResponse.json({
        audio_url: ttsResult.audio_url,
        slideNumber,
        stage: 'tts_slide_complete',
      });
    }

    // ── Step: tts_batch ────────────────────────────────────────────────────
    if (step === 'tts_batch') {
      const { slides } = body;
      if (!slides || !Array.isArray(slides)) {
        return NextResponse.json({ error: 'slides array is required for TTS batch' }, { status: 400 });
      }

      const results: Array<{ slideNumber: number; audio_url: string }> = [];

      for (const slide of slides) {
        if (!slide.narrationText || slide.narrationText.trim() === '') {
          results.push({ slideNumber: slide.slideNumber, audio_url: '' });
          continue;
        }

        try {
          const ttsResult = await textToSpeech(slide.narrationText, language);
          results.push({ slideNumber: slide.slideNumber, audio_url: ttsResult.audio_url });
          console.log(`[TTS Batch] Slide ${slide.slideNumber} completed`);
        } catch (err) {
          console.error(`[TTS Batch] Slide ${slide.slideNumber} failed:`, err);
          results.push({ slideNumber: slide.slideNumber, audio_url: '' });
        }
      }

      return NextResponse.json({ audioResults: results, stage: 'tts_batch_complete' });
    }

    // ── Step: lipsync ──────────────────────────────────────────────────────
    if (step === 'lipsync') {
      const { video_url, audio_url } = body;
      if (!video_url || !audio_url) {
        return NextResponse.json(
          { error: 'video_url and audio_url are required for lipsync' },
          { status: 400 }
        );
      }

      const result = await createLipsyncVideo(video_url, audio_url);
      return NextResponse.json({ video_url: result.video_url, stage: 'lipsync_complete' });
    }

    // ── Step: demo_content (landing page short narration) ──────────────────
    if (step === 'demo_content') {
      const { demoTopic, demoSubject } = body;
      if (!demoTopic || !demoSubject) {
        return NextResponse.json(
          { error: 'demoTopic and demoSubject are required' },
          { status: 400 }
        );
      }

      const lang = language || 'tr';
      const demoPrompt = lang === 'tr'
        ? `Sen harika bir öğretmensin. Aşağıdaki konu hakkında çok kısa, etkileyici ve anlaşılır bir video ders metni hazırla.
Konu: ${demoTopic}
Ders: ${demoSubject}

Kurallar:
1. Sadece anlatılacak metni yaz. Başlık, giriş, "Merhaba arkadaşlar" gibi girişleri veya "Görüşürüz" gibi kapanışları ekleme.
2. Maksimum 2-3 cümle olsun. Çok kısa ve öz olsun.
3. Doğrudan konuya gir.
4. Samimi ve enerjik bir dil kullan.
5. Türkçe yaz.
6. Sadece düz metin döndür, JSON formatı KULLANMA.`
        : `You are a great teacher. Write a very short, impactful, and clear video lesson text on the following topic.
Topic: ${demoTopic}
Subject: ${demoSubject}

Rules:
1. Write only the narration text. No titles, intros like "Hello everyone", or closings like "Goodbye".
2. Maximum 2-3 sentences. Very short and concise.
3. Get straight to the point.
4. Use a warm and energetic tone.
5. Return only plain text, do NOT use JSON format.`;

      const response = await falRequest<{ output: string }>('fal-ai/any-llm', {
        prompt: demoPrompt,
        model: 'google/gemini-2.5-flash-lite',
        max_tokens: 500,
        temperature: 0.7,
      });

      const text = response.output?.trim() || '';
      return NextResponse.json({ text, stage: 'demo_content_complete' });
    }

    // ── Step: bunny_ingest_batch ───────────────────────────────────────────
    if (step === 'bunny_ingest_batch') {
      if (!isBunnyEnabled()) {
        return NextResponse.json(
          { error: 'Bunny Stream is not enabled. Set VIDEO_DELIVERY_PROVIDER=bunny.' },
          { status: 400 }
        );
      }

      const { slides, videoTitle } = body;
      if (!slides || !Array.isArray(slides)) {
        return NextResponse.json(
          { error: 'slides array is required for Bunny ingestion' },
          { status: 400 }
        );
      }

      console.log(`[BunnyIngest] Starting batch ingestion for ${slides.length} slides`);

      const results: Array<{
        slideNumber: number;
        bunnyVideoGuid: string;
        bunnyEmbedUrl: string;
        status: 'success' | 'failed' | 'skipped';
        error?: string;
      }> = [];

      for (const slide of slides) {
        if (!slide.videoUrl) {
          results.push({
            slideNumber: slide.slideNumber,
            bunnyVideoGuid: '',
            bunnyEmbedUrl: '',
            status: 'skipped',
          });
          continue;
        }

        try {
          const title = `${videoTitle || 'Lesson'} - Slide ${slide.slideNumber}`;
          const result = await ingestFromUrl(slide.videoUrl, title);

          results.push({
            slideNumber: slide.slideNumber,
            bunnyVideoGuid: result.guid,
            bunnyEmbedUrl: result.hlsUrl,
            status: result.status,
            error: result.error,
          });

          console.log(
            `[BunnyIngest] Slide ${slide.slideNumber}: ${result.status}${result.guid ? ` (guid=${result.guid})` : ''}`
          );
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.error(`[BunnyIngest] Slide ${slide.slideNumber} error:`, errorMsg);
          results.push({
            slideNumber: slide.slideNumber,
            bunnyVideoGuid: '',
            bunnyEmbedUrl: '',
            status: 'failed',
            error: errorMsg,
          });
        }
      }

      const successCount = results.filter((r) => r.status === 'success').length;
      const totalWithVideo = results.filter((r) => r.status !== 'skipped').length;
      console.log(`[BunnyIngest] Batch complete: ${successCount}/${totalWithVideo} succeeded`);

      return NextResponse.json({ ingestionResults: results, stage: 'bunny_ingest_complete' });
    }

    // ── Step: manim_code ───────────────────────────────────────────────────
    if (step === 'manim_code') {
      const { slide, topic: slideTopic, language: lang = 'en' } = body as {
        slide: { slideNumber: number; title: string; content: string; bulletPoints: string[] };
        topic: string;
        language?: string;
      };

      if (!slide || !slideTopic) {
        return NextResponse.json({ error: 'slide and topic are required' }, { status: 400 });
      }

      const manimCode = await generateManimCode(slide, slideTopic, lang);
      return NextResponse.json({ manim_code: manimCode });
    }

    // ── Step: manim_render ─────────────────────────────────────────────────
    if (step === 'manim_render') {
      const { manim_code, slide_number, video_id } = body as {
        manim_code: string;
        slide_number: number;
        video_id: string;
      };

      if (!manim_code || !video_id) {
        return NextResponse.json({ error: 'manim_code and video_id are required' }, { status: 400 });
      }

      const animationUrl = await renderManimAnimation(manim_code, slide_number, video_id);
      return NextResponse.json({ animation_url: animationUrl });
    }

    // ── Step: regenerate_slide (editor's per-slide regen) ──────────────────
    if (step === 'regenerate_slide') {
      const { slideNumber, totalSlides, currentSlide, siblingTitles, feedback } = body as {
        slideNumber: number;
        totalSlides: number;
        currentSlide: { title: string; content: string; bulletPoints: string[]; narrationText: string };
        siblingTitles: string[];
        feedback?: string;
      };

      if (!topic || !slideNumber || !totalSlides || !currentSlide || !Array.isArray(siblingTitles)) {
        return NextResponse.json(
          { error: 'topic, slideNumber, totalSlides, currentSlide, and siblingTitles are required' },
          { status: 400 }
        );
      }

      const slide = await regenerateSingleSlide({
        topic,
        description,
        language,
        tone,
        slideNumber,
        totalSlides,
        currentSlide,
        siblingTitles,
        feedback,
      });

      return NextResponse.json({ slide, stage: 'regenerate_slide_complete' });
    }

    // ── Step: generate_quiz (editor "Quiz oluştur") ────────────────────────
    if (step === 'generate_quiz') {
      const { sourceSlide, difficulty } = body as {
        sourceSlide?: { title: string; content: string; bulletPoints: string[] };
        difficulty?: 'easy' | 'medium' | 'hard';
      };

      if (!topic) {
        return NextResponse.json({ error: 'topic is required' }, { status: 400 });
      }

      const quiz = await generateQuiz({ topic, language, sourceSlide, difficulty });
      return NextResponse.json({ quiz, stage: 'generate_quiz_complete' });
    }

    return NextResponse.json(
      {
        error: `Unknown step: ${step}. Use 'slides', 'tts_slide', 'tts_batch', 'lipsync', 'demo_content', 'bunny_ingest_batch', 'manim_code', 'manim_render', 'rag_retrieve', 'regenerate_slide', or 'generate_quiz'.`,
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Video generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
