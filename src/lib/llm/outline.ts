// Pass 1 — Lesson Outline.
//
// One fast LLM call returns a structured plan: 10 SlideOutline records with
// pedagogical role, complexity, visual need and a one-line goal. This is the
// "intent" layer the rest of the pipeline routes on (per-slide materialize,
// Manim filtering, asset routing).
//
// The model used here is intentionally cheap (Gemini Flash-Lite). The prompt
// is short and the schema is small — typical latency 2-3s.

import { falRequest } from './fal-client';
import {
  extractJsonBody,
  sanitizeLatexInJson,
  recoverTruncatedJson,
} from './json-sanitizer';
import type { SlideLanguage, SlideTone } from './prompts';
import type { SlideOutline, SlideRole, VisualNeed } from '@/types';

const FAL_MODEL = 'fal-ai/any-llm';
const LLM_MODEL = 'google/gemini-2.5-flash-lite';

const VALID_ROLES: ReadonlySet<SlideRole> = new Set<SlideRole>([
  'hook',
  'definition',
  'concept',
  'derivation',
  'worked_example',
  'comparison',
  'experiment',
  'visualization',
  'quiz',
  'summary',
]);

const VALID_NEEDS: ReadonlySet<VisualNeed> = new Set<VisualNeed>([
  'static',
  'diagram',
  'chart',
  'animation',
  'photo',
]);

export interface GenerateOutlineOpts {
  topic: string;
  description: string;
  language: SlideLanguage;
  tone: SlideTone;
  includesProblemSolving?: boolean;
  problemCount?: number;
  difficulty?: string;
  ragContext?: string;
  totalSlides?: number; // default 10
  /** Full kazanım labels in the form "8.1.1.1 — <title>" — already resolved by the caller. */
  curriculumLines?: string[];
}

function buildOutlineSystemPrompt(language: SlideLanguage): string {
  if (language === 'tr') {
    return `Sen deneyimli bir öğretim tasarımcısısın. Bir konu için 10 slaytlık bir DERS PLANI üreteceksin.

Her slayt için SADECE şu meta-bilgileri belirleyeceksin (içerik metni HENÜZ üretme):
- role: slaytın pedagojik amacı
- complexity: 1 (giriş) | 2 (orta) | 3 (zirve)
- visualNeed: o slaytta hangi görsel yardımcı en uygun
- title: kısa başlık (3-7 kelime)
- oneLineGoal: tek cümle öğrenme hedefi
- estimatedDurationSec: 30-120 arası

KURALLAR:
1. role değerleri: hook, definition, concept, derivation, worked_example, comparison, experiment, visualization, quiz, summary
2. visualNeed değerleri: static, diagram, chart, animation, photo
3. visualNeed='animation' SADECE konu zamanla değişen, hareket eden, dönüşen, çizilen bir şeyse seç (örn: dalga, sarkaç, türetme adımları, vektör alanı, geometrik inşa). Aksi takdirde 'static' veya 'diagram' tercih et.
4. visualNeed='diagram' kavram ilişkileri / süreç akışı için.
5. visualNeed='chart' veri/istatistik karşılaştırması için.
6. visualNeed='photo' gerçek dünya örneği veya görsel referans gerektiriyorsa.
7. Slayt 1 genelde 'hook' veya 'definition'. Son slayt genelde 'summary' veya 'quiz'.
8. complexity slayt 1'den sona doğru genelde artar; tek tekil sıçrama yapma.
9. visualNeed='animation' EN FAZLA 2-3 slaytta olsun. Her slayta animasyon ATAMA — kötü kaliteye yol açar.
10. Çıktı KESİNLİKLE geçerli JSON olmalı, markdown çitleri ekleme.

JSON şeması:
{
  "outline": [
    {
      "slideNumber": 1,
      "role": "hook",
      "complexity": 1,
      "visualNeed": "photo",
      "title": "...",
      "oneLineGoal": "...",
      "estimatedDurationSec": 45,
      "motionJustification": "..."  // SADECE visualNeed='animation' ise
    }
  ]
}`;
  }
  return `You are an experienced instructional designer. You will produce a 10-slide LESSON PLAN for a topic.

For each slide produce ONLY meta-information (do NOT write the body text yet):
- role: pedagogical purpose
- complexity: 1 (intro) | 2 (mid) | 3 (peak)
- visualNeed: best visual aid for this slide
- title: short title (3-7 words)
- oneLineGoal: one-sentence learning objective
- estimatedDurationSec: 30-120

RULES:
1. role values: hook, definition, concept, derivation, worked_example, comparison, experiment, visualization, quiz, summary
2. visualNeed values: static, diagram, chart, animation, photo
3. visualNeed='animation' ONLY when the topic moves, transforms, oscillates, or is constructed step by step (e.g. wave, pendulum, derivation, vector field, geometric construction). Otherwise prefer 'static' or 'diagram'.
4. visualNeed='diagram' for concept relationships / process flow.
5. visualNeed='chart' for data / statistical comparison.
6. visualNeed='photo' for real-world references.
7. Slide 1 usually 'hook' or 'definition'. Last slide usually 'summary' or 'quiz'.
8. complexity should generally rise from slide 1 to last; avoid single-step spikes.
9. visualNeed='animation' on AT MOST 2-3 slides. Do not assign animation to every slide.
10. Output MUST be valid JSON, no markdown fences.

JSON schema:
{
  "outline": [
    {
      "slideNumber": 1,
      "role": "hook",
      "complexity": 1,
      "visualNeed": "photo",
      "title": "...",
      "oneLineGoal": "...",
      "estimatedDurationSec": 45,
      "motionJustification": "..."  // ONLY when visualNeed='animation'
    }
  ]
}`;
}

