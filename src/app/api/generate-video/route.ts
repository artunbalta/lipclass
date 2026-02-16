import { NextRequest, NextResponse } from 'next/server';
import { retrieveContext, isRagConfigured } from '@/lib/api/rag';
import { isBunnyEnabled } from '@/lib/config/bunny-config';
import { ingestFromUrl } from '@/lib/api/bunny-stream';

// Fal AI API endpoints
const FAL_API_BASE = 'https://fal.run';
const FAL_QUEUE_BASE = 'https://queue.fal.run';

/**
 * Get Fal AI API key from environment (server-side only)
 */
function getApiKey(): string {
  const key = process.env.FAL_KEY || process.env.NEXT_PUBLIC_FAL_KEY;
  if (!key) {
    throw new Error('FAL_KEY is not configured');
  }
  return key;
}

/**
 * Make a direct request to Fal AI API
 */
async function falRequest<T>(
  modelPath: string,
  body: Record<string, unknown>
): Promise<T> {
  const apiKey = getApiKey();

  const response = await fetch(`${FAL_API_BASE}/${modelPath}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Key ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage: string = response.statusText;
    try {
      const errorJson = JSON.parse(errorText);
      const raw = errorJson.detail ?? errorJson.message ?? errorJson.error ?? errorText;
      errorMessage = typeof raw === 'string' ? raw : JSON.stringify(raw);
    } catch {
      errorMessage = errorText || response.statusText;
    }
    throw new Error(`Fal API error (${response.status}): ${errorMessage}`);
  }

  return response.json();
}

/**
 * Generate 10-slide structured lesson content using LLM.
 * Returns JSON with slides array containing title, content (KaTeX), bullet points, and narration.
 */
async function generateSlides(
  topic: string,
  description: string,
  prompt: string,
  language: 'tr' | 'en',
  tone: 'formal' | 'friendly' | 'energetic',
  includesProblemSolving: boolean,
  problemCount?: number,
  difficulty?: string,
  ragContext?: string,
  sourceOnly?: boolean
): Promise<{ slides: Array<{ slideNumber: number; title: string; content: string; bulletPoints: string[]; narrationText: string }> }> {
  const modelPath = 'fal-ai/any-llm';

  const toneMap = {
    tr: { formal: 'Resmi ve profesyonel', friendly: 'Samimi ve sıcak', energetic: 'Enerjik ve dinamik' },
    en: { formal: 'Formal and professional', friendly: 'Warm and friendly', energetic: 'Energetic and dynamic' },
  };
  const toneLabel = toneMap[language][tone];

  const problemInstruction = includesProblemSolving
    ? language === 'tr'
      ? `Son ${problemCount || 2} slayt soru çözümü içermeli (zorluk: ${difficulty || 'orta'}).`
      : `The last ${problemCount || 2} slides should contain problem solving exercises (difficulty: ${difficulty || 'medium'}).`
    : '';

  // Build additional style instructions from teacher's description
  const hasStyleHints = description && description.length > 30;
  const defaultStyle = language === 'tr'
    ? 'Detaylı, samimi ve öğretici bir anlatım yap. Öğrencilere sıcak bir şekilde hitap et.'
    : 'Use a detailed, friendly and educational tone. Address students warmly.';
  const styleInstruction = hasStyleHints ? '' : (language === 'tr' ? `\nAnlatım stili: ${defaultStyle}` : `\nStyle: ${defaultStyle}`);

  // ── Mermaid diagram instructions (added to all modes) ──
  const BT = '`'; // backtick - can't use directly in template literals
  const codeBlockOpen = BT + BT + BT + 'mermaid';
  const codeBlockClose = BT + BT + BT;
  const mermaidInstruction = language === 'tr'
    ? '\n\nDİYAGRAM KURALLARI:\nUygun yerlerde konuyu görselleştiren Mermaid diyagramları üret. Diyagramları content alanına şu formatta ekle:\n' + codeBlockOpen + '\nflowchart TD\n    A[Başlangıç] --> B[Sonuç]\n' + codeBlockClose + '\nDesteklenen tipler: flowchart, sequenceDiagram, pie, graph. Her sunumda en az 1-2 slaytın diyagram içermesi tercih edilir. Diyagramlar konuyu anlamayı kolaylaştırmalı (süreç akışları, kavram ilişkileri, karar ağaçları vb.).'
    : '\n\nDIAGRAM RULES:\nGenerate Mermaid diagrams where appropriate to visualize the topic. Add diagrams in the content field using this format:\n' + codeBlockOpen + '\nflowchart TD\n    A[Start] --> B[Result]\n' + codeBlockClose + '\nSupported types: flowchart, sequenceDiagram, pie, graph. At least 1-2 slides should contain diagrams. Diagrams should help understand the topic (process flows, concept relationships, decision trees, etc.).';

  // ── Build RAG context section ──
  const ragSection = ragContext
    ? (language === 'tr'
      ? `\n\nÖĞRETMENİN KAYNAKLARI:\n${ragContext}`
      : `\n\nTEACHER'S SOURCE MATERIALS:\n${ragContext}`)
    : '';

  // ── Determine system prompt mode ──
  let systemPrompt: string;

  if (sourceOnly && ragContext) {
    // ══ RAG-ONLY MODE: Only use provided sources ══
    systemPrompt = language === 'tr'
      ? `Sen deneyimli bir öğretmensin. SADECE aşağıda verilen kaynakların içeriğine dayanarak TAM OLARAK 10 slaytlık profesyonel bir ders sunumu oluştur.

KRİTİK: Kaynakların dışına ÇIKMA. Kaynakta olmayan bilgi ekleme. Tüm içerik ve örnekler kaynaklardaki bilgilerden türetilmeli.

KRİTİK KURALLAR:
1. İçerik FORMÜL VE GÖRSEL AĞIRLIKLI olmalı. Uzun düz cümleler yerine formüller, denklemler, tablolar, adım adım çözümler kullan.
2. Her slaytın content alanında MUTLAKA en az 2-3 KaTeX formül/denklem olmalı (kaynakta varsa).
3. KaTeX formüllerinde backslash'leri ÇİFT yaz: \\\\frac, \\\\sqrt, \\\\int, \\\\sum, \\\\text, \\\\left, \\\\right, \\\\cdot, \\\\times, \\\\leq, \\\\geq, \\\\neq, \\\\alpha, \\\\beta, \\\\theta, \\\\pi, \\\\infty vb.
4. Inline formül: $...$, Blok formül: $$...$$
5. Sol alt köşeye yakın metin yazma.
${mermaidInstruction}

Her slayt şunları içermeli:
- slideNumber: Slayt numarası (1-10)
- title: Slayt başlığı
- content: ANA İÇERİK. Kaynağa dayalı. Satır atlamaları için \\n kullan.
- bulletPoints: 3-5 kısa madde.
- narrationText: Öğretmenin söyleyeceği anlatım (60-100 kelime). Samimi, sohbet tarzında. ASLA LaTeX veya $ sembolü kullanma. Formülleri okunuşuyla yaz (örn: "F eşittir m çarpı a"). Selamlama/veda KULLANMA.
${ragSection}
${problemInstruction}
${styleInstruction}
Ton: ${toneLabel}

SADECE geçerli JSON döndür. Format:
{"slides": [{"slideNumber": 1, "title": "...", "content": "...", "bulletPoints": ["..."], "narrationText": "..."}]}`
      : `You are an experienced teacher. Create EXACTLY 10 professional slides ONLY based on the provided source materials.

CRITICAL: Do NOT go beyond the sources. Do NOT add information not present in the sources. All content must derive from the provided materials.

CRITICAL RULES:
1. Content must be FORMULA AND VISUAL HEAVY.
2. Each slide's content must contain at least 2-3 KaTeX formulas (if present in sources).
3. Use DOUBLE backslashes in KaTeX: \\\\frac, \\\\sqrt, etc.
4. Inline formula: $...$, Block formula: $$...$$
5. Do NOT place text near the bottom-left corner.
${mermaidInstruction}

Each slide must contain: slideNumber, title, content, bulletPoints, narrationText (60-100 words). Narration must be spoken text. NO LaTeX/Math symbols. Write "equals", "divided by" etc.
${ragSection}
${problemInstruction}
${styleInstruction}
Tone: ${toneLabel}

Return ONLY valid JSON. Format:
{"slides": [{"slideNumber": 1, "title": "...", "content": "...", "bulletPoints": ["..."], "narrationText": "..."}]}`;
  } else if (ragContext) {
    // ══ HYBRID MODE: Use sources as reference + general knowledge ══
    systemPrompt = language === 'tr'
      ? `Sen deneyimli bir öğretmensin. Verilen konu hakkında TAM OLARAK 10 slaytlık profesyonel bir ders sunumu oluştur. Aşağıda verilen kaynak dökümanları referans al ve içeriği zenginleştir. Gerektiğinde ek bilgi ve açıklama ekleyebilirsin.

KRİTİK KURALLAR:
1. İçerik FORMÜL VE GÖRSEL AĞIRLIKLI olmalı. Uzun düz cümleler yerine formüller, denklemler, tablolar, adım adım çözümler kullan.
2. Her slaytın content alanında MUTLAKA en az 2-3 KaTeX formül/denklem olmalı.
3. KaTeX formüllerinde backslash'leri ÇİFT yaz: \\\\frac, \\\\sqrt, \\\\int, \\\\sum, \\\\text, \\\\left, \\\\right, \\\\cdot, \\\\times, \\\\leq, \\\\geq, \\\\neq, \\\\alpha, \\\\beta, \\\\theta, \\\\pi, \\\\infty vb.
4. Inline formül: $...$, Blok formül: $$...$$
5. Sol alt köşeye yakın metin yazma.
${mermaidInstruction}

Her slayt şunları içermeli:
- slideNumber: Slayt numarası (1-10)
- title: Slayt başlığı
- content: ANA İÇERİK. Formül ağırlıklı. Kısa açıklayıcı cümleler + çokça KaTeX formül/denklem. Satır atlamaları için \\n kullan.
- bulletPoints: 3-5 kısa madde.
- narrationText: Öğretmenin söyleyeceği anlatım (60-100 kelime). Samimi, sohbet tarzında. ASLA LaTeX veya $ sembolü kullanma. Formülleri okunuşuyla yaz (örn: "F eşittir m çarpı a"). Selamlama/veda KULLANMA.

Sunum yapısı:
- Slayt 1: Konuya giriş
- Slayt 2-3: Temel kavramlar
- Slayt 4-5: Kurallar ve formüller
- Slayt 6-7: Örnekler
- Slayt 8-9: İleri örnekler
- Slayt 10: Özet
${ragSection}
${problemInstruction}
${styleInstruction}
Ton: ${toneLabel}

SADECE geçerli JSON döndür. Format:
{"slides": [{"slideNumber": 1, "title": "...", "content": "...", "bulletPoints": ["..."], "narrationText": "..."}]}`
      : `You are an experienced teacher. Create EXACTLY 10 professional slides on the given topic. Use the provided source documents as reference and enrich the content. You may add additional explanations beyond the sources.

CRITICAL RULES:
1. Content must be FORMULA AND VISUAL HEAVY.
2. Each slide must contain at least 2-3 KaTeX formulas.
3. Use DOUBLE backslashes in KaTeX: \\\\frac, \\\\sqrt, etc.
4. Inline formula: $...$, Block formula: $$...$$
5. Do NOT place text near the bottom-left corner.
${mermaidInstruction}

Each slide: slideNumber, title, content (formula-heavy), bulletPoints (3-5), narrationText (60-100 words). Narration MUST be spoken text. NO LaTeX/Math symbols.

Structure: Slide 1 intro, 2-3 core concepts, 4-5 rules, 6-7 examples, 8-9 advanced, 10 summary.
${ragSection}
${problemInstruction}
${styleInstruction}
Tone: ${toneLabel}

Return ONLY valid JSON. Format:
{"slides": [{"slideNumber": 1, "title": "...", "content": "...", "bulletPoints": ["..."], "narrationText": "..."}]}`;
  } else {
    // ══ ORIGINAL MODE: No RAG context ══
    systemPrompt = language === 'tr'
      ? `Sen deneyimli bir öğretmensin. Verilen konu ve açıklamaya göre TAM OLARAK 10 slaytlık görsel açıdan zengin, formül ve şablon ağırlıklı profesyonel bir ders sunumu oluştur.

KRİTİK KURALLAR:
1. İçerik FORMÜL VE GÖRSEL AĞIRLIKLI olmalı. Uzun düz cümleler yerine formüller, denklemler, tablolar, adım adım çözümler kullan.
2. Her slaytın content alanında MUTLAKA en az 2-3 KaTeX formül/denklem olmalı.
3. KaTeX formüllerinde backslash'leri ÇİFT yaz: \\\\frac, \\\\sqrt, \\\\int, \\\\sum, \\\\text, \\\\left, \\\\right, \\\\cdot, \\\\times, \\\\leq, \\\\geq, \\\\neq, \\\\alpha, \\\\beta, \\\\theta, \\\\pi, \\\\infty vb. Bu JSON uyumluluğu için zorunlu.
4. Inline formül: $...$, Blok formül: $$...$$
5. Sol alt köşeye yakın metin yazma (orada öğretmen videosu gösterilecek).
${mermaidInstruction}

Her slayt şunları içermeli:
- slideNumber: Slayt numarası (1-10)
- title: Slayt başlığı
- content: ANA İÇERİK. Formül ağırlıklı olmalı. Kısa açıklayıcı cümleler + çokça KaTeX formül/denklem. Adım adım çözümlerde her adımı ayrı satırda formülle göster. Düz metin az, formül çok olmalı. Satır atlamaları için \\n kullan.
- bulletPoints: 3-5 kısa madde. Her madde bir anahtar kural veya formül içersin.
- narrationText: Öğretmenin söyleyeceği anlatım (60-100 kelime). Samimi, sohbet tarzında. Slayttaki formülleri ve kavramları SÖZLÜ olarak açıkla. ASLA LaTeX veya $ sembolü kullanma. Formülleri okunuşuyla yaz. Selamlama/veda KULLANMA.

Sunum yapısı:
- Slayt 1: Konuya giriş - neden önemli, temel formül/denklem tanıtımı
- Slayt 2-3: Temel kavramlar - her kavram formül/denklem ile desteklensin
- Slayt 4-5: Kurallar ve formüller - detaylı formül türetmeleri ve açıklamaları
- Slayt 6-7: Örnekler - adım adım formüllerle çözüm (her adım ayrı satır)
- Slayt 8-9: İleri örnekler ve özel durumlar
- Slayt 10: Özet - tüm önemli formüller bir arada
${problemInstruction}
${styleInstruction}
Ton: ${toneLabel}

SADECE geçerli JSON döndür, başka hiçbir şey yazma. Format:
{"slides": [{"slideNumber": 1, "title": "...", "content": "...", "bulletPoints": ["..."], "narrationText": "..."}]}`
      : `You are an experienced teacher. Create EXACTLY 10 visually rich, formula-heavy, professional lesson slides based on the given topic.

CRITICAL RULES:
1. Content must be FORMULA AND VISUAL HEAVY. Use formulas, equations, tables, step-by-step solutions instead of long plain text.
2. Each slide's content MUST contain at least 2-3 KaTeX formulas/equations.
3. In KaTeX formulas, use DOUBLE backslashes: \\\\frac, \\\\sqrt, \\\\int, \\\\sum, \\\\text, \\\\left, \\\\right, \\\\cdot, \\\\times, \\\\leq, \\\\geq, \\\\neq, \\\\alpha, \\\\beta, \\\\theta, \\\\pi, \\\\infty etc. This is REQUIRED for JSON compatibility.
4. Inline formula: $...$, Block formula: $$...$$
5. Do NOT place text near the bottom-left corner (teacher video overlay shown there).
${mermaidInstruction}

Each slide must contain:
- slideNumber: Slide number (1-10)
- title: Slide title
- content: MAIN CONTENT. Formula-heavy. Short explanatory sentences + many KaTeX formulas/equations. Show each step on a separate line with formulas. Less plain text, more formulas. Use \\n for line breaks.
- bulletPoints: 3-5 brief items. Each should contain a key rule or formula.
- narrationText: Teacher narration (60-100 words). Warm, conversational. VERBALLY explain the formulas. NO LaTeX/Math symbols in narration. Write "equals", "plus" etc. Do NOT use greetings/farewells.

Structure:
- Slide 1: Introduction - why it matters, key formula preview
- Slides 2-3: Core concepts with supporting formulas
- Slides 4-5: Rules and formulas - detailed derivations
- Slides 6-7: Examples - step-by-step formula solutions (each step on its own line)
- Slides 8-9: Advanced examples and special cases
- Slide 10: Summary - all key formulas together
${problemInstruction}
${styleInstruction}
Tone: ${toneLabel}

Return ONLY valid JSON, nothing else. Format:
{"slides": [{"slideNumber": 1, "title": "...", "content": "...", "bulletPoints": ["..."], "narrationText": "..."}]}`;
  }

  const userPrompt = language === 'tr'
    ? `Konu: ${topic}\n\nAçıklama ve öğretmen notları: ${description}${prompt ? `\n\nEk talimatlar: ${prompt}` : ''}`
    : `Topic: ${topic}\n\nDescription and teacher notes: ${description}${prompt ? `\n\nAdditional instructions: ${prompt}` : ''}`;

  const response = await falRequest<{ output: string }>(modelPath, {
    prompt: userPrompt,
    system_prompt: systemPrompt,
    model: 'google/gemini-2.5-flash-lite',
    max_tokens: 8000,
    temperature: 0.7,
  });

  // Parse the JSON output from LLM
  const rawOutput = response.output.trim();
  // Extract JSON - LLM often wraps in markdown code blocks (```json ... ```)
  let jsonStr = rawOutput;
  if (rawOutput.includes('```')) {
    const match = rawOutput.match(/```(?:json|JSON)?\s*\n?([\s\S]*?)\n?```/);
    if (match?.[1]) {
      jsonStr = match[1].trim();
    } else {
      jsonStr = rawOutput.replace(/^```(?:json|JSON)?\s*\n?/i, '').replace(/\n?```\s*$/, '').trim();
    }
  }
  // If still not valid JSON start, try to extract {...} block
  if (jsonStr.startsWith('`') || !jsonStr.startsWith('{')) {
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
    }
  }

  /**
   * Robust JSON sanitizer for LLM output containing LaTeX.
   *
   * Problem: LLMs write LaTeX like \frac, \sqrt, \text inside JSON strings.
   * JSON uses \b \f \n \r \t as control chars, so \frac → form-feed + "rac".
   *
   * Approach: Character-by-character scan. When inside a JSON string and we see
   * a backslash, determine if the escape is valid JSON or a LaTeX command.
   * If LaTeX, double the backslash.
   */
  function sanitizeLatexInJson(raw: string): string {
    const result: string[] = [];
    let inString = false;
    let i = 0;

    while (i < raw.length) {
      const ch = raw[i];

      if (!inString) {
        // Outside a string: look for opening quote
        if (ch === '"') {
          inString = true;
        }
        result.push(ch);
        i++;
      } else {
        // Inside a JSON string value
        if (ch === '"') {
          // Closing quote (unescaped)
          inString = false;
          result.push(ch);
          i++;
        } else if (ch === '\\') {
          // Backslash inside string - check what follows
          const next = i + 1 < raw.length ? raw[i + 1] : '';

          if (next === '"' || next === '\\' || next === '/') {
            // Valid JSON escape: \", \\, \/  → keep as-is
            result.push(ch, next);
            i += 2;
          } else if (
            (next === 'b' || next === 'f' || next === 'n' || next === 'r' || next === 't')
          ) {
            // Could be valid JSON escape OR start of LaTeX command
            // Check if followed by another letter → LaTeX (e.g. \frac, \text, \begin)
            const afterNext = i + 2 < raw.length ? raw[i + 2] : '';
            if (/[a-zA-Z]/.test(afterNext)) {
              // LaTeX command: \frac, \begin, \text, \nabla, \right, etc.
              result.push('\\\\');
              i += 1; // advance past the backslash only, next char stays
            } else {
              // Likely real JSON escape: \n, \t, \b, \f, \r (standalone)
              result.push(ch, next);
              i += 2;
            }
          } else if (next === 'u') {
            // \u must be followed by 4 hex digits for valid JSON
            const hex = raw.substring(i + 2, i + 6);
            if (/^[0-9a-fA-F]{4}$/.test(hex)) {
              // Valid unicode escape \uXXXX
              result.push(ch, next);
              i += 2;
            } else {
              // LaTeX: \underline, \underbrace, etc.
              result.push('\\\\');
              i += 1;
            }
          } else {
            // Any other \X where X is not a valid JSON escape → must be LaTeX
            // e.g. \sqrt, \sum, \int, \alpha, \cdot, \leq, \pi, \infty, etc.
            result.push('\\\\');
            i += 1;
          }
        } else {
          result.push(ch);
          i++;
        }
      }
    }

    return result.join('');
  }

  // Always sanitize before parsing
  let parsed: Record<string, unknown>;
  const sanitized = sanitizeLatexInJson(jsonStr);
  try {
    parsed = JSON.parse(sanitized);
  } catch (firstError) {
    // Fallback: try even more aggressive cleanup
    console.warn('[Slides] First sanitization failed, trying aggressive cleanup...');
    try {
      // Remove any control characters that might have slipped through
      const aggressive = sanitized
        .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, ' ') // Remove control chars except \n \r \t
        .replace(/,\s*}/g, '}')   // Remove trailing commas before }
        .replace(/,\s*]/g, ']');  // Remove trailing commas before ]
      parsed = JSON.parse(aggressive);
    } catch (secondError) {
      console.error('[Slides] JSON parse failed. Raw output (first 800 chars):', jsonStr.substring(0, 800));
      console.error('[Slides] Sanitized (first 800 chars):', sanitized.substring(0, 800));
      throw new Error(`LLM çıktısı JSON olarak ayrıştırılamadı: ${secondError instanceof Error ? secondError.message : 'Parse error'}`);
    }
  }

  if (!parsed.slides || !Array.isArray(parsed.slides)) {
    throw new Error('Invalid slides format: missing slides array');
  }
  // Validate and sanitize slides
  const slides = parsed.slides.slice(0, 10).map((s: Record<string, unknown>, i: number) => ({
    slideNumber: i + 1,
    title: String(s.title || `Slayt ${i + 1}`),
    content: String(s.content || ''),
    bulletPoints: Array.isArray(s.bulletPoints) ? s.bulletPoints.map(String) : [],
    narrationText: String(s.narrationText || s.narration || ''),
  }));
  return { slides };
}

