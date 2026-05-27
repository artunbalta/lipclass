// Pass 2 — Per-slide Materialize.
//
// Given a single SlideOutline (intent + title + goal) plus the lesson context,
// produce the full Slide payload (content, bulletPoints, narrationText) along
// with a visualHint that downstream stages (Manim, Mermaid, charts) use to
// pick deterministic assets.
//
// Each call is small and independent → callable in parallel via pLimit.

import { falRequest } from './fal-client';
import {
  extractJsonBody,
  sanitizeLatexInJson,
} from './json-sanitizer';
import type { SlideLanguage, SlideTone } from './prompts';
import type {
  Slide,
  SlideOutline,
  SlideRole,
  VisualHint,
  VisualNeed,
} from '@/types';

const FAL_MODEL = 'fal-ai/any-llm';
const LLM_MODEL = 'google/gemini-2.5-flash-lite';

const TONE_LABEL_TR: Record<SlideTone, string> = {
  formal: 'Resmi ve profesyonel',
  friendly: 'Samimi ve sıcak',
  energetic: 'Enerjik ve dinamik',
};
const TONE_LABEL_EN: Record<SlideTone, string> = {
  formal: 'Formal and professional',
  friendly: 'Warm and friendly',
  energetic: 'Energetic and dynamic',
};

// Per-role focused directives. Each is short and surgical so the LLM produces
// the right shape without bleeding into the surrounding slides.
const ROLE_DIRECTIVE_TR: Record<SlideRole, string> = {
  hook:
    'Bu slayt giriş/kanca slaytı. Kısa, dikkat çekici 1-2 cümle anlatım, en fazla 1 bullet. Formül kullanma.',
  definition:
    'Bu slayt bir tanım slaytı. Tanımı tek cümlede ver, ardından 2-3 bullet ile özelliklerini sırala.',
  concept:
    'Bu slayt kavramsal açıklama. 2-4 bullet ile yapıyı ver, gerekirse 1 ana formül.',
  derivation:
    'Bu slayt türetme slaytı. Adım adım KaTeX kullanarak en az 3-4 ara denklem göster. Bulletları ADIM olarak kullan.',
  worked_example:
    'Bu slayt çözülmüş örnek. Verilenler → Bulunması istenen → Adım adım çözüm → Sonuç. KaTeX kullan.',
  comparison:
    'Bu slayt karşılaştırma. content alanında 2 sütun veya tablo şeklinde yapı kur. Aynı kriterleri her iki tarafa uygula. Formül kullanma.',
  experiment:
    'Bu slayt deney/laboratuvar adımı. Numaralı liste ile prosedür ver. Varsa güvenlik uyarısı ekle.',
  visualization:
    'Bu slayt görsel ağırlıklı. Anlatım kısa olsun (1-2 cümle); asıl iş diyagram/animasyon. Bullet en fazla 2.',
  quiz:
    'Bu slayt quiz slaytı. content alanını boş bırak, narrationText 1 cümle "Şimdi öğrendiklerimizi test edelim". Quiz içeriği başka bir adımda eklenecek.',
  summary:
    'Bu slayt özet slaytı. 3-4 bullet ile dersin ana noktaları. Yeni bilgi ekleme. Kısa kapanış cümlesi.',
};

const ROLE_DIRECTIVE_EN: Record<SlideRole, string> = {
  hook:
    'This is a hook slide. Short, attention-grabbing 1-2 sentence narration, at most 1 bullet. No formulas.',
  definition:
    'This is a definition slide. State the definition in one sentence, then 2-3 bullets listing its properties.',
  concept:
    'This is a conceptual explanation slide. 2-4 bullets covering the structure, optionally 1 main formula.',
  derivation:
    'This is a derivation slide. Show step-by-step KaTeX with at least 3-4 intermediate equations. Bullets are STEPS.',
  worked_example:
    'This is a worked example. Given → Find → Step-by-step solution → Result. Use KaTeX.',
  comparison:
    'This is a comparison slide. In content, build a 2-column or table structure. Apply the same criteria to both sides. No formulas.',
  experiment:
    'This is an experiment/lab step. Use a numbered list for the procedure. Include safety warnings if relevant.',
  visualization:
    'This is a visual-heavy slide. Keep narration short (1-2 sentences); diagram/animation does the work. Max 2 bullets.',
  quiz:
    "This is a quiz slide. Leave content empty; narrationText is 1 sentence 'Now let's test what we learned'. Quiz content is added in another step.",
  summary:
    'This is a summary slide. 3-4 bullets covering the main points. No new info. Short closing line.',
};

