// LLM-driven slide translation for variant ("derivative") videos.
//
// Used by /api/videos/[id]/derive when the requested derivative is in a
// different language than the parent. We translate per-slide because:
//   1. Whole-lesson translation in one shot risks JSON corruption and token
//      ceilings (multi-page Mermaid + KaTeX content).
//   2. Per-slide calls run in parallel via pLimit and stream progress nicely.
//   3. KaTeX/Mermaid blocks must be preserved verbatim — easier to enforce
//      inside a focused prompt that sees only one slide at a time.

import { falRequest } from './fal-client';
import { extractJsonBody, sanitizeLatexInJson } from './json-sanitizer';
import { pLimit } from './p-limit';
import type { Slide } from '@/types';

const FAL_MODEL = 'fal-ai/any-llm';
const LLM_MODEL = 'google/gemini-2.5-flash';

const TRANSLATE_CONCURRENCY = 4;

export type TranslationLanguage = 'tr' | 'en';

const LANG_NAME: Record<TranslationLanguage, string> = {
  tr: 'Turkish',
  en: 'English',
};

interface TranslatedFields {
  title: string;
  content: string;
  bulletPoints: string[];
  narrationText: string;
}

function buildSystemPrompt(target: TranslationLanguage): string {
  const tgt = LANG_NAME[target];
  return `You are a precision lesson translator. Translate the given slide into ${tgt}.

ABSOLUTE RULES:
1. Preserve KaTeX math verbatim. Do NOT translate inside $...$ or $$...$$.
   Backslashes inside math (\\\\frac, \\\\sqrt, \\\\sum, \\\\alpha, ...) must
   be kept exactly. Do not "fix" them.
2. Preserve Mermaid blocks verbatim. Anything inside \`\`\`mermaid ... \`\`\`
   stays in the source code language; only translate human-readable LABELS
   that appear in node text (e.g. \`A[Konu]\` → \`A[Topic]\`).
3. Keep markdown structure (lists, tables, headings, bold) byte-identical
   apart from the words themselves.
4. Numbers, units (kg, m/s, °C), variable names (x, y, F=ma), and proper
   nouns stay as-is.
5. Tone: educational, age-appropriate for K-12. Match the source's register.
6. Output STRICTLY valid JSON, no markdown fences, no commentary. Schema:

{
  "title": "...",
  "content": "...",
  "bulletPoints": ["...", "..."],
  "narrationText": "..."
}`;
}

function buildUserPrompt(slide: Slide): string {
  return `Translate this slide.

TITLE:
${slide.title}

CONTENT (markdown + KaTeX + optional Mermaid):
${slide.content || '(empty)'}

BULLET POINTS:
${(slide.bulletPoints || []).map((b, i) => `${i + 1}. ${b}`).join('\n') || '(none)'}

NARRATION (this is what the teacher SAYS out loud — keep it conversational):
${slide.narrationText || '(empty)'}`;
}

function safeParse(raw: string): TranslatedFields | null {
  const jsonStr = extractJsonBody(raw);
  const sanitized = sanitizeLatexInJson(jsonStr);
  let parsed: unknown;
  try {
    parsed = JSON.parse(sanitized);
  } catch {
    try {
      const aggressive = sanitized
        .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, ' ')
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']');
      parsed = JSON.parse(aggressive);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;
  return {
    title: String(obj.title ?? '').trim(),
    content: String(obj.content ?? '').trim(),
    bulletPoints: Array.isArray(obj.bulletPoints)
      ? (obj.bulletPoints as unknown[]).map(String)
      : [],
    narrationText: String(obj.narrationText ?? obj.narration ?? '').trim(),
  };
}

/**
 * Translate one slide into the target language. Quiz slides keep their
 * structure but get question/options/explanation translated. Media URLs
 * (audioUrl, videoUrl, animationUrl, bunnyEmbedUrl) are wiped — the caller
 * (derive route) already strips them but we double-check here for safety.
 */