function buildOutlineUserPrompt(opts: GenerateOutlineOpts): string {
  const {
    topic,
    description,
    language,
    includesProblemSolving,
    problemCount,
    difficulty,
    ragContext,
    totalSlides = 10,
    curriculumLines,
  } = opts;

  const isTR = language === 'tr';

  const ragBlock = ragContext
    ? isTR
      ? `\n\nÖĞRETMENİN KAYNAKLARI:\n${ragContext}`
      : `\n\nTEACHER'S SOURCES:\n${ragContext}`
    : '';

  const problemLine =
    includesProblemSolving && (problemCount ?? 0) > 0
      ? isTR
        ? `Son ${problemCount} slayt 'worked_example' veya 'quiz' rolü olmalı (zorluk: ${difficulty || 'orta'}).`
        : `The last ${problemCount} slides should be 'worked_example' or 'quiz' role (difficulty: ${difficulty || 'medium'}).`
      : '';

  const kazanimBlock =
    curriculumLines && curriculumLines.length > 0
      ? isTR
        ? `\n\nMEB KAZANIMLARI (ders planı bu hedeflerin TAMAMINI karşılamalı; her kazanım en az bir slayta yansımalı):\n${curriculumLines.map((l) => `• ${l}`).join('\n')}`
        : `\n\nMEB LEARNING OBJECTIVES (the lesson plan MUST cover ALL of these; each objective should appear in at least one slide):\n${curriculumLines.map((l) => `• ${l}`).join('\n')}`
      : '';

  if (isTR) {
    return `Konu: ${topic}
Açıklama: ${description}
Toplam slayt sayısı: ${totalSlides}
${problemLine}${kazanimBlock}${ragBlock}

${totalSlides} slaytlık DERS PLANI'nı JSON olarak üret. Hatırlatma: BU AŞAMADA SADECE meta-bilgi, içerik metni YOK.`;
  }
  return `Topic: ${topic}
Description: ${description}
Total slides: ${totalSlides}
${problemLine}${kazanimBlock}${ragBlock}

Produce a ${totalSlides}-slide LESSON PLAN as JSON. Reminder: META ONLY at this stage, NO body text.`;
}