// Per-visualNeed deterministic hint instructions.
const VISUAL_DIRECTIVE_TR: Record<VisualNeed, string> = {
  static: 'Görsel yardımcı YOK. Sadece metin + KaTeX kullan.',
  diagram:
    'content alanına bir Mermaid diyagramı ekle. Tip: flowchart TD, mindmap veya sequenceDiagram. Format: ```mermaid\\n...\\n``` (üç backtick).',
  chart: 'content alanına basit bir veri tablosu yaz (markdown tablo). Sayılar gerçek değil temsil olsun.',
  animation:
    'content metni kısa olsun çünkü ana iş animasyon. Anlatımda animasyonun ne göstereceğini bir cümle ile özetle.',
  photo:
    'content alanında 1 cümle ile gerçek dünya örneğine atıfta bulun. Görseli sistem ileride yerleştirecek.',
};

const VISUAL_DIRECTIVE_EN: Record<VisualNeed, string> = {
  static: 'NO visual aid. Use only text + KaTeX.',
  diagram:
    'Add a Mermaid diagram inside content. Types: flowchart TD, mindmap, sequenceDiagram. Format: ```mermaid\\n...\\n``` (three backticks).',
  chart: 'Add a simple markdown data table in content. Numbers can be illustrative.',
  animation:
    'Keep content text short; animation does the heavy lifting. In narration, summarize in one sentence what the animation will show.',
  photo:
    'In content, reference a real-world example in one sentence. The system will place the image later.',
};

function buildSystemPrompt(opts: {
  language: SlideLanguage;
  tone: SlideTone;
  outline: SlideOutline;
}): string {
  const { language, tone, outline } = opts;
  const isTR = language === 'tr';
  const toneLabel = isTR ? TONE_LABEL_TR[tone] : TONE_LABEL_EN[tone];
  const roleDir = isTR ? ROLE_DIRECTIVE_TR[outline.intent.role] : ROLE_DIRECTIVE_EN[outline.intent.role];
  const visualDir = isTR
    ? VISUAL_DIRECTIVE_TR[outline.intent.visualNeed]
    : VISUAL_DIRECTIVE_EN[outline.intent.visualNeed];

  if (isTR) {
    return `Sen deneyimli bir öğretmensin. SADECE BİR SLAYT üreteceksin.

TON: ${toneLabel}
SLAYT ROLÜ: ${outline.intent.role}
SLAYT KARMAŞIKLIK SEVİYESİ: ${outline.intent.complexity}/3
GÖRSEL İHTİYAÇ: ${outline.intent.visualNeed}

ROL DİREKTİFİ: ${roleDir}
GÖRSEL DİREKTİFİ: ${visualDir}

KaTeX KURALI:
- Inline formül: $...$
- Blok formül: $$...$$
- Backslash'leri ÇİFT yaz: \\\\frac, \\\\sqrt, \\\\int, \\\\sum, \\\\alpha, vb.

JSON ÇIKTI ŞEMASI (sadece bu, başka şey ekleme, markdown çiti yok):
{
  "slide": {
    "title": "kısa başlık",
    "content": "ana içerik metni (markdown + KaTeX + opsiyonel Mermaid)",
    "bulletPoints": ["bullet 1", "bullet 2"],
    "narrationText": "öğretmenin sesli anlatımı, 30-90 saniye",
    "visualHint": {
      "hasFormulas": true|false,
      "diagramKind": "flowchart"|"mindmap"|"sequence"|"pie"|"graph", // sadece visualNeed='diagram' ise
      "chartKind": "bar"|"line"|"pie",                                  // sadece visualNeed='chart' ise
      "animationKind": "graph"|"vector_field"|"geometry_construction"|"oscillation"|"transformation"|"process_flow" // sadece visualNeed='animation' ise
    }
  }
}`;
  }

  return `You are an experienced teacher. You will produce A SINGLE SLIDE.

TONE: ${toneLabel}
SLIDE ROLE: ${outline.intent.role}
SLIDE COMPLEXITY: ${outline.intent.complexity}/3
VISUAL NEED: ${outline.intent.visualNeed}

ROLE DIRECTIVE: ${roleDir}
VISUAL DIRECTIVE: ${visualDir}

KaTeX RULES:
- Inline formula: $...$
- Block formula: $$...$$
- Double-escape backslashes: \\\\frac, \\\\sqrt, \\\\int, \\\\sum, \\\\alpha, etc.

JSON OUTPUT SCHEMA (only this, nothing else, no markdown fence):
{
  "slide": {
    "title": "short title",
    "content": "main body (markdown + KaTeX + optional Mermaid)",
    "bulletPoints": ["bullet 1", "bullet 2"],
    "narrationText": "teacher narration, 30-90 seconds",
    "visualHint": {
      "hasFormulas": true|false,
      "diagramKind": "flowchart"|"mindmap"|"sequence"|"pie"|"graph", // only when visualNeed='diagram'
      "chartKind": "bar"|"line"|"pie",                                // only when visualNeed='chart'
      "animationKind": "graph"|"vector_field"|"geometry_construction"|"oscillation"|"transformation"|"process_flow" // only when visualNeed='animation'
    }
  }
}`;
}

