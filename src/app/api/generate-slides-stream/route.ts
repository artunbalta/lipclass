// POST /api/generate-slides-stream
//
// Server-Sent Events endpoint for the 2-pass slide pipeline.
//
//   Pass 1 — outline   (single fast LLM call, ~2-3s)
//   Pass 2 — materialize each slide in parallel (slot-limited)
//
// Event types:
//   data: { type: 'progress', stage: string, progress: number }
//   data: { type: 'outline',  outline: SlideOutline[] }
//   data: { type: 'slide',    slide: Slide, index: number, total: number }
//   data: { type: 'done',     videoId: string }
//   data: { type: 'error',    message: string }
//
// Backwards compat:
//   - If outline generation fails, we fall back to the legacy generateSlides()
//     single-shot path so existing clients still get slides.
//   - Cached slides (slide_cache table) short-circuit both passes.

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateOutline } from '@/lib/llm/outline';
import { materializeSlide } from '@/lib/llm/materialize';
import { generateSlides } from '@/lib/llm/slides';
import { saveSlidesData } from '@/lib/api/videos';
import { computeSlidesHash } from '@/lib/llm/content-hash';
import { findCachedSlides } from '@/lib/api/slide-cache';
import { retrieveContext, isRagConfigured } from '@/lib/api/rag';
import { pLimit } from '@/lib/llm/p-limit';
import { findByCode } from '@/lib/curriculum/meb-catalog';
import type { Slide, SlideOutline, SlidesData } from '@/types';
import type { SlideLanguage, SlideTone } from '@/lib/llm/prompts';

export const maxDuration = 120;

const MATERIALIZE_CONCURRENCY = 4;

