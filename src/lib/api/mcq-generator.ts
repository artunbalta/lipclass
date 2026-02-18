/**
 * MCQ Generator — 3-Stage Parallel Pipeline
 *
 * Stage 1: Parallel MCQ generation (GPT-4o-mini via Fal AI)
 * Stage 2: Duplicate detection (GPT-4.1-nano via Fal AI)
 * Stage 3: Quality enhancement (Gemini-2.5-flash via Fal AI)
 */

import type { MCQQuestion } from '@/types';
import { fixLatexFormatting } from './summarization';

const FAL_API_BASE = 'https://fal.run';
const MAX_QUESTIONS_PER_BLOCK = 5;
const MAX_CONCURRENT_BLOCKS = 6;

// ── Fal AI Helper ───────────────────────────────────────────────────────────

function getApiKey(): string {
  const key = process.env.FAL_KEY || process.env.NEXT_PUBLIC_FAL_KEY;
  if (!key) throw new Error('FAL_KEY is not configured');
  return key;
}

async function falLLMRequest(
  prompt: string,
  systemPrompt: string,
  options?: { model?: string; maxTokens?: number; temperature?: number }
): Promise<string> {
  const apiKey = getApiKey();
  const response = await fetch(`${FAL_API_BASE}/fal-ai/any-llm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Key ${apiKey}`,
    },
    body: JSON.stringify({
      prompt,
      system_prompt: systemPrompt,
      model: options?.model || 'openai/gpt-4o-mini',
      max_tokens: options?.maxTokens || 4000,
      temperature: options?.temperature ?? 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Fal AI error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return (data.output || '').trim();
}

// ── Math Content Detection ──────────────────────────────────────────────────

export function detectMathContent(text: string): boolean {
  const patterns = [
    /\$[^$]+\$/, // LaTeX inline
    /\$\$[^$]+\$\$/, // LaTeX block
    /[αβγδεζηθικλμνξπρστυφχψωΣΔΠ∫∑∏∂∀∃∈∞]/, // Greek/math symbols
    /\b(theorem|lemma|integral|derivative|matrix|equation|formula)\b/i,
    /\b(teorem|türev|integral|matris|denklem|formül)\b/i,
    /[a-z]\s*=\s*[a-z0-9]|f\(x\)|dy\/dx/i, // equation patterns
  ];

  let score = 0;
  for (const pattern of patterns) {
    if (pattern.test(text)) score++;
  }

  return score >= 2;
}

// ── Question Type Distribution ──────────────────────────────────────────────

export function calculateQuestionDistribution(
  numQuestions: number,
  questionType: 'theoretical' | 'mathematical' | 'mixed'
): string[] {
  let theoreticalRatio: number;

  switch (questionType) {
    case 'theoretical':
      theoreticalRatio = 0.75;
      break;
    case 'mathematical':
      theoreticalRatio = 0.25;
      break;
    case 'mixed':
    default:
      theoreticalRatio = 0.5;
      break;
  }

  const numTheoretical = Math.round(numQuestions * theoreticalRatio);
  const numMathematical = numQuestions - numTheoretical;

  const distribution: string[] = [
    ...Array(numTheoretical).fill('theoretical'),
    ...Array(numMathematical).fill('mathematical'),
  ];

  // Shuffle
  for (let i = distribution.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [distribution[i], distribution[j]] = [distribution[j], distribution[i]];
  }

  return distribution;
}

// ── JSON Parsing Helper ─────────────────────────────────────────────────────

function parseJSONFromLLM(raw: string): unknown {
  let jsonStr = raw;

  // Strip markdown code blocks
  if (jsonStr.includes('```')) {
    const match = jsonStr.match(/```(?:json|JSON)?\s*\n?([\s\S]*?)\n?```/);
    if (match?.[1]) {
      jsonStr = match[1].trim();
    } else {
      jsonStr = jsonStr.replace(/^```(?:json|JSON)?\s*\n?/i, '').replace(/\n?```\s*$/, '').trim();
    }
  }

  // Extract JSON array or object
  const firstBracket = jsonStr.indexOf('[');
  const firstBrace = jsonStr.indexOf('{');
  const start = Math.min(
    firstBracket >= 0 ? firstBracket : Infinity,
    firstBrace >= 0 ? firstBrace : Infinity
  );

  if (start !== Infinity) {
    const isArray = jsonStr[start] === '[';
    const end = isArray ? jsonStr.lastIndexOf(']') : jsonStr.lastIndexOf('}');
    if (end > start) {
      jsonStr = jsonStr.slice(start, end + 1);
    }
  }

  return JSON.parse(jsonStr);
}

// ── Stage 1: Parallel MCQ Generation ────────────────────────────────────────

interface RawMCQ {
  question: string;
  options: Record<string, string> | string[];
  correct_answer: string | number;
  explanation: string;
  difficulty: string;
  topic: string;
}

async function generateSingleBlock(
  blockId: number,
  numQuestions: number,
  documentSummary: string,
  difficulty: string,
  questionTypes: string[],
  language: 'tr' | 'en',
  topic?: string
): Promise<RawMCQ[]> {
  const theoreticalCount = questionTypes.filter((t) => t === 'theoretical').length;
  const mathematicalCount = questionTypes.filter((t) => t === 'mathematical').length;

  const typeInstruction =
    language === 'tr'
      ? `Bu blokta ${theoreticalCount} teorik ve ${mathematicalCount} matematiksel soru üret.`
      : `In this block, generate ${theoreticalCount} theoretical and ${mathematicalCount} mathematical questions.`;

  const difficultyMap: Record<string, Record<string, string>> = {
    easy: { tr: 'Kolay - temel kavramları test et', en: 'Easy - test basic concepts' },
    medium: { tr: 'Orta - anlama ve uygulama düzeyi', en: 'Medium - comprehension and application level' },
    hard: { tr: 'Zor - analiz ve sentez düzeyi', en: 'Hard - analysis and synthesis level' },
  };

  const diffLabel = difficultyMap[difficulty]?.[language] || difficultyMap.medium[language];

  const systemPrompt =
    language === 'tr'
      ? `Sen uzman bir eğitimcisin. SADECE geçerli JSON dizisi döndür. Başka metin yazma.`
      : `You are an expert educator. Respond with ONLY a valid JSON array. No other text.`;

  const userPrompt =
    language === 'tr'
      ? `Aşağıdaki özete dayanarak ${numQuestions} çoktan seçmeli soru oluştur.

${typeInstruction}
Zorluk: ${diffLabel}
${topic ? `Konu: ${topic}` : ''}

KURALLAR:
- Her sorunun 4 seçeneği (A, B, C, D) olmalı
- Doğru cevap net ve tartışmasız olmalı
- Çeldiriciler makul ama yanlış olmalı
- Açıklama neden doğru cevabın doğru olduğunu belirtmeli
- Matematiksel içerikte LaTeX kullan ($...$)
- Her soru farklı bir konuyu/kavramı test etmeli

JSON formatı (sadece dizi döndür):
[{"question": "...", "options": {"A": "...", "B": "...", "C": "...", "D": "..."}, "correct_answer": "B", "explanation": "...", "difficulty": "${difficulty}", "topic": "..."}]

Döküman Özeti:
${documentSummary}`
      : `Based on the following summary, generate ${numQuestions} multiple choice questions.

${typeInstruction}
Difficulty: ${diffLabel}
${topic ? `Topic: ${topic}` : ''}

RULES:
- Each question must have 4 options (A, B, C, D)
- The correct answer must be clear and unambiguous
- Distractors should be plausible but incorrect
- Explanation must state why the correct answer is correct
- Use LaTeX for mathematical content ($...$)
- Each question should test a different concept

JSON format (return only the array):
[{"question": "...", "options": {"A": "...", "B": "...", "C": "...", "D": "..."}, "correct_answer": "B", "explanation": "...", "difficulty": "${difficulty}", "topic": "..."}]

Document Summary:
${documentSummary}`;

  const output = await falLLMRequest(userPrompt, systemPrompt, {
    model: 'openai/gpt-4o-mini',
    maxTokens: 4000,
    temperature: 0.7,
  });

  const parsed = parseJSONFromLLM(output) as RawMCQ[];

  if (!Array.isArray(parsed)) {
    throw new Error(`Block ${blockId}: Expected array, got ${typeof parsed}`);
  }

  return parsed;
}

async function stage1ParallelGeneration(
  documentSummary: string,
  numQuestions: number,
  difficulty: string,
  questionType: 'theoretical' | 'mathematical' | 'mixed',
  language: 'tr' | 'en',
  topic?: string
): Promise<RawMCQ[]> {
  const distribution = calculateQuestionDistribution(numQuestions, questionType);

  // Split into blocks of MAX_QUESTIONS_PER_BLOCK
  const numBlocks = Math.ceil(numQuestions / MAX_QUESTIONS_PER_BLOCK);
  const blocks: { count: number; types: string[] }[] = [];

  for (let i = 0; i < numBlocks; i++) {
    const start = i * MAX_QUESTIONS_PER_BLOCK;
    const end = Math.min(start + MAX_QUESTIONS_PER_BLOCK, numQuestions);
    blocks.push({
      count: end - start,
      types: distribution.slice(start, end),
    });
  }

  // Run blocks concurrently (with semaphore limit)
  const results: RawMCQ[][] = [];
  const semaphore = { count: 0 };

  const runBlock = async (blockIdx: number): Promise<RawMCQ[]> => {
    while (semaphore.count >= MAX_CONCURRENT_BLOCKS) {
      await new Promise((r) => setTimeout(r, 100));
    }
    semaphore.count++;
    try {
      return await generateSingleBlock(
        blockIdx,
        blocks[blockIdx].count,
        documentSummary,
        difficulty,
        blocks[blockIdx].types,
        language,
        topic
      );
    } finally {
      semaphore.count--;
    }
  };

  try {
    const blockResults = await Promise.all(
      blocks.map((_, idx) => runBlock(idx))
    );
    for (const r of blockResults) results.push(r);
  } catch (error) {
    // Fallback: sequential processing
    console.warn('[MCQ] Parallel generation failed, falling back to sequential:', error);
    for (let i = 0; i < blocks.length; i++) {
      try {
        const blockResult = await generateSingleBlock(
          i,
          blocks[i].count,
          documentSummary,
          difficulty,
          blocks[i].types,
          language,
          topic
        );
        results.push(blockResult);
      } catch (err) {
        console.error(`[MCQ] Block ${i} failed:`, err);
      }
    }
  }

  return results.flat();
}

// ── Stage 2: Duplicate Detection ────────────────────────────────────────────

async function stage2DuplicateDetection(
  mcqs: RawMCQ[],
  targetCount: number,
  language: 'tr' | 'en'
): Promise<RawMCQ[]> {
  if (mcqs.length <= targetCount) return mcqs;

  const questionsText = mcqs
    .map((q, i) => `[${i}] ${q.question}`)
    .join('\n');

  const systemPrompt = 'You are an expert at detecting duplicate questions. Respond with ONLY valid JSON.';

  const userPrompt =
    language === 'tr'
      ? `Aşağıdaki ${mcqs.length} soruyu analiz et. Şu durumlarda sorular tekrar sayılır:
- Aynı kavramı veya bilgi noktasını test ediyorlar
- Benzer doğru cevapları var ve aynı anlayışı ölçüyorlar
- Aynı veya çok benzer açıklamaları olacak
- Farklı kelimelerle aynı konuyu soruyorlar

EN İYİ ${targetCount} soruyu belirle. Tekrarlardan en kaliteli olanı tut.

JSON formatında yanıtla:
{"keep_indices": [0, 1, 3, ...], "reasoning": "..."}

Sorular:
${questionsText}`
      : `Analyze the following ${mcqs.length} questions. Questions are duplicates if they:
- Test the same specific concept or knowledge point
- Have similar correct answers testing identical understanding
- Would have the same/very similar explanations
- Ask about the same topic with different wording

Identify the BEST ${targetCount} questions. Keep the highest-quality version of duplicates.

Respond with JSON:
{"keep_indices": [0, 1, 3, ...], "reasoning": "..."}

Questions:
${questionsText}`;

  try {
    const output = await falLLMRequest(userPrompt, systemPrompt, {
      model: 'openai/gpt-4.1-nano',
      maxTokens: 2000,
      temperature: 0.1,
    });

    const parsed = parseJSONFromLLM(output) as { keep_indices: number[] };

    if (parsed.keep_indices && Array.isArray(parsed.keep_indices)) {
      const kept = parsed.keep_indices
        .filter((i) => i >= 0 && i < mcqs.length)
        .slice(0, targetCount)
        .map((i) => mcqs[i]);
      return kept.length > 0 ? kept : mcqs.slice(0, targetCount);
    }
  } catch (error) {
    console.warn('[MCQ] Stage 2 dedup failed, using first N:', error);
  }

  return mcqs.slice(0, targetCount);
}

// ── Stage 3: Quality Enhancement ────────────────────────────────────────────

async function stage3QualityEnhancement(
  mcqs: RawMCQ[],
  documentSummary: string,
  difficulty: string,
  language: 'tr' | 'en'
): Promise<RawMCQ[]> {
  const CHUNK_SIZE = 5;
  const chunks: RawMCQ[][] = [];

  for (let i = 0; i < mcqs.length; i += CHUNK_SIZE) {
    chunks.push(mcqs.slice(i, i + CHUNK_SIZE));
  }

  const systemPrompt =
    language === 'tr'
      ? 'Sen soru kalitesi değerlendirme uzmanısın. Verilen soruları incele ve gerekiyorsa iyileştir. SADECE JSON dizisi döndür.'
      : 'You are a question quality expert. Review and improve given questions if needed. Return ONLY a JSON array.';

  const processChunk = async (chunk: RawMCQ[]): Promise<RawMCQ[]> => {
    const chunkJson = JSON.stringify(chunk, null, 2);

    const userPrompt =
      language === 'tr'
        ? `Aşağıdaki çoktan seçmeli soruları değerlendir ve iyileştir:

Kontrol listesi:
1. Soru açık ve net mi?
2. Doğru cevap tartışmasız doğru mu?
3. Çeldiriciler makul ama yanlış mı (bariz saçma seçenek olmamalı)?
4. Açıklama doğru cevabı yeterli şekilde açıklıyor mu?
5. Zorluk seviyesi doğru ayarlanmış mı? (Hedef: ${difficulty})

Gerekli düzeltmeleri yap ve aynı JSON formatında döndür. Değişiklik gerekmiyorsa aynen döndür.

Döküman özeti (referans):
${documentSummary.slice(0, 2000)}

Sorular:
${chunkJson}`
        : `Evaluate and improve the following MCQ questions:

Checklist:
1. Is the question clearly worded?
2. Is the correct answer unambiguously correct?
3. Are distractors plausible but wrong (no obviously absurd options)?
4. Does the explanation adequately explain the correct answer?
5. Is difficulty calibrated correctly? (Target: ${difficulty})

Make corrections and return in the same JSON format. If no changes needed, return as-is.

Document summary (reference):
${documentSummary.slice(0, 2000)}

Questions:
${chunkJson}`;

    try {
      const output = await falLLMRequest(userPrompt, systemPrompt, {
        model: 'google/gemini-2.5-flash',
        maxTokens: 4000,
        temperature: 0.2,
      });

      const parsed = parseJSONFromLLM(output);
      if (Array.isArray(parsed)) return parsed as RawMCQ[];
    } catch (error) {
      console.warn('[MCQ] Stage 3 quality check failed for chunk:', error);
    }

    return chunk; // Return original on failure
  };

  const results = await Promise.all(chunks.map(processChunk));
  return results.flat();
}

// ── Format Output ───────────────────────────────────────────────────────────

function formatMCQs(rawMcqs: RawMCQ[]): MCQQuestion[] {
  const letterToIndex: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };

  return rawMcqs
    .map((raw) => {
      // Convert options to array if dict
      let optionsArr: string[];
      if (Array.isArray(raw.options)) {
        optionsArr = raw.options.map(String);
      } else if (typeof raw.options === 'object') {
        optionsArr = ['A', 'B', 'C', 'D'].map(
          (k) => (raw.options as Record<string, string>)[k] || ''
        );
      } else {
        return null;
      }

      // Convert correct_answer to index
      let correctIndex: number;
      if (typeof raw.correct_answer === 'number') {
        correctIndex = raw.correct_answer;
      } else {
        const letter = String(raw.correct_answer).trim().toUpperCase();
        correctIndex = letterToIndex[letter] ?? 0;
      }

      // Apply LaTeX formatting
      return {
        question: fixLatexFormatting(raw.question || ''),
        options: optionsArr.map(fixLatexFormatting),
        correctAnswer: correctIndex,
        explanation: fixLatexFormatting(raw.explanation || ''),
        difficulty: (raw.difficulty || 'medium') as MCQQuestion['difficulty'],
        topic: raw.topic || '',
      };
    })
    .filter((q): q is MCQQuestion => q !== null && q.question.length > 0);
}

// ── Main Pipeline Orchestrator ──────────────────────────────────────────────

export interface GenerateMCQOptions {
  documentSummary: string;
  numQuestions: number;
  difficulty: 'easy' | 'medium' | 'hard';
  questionType: 'theoretical' | 'mathematical' | 'mixed';
  language: 'tr' | 'en';
  topic?: string;
}

export interface GenerateMCQResult {
  questions: MCQQuestion[];
  totalQuestions: number;
  stages: {
    stage1Count: number;
    stage2Count: number;
    stage3Count: number;
  };
  processingTime: number;
}

export async function generateMCQs(
  options: GenerateMCQOptions
): Promise<GenerateMCQResult> {
  const {
    documentSummary,
    numQuestions,
    difficulty,
    questionType,
    language,
    topic,
  } = options;

  const startTime = Date.now();

  // Stage 1: Parallel generation
  console.log(`[MCQ] Stage 1: Generating ${numQuestions} questions in parallel blocks...`);
  const rawMcqs = await stage1ParallelGeneration(
    documentSummary,
    numQuestions,
    difficulty,
    questionType,
    language,
    topic
  );
  const stage1Count = rawMcqs.length;
  console.log(`[MCQ] Stage 1 complete: ${stage1Count} questions generated`);

  // Stage 2: Duplicate detection
  console.log('[MCQ] Stage 2: Detecting duplicates...');
  const deduplicated = await stage2DuplicateDetection(rawMcqs, numQuestions, language);
  const stage2Count = deduplicated.length;
  console.log(`[MCQ] Stage 2 complete: ${stage2Count} unique questions`);

  // Stage 3: Quality enhancement
  console.log('[MCQ] Stage 3: Enhancing quality...');
  const enhanced = await stage3QualityEnhancement(
    deduplicated,
    documentSummary,
    difficulty,
    language
  );
  const stage3Count = enhanced.length;
  console.log(`[MCQ] Stage 3 complete: ${stage3Count} enhanced questions`);

  // Format final output
  const questions = formatMCQs(enhanced);

  const processingTime = (Date.now() - startTime) / 1000;

  return {
    questions,
    totalQuestions: questions.length,
    stages: { stage1Count, stage2Count, stage3Count },
    processingTime,
  };
}
