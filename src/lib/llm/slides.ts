// Slide generation via Fal AI (Gemini). Extracted from /api/generate-video/route.ts.
// Behavior preserved exactly — same model, same params, same prompts, same parsing.

import { falRequest } from './fal-client';
import {
  extractJsonBody,
  sanitizeLatexInJson,
  recoverTruncatedJson,
} from './json-sanitizer';
import {
  buildFullSlidesSystemPrompt,
  buildFullSlidesUserPrompt,
  buildSingleSlideSystemPrompt,
  buildSingleSlideUserPrompt,
  buildQuizSystemPrompt,
  buildQuizUserPrompt,
  type SlideLanguage,
  type SlideTone,
} from './prompts';

const FAL_MODEL = 'fal-ai/any-llm';
const LLM_MODEL = 'google/gemini-2.5-flash-lite';

export interface GeneratedSlide {
  slideNumber: number;
  title: string;
  content: string;
  bulletPoints: string[];
  narrationText: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Generate 10 slides
// ─────────────────────────────────────────────────────────────────────────────

export async function generateSlides(opts: {
  topic: string;
  description: string;
  prompt: string;
  language: SlideLanguage;
  tone: SlideTone;
  includesProblemSolving: boolean;
  problemCount?: number;
  difficulty?: string;
  ragContext?: string;
  sourceOnly?: boolean;
}): Promise<{ slides: GeneratedSlide[] }> {
  const systemPrompt = buildFullSlidesSystemPrompt(opts);
  const userPrompt = buildFullSlidesUserPrompt(opts);

  const response = await falRequest<{ output: string }>(FAL_MODEL, {
    prompt: userPrompt,
    system_prompt: systemPrompt,
    model: LLM_MODEL,
    max_tokens: 32000,
    temperature: 0.7,
  });

  const rawOutput = response.output.trim();
  const jsonStr = extractJsonBody(rawOutput);
  const sanitized = sanitizeLatexInJson(jsonStr);

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(sanitized);
  } catch (firstError) {
    console.warn('[Slides] First sanitization failed, trying aggressive cleanup...');
    try {
      const aggressive = sanitized
        .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, ' ')
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']');
      parsed = JSON.parse(aggressive);
    } catch (secondError) {
      const recovered = recoverTruncatedJson(sanitized, 'slides');
      if (recovered) {
        try {
          parsed = JSON.parse(recovered);
          const recoveredCount = Array.isArray((parsed as { slides?: unknown[] }).slides)
            ? (parsed as { slides: unknown[] }).slides.length
            : 0;
          console.warn(`[Slides] Recovered ${recoveredCount} slide(s) from truncated output.`);
        } catch {
          console.error('[Slides] JSON parse failed. Raw output (first 800 chars):', jsonStr.substring(0, 800));
          console.error('[Slides] Sanitized (first 800 chars):', sanitized.substring(0, 800));
          throw new Error(`LLM çıktısı JSON olarak ayrıştırılamadı: ${secondError instanceof Error ? secondError.message : 'Parse error'}`);
        }
      } else {
        console.error('[Slides] JSON parse failed. Raw output (first 800 chars):', jsonStr.substring(0, 800));
        console.error('[Slides] Sanitized (first 800 chars):', sanitized.substring(0, 800));
        throw new Error(`LLM çıktısı JSON olarak ayrıştırılamadı: ${secondError instanceof Error ? secondError.message : 'Parse error'}`);
      }
    }
  }

  if (!parsed.slides || !Array.isArray(parsed.slides)) {
    throw new Error('Invalid slides format: missing slides array');
  }

  const slides = parsed.slides.slice(0, 10).map((s: Record<string, unknown>, i: number) => {
    const slideNumber = i + 1;
    const rawContent = String(s.content || '').trim();
    const bulletPoints = Array.isArray(s.bulletPoints) ? s.bulletPoints.map(String) : [];
    const narrationText = String(s.narrationText || s.narration || '').trim();

    // If empty content + no bullets (LLM truncated), fall back to narration so
    // we don't render a blank slide.
    let content = rawContent;
    if (!content && bulletPoints.length === 0 && narrationText) {
      console.warn(`[Slides] slide ${slideNumber} had empty content; falling back to narration`);
      content = narrationText;
    }

    return {
      slideNumber,
      title: String(s.title || `Slayt ${slideNumber}`),
      content,
      bulletPoints,
      narrationText,
    };
  });

  const emptyCount = slides.filter((s) => !s.content && s.bulletPoints.length === 0).length;
  if (emptyCount > 0) {
    console.warn(`[Slides] ${emptyCount}/${slides.length} slides have no displayable content`);
  }

  return { slides };
}