function encode(obj: unknown) {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return new Response('data: {"type":"error","message":"Invalid body"}\n\n', {
      status: 400,
      headers: { 'Content-Type': 'text/event-stream' },
    });
  }

  const {
    videoId,
    teacherId,
    topic,
    description,
    prompt = '',
    language = 'tr',
    tone = 'friendly',
    includesProblemSolving = false,
    problemCount,
    difficulty,
    sourceOnly,
    sourceDocumentIds,
  } = body;

  // Resolve curriculum codes to full "code — title" lines for the LLM.
  // We accept codes from the request body (already saved to the DB row by the
  // time this endpoint is called), but also fall back to reading from the DB
  // so the route is self-contained even if the caller omits them.
  async function resolveCurriculumLines(): Promise<string[]> {
    let codes: string[] = Array.isArray(body.curriculumCodes) ? body.curriculumCodes : [];
    if (codes.length === 0 && videoId) {
      try {
        const sb = await createClient();
        const { data } = await sb
          .from('videos')
          .select('curriculum_codes')
          .eq('id', videoId)
          .single();
        if (Array.isArray(data?.curriculum_codes)) {
          codes = data.curriculum_codes as string[];
        }
      } catch { /* non-fatal */ }
    }
    return codes
      .map((code) => {
        const k = findByCode(code);
        return k ? `${code} — ${k.title}` : code;
      })
      .filter(Boolean);
  }

  const lang = language as SlideLanguage;
  const toneVal = tone as SlideTone;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encode(obj));

      try {
        send({ type: 'progress', stage: 'Bağlantı kuruldu', progress: 3 });

        // ── Auth ───────────────────────────────────────────────────────────
        const sb = await createClient();
        const { data: { user } } = await sb.auth.getUser();
        if (!user) {
          send({ type: 'error', message: 'Oturum açılmamış' });
          controller.close();
          return;
        }

        // ── Cache check ────────────────────────────────────────────────────
        const fullPrompt = prompt || '';
        const contentHash = computeSlidesHash({
          topic,
          description,
          extraPrompt: fullPrompt,
          language: lang,
          tone: toneVal,
          includesProblemSolving,
          problemCount,
          difficulty,
        });

        const cached = await findCachedSlides(teacherId, contentHash);
        if (cached) {
          send({ type: 'progress', stage: 'Önbellekten yükleniyor', progress: 30 });
          const slides = cached.slides as Slide[];
          // Replay outline from cached slides if present.
          const cachedOutline = slides
            .filter((s) => s.intent)
            .map<SlideOutline>((s) => ({
              slideNumber: s.slideNumber,
              title: s.title,
              oneLineGoal: '',
              intent: s.intent!,
            }));
          if (cachedOutline.length === slides.length) {
            send({ type: 'outline', outline: cachedOutline });
          }
          for (let i = 0; i < slides.length; i++) {
            send({ type: 'slide', slide: slides[i], index: i, total: slides.length });
            await new Promise((r) => setTimeout(r, 60));
          }
          if (videoId) await saveSlidesData(videoId, { slides });
          send({ type: 'done', videoId });
          controller.close();
          return;
        }

        // ── Curriculum codes ───────────────────────────────────────────────
        const curriculumLines = await resolveCurriculumLines();

        // ── Optional RAG ───────────────────────────────────────────────────
        let ragContext: string | undefined;
        if (sourceDocumentIds?.length && isRagConfigured()) {
          send({ type: 'progress', stage: 'Belgeler taranıyor', progress: 10 });
          try {
            ragContext = await retrieveContext(
              `${topic} ${description}`,
              teacherId,
              sourceDocumentIds,
              8
            );
          } catch (err) {
            console.warn('[Stream] RAG retrieval failed:', err);
          }
        }

        // ── Pass 1: Outline ────────────────────────────────────────────────
        send({ type: 'progress', stage: 'Ders planı çıkarılıyor', progress: 18 });

        let outline: SlideOutline[] | null = null;
        try {
          const outlineResult = await generateOutline({
            topic,
            description,
            language: lang,
            tone: toneVal,
            includesProblemSolving,
            problemCount,
            difficulty,
            ragContext,
            totalSlides: 10,
            curriculumLines: curriculumLines.length > 0 ? curriculumLines : undefined,
          });
          outline = outlineResult.outline;
          send({ type: 'outline', outline });
        } catch (err) {
          console.warn('[Stream] Outline failed, falling back to legacy single-shot:', err);
        }

        // ── Pass 2: Materialize (parallel) or legacy fallback ──────────────
        const slides: Slide[] = new Array(outline?.length || 10);

        if (outline && outline.length > 0) {
          send({ type: 'progress', stage: 'Slaytlar paralel üretiliyor', progress: 28 });

          const siblingTitles = outline.map((o) => o.title);
          const total = outline.length;
          const limit = pLimit(MATERIALIZE_CONCURRENCY);
          let completed = 0;

          await Promise.all(
            outline.map((o) =>
              limit(async () => {
                try {
                  const slide = await materializeSlide({
                    topic,
                    description,
                    language: lang,
                    tone: toneVal,
                    outline: o,
                    totalSlides: total,
                    siblingTitles,
                    ragContext: sourceOnly ? ragContext : undefined,
                    curriculumLines: curriculumLines.length > 0 ? curriculumLines : undefined,
                  });
                  slides[o.slideNumber - 1] = slide;
                  send({
                    type: 'slide',
                    slide,
                    index: o.slideNumber - 1,
                    total,
                  });
                } catch (err) {
                  console.error(`[Stream] Slide ${o.slideNumber} materialize failed:`, err);
                  // Emit a placeholder slide so the UI still progresses; user
                  // can regenerate from the editor.
                  const placeholder: Slide = {
                    slideNumber: o.slideNumber,
                    title: o.title,
                    content: '',
                    bulletPoints: [],
                    narrationText: o.oneLineGoal,
                    intent: o.intent,
                  };
                  slides[o.slideNumber - 1] = placeholder;
                  send({ type: 'slide', slide: placeholder, index: o.slideNumber - 1, total });
                } finally {
                  completed++;
                  const pct = 28 + Math.round((completed / total) * 60);
                  send({
                    type: 'progress',
                    stage: `Slayt ${completed}/${total}`,
                    progress: pct,
                  });
                }
              })
            )
          );
        } else {
          // Legacy path — outline LLM failed.
          send({ type: 'progress', stage: 'Slaytlar oluşturuluyor (klasik mod)', progress: 30 });

          let progress = 30;
          const heartbeat = setInterval(() => {
            progress = Math.min(progress + 3, 80);
            send({ type: 'progress', stage: 'Yapay zeka içerik hazırlıyor', progress });
          }, 2000);

          let legacy: { slides: { slideNumber: number; title: string; content: string; bulletPoints: string[]; narrationText: string }[] };
          try {
            legacy = await generateSlides({
              topic,
              description,
              prompt: fullPrompt,
              language: lang,
              tone: toneVal,
              includesProblemSolving,
              problemCount,
              difficulty,
              ragContext,
              sourceOnly,
            });
          } finally {
            clearInterval(heartbeat);
          }

          for (let i = 0; i < legacy.slides.length; i++) {
            const s = legacy.slides[i];
            const slide: Slide = {
              slideNumber: s.slideNumber,
              title: s.title,
              content: s.content,
              bulletPoints: s.bulletPoints,
              narrationText: s.narrationText,
            };
            slides[i] = slide;
            send({ type: 'slide', slide, index: i, total: legacy.slides.length });
            await new Promise((r) => setTimeout(r, 80));
          }
        }

        // ── Persist ────────────────────────────────────────────────────────
        const finalSlides = slides.filter(Boolean);
        const slidesData: SlidesData = {
          slides: finalSlides,
          outline: outline || undefined,
        };
        if (videoId) {
          await saveSlidesData(videoId, slidesData);
        }

        send({ type: 'progress', stage: 'Tamamlandı', progress: 100 });
        send({ type: 'done', videoId });
      } catch (err) {
        send({ type: 'error', message: err instanceof Error ? err.message : 'Bilinmeyen hata' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
      Connection: 'keep-alive',
    },
  });
}