/**
 * Remove LaTeX symbols and formatting for TTS.
 * Converts symbols to readable text where possible, or removes them.
 */
function cleanTextForTts(text: string): string {
  return text
    // Remove inline math delimiters
    .replace(/\$\$/g, '')
    .replace(/\$/g, '')
    // Remove common LaTeX commands
    .replace(/\\(text|frac|sqrt|cdot|times|hat|vec|bar|mathbf|mathrm|leq|geq|neq|approx|infty|alpha|beta|theta|pi|sigma|delta|gamma|omega)/g, '')
    .replace(/\\/g, '') // Remove remaining backslashes
    .replace(/{/g, '').replace(/}/g, '') // Remove braces
    .replace(/\[/g, '').replace(/\]/g, '') // Remove brackets
    .replace(/\*/g, '') // Remove asterisks
    .replace(/_/g, ' ') // Replace underscores with space
    .replace(/\^/g, '') // Remove carets
    .trim();
}

/**
 * Convert text to speech using fal-ai/elevenlabs TTS
 */
async function textToSpeech(
  rawText: string,
  language: 'tr' | 'en'
): Promise<{ audio_url: string }> {
  const text = cleanTextForTts(rawText);
  const modelPath = 'fal-ai/elevenlabs/text-to-dialogue/eleven-v3';

  const result = await falRequest<{ audio: { url: string } }>(
    modelPath,
    {
      inputs: [
        {
          text: text,
          voice: 'Adam', // Male voice - ElevenLabs premade (deep, narration)
        },
      ],
      language_code: language,
      stability: 0.5,
      use_speaker_boost: true,
    }
  );

  return {
    audio_url: result.audio?.url || '',
  };
}