function coerceRole(value: unknown): SlideRole {
  const v = String(value || '').toLowerCase().trim() as SlideRole;
  return VALID_ROLES.has(v) ? v : 'concept';
}

function coerceVisualNeed(value: unknown): VisualNeed {
  const v = String(value || '').toLowerCase().trim() as VisualNeed;
  return VALID_NEEDS.has(v) ? v : 'static';
}

function coerceComplexity(value: unknown): 1 | 2 | 3 {
  const n = typeof value === 'number' ? value : parseInt(String(value), 10);
  if (n <= 1) return 1;
  if (n >= 3) return 3;
  return 2;
}

function coerceDuration(value: unknown): number {
  const n = typeof value === 'number' ? value : parseInt(String(value), 10);
  if (!Number.isFinite(n)) return 60;
  return Math.max(30, Math.min(120, Math.round(n)));
}

export async function generateOutline(
  opts: GenerateOutlineOpts
): Promise<{ outline: SlideOutline[] }> {
  const total = opts.totalSlides ?? 10;
  const systemPrompt = buildOutlineSystemPrompt(opts.language);
  const userPrompt = buildOutlineUserPrompt(opts);

  const response = await falRequest<{ output: string }>(FAL_MODEL, {
    prompt: userPrompt,
    system_prompt: systemPrompt,
    model: LLM_MODEL,
    max_tokens: 3000,
    temperature: 0.5,
  });

  const raw = response.output?.trim() || '{}';
  const jsonStr = extractJsonBody(raw);
  const sanitized = sanitizeLatexInJson(jsonStr);

  let parsed: { outline?: unknown };
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
      const recovered = recoverTruncatedJson(sanitized, 'outline');
      if (!recovered) {
        console.error('[Outline] JSON parse failed. Raw (first 600):', jsonStr.substring(0, 600));
        throw new Error('Outline LLM çıktısı JSON olarak ayrıştırılamadı');
      }
      parsed = JSON.parse(recovered);
    }
  }

  const arr = Array.isArray(parsed.outline) ? parsed.outline : [];
  if (arr.length === 0) {
    throw new Error('Outline boş döndü');
  }

  const outline: SlideOutline[] = arr.slice(0, total).map((item: unknown, i: number) => {
    const o = (item ?? {}) as Record<string, unknown>;
    const role = coerceRole(o.role);
    const visualNeed = coerceVisualNeed(o.visualNeed);
    return {
      slideNumber: i + 1,
      title: String(o.title || `Slayt ${i + 1}`).trim(),
      oneLineGoal: String(o.oneLineGoal || o.goal || '').trim(),
      intent: {
        role,
        complexity: coerceComplexity(o.complexity),
        visualNeed,
        motionJustification:
          visualNeed === 'animation' && o.motionJustification
            ? String(o.motionJustification).trim()
            : undefined,
        estimatedDurationSec: coerceDuration(o.estimatedDurationSec),
      },
    };
  });

  // Pad to total if LLM returned fewer.
  while (outline.length < total) {
    const i = outline.length;
    outline.push({
      slideNumber: i + 1,
      title: `Slayt ${i + 1}`,
      oneLineGoal: '',
      intent: { role: 'concept', complexity: 2, visualNeed: 'static', estimatedDurationSec: 60 },
    });
  }

  // Enforce animation budget (max 3) — if LLM over-assigned, downgrade extras.
  let animationCount = outline.filter((o) => o.intent.visualNeed === 'animation').length;
  if (animationCount > 3) {
    for (let i = outline.length - 1; i >= 0 && animationCount > 3; i--) {
      if (outline[i].intent.visualNeed === 'animation') {
        outline[i].intent.visualNeed = 'diagram';
        outline[i].intent.motionJustification = undefined;
        animationCount--;
      }
    }
  }

  return { outline };
}