async function translateOneSlide(
  slide: Slide,
  target: TranslationLanguage,
): Promise<Slide> {
  const systemPrompt = buildSystemPrompt(target);
  const userPrompt = buildUserPrompt(slide);

  const response = await falRequest<{ output: string }>(FAL_MODEL, {
    prompt: userPrompt,
    system_prompt: systemPrompt,
    model: LLM_MODEL,
    max_tokens: 3500,
    temperature: 0.3,
  });

  const parsed = safeParse(response.output ?? '');
  if (!parsed) {
    // Fail-soft: keep the source content rather than block the variant.
    // The teacher can re-translate the slide from the editor.
    console.warn(
      `[Translate] slide ${slide.slideNumber}: parse failed, leaving source text in place`,
    );
    return { ...slide, audioUrl: undefined, videoUrl: undefined, animationUrl: undefined,
             bunnyVideoGuid: undefined, bunnyEmbedUrl: undefined };
  }

  const translated: Slide = {
    ...slide,
    title: parsed.title || slide.title,
    content: parsed.content || slide.content,
    bulletPoints: parsed.bulletPoints.length > 0 ? parsed.bulletPoints : slide.bulletPoints,
    narrationText: parsed.narrationText || slide.narrationText,
    // Always drop media — derivative pipeline will regenerate TTS + lipsync.
    audioUrl: undefined,
    videoUrl: undefined,
    animationUrl: undefined,
    bunnyVideoGuid: undefined,
    bunnyEmbedUrl: undefined,
    // Reset edit/dirty flags
    narrationDirtyAt: undefined,
    editedAt: undefined,
    mediaStatus: undefined,
  };

  // Quiz slides: translate the question/options/explanation. Indices stay
  // unchanged so correctAnswer remains valid.
  if (slide.slideType === 'quiz' && slide.quiz) {
    try {
      const quizPayload = await translateQuiz(slide.quiz, target);
      translated.slideType = 'quiz';
      translated.quiz = quizPayload;
    } catch (err) {
      console.warn(
        `[Translate] slide ${slide.slideNumber}: quiz translation failed, keeping original quiz`,
        err,
      );
      translated.slideType = 'quiz';
      translated.quiz = slide.quiz;
    }
  }

  return translated;
}

interface QuizShape {
  question: string;
  options: [string, string, string, string];
  correctAnswer: 0 | 1 | 2 | 3;
  explanation?: string;
}

async function translateQuiz(
  quiz: QuizShape,
  target: TranslationLanguage,
): Promise<QuizShape> {
  const tgt = LANG_NAME[target];
  const systemPrompt = `Translate a multiple-choice quiz into ${tgt}.
Keep math expressions verbatim. Do NOT change the order of options.
Output strict JSON: { "question": "...", "options": ["...", "...", "...", "..."], "explanation": "..." }`;

  const userPrompt = `QUESTION: ${quiz.question}
OPTIONS:
A) ${quiz.options[0]}
B) ${quiz.options[1]}
C) ${quiz.options[2]}
D) ${quiz.options[3]}

EXPLANATION: ${quiz.explanation ?? ''}`;

  const response = await falRequest<{ output: string }>(FAL_MODEL, {
    prompt: userPrompt,
    system_prompt: systemPrompt,
    model: LLM_MODEL,
    max_tokens: 1200,
    temperature: 0.2,
  });

  const raw = response.output ?? '';
  const clean = extractJsonBody(raw);
  const sanitized = sanitizeLatexInJson(clean);
  const parsed = JSON.parse(sanitized) as {
    question?: string;
    options?: unknown[];
    explanation?: string;
  };
  const opts = Array.isArray(parsed.options) ? parsed.options.slice(0, 4).map(String) : [];
  if (opts.length !== 4) throw new Error('quiz translation returned !=4 options');

  return {
    question: String(parsed.question || quiz.question),
    options: opts as [string, string, string, string],
    correctAnswer: quiz.correctAnswer,
    explanation: parsed.explanation ?? quiz.explanation,
  };
}

/**
 * Translate every slide in a lesson in parallel (concurrency-limited).
 * Errors on individual slides degrade gracefully — that slide keeps the
 * source language and the rest of the lesson still gets translated.
 */
export async function translateSlides(
  slides: Slide[],
  target: TranslationLanguage,
): Promise<Slide[]> {
  if (slides.length === 0) return slides;

  const limit = pLimit(TRANSLATE_CONCURRENCY);
  const out = new Array<Slide>(slides.length);

  await Promise.all(
    slides.map((s, idx) =>
      limit(async () => {
        try {
          out[idx] = await translateOneSlide(s, target);
        } catch (err) {
          console.error(
            `[Translate] slide ${s.slideNumber} translation failed:`,
            err,
          );
          // Source text survives — derive route won't break.
          out[idx] = { ...s, audioUrl: undefined, videoUrl: undefined,
                       animationUrl: undefined, bunnyVideoGuid: undefined,
                       bunnyEmbedUrl: undefined };
        }
      }),
    ),
  );

  return out;
}
