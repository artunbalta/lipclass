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
import { generateOutline } from '@/lib/llm/outline';
import { materializeSlide } from '@/lib/llm/materialize';
import { textToSpeech } from '@/lib/llm/tts';
import { createLipsyncVideo } from '@/lib/llm/lipsync';
import { generateManimCode, renderManimAnimation } from '@/lib/llm/manim';
import { computeSlidesHash } from '@/lib/llm/content-hash';
import { findCachedSlides } from '@/lib/api/slide-cache';
import type { SlideOutline } from '@/types';
import type { SlideLanguage, SlideTone } from '@/lib/llm/prompts';

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

    // ── Step: outline (Pass 1 of the 2-pass pipeline) ──────────────────────
    if (step === 'outline') {
      if (!topic || !description) {
        return NextResponse.json({ error: 'Topic and description are required' }, { status: 400 });
      }
      const { totalSlides } = body as { totalSlides?: number };
      const result = await generateOutline({
        topic,
        description,
        language: language as SlideLanguage,
        tone: tone as SlideTone,
        includesProblemSolving,
        problemCount,
        difficulty,
        ragContext,
        totalSlides: totalSlides ?? 10,
      });
      return NextResponse.json({ outline: result.outline, stage: 'outline_complete' });
    }

    // ── Step: materialize_slide (Pass 2 — one slide at a time) ─────────────
    if (step === 'materialize_slide') {
      const { outlineSlide, totalSlides: total, siblingTitles } = body as {
        outlineSlide: SlideOutline;
        totalSlides: number;
        siblingTitles: string[];
      };

      if (!topic || !description || !outlineSlide || !total || !Array.isArray(siblingTitles)) {
        return NextResponse.json(
          { error: 'topic, description, outlineSlide, totalSlides, and siblingTitles are required' },
          { status: 400 }
        );
      }

      const slide = await materializeSlide({
        topic,
        description,
        language: language as SlideLanguage,
        tone: tone as SlideTone,
        outline: outlineSlide,
        totalSlides: total,
        siblingTitles,
        ragContext,
      });

      return NextResponse.json({ slide, stage: 'materialize_complete' });
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

    // ── Step: whiteboard_extract (vision LLM — extracts lesson content from image) ──
    if (step === 'whiteboard_extract') {
      const { image_url } = body as { image_url: string };
      if (!image_url) {
        return NextResponse.json({ error: 'image_url is required' }, { status: 400 });
      }

      const extractPrompt =
        'You are analyzing a whiteboard or handwritten classroom notes photo. ' +
        'Extract all educational content and return a JSON object with these fields: ' +
        '{"topic":"main topic/title (5-10 words max)","description":"detailed description of content (200-400 chars), including key concepts and any formulas described in plain text","formulas":["list of LaTeX formulas found"]}. ' +
        'Return ONLY the JSON object, no markdown fences, no explanation.';

      const response = await falRequest<{ output: string }>('fal-ai/any-llm', {
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: image_url } },
              { type: 'text', text: extractPrompt },
            ],
          },
        ],
        max_tokens: 1000,
      });

      const raw = response.output?.trim() || '{}';
      let extracted: { topic?: string; description?: string; formulas?: string[] };
      try {
        const clean = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
        extracted = JSON.parse(clean);
      } catch {
        extracted = { topic: '', description: raw, formulas: [] };
      }

      return NextResponse.json({ extracted, stage: 'whiteboard_extract_complete' });
    }

    // ── Step: voice_parse (LLM parses spoken command into form fields) ─────────
    if (step === 'voice_parse') {
      const { transcript } = body as { transcript?: string };
      const cleanTranscript = (transcript || '').trim();
      if (!cleanTranscript) {
        return NextResponse.json(
          { error: 'Transkript boş geldi. Mikrofon sesini yakalayamadı.' },
          { status: 400 }
        );
      }

      // Defensive: surface a friendly message if Fal isn't configured rather
      // than letting falRequest throw a generic "FAL_KEY is not configured".
      if (!process.env.FAL_KEY && !process.env.NEXT_PUBLIC_FAL_KEY) {
        console.error('[voice_parse] FAL_KEY missing in environment');
        return NextResponse.json(
          { error: 'AI servisi yapılandırılmamış (FAL_KEY). Lütfen yöneticiyle iletişime geç.' },
          { status: 503 }
        );
      }

      const subjects = [
        'Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Türkçe',
        'Edebiyat', 'Tarih', 'Coğrafya', 'İngilizce', 'Fen Bilimleri',
      ];

      const parsePrompt =
        `Parse the following Turkish teacher's voice command into lesson creation form fields.\n` +
        `Voice command: "${cleanTranscript}"\n\n` +
        `Return ONLY a JSON object (no markdown). Include only fields you can confidently extract:\n` +
        `{"subject": one of [${subjects.map((s) => `"${s}"`).join(', ')}] | null,` +
        `"grade": one of ["5","6","7","8","9","10","11","12"] | null,` +
        `"topic": "short lesson topic (max 60 chars)" | null,` +
        `"description": "detailed lesson description (100-400 chars)" | null,` +
        `"tone": "formal"|"friendly"|"energetic" | null}`;

      let response: { output: string };
      try {
        response = await falRequest<{ output: string }>('fal-ai/any-llm', {
          prompt: parsePrompt,
          model: 'google/gemini-2.5-flash-lite',
          max_tokens: 500,
          temperature: 0.1,
        });
      } catch (e) {
        console.error('[voice_parse] Fal request failed:', e);
        return NextResponse.json(
          { error: `AI servisi yanıt vermedi: ${e instanceof Error ? e.message : 'unknown'}` },
          { status: 502 }
        );
      }

      const raw = (response.output || '').trim() || '{}';
      let parsed: Record<string, string | null>;
      try {
        const clean = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
        parsed = JSON.parse(clean);
      } catch (e) {
        console.warn('[voice_parse] LLM output not valid JSON:', raw.slice(0, 200), e);
        parsed = {};
      }

      return NextResponse.json({ parsed, stage: 'voice_parse_complete' });
    }

    return NextResponse.json(
      {
        error: `Unknown step: ${step}. Use 'outline', 'materialize_slide', 'slides', 'tts_slide', 'tts_batch', 'lipsync', 'demo_content', 'bunny_ingest_batch', 'manim_code', 'manim_render', 'rag_retrieve', 'regenerate_slide', 'generate_quiz', 'whiteboard_extract', or 'voice_parse'.`,
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