function buildUserPrompt(opts: {
  language: SlideLanguage;
  topic: string;
  description: string;
  outline: SlideOutline;
  totalSlides: number;
  siblingTitles: string[];
  ragContext?: string;
  /** Full kazanım labels already resolved by the caller: "8.1.1.1 — <title>" */
  curriculumLines?: string[];
}): string {
  const { language, topic, description, outline, totalSlides, siblingTitles, ragContext, curriculumLines } = opts;
  const isTR = language === 'tr';

  const ragBlock = ragContext
    ? isTR
      ? `\n\nÖĞRETMENİN KAYNAKLARI (sadece ilgili olanı kullan):\n${ragContext}`
      : `\n\nTEACHER SOURCES (use only what is relevant):\n${ragContext}`
    : '';

  const kazanimBlock =
    curriculumLines && curriculumLines.length > 0
      ? isTR
        ? `\n\nMEB KAZANIMLARI (bu dersin genel hedefleri — ilgili olanları bu slayta yansıt):\n${curriculumLines.map((l) => `• ${l}`).join('\n')}`
        : `\n\nMEB LEARNING OBJECTIVES (overall lesson goals — reflect the relevant ones in this slide):\n${curriculumLines.map((l) => `• ${l}`).join('\n')}`
      : '';

  const siblings = siblingTitles
    .map((t, i) => `  ${i + 1}. ${t || '(boş)'}`)
    .join('\n');

  if (isTR) {
    return `Konu: ${topic}
Ders açıklaması: ${description}

Bu slayt: ${outline.slideNumber}/${totalSlides}
Bu slaytın başlığı: ${outline.title}
Bu slaytın hedefi: ${outline.oneLineGoal}

Tüm dersin slayt başlıkları (akış için):
${siblings}
${kazanimBlock}${ragBlock}

Yukarıdaki ROL ve GÖRSEL direktiflerine UYARAK sadece BU slaytı JSON olarak üret.`;
  }

  return `Topic: ${topic}
Lesson description: ${description}

This slide: ${outline.slideNumber}/${totalSlides}
Slide title: ${outline.title}
Slide goal: ${outline.oneLineGoal}

All slide titles in this lesson (for flow):
${siblings}
${kazanimBlock}${ragBlock}

Following the ROLE and VISUAL directives above, produce ONLY this slide as JSON.`;
}

