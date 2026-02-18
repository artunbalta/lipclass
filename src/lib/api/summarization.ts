/**
 * Summarization Service
 *
 * Compresses raw document text into a structured summary using:
 * 1. Extractive preprocessing (TF-IDF sentence scoring)
 * 2. LLM summarization via Fal AI (GPT-4o-mini)
 * 3. Completion check + optional second pass
 * 4. LaTeX formatting normalization
 */

const FAL_API_BASE = 'https://fal.run';

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
      temperature: options?.temperature || 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Fal AI error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return (data.output || '').trim();
}

// ── Extractive Preprocessing ────────────────────────────────────────────────

/**
 * Score and select the most informative sentences from text.
 * Uses a simplified TF-IDF + positional scoring approach.
 */
export function extractivePreprocess(
  text: string,
  maxTokens = 6000
): string {
  // Split into sentences
  const sentences = text
    .split(/(?<=[.!?;])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);

  if (sentences.length === 0) return text;

  // Estimate token count (rough: 1 token ≈ 4 chars)
  const estimateTokens = (t: string) => Math.ceil(t.length / 4);
  const totalTokens = estimateTokens(text);

  // If already within budget, return as-is
  if (totalTokens <= maxTokens) return text;

  // Build word frequency map (TF)
  const wordFreq = new Map<string, number>();
  const allWords = text.toLowerCase().split(/\s+/);
  for (const w of allWords) {
    const clean = w.replace(/[^a-züöşıçğ0-9]/gi, '');
    if (clean.length > 2) {
      wordFreq.set(clean, (wordFreq.get(clean) || 0) + 1);
    }
  }

  // Score each sentence
  const scored = sentences.map((sentence, index) => {
    const words = sentence.toLowerCase().split(/\s+/);
    let tfScore = 0;
    for (const w of words) {
      const clean = w.replace(/[^a-züöşıçğ0-9]/gi, '');
      tfScore += wordFreq.get(clean) || 0;
    }
    // Normalize by sentence length
    tfScore = words.length > 0 ? tfScore / words.length : 0;

    // Positional scoring: first and last sentences get a boost
    const totalSentences = sentences.length;
    let positionScore = 0;
    if (index < 3) positionScore = 0.3; // first 3 sentences
    if (index >= totalSentences - 3) positionScore = 0.2; // last 3

    // Keyword density bonus (LaTeX formulas, technical terms)
    const hasFormula = /\$[^$]+\$/.test(sentence) || /\\[a-z]+/i.test(sentence);
    const formulaBonus = hasFormula ? 0.3 : 0;

    return {
      sentence,
      score: tfScore + positionScore + formulaBonus,
      originalIndex: index,
    };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Select top sentences until budget is filled
  const selected: typeof scored = [];
  let tokenCount = 0;

  for (const item of scored) {
    const itemTokens = estimateTokens(item.sentence);
    if (tokenCount + itemTokens > maxTokens) break;
    selected.push(item);
    tokenCount += itemTokens;
  }

  // Restore original order for coherence
  selected.sort((a, b) => a.originalIndex - b.originalIndex);

  return selected.map((s) => s.sentence).join(' ');
}

// ── Summary Prompts ─────────────────────────────────────────────────────────

const SUMMARY_PROMPTS: Record<string, Record<string, string>> = {
  comprehensive: {
    tr: `Aşağıdaki metni kapsamlı bir şekilde özetle. Şu yapıyı kullan:
- Bölüm başlıkları (##)
- Anahtar tanımlar
- Formüller LaTeX formatında ($...$ inline, $$...$$ blok)
- Numaralı kavram listeleri
- Önemli ilişkiler ve prensipler`,
    en: `Summarize the following text comprehensively. Use this structure:
- Section headings (##)
- Key definitions
- Formulas in LaTeX format ($...$ inline, $$...$$ block)
- Numbered concept lists
- Important relationships and principles`,
  },
  key_points: {
    tr: 'Aşağıdaki metnin ana noktalarını madde madde listele. Her madde kısa ve öz olsun.',
    en: 'List the main points of the following text as bullet points. Keep each point concise.',
  },
  study_guide: {
    tr: `Aşağıdaki metinden bir çalışma rehberi oluştur. Şunları içersin:
- Öğrenilmesi gereken kavramlar
- Formüller ve denklemler
- Sık yapılan hatalar
- Pratik ipuçları`,
    en: `Create a study guide from the following text. Include:
- Key concepts to learn
- Formulas and equations
- Common mistakes
- Practical tips`,
  },
};

// ── Completion Check ────────────────────────────────────────────────────────

function isSummaryComplete(summary: string): boolean {
  const trimmed = summary.trim();
  if (trimmed.length < 50) return false;

  // Must end with proper punctuation
  const lastChar = trimmed[trimmed.length - 1];
  if (!['.', '!', '?', ':', ';'].includes(lastChar)) return false;

  // Last sentence must be substantial
  const sentences = trimmed.split(/[.!?]/);
  const lastSentence = sentences[sentences.length - 2]?.trim() || '';
  if (lastSentence.length < 10) return false;

  // Must not end with connector words
  const connectors = [
    'and', 'or', 'but', 'however', 'therefore', 'moreover',
    've', 'veya', 'ama', 'ancak', 'dolayısıyla', 'ayrıca',
  ];
  const lastWords = trimmed.toLowerCase().split(/\s+/).slice(-3);
  for (const w of lastWords) {
    if (connectors.includes(w.replace(/[.,;:!?]/, ''))) return false;
  }

  return true;
}

// ── LaTeX Formatting ────────────────────────────────────────────────────────

/**
 * Normalize LaTeX delimiters in text
 */
export function fixLatexFormatting(text: string): string {
  let result = text;

  // Normalize display math: \[...\] → $$...$$
  result = result.replace(/\\\[([\s\S]*?)\\\]/g, '$$$$1$$');

  // Normalize inline math: \(...\) → $...$
  result = result.replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');

  // Ensure $$ blocks have proper spacing
  result = result.replace(/\$\$([\s\S]*?)\$\$/g, (_, content) => {
    return `\n$$${content.trim()}$$\n`;
  });

  return result;
}

// ── Main Summarization Function ─────────────────────────────────────────────

export interface SummarizeOptions {
  text: string;
  summaryType?: 'comprehensive' | 'key_points' | 'study_guide';
  language?: 'tr' | 'en';
  maxInputTokens?: number;
}

export interface SummarizeResult {
  summary: string;
  summaryType: string;
  wordCount: number;
  processingTime: number;
}

export async function generateSummary(
  options: SummarizeOptions
): Promise<SummarizeResult> {
  const {
    text,
    summaryType = 'comprehensive',
    language = 'tr',
    maxInputTokens = 6000,
  } = options;

  const startTime = Date.now();

  // 1. Extractive preprocessing to fit token budget
  const optimizedText = extractivePreprocess(text, maxInputTokens);

  // 2. Build prompt
  const summaryPrompt =
    SUMMARY_PROMPTS[summaryType]?.[language] ||
    SUMMARY_PROMPTS.comprehensive[language];

  const systemPrompt =
    language === 'tr'
      ? 'Sen akademik özetleme konusunda uzman bir asistansın. Verilen metni yapılandırılmış, bilgi yoğun bir özete dönüştür. Formülleri LaTeX formatında koru.'
      : 'You are an expert summarization assistant. Convert the given text into a structured, information-dense summary. Preserve formulas in LaTeX format.';

  const userPrompt = `${summaryPrompt}\n\n--- Document Text ---\n${optimizedText}`;

  // 3. Generate summary via LLM
  let summary = await falLLMRequest(userPrompt, systemPrompt, {
    model: 'openai/gpt-4o-mini',
    maxTokens: 4000,
    temperature: 0.3,
  });

  // 4. Completion check + optional second pass
  if (!isSummaryComplete(summary)) {
    const completionPrompt =
      language === 'tr'
        ? `Aşağıdaki özet eksik kalmış. Tamamla:\n\n${summary}`
        : `The following summary is incomplete. Complete it:\n\n${summary}`;

    const completion = await falLLMRequest(completionPrompt, systemPrompt, {
      model: 'openai/gpt-4o-mini',
      maxTokens: 2000,
      temperature: 0.3,
    });

    summary = summary + '\n' + completion;
  }

  // 5. Fix LaTeX formatting
  summary = fixLatexFormatting(summary);

  const processingTime = (Date.now() - startTime) / 1000;
  const wordCount = summary.split(/\s+/).length;

  return {
    summary,
    summaryType,
    wordCount,
    processingTime,
  };
}