// ─────────────────────────────────────────────────────────────────────────────
// Regenerate a single slide
// ─────────────────────────────────────────────────────────────────────────────

export async function regenerateSingleSlide(input: {
  topic: string;
  description?: string;
  language: SlideLanguage;
  tone: SlideTone;
  slideNumber: number;
  totalSlides: number;
  currentSlide: { title: string; content: string; bulletPoints: string[]; narrationText: string };
  siblingTitles: string[];
  feedback?: string;
}): Promise<GeneratedSlide> {
  const { topic, description, language, tone, slideNumber, totalSlides, currentSlide, siblingTitles, feedback } = input;

  const systemPrompt = buildSingleSlideSystemPrompt({ language, tone, slideNumber, totalSlides });
  const userPrompt = buildSingleSlideUserPrompt({
    language,
    topic,
    description,
    slideNumber,
    siblingTitles,
    currentSlide,
    feedback,
  });

  const response = await falRequest<{ output: string }>(FAL_MODEL, {
    prompt: userPrompt,
    system_prompt: systemPrompt,
    model: LLM_MODEL,
    max_tokens: 4000,
    temperature: 0.7,
  });

  const rawOutput = response.output.trim();
  const jsonStr = extractJsonBody(rawOutput);
  const sanitized = sanitizeLatexInJson(jsonStr);

  let parsed: { slide?: Record<string, unknown> };
  try {
    parsed = JSON.parse(sanitized);
  } catch {
    const aggressive = sanitized
      .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, ' ')
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']');
    parsed = JSON.parse(aggressive);
  }

  const s = parsed.slide;
  if (!s || typeof s !== 'object') {
    throw new Error('Tek slayt çıktısı geçersiz: "slide" alanı yok.');
  }

  return {
    slideNumber,
    title: String(s.title || currentSlide.title),
    content: String(s.content || '').trim(),
    bulletPoints: Array.isArray(s.bulletPoints) ? s.bulletPoints.map(String) : [],
    narrationText: String(s.narrationText || s.narration || '').trim(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Generate a single 4-option quiz
// ─────────────────────────────────────────────────────────────────────────────

export interface GeneratedQuiz {
  question: string;
  options: [string, string, string, string];
  correctAnswer: 0 | 1 | 2 | 3;
  explanation?: string;
}

export async function generateQuiz(opts: {
  topic: string;
  language: SlideLanguage;
  sourceSlide?: { title: string; content: string; bulletPoints: string[] };
  difficulty?: 'easy' | 'medium' | 'hard';
}): Promise<GeneratedQuiz> {
  const systemPrompt = buildQuizSystemPrompt(opts.language);
  const userPrompt = buildQuizUserPrompt(opts);

  const response = await falRequest<{ output: string }>(FAL_MODEL, {
    prompt: userPrompt,
    system_prompt: systemPrompt,
    model: LLM_MODEL,
    max_tokens: 1200,
    temperature: 0.7,
  });

  const rawOutput = response.output.trim();
  const jsonStr = extractJsonBody(rawOutput);
  const sanitized = sanitizeLatexInJson(jsonStr);

  let parsed: { quiz?: Record<string, unknown> };
  try {
    parsed = JSON.parse(sanitized);
  } catch {
    const aggressive = sanitized
      .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, ' ')
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']');
    parsed = JSON.parse(aggressive);
  }

  const q = parsed.quiz;
  if (!q || typeof q !== 'object') {
    throw new Error('Quiz çıktısı geçersiz: "quiz" alanı yok.');
  }

  const options = Array.isArray(q.options) ? q.options.map(String) : [];
  if (options.length < 4) {
    while (options.length < 4) options.push('—');
  }
  const correctRaw = typeof q.correctAnswer === 'number' ? q.correctAnswer : 0;
  const correct = (Math.max(0, Math.min(3, Math.floor(correctRaw))) as 0 | 1 | 2 | 3);

  return {
    question: String(q.question || '').trim() || 'Soru üretilemedi',
    options: [options[0], options[1], options[2], options[3]] as [string, string, string, string],
    correctAnswer: correct,
    explanation: q.explanation ? String(q.explanation) : undefined,
  };
}