function safeParse(raw: string): { slide?: Record<string, unknown> } {
  const jsonStr = extractJsonBody(raw);
  const sanitized = sanitizeLatexInJson(jsonStr);
  try {
    return JSON.parse(sanitized);
  } catch {
    const aggressive = sanitized
      .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, ' ')
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']');
    return JSON.parse(aggressive);
  }
}

function coerceVisualHint(value: unknown): VisualHint {
  if (!value || typeof value !== 'object') return {};
  const v = value as Record<string, unknown>;
  const hint: VisualHint = {};
  if (typeof v.hasFormulas === 'boolean') hint.hasFormulas = v.hasFormulas;
  if (typeof v.diagramKind === 'string') {
    const k = v.diagramKind as VisualHint['diagramKind'];
    if (k === 'flowchart' || k === 'sequence' || k === 'pie' || k === 'graph' || k === 'mindmap') {
      hint.diagramKind = k;
    }
  }
  if (typeof v.chartKind === 'string') {
    const k = v.chartKind as VisualHint['chartKind'];
    if (k === 'bar' || k === 'line' || k === 'pie') hint.chartKind = k;
  }
  if (typeof v.animationKind === 'string') {
    const k = v.animationKind as VisualHint['animationKind'];
    if (
      k === 'graph' ||
      k === 'vector_field' ||
      k === 'geometry_construction' ||
      k === 'oscillation' ||
      k === 'transformation' ||
      k === 'process_flow'
    ) {
      hint.animationKind = k;
    }
  }
  return hint;
}

export async function materializeSlide(input: {
  topic: string;
  description: string;
  language: SlideLanguage;
  tone: SlideTone;
  outline: SlideOutline;
  totalSlides: number;
  siblingTitles: string[];
  ragContext?: string;
  /** Full kazanım labels already resolved by the caller: "8.1.1.1 — <title>" */
  curriculumLines?: string[];
}): Promise<Slide> {
  const systemPrompt = buildSystemPrompt({
    language: input.language,
    tone: input.tone,
    outline: input.outline,
  });
  const userPrompt = buildUserPrompt(input);

  const response = await falRequest<{ output: string }>(FAL_MODEL, {
    prompt: userPrompt,
    system_prompt: systemPrompt,
    model: LLM_MODEL,
    max_tokens: 3500,
    temperature: 0.7,
  });

  const raw = response.output?.trim() || '{}';
  const parsed = safeParse(raw);
  const s = parsed.slide;
  if (!s || typeof s !== 'object') {
    throw new Error(`Materialize: slide field missing for slide ${input.outline.slideNumber}`);
  }

  const content = String((s as Record<string, unknown>).content || '').trim();
  const bulletPoints = Array.isArray((s as Record<string, unknown>).bulletPoints)
    ? ((s as Record<string, unknown>).bulletPoints as unknown[]).map(String)
    : [];
  const narrationText = String(
    (s as Record<string, unknown>).narrationText || (s as Record<string, unknown>).narration || ''
  ).trim();
  const title = String((s as Record<string, unknown>).title || input.outline.title || `Slayt ${input.outline.slideNumber}`);

  const visualHint = coerceVisualHint((s as Record<string, unknown>).visualHint);
  // Auto-detect formulas if LLM forgot to set the flag.
  if (visualHint.hasFormulas === undefined) {
    visualHint.hasFormulas = /\$\$?|\\\\frac|\\\\sqrt|\\\\int|\\\\sum/.test(content);
  }

  const finalSlide: Slide = {
    slideNumber: input.outline.slideNumber,
    title,
    content: content || (bulletPoints.length === 0 ? narrationText : ''),
    bulletPoints,
    narrationText,
    intent: input.outline.intent,
    visualHint,
  };

  return finalSlide;
}