/**
 * Create a lipsync video using VEED lipsync (veed/lipsync on fal.ai).
 * Takes a reference video + TTS audio → produces video with synced lip movements + embedded audio.
 * Uses queue-based approach since lipsync can take 30-120s per clip.
 */
async function createLipsyncVideo(
  videoUrl: string,
  audioUrl: string,
  maxWaitMs = 360000 // 6 minutes max
): Promise<{ video_url: string }> {
  const apiKey = getApiKey();
  const modelId = 'veed/lipsync';

  // Submit job to fal queue
  const submitRes = await fetch(`${FAL_QUEUE_BASE}/${modelId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Key ${apiKey}`,
    },
    body: JSON.stringify({
      video_url: videoUrl,
      audio_url: audioUrl,
    }),
  });

  if (!submitRes.ok) {
    const errText = await submitRes.text();
    throw new Error(`Lipsync submit failed (${submitRes.status}): ${errText}`);
  }

  const { request_id } = await submitRes.json();
  console.log(`[Lipsync] VEED job submitted: ${request_id}`);

  // Poll for completion
  const startTime = Date.now();
  const pollInterval = 3000;

  while (Date.now() - startTime < maxWaitMs) {
    await new Promise((r) => setTimeout(r, pollInterval));

    try {
      const statusRes = await fetch(
        `${FAL_QUEUE_BASE}/${modelId}/requests/${request_id}/status`,
        { headers: { 'Authorization': `Key ${apiKey}` } }
      );

      if (!statusRes.ok) {
        console.warn(`[Lipsync] Status check returned ${statusRes.status}, retrying...`);
        continue;
      }

      const statusData = await statusRes.json();
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(`[Lipsync] Status: ${statusData.status} (${elapsed}s)`);

      if (statusData.status === 'COMPLETED') {
        await new Promise((r) => setTimeout(r, 500));

        const resultRes = await fetch(
          `${FAL_QUEUE_BASE}/${modelId}/requests/${request_id}`,
          { headers: { 'Authorization': `Key ${apiKey}` } }
        );

        if (!resultRes.ok) {
          const errText = await resultRes.text();
          throw new Error(`Lipsync result fetch failed (${resultRes.status}): ${errText}`);
        }

        const result = await resultRes.json();
        const outputUrl = result.video?.url;

        if (!outputUrl) {
          throw new Error('Lipsync completed but no video URL in response');
        }

        console.log(`[Lipsync] Completed in ${elapsed}s: ${outputUrl.substring(0, 60)}...`);
        return { video_url: outputUrl };
      }

      if (statusData.status === 'FAILED') {
        const reason = statusData.error || 'Unknown lipsync error';
        throw new Error(`Lipsync failed: ${reason}`);
      }

      // IN_QUEUE or IN_PROGRESS → keep polling
    } catch (err) {
      if (err instanceof Error && (err.message.includes('Lipsync') || err.message.includes('lipsync'))) {
        throw err;
      }
      console.warn(`[Lipsync] Poll error:`, err);
    }
  }

  throw new Error(`Lipsync timed out after ${maxWaitMs / 1000}s`);
}

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
      step, // 'slides', 'tts_slide', 'tts_batch', 'lipsync', 'rag_retrieve'
      ragContext,
      sourceOnly,
      teacherId,
      documentIds,
      query,
    } = body;

    // Step: Retrieve RAG context from Pinecone
    if (step === 'rag_retrieve') {
      if (!query || !teacherId) {
        return NextResponse.json(
          { error: 'query and teacherId are required' },
          { status: 400 }
        );
      }

      if (!isRagConfigured()) {
        return NextResponse.json(
          { error: 'RAG services are not configured' },
          { status: 503 }
        );
      }

      const context = await retrieveContext(
        query,
        teacherId,
        documentIds || undefined,
        8
      );

      return NextResponse.json({ context });
    }

    // Step: Generate slides content with LLM
    if (step === 'slides') {
      if (!topic || !description) {
        return NextResponse.json(
          { error: 'Topic and description are required' },
          { status: 400 }
        );
      }

      const slidesResult = await generateSlides(
        topic,
        description,
        prompt,
        language,
        tone,
        includesProblemSolving,
        problemCount,
        difficulty,
        ragContext,
        sourceOnly
      );

      return NextResponse.json({
        slides: slidesResult.slides,
        stage: 'slides_complete',
      });
    }

    // Step: Generate TTS for a single slide
    if (step === 'tts_slide') {
      const { narrationText, slideNumber } = body;
      if (!narrationText) {
        return NextResponse.json(
          { error: 'narrationText is required for TTS' },
          { status: 400 }
        );
      }

      const ttsResult = await textToSpeech(narrationText, language);

      return NextResponse.json({
        audio_url: ttsResult.audio_url,
        slideNumber,
        stage: 'tts_slide_complete',
      });
    }

    // Step: Generate TTS for all slides (batch - sequential)
    if (step === 'tts_batch') {
      const { slides } = body;
      if (!slides || !Array.isArray(slides)) {
        return NextResponse.json(
          { error: 'slides array is required for TTS batch' },
          { status: 400 }
        );
      }

      const results: Array<{ slideNumber: number; audio_url: string }> = [];

      for (const slide of slides) {
        if (!slide.narrationText || slide.narrationText.trim() === '') {
          results.push({ slideNumber: slide.slideNumber, audio_url: '' });
          continue;
        }

        try {
          const ttsResult = await textToSpeech(slide.narrationText, language);
          results.push({
            slideNumber: slide.slideNumber,
            audio_url: ttsResult.audio_url,
          });
          console.log(`[TTS Batch] Slide ${slide.slideNumber} completed`);
        } catch (err) {
          console.error(`[TTS Batch] Slide ${slide.slideNumber} failed:`, err);
          results.push({ slideNumber: slide.slideNumber, audio_url: '' });
        }
      }

      return NextResponse.json({
        audioResults: results,
        stage: 'tts_batch_complete',
      });
    }

    // Step: Lipsync - sync reference video lips to TTS audio
    if (step === 'lipsync') {
      const { video_url, audio_url } = body;
      if (!video_url || !audio_url) {
        return NextResponse.json(
          { error: 'video_url and audio_url are required for lipsync' },
          { status: 400 }
        );
      }

      const result = await createLipsyncVideo(video_url, audio_url);
      return NextResponse.json({
        video_url: result.video_url,
        stage: 'lipsync_complete',
      });
    }

    // Step: Bunny Stream batch ingestion — upload each slide's lipsync video to Bunny
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
        // Only ingest slides that have a video URL (lipsync output)
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
            bunnyEmbedUrl: result.embedUrl,
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

      return NextResponse.json({
        ingestionResults: results,
        stage: 'bunny_ingest_complete',
      });
    }

    // Unknown step
    return NextResponse.json(
      { error: `Unknown step: ${step}. Use 'slides', 'tts_slide', 'tts_batch', 'lipsync', or 'bunny_ingest_batch'.` },
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
