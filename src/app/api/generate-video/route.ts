import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { retrieveContext, isRagConfigured } from '@/lib/api/rag';
import { isBunnyEnabled } from '@/lib/config/bunny-config';
import { ingestFromUrl } from '@/lib/api/bunny-stream';

// Allow up to 5 minutes — needed for lipsync polling and Manim render calls
export const maxDuration = 300;

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
    max_tokens: 32000,
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
        } else if (ch === '\n') {
          // Literal newline inside a JSON string → escape it (JSON forbids raw newlines)
          result.push('\\n');
          i++;
        } else if (ch === '\r') {
          result.push('\\r');
          i++;
        } else if (ch === '\t') {
          result.push('\\t');
          i++;
        } else {
          result.push(ch);
          i++;
        }
      }
    }

    return result.join('');
  }

  /**
   * Last-resort recovery for truncated JSON output (LLM ran out of tokens
   * mid-string). Finds the last complete slide object in the slides array,
   * truncates everything after it, and re-closes the array + root object.
   */
  function recoverTruncatedJson(raw: string): string | null {
    const slidesIdx = raw.indexOf('"slides"');
    if (slidesIdx < 0) return null;
    const arrStart = raw.indexOf('[', slidesIdx);
    if (arrStart < 0) return null;

    // Walk forward tracking brace depth, only counting structural braces
    // (i.e., not braces inside strings). Record the end-position after each
    // top-level slide object (depth returns to 1 inside the array).
    let depth = 0;
    let inStr = false;
    let escape = false;
    let lastGoodEnd = -1;
    for (let i = arrStart; i < raw.length; i++) {
      const c = raw[i];
      if (escape) { escape = false; continue; }
      if (inStr) {
        if (c === '\\') escape = true;
        else if (c === '"') inStr = false;
        continue;
      }
      if (c === '"') { inStr = true; continue; }
      if (c === '[' || c === '{') depth++;
      else if (c === ']' || c === '}') {
        depth--;
        // After closing a slide object we are back inside the array (depth === 1)
        if (c === '}' && depth === 1) lastGoodEnd = i;
      }
    }

    if (lastGoodEnd < 0) return null;
    return raw.slice(0, lastGoodEnd + 1) + ']}';
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
      // Last resort: output was likely truncated mid-string. Trim to the last
      // complete slide and re-close the structure so we still get usable slides.
      const recovered = recoverTruncatedJson(sanitized);
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
  // Validate and sanitize slides
  const slides = parsed.slides.slice(0, 10).map((s: Record<string, unknown>, i: number) => {
    const slideNumber = i + 1;
    const rawContent = String(s.content || '').trim();
    const bulletPoints = Array.isArray(s.bulletPoints) ? s.bulletPoints.map(String) : [];
    const narrationText = String(s.narrationText || s.narration || '').trim();

    // If the LLM returned an empty content AND no bullets (e.g. truncated by
    // max_tokens), fall back to the narration text so the user at least sees
    // the spoken content rendered, instead of a blank slide.
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
 * Convert text to speech.
 * Primary: ElevenLabs direct API with the teacher's cloned voice (ELEVENLABS_VOICE_ID).
 * Fallback: fal-ai/elevenlabs premade voice (used if ELEVENLABS_API_KEY/VOICE_ID missing
 * or the direct call fails).
 */
async function textToSpeech(
  rawText: string,
  language: 'tr' | 'en'
): Promise<{ audio_url: string }> {
  const text = cleanTextForTts(rawText);

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;

  if (apiKey && voiceId) {
    try {
      return await textToSpeechElevenLabsDirect(text, voiceId, apiKey);
    } catch (err) {
      console.warn('[TTS] ElevenLabs direct call failed, falling back to fal.ai:', err);
    }
  }

  return await textToSpeechFalFallback(text, language);
}

/**
 * ElevenLabs direct TTS with cloned voice → upload mp3 to Vercel Blob → return public URL.
 * VEED lipsync requires a fetchable audio URL.
 */
async function textToSpeechElevenLabsDirect(
  text: string,
  voiceId: string,
  apiKey: string
): Promise<{ audio_url: string }> {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ElevenLabs TTS failed (${res.status}): ${errText}`);
  }

  const audioBuffer = await res.arrayBuffer();
  const pathname = `tts/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.mp3`;

  const blob = await put(pathname, audioBuffer, {
    access: 'public',
    contentType: 'audio/mpeg',
  });

  return { audio_url: blob.url };
}

/**
 * Fallback: fal-ai/elevenlabs premade voice (legacy path).
 */
async function textToSpeechFalFallback(
  text: string,
  language: 'tr' | 'en'
): Promise<{ audio_url: string }> {
  const modelPath = 'fal-ai/elevenlabs/text-to-dialogue/eleven-v3';

  const result = await falRequest<{ audio: { url: string } }>(
    modelPath,
    {
      inputs: [
        {
          text: text,
          voice: 'Adam',
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

// ---------------------------------------------------------------------------
// Manim helpers
// ---------------------------------------------------------------------------

const MANIM_SYSTEM_PROMPT = `You are a Manim animation expert creating short educational animations for high-school and university students. Aim for the visual clarity of 3Blue1Brown — when the slide describes any physical, geometric, or temporal phenomenon, prefer DYNAMIC, MOTION-DRIVEN visualizations over static text+formula layouts.

Given a lecture slide, choose the animation style that best visualises the core idea — formulas, diagrams, graphs, force sketches, geometric constructions, simulations, particle motion, transformations, etc.

STRICT OUTPUT RULES:
1. Output ONLY valid Python code — no markdown fences, no explanation.
2. The class MUST be named exactly \`SlideScene\`.
3. Always start with: from manim import *
   When you need math: also include \`import numpy as np\` on the next line.
4. Output exactly the word SKIP (nothing else) for:
   - Pure intro / welcome slides (slide 1) with no formulas or diagrams
   - Pure summary slides that only list bullet text
   - Slides whose entire content is already plain prose with nothing to visualise
5. Animation total duration: 10–20 seconds. Use self.wait() for pacing.
6. LaTeX inside MathTex: escape backslashes once — \\\\frac, \\\\sqrt, \\\\vec, \\\\cdot, \\\\Delta, etc.
   Do NOT use $ delimiters inside MathTex().
7. Animate the 1–3 most important ideas. Do not try to show everything.
8. PREFER MOTION OVER STATIC: if the topic involves anything that moves, transforms, oscillates, builds up, or interacts (projectile, wave, orbit, pendulum, bond formation, current flow, vector field, Fourier, particle collision, growth/decay, geometric construction step-by-step), use ValueTracker + always_redraw + MoveAlongPath + TracedPath to animate it live, not as a static snapshot.

COLOR CONVENTIONS:
  WHITE   — body text, labels
  YELLOW  — formulas, equations, key values
  BLUE    — axes, reference lines, water/electricity
  GREEN   — results, final answers, positive forces
  RED     — warnings, opposing forces, negative
  ORANGE  — objects (blocks, balls, particles)

━━━ ANIMATION TYPE SELECTION ━━━

Read the slide content and pick ONE primary type:

TYPE A — FORMULA DERIVATION
  When: slide is dominated by equations, proofs, algebraic manipulation.
  How: Write each MathTex step top-to-bottom, use Transform to evolve expressions.

TYPE B — FUNCTION / GRAPH
  When: slide discusses a function, curve, distribution, or numeric relationship.
  How: Axes() + axes.plot(lambda x: ...) + get_graph_label(). Animate with Create().

TYPE C — PHYSICS / FORCE DIAGRAM
  When: slide mentions forces, vectors, motion, fields, circuits, torque, pressure.
  How: Draw the physical object (Rectangle/Circle/Dot), then GrowArrow() for each
  force/vector with a MathTex label. Add ground lines, walls, springs with Line().
  Animate forces appearing one by one with narration-friendly pacing.

TYPE D — GEOMETRIC CONSTRUCTION
  When: slide covers geometry, angles, area, proofs, trigonometry, coordinate geometry.
  How: Draw shapes (Polygon, Circle, Line), animate angle arcs with Arc(),
  label sides/angles with MathTex, use Indicate() or Circumscribe() to highlight.

TYPE E — CONCEPT / PROCESS DIAGRAM
  When: slide explains a process, cycle, relationship between concepts, algorithm steps.
  How: Use labeled boxes (RoundedRectangle + Text), connect them with Arrow(),
  animate boxes and arrows appearing sequentially.

TYPE F — STEP-BY-STEP PROBLEM SOLUTION
  When: slide shows a worked example with numbered steps.
  How: Each step is a MathTex or Text line appearing with FadeIn(shift=DOWN*0.3).

TYPE G — DYNAMIC SIMULATION (PRIORITISE THIS WHEN APPLICABLE)
  When: slide describes motion, trajectory, oscillation, wave propagation,
  orbital motion, projectile, pendulum, falling object, particle interaction,
  current/charge flow, chemical bond formation/breaking, collision, growth/decay,
  rotation, or any phenomenon that unfolds over time.
  How: Use ValueTracker for time/parameter; always_redraw for objects whose
  position depends on it; TracedPath to leave a visible trail; MoveAlongPath
  to send a Dot along a parametric curve. The animation should *show the
  phenomenon happening*, not just label it.

TYPE H — CREATIVE / EPICYCLE / FOURIER-STYLE VISUALIZATION
  When: slide is about Fourier series, complex exponentials, rotating reference
  frames, Lissajous curves, harmonic motion, or any topic where stacked /
  composed rotations reveal structure (e.g. drawing a shape from circles).
  How: Build nested rotating arms with always_redraw + ValueTracker, attach a
  TracedPath to the tip so the curve is *drawn live* during the animation.

━━━ EXAMPLES ━━━

EXAMPLE A — formula derivation (kinetic energy):
from manim import *

class SlideScene(Scene):
    def construct(self):
        title = Text("Kinetic Energy", font_size=36, color=WHITE).to_edge(UP)
        self.play(Write(title))

        step1 = MathTex(r"W = F \\cdot d", font_size=52, color=YELLOW)
        self.play(Write(step1))
        self.wait(0.8)

        step2 = MathTex(r"W = ma \\cdot d = m \\cdot \\frac{v^2}{2}", font_size=52, color=YELLOW)
        self.play(TransformMatchingTex(step1, step2))
        self.wait(0.8)

        step3 = MathTex(r"E_k = \\frac{1}{2}mv^2", font_size=64, color=GREEN)
        self.play(TransformMatchingTex(step2, step3))
        self.wait(2)

EXAMPLE B — graph (quadratic):
from manim import *

class SlideScene(Scene):
    def construct(self):
        title = Text("Quadratic Function", font_size=36, color=WHITE).to_edge(UP)
        self.play(Write(title))

        axes = Axes(x_range=[-3, 3, 1], y_range=[-1, 5, 1],
                    axis_config={"color": BLUE})
        graph = axes.plot(lambda x: x**2, color=YELLOW)
        label = axes.get_graph_label(graph, label=r"f(x)=x^2", color=YELLOW)

        self.play(Create(axes))
        self.play(Create(graph), Write(label))
        self.wait(2)

EXAMPLE C — physics diagram (Newton's second law, free body diagram):
from manim import *

class SlideScene(Scene):
    def construct(self):
        title = Text("Newton's Second Law", font_size=34, color=WHITE).to_edge(UP)
        self.play(Write(title))

        # Ground and block
        ground = Line(LEFT * 3.5, RIGHT * 3.5, color=WHITE).shift(DOWN * 1.5)
        block = Rectangle(width=1.2, height=1.2, color=ORANGE, fill_opacity=0.8)
        block.move_to(ORIGIN)
        self.play(Create(ground), FadeIn(block))

        # Applied force (right)
        f_arrow = Arrow(block.get_right(), block.get_right() + RIGHT * 2,
                        color=GREEN, buff=0)
        f_label = MathTex(r"F", color=GREEN, font_size=40).next_to(f_arrow, UP)
        self.play(GrowArrow(f_arrow), Write(f_label))

        # Friction (left)
        fr_arrow = Arrow(block.get_left(), block.get_left() + LEFT * 1.2,
                         color=RED, buff=0)
        fr_label = MathTex(r"f", color=RED, font_size=40).next_to(fr_arrow, UP)
        self.play(GrowArrow(fr_arrow), Write(fr_label))

        # Weight (down) and Normal (up)
        w_arrow = Arrow(block.get_center(), block.get_center() + DOWN * 1.4,
                        color=YELLOW, buff=0)
        w_label = MathTex(r"mg", color=YELLOW, font_size=36).next_to(w_arrow, RIGHT)
        n_arrow = Arrow(block.get_bottom(), block.get_bottom() + UP * 1.4,
                        color=BLUE, buff=0)
        n_label = MathTex(r"N", color=BLUE, font_size=36).next_to(n_arrow, RIGHT)
        self.play(GrowArrow(w_arrow), Write(w_label),
                  GrowArrow(n_arrow), Write(n_label))

        # Result formula
        result = MathTex(r"F_{net} = ma", font_size=48, color=GREEN)
        result.to_edge(DOWN, buff=0.4)
        self.play(Write(result))
        self.wait(2)

EXAMPLE D — geometric construction (Pythagorean theorem):
from manim import *

class SlideScene(Scene):
    def construct(self):
        title = Text("Pythagorean Theorem", font_size=34, color=WHITE).to_edge(UP)
        self.play(Write(title))

        # Right triangle
        A, B, C = LEFT * 2 + DOWN, LEFT * 2 + UP * 1.5, RIGHT * 1.5 + DOWN
        triangle = Polygon(A, B, C, color=WHITE)
        right_angle = RightAngle(Line(A, B), Line(A, C), length=0.25, color=WHITE)

        a_label = MathTex(r"a", color=YELLOW).move_to(midpoint(A, B) + LEFT * 0.3)
        b_label = MathTex(r"b", color=YELLOW).move_to(midpoint(A, C) + DOWN * 0.3)
        c_label = MathTex(r"c", color=GREEN).move_to(midpoint(B, C) + RIGHT * 0.4)

        self.play(Create(triangle), Create(right_angle))
        self.play(Write(a_label), Write(b_label), Write(c_label))

        formula = MathTex(r"a^2 + b^2 = c^2", font_size=56, color=GREEN)
        formula.to_edge(DOWN, buff=0.6)
        self.play(Write(formula))
        self.wait(2)

EXAMPLE E — concept diagram (photosynthesis steps):
from manim import *

class SlideScene(Scene):
    def construct(self):
        title = Text("Photosynthesis", font_size=34, color=WHITE).to_edge(UP)
        self.play(Write(title))

        boxes = VGroup()
        labels = ["Light\\nAbsorption", "Water\\nSplitting", "CO₂\\nFixation", "Glucose"]
        colors = [YELLOW, BLUE, GREEN, ORANGE]
        for i, (lbl, col) in enumerate(zip(labels, colors)):
            box = RoundedRectangle(width=2, height=1, corner_radius=0.2,
                                   color=col, fill_opacity=0.25)
            text = Text(lbl, font_size=22, color=col)
            text.move_to(box)
            boxes.add(VGroup(box, text))
        boxes.arrange(RIGHT, buff=0.5).shift(DOWN * 0.3)

        arrows = VGroup(*[
            Arrow(boxes[i].get_right(), boxes[i+1].get_left(), buff=0.05, color=WHITE)
            for i in range(len(boxes)-1)
        ])

        for box in boxes:
            self.play(FadeIn(box, shift=UP * 0.2), run_time=0.5)
        for arrow in arrows:
            self.play(GrowArrow(arrow), run_time=0.4)
        self.wait(2)

EXAMPLE G — dynamic simulation (projectile motion, ball flies along the curve):
from manim import *
import numpy as np

class SlideScene(Scene):
    def construct(self):
        title = Text("Projectile Motion", font_size=34, color=WHITE).to_edge(UP)
        self.play(Write(title))

        axes = Axes(
            x_range=[0, 8, 1], y_range=[0, 4, 1],
            x_length=8, y_length=3.4,
            axis_config={"color": BLUE, "include_tip": False},
        ).to_edge(DOWN, buff=0.6)
        self.play(Create(axes))

        v0, theta_deg = 8.5, 55
        theta = np.deg2rad(theta_deg)
        g = 9.8

        def y(x):
            return x * np.tan(theta) - g * x ** 2 / (2 * v0 ** 2 * np.cos(theta) ** 2)

        # Find x where y returns to 0 (range)
        x_max = (v0 ** 2) * np.sin(2 * theta) / g

        traj = axes.plot(y, x_range=[0, x_max], color=YELLOW)
        ball = Dot(color=ORANGE, radius=0.13).move_to(axes.c2p(0, 0))
        self.play(Create(ball))

        # Animate ball along curve while drawing the trajectory
        self.play(
            MoveAlongPath(ball, traj),
            Create(traj),
            run_time=3.5,
            rate_func=linear,
        )

        formula = MathTex(
            r"y = x\\tan\\theta - \\frac{g\\,x^2}{2 v_0^2 \\cos^2\\theta}",
            font_size=34, color=GREEN
        ).to_edge(DOWN, buff=0.05)
        self.play(Write(formula))
        self.wait(1.5)

EXAMPLE H — creative / Fourier-style (two epicycles draw a curve live):
from manim import *
import numpy as np

class SlideScene(Scene):
    def construct(self):
        title = Text("Fourier Epicycles", font_size=34, color=WHITE).to_edge(UP)
        self.play(Write(title))

        center = LEFT * 1.5 + DOWN * 0.3
        r1, r2 = 1.4, 0.7
        omega1, omega2 = 1, 3  # second wheel spins 3x faster

        c1 = Circle(radius=r1, color=BLUE, stroke_opacity=0.6).move_to(center)
        self.play(Create(c1))

        t = ValueTracker(0)

        def arm1_end():
            phi = t.get_value()
            return center + r1 * np.array([np.cos(omega1 * phi), np.sin(omega1 * phi), 0])

        def tip():
            phi = t.get_value()
            return arm1_end() + r2 * np.array([np.cos(omega2 * phi), np.sin(omega2 * phi), 0])

        c2 = always_redraw(lambda: Circle(radius=r2, color=YELLOW, stroke_opacity=0.6).move_to(arm1_end()))
        line1 = always_redraw(lambda: Line(center, arm1_end(), color=BLUE))
        line2 = always_redraw(lambda: Line(arm1_end(), tip(), color=YELLOW))
        tip_dot = always_redraw(lambda: Dot(tip(), color=GREEN, radius=0.1))
        path = TracedPath(tip, stroke_color=GREEN, stroke_width=3)

        self.add(c2, line1, line2, tip_dot, path)
        self.play(t.animate.set_value(2 * PI), run_time=6, rate_func=linear)
        self.wait(1)
`;

/**
 * Call the LLM to generate a Manim Python script for a given slide.
 * Returns either valid Python code (starting with "from manim import *")
 * or the string "SKIP" when the slide doesn't warrant animation.
 */
async function generateManimCode(
  slide: { slideNumber: number; title: string; content: string; bulletPoints: string[] },
  topic: string,
  language: string
): Promise<string> {
  const userPrompt = `Topic: ${topic}
Slide ${slide.slideNumber}/10: "${slide.title}"

Content:
${slide.content}

Bullet points:
${slide.bulletPoints.map((b, i) => `${i + 1}. ${b}`).join('\n')}

Language hint: ${language === 'tr' ? 'Turkish content — use English labels in Manim (LaTeX renders in English regardless)' : 'English content'}

Generate the Manim SlideScene now:`;

  const response = await falRequest<{ output: string }>('fal-ai/any-llm', {
    prompt: userPrompt,
    system_prompt: MANIM_SYSTEM_PROMPT,
    model: 'google/gemini-2.5-flash',
    max_tokens: 5000,
    temperature: 0.3, // low temp — we want consistent, correct code
  });

  const raw = (response.output || '').trim();

  // Strip markdown code fences if LLM wrapped the output anyway
  if (raw.includes('```')) {
    const match = raw.match(/```(?:python)?\s*\n?([\s\S]*?)\n?```/);
    if (match?.[1]) return match[1].trim();
  }

  return raw;
}

/**
 * Send Manim code to the Modal endpoint for rendering.
 * Returns the public Supabase Storage URL of the rendered MP4, or null on failure.
 */
async function renderManimAnimation(
  manimCode: string,
  slideNumber: number,
  videoId: string
): Promise<string | null> {
  const modalUrl = process.env.MODAL_MANIM_URL;
  if (!modalUrl) {
    console.log('[Manim] MODAL_MANIM_URL not set — skipping animation render');
    return null;
  }

  if (!manimCode || manimCode.trim().toUpperCase() === 'SKIP') {
    return null;
  }

  try {
    const res = await fetch(modalUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manim_code: manimCode, slide_number: slideNumber, video_id: videoId }),
      signal: AbortSignal.timeout(280_000), // 280s — just under Vercel's 300s function limit
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[Manim] Modal returned ${res.status}: ${text.slice(0, 200)}`);
      return null;
    }

    const data = await res.json() as { animation_url?: string | null; skipped?: boolean; error?: string | null };

    if (data.error) {
      console.error(`[Manim] Render error for slide ${slideNumber}:`, data.error);
      return null;
    }

    return data.animation_url ?? null;
  } catch (err) {
    console.error(`[Manim] fetch error for slide ${slideNumber}:`, err);
    return null;
  }
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

    // Step: Generate short demo narration text (for landing page demo)
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

    // Step: Bunny Stream batch ingestion, upload each slide's lipsync video to Bunny
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

      return NextResponse.json({
        ingestionResults: results,
        stage: 'bunny_ingest_complete',
      });
    }

    // Step: Generate Manim Python code for a single slide using the LLM
    if (step === 'manim_code') {
      const { slide, topic, language: lang = 'en' } = body as {
        slide: { slideNumber: number; title: string; content: string; bulletPoints: string[] };
        topic: string;
        language?: string;
      };

      if (!slide || !topic) {
        return NextResponse.json({ error: 'slide and topic are required' }, { status: 400 });
      }

      const manimCode = await generateManimCode(slide, topic, lang);
      return NextResponse.json({ manim_code: manimCode });
    }

    // Step: Send Manim code to Modal for rendering, return animation_url
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

    // Unknown step
    return NextResponse.json(
      { error: `Unknown step: ${step}. Use 'slides', 'tts_slide', 'tts_batch', 'lipsync', 'demo_content', 'bunny_ingest_batch', 'manim_code', or 'manim_render'.` },
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
