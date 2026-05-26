// LLM prompt builders for slide generation.
//
// IMPORTANT: The prompt text below has been moved out of route.ts byte-for-byte.
// Do NOT casually edit the strings — they are tuned and produce the current
// working slide output. Change only when intentionally adjusting model behavior.

export type SlideLanguage = 'tr' | 'en';
export type SlideTone = 'formal' | 'friendly' | 'energetic';

const TONE_LABELS: Record<SlideLanguage, Record<SlideTone, string>> = {
  tr: { formal: 'Resmi ve profesyonel', friendly: 'Samimi ve sıcak', energetic: 'Enerjik ve dinamik' },
  en: { formal: 'Formal and professional', friendly: 'Warm and friendly', energetic: 'Energetic and dynamic' },
};

const BT = '`';
const MERMAID_CODE_OPEN = BT + BT + BT + 'mermaid';
const MERMAID_CODE_CLOSE = BT + BT + BT;

function mermaidInstructionFor(language: SlideLanguage): string {
  return language === 'tr'
    ? '\n\nDİYAGRAM KURALLARI:\nUygun yerlerde konuyu görselleştiren Mermaid diyagramları üret. Diyagramları content alanına şu formatta ekle:\n' + MERMAID_CODE_OPEN + '\nflowchart TD\n    A[Başlangıç] --> B[Sonuç]\n' + MERMAID_CODE_CLOSE + '\nDesteklenen tipler: flowchart, sequenceDiagram, pie, graph. Her sunumda en az 1-2 slaytın diyagram içermesi tercih edilir. Diyagramlar konuyu anlamayı kolaylaştırmalı (süreç akışları, kavram ilişkileri, karar ağaçları vb.).'
    : '\n\nDIAGRAM RULES:\nGenerate Mermaid diagrams where appropriate to visualize the topic. Add diagrams in the content field using this format:\n' + MERMAID_CODE_OPEN + '\nflowchart TD\n    A[Start] --> B[Result]\n' + MERMAID_CODE_CLOSE + '\nSupported types: flowchart, sequenceDiagram, pie, graph. At least 1-2 slides should contain diagrams. Diagrams should help understand the topic (process flows, concept relationships, decision trees, etc.).';
}

export interface FullSlidesPromptOpts {
  language: SlideLanguage;
  tone: SlideTone;
  description: string;
  includesProblemSolving: boolean;
  problemCount?: number;
  difficulty?: string;
  ragContext?: string;
  sourceOnly?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Full 10-slides system prompt — 3 modes × 2 languages
// ─────────────────────────────────────────────────────────────────────────────

export function buildFullSlidesSystemPrompt(opts: FullSlidesPromptOpts): string {
  const { language, tone, description, includesProblemSolving, problemCount, difficulty, ragContext, sourceOnly } = opts;

  const toneLabel = TONE_LABELS[language][tone];

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

  const mermaidInstruction = mermaidInstructionFor(language);

  const ragSection = ragContext
    ? (language === 'tr'
      ? `\n\nÖĞRETMENİN KAYNAKLARI:\n${ragContext}`
      : `\n\nTEACHER'S SOURCE MATERIALS:\n${ragContext}`)
    : '';

  if (sourceOnly && ragContext) {
    // ══ RAG-ONLY MODE ══
    return language === 'tr'
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
    // ══ HYBRID MODE ══
    return language === 'tr'
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
  }

  // ══ ORIGINAL MODE (no RAG) ══
  return language === 'tr'
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

export function buildFullSlidesUserPrompt(opts: {
  language: SlideLanguage;
  topic: string;
  description: string;
  prompt: string;
}): string {
  const { language, topic, description, prompt } = opts;
  return language === 'tr'
    ? `Konu: ${topic}\n\nAçıklama ve öğretmen notları: ${description}${prompt ? `\n\nEk talimatlar: ${prompt}` : ''}`
    : `Topic: ${topic}\n\nDescription and teacher notes: ${description}${prompt ? `\n\nAdditional instructions: ${prompt}` : ''}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Single-slide regen prompts
// ─────────────────────────────────────────────────────────────────────────────

export interface SingleSlidePromptOpts {
  language: SlideLanguage;
  tone: SlideTone;
  slideNumber: number;
  totalSlides: number;
}

export function buildSingleSlideSystemPrompt(opts: SingleSlidePromptOpts): string {
  const { language, tone, slideNumber, totalSlides } = opts;
  const toneLabel = TONE_LABELS[language][tone];

  return language === 'tr'
    ? `Sen deneyimli bir öğretmensin. SADECE ${slideNumber}. slaytı yeniden üret (toplam ${totalSlides} slayt var).

KRİTİK KURALLAR:
1. Formül ve görsel ağırlıklı içerik. Uzun düz cümleler yerine formüller, denklemler, adım adım çözümler.
2. content alanında en az 2-3 KaTeX formül/denklem olsun.
3. KaTeX backslash'leri ÇİFT: \\\\frac, \\\\sqrt, \\\\int, \\\\sum, \\\\alpha, \\\\beta vb.
4. Inline: $...$, Blok: $$...$$
5. Sol alt köşeye yakın metin yazma (öğretmen video overlay'i orada).
6. Uygunsa Mermaid diyagram ekle:
${MERMAID_CODE_OPEN}
flowchart TD
    A[Başlangıç] --> B[Sonuç]
${MERMAID_CODE_CLOSE}

Slayt yapısı içeriği:
- title: kısa, net başlık
- content: ana içerik (formül ağırlıklı), satır atlamak için \\n
- bulletPoints: 3-5 kısa madde
- narrationText: 60-100 kelime sözlü anlatım. ASLA LaTeX/dolar işareti yok. Formülleri okunuşuyla yaz ("F eşittir m çarpı a"). Selamlama/veda yok.

Ton: ${toneLabel}

SADECE geçerli JSON döndür:
{"slide": {"slideNumber": ${slideNumber}, "title": "...", "content": "...", "bulletPoints": ["..."], "narrationText": "..."}}`
    : `You are an experienced teacher. Regenerate ONLY slide ${slideNumber} (of ${totalSlides}).

CRITICAL RULES:
1. Formula and visual-heavy content. Use formulas, equations, step-by-step solutions.
2. content must contain at least 2-3 KaTeX formulas.
3. KaTeX double backslashes: \\\\frac, \\\\sqrt, etc.
4. Inline: $...$, Block: $$...$$
5. Do NOT place text near the bottom-left (teacher video overlay there).
6. Add Mermaid diagram when appropriate:
${MERMAID_CODE_OPEN}
flowchart TD
    A[Start] --> B[Result]
${MERMAID_CODE_CLOSE}

Slide structure:
- title: short, clear
- content: main content (formula-heavy), use \\n for line breaks
- bulletPoints: 3-5 short items
- narrationText: 60-100 spoken words. NO LaTeX/dollar signs. Spell formulas out ("F equals m times a"). No greetings/farewells.

Tone: ${toneLabel}

Return ONLY valid JSON:
{"slide": {"slideNumber": ${slideNumber}, "title": "...", "content": "...", "bulletPoints": ["..."], "narrationText": "..."}}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Quiz generation prompts
// ─────────────────────────────────────────────────────────────────────────────

export interface QuizPromptOpts {
  language: SlideLanguage;
  topic: string;
  sourceSlide?: {
    title: string;
    content: string;
    bulletPoints: string[];
  };
  difficulty?: 'easy' | 'medium' | 'hard';
}

export function buildQuizSystemPrompt(language: SlideLanguage): string {
  return language === 'tr'
    ? `Sen deneyimli bir öğretmensin. Verilen konu / slayt için 4 şıklı çoktan seçmeli TEK bir soru üret.

KURALLAR:
1. Soru net, tek bir doğru cevabı olan, müfredat seviyesine uygun olsun.
2. 4 şık ver. Yanlış şıklar makul ama açıkça yanlış olsun (rastgele değil).
3. correctAnswer 0-3 arası bir index (0 = ilk şık).
4. KaTeX formülleri kullanabilirsin ($...$ inline). Backslash'leri ÇİFT yaz: \\\\frac, \\\\sqrt vb.
5. explanation: cevabın neden doğru olduğunu kısa açıkla (1-2 cümle).
6. Selamlama/kapanış YOK.

SADECE geçerli JSON döndür:
{"quiz": {"question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": 0, "explanation": "..."}}`
    : `You are an experienced teacher. Generate ONE 4-option multiple-choice question for the given topic/slide.

RULES:
1. Question is clear, has a single correct answer, appropriate for the curriculum level.
2. Provide exactly 4 options. Wrong options should be plausible but clearly wrong (not random).
3. correctAnswer is an integer 0-3 (0 = first option).
4. You may use KaTeX formulas ($...$ inline). DOUBLE the backslashes: \\\\frac, \\\\sqrt, etc.
5. explanation: 1-2 sentences explaining why the answer is correct.
6. No greetings or closings.

Return ONLY valid JSON:
{"quiz": {"question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": 0, "explanation": "..."}}`;
}

export function buildQuizUserPrompt(opts: QuizPromptOpts): string {
  const { language, topic, sourceSlide, difficulty } = opts;
  const diffLabel = difficulty || 'medium';

  const slideContext = sourceSlide
    ? language === 'tr'
      ? `\n\nKaynak slayt:\nBaşlık: ${sourceSlide.title}\nİçerik: ${sourceSlide.content.slice(0, 600)}\nMaddeler: ${sourceSlide.bulletPoints.join(' • ')}`
      : `\n\nSource slide:\nTitle: ${sourceSlide.title}\nContent: ${sourceSlide.content.slice(0, 600)}\nBullets: ${sourceSlide.bulletPoints.join(' • ')}`
    : '';

  return language === 'tr'
    ? `Konu: ${topic}\nZorluk: ${diffLabel}${slideContext}\n\nBu konu için 4 şıklı bir soru üret.`
    : `Topic: ${topic}\nDifficulty: ${diffLabel}${slideContext}\n\nGenerate a 4-option question for this topic.`;
}

export function buildSingleSlideUserPrompt(opts: {
  language: SlideLanguage;
  topic: string;
  description?: string;
  slideNumber: number;
  siblingTitles: string[];
  currentSlide: { title: string; content: string; bulletPoints: string[]; narrationText: string };
  feedback?: string;
}): string {
  const { language, topic, description, slideNumber, siblingTitles, currentSlide, feedback } = opts;

  const siblingList = siblingTitles
    .map((t, i) => `  ${i + 1}. ${t}${i + 1 === slideNumber ? '   ← bu slayt' : ''}`)
    .join('\n');

  return language === 'tr'
    ? `Ders konusu: ${topic}
${description ? `Ders açıklaması: ${description}\n` : ''}
Tüm slayt başlıkları (akışı koru):
${siblingList}

Mevcut ${slideNumber}. slayt (referans — bunu iyileştir):
Başlık: ${currentSlide.title}
İçerik: ${currentSlide.content.slice(0, 600)}
Maddeler: ${currentSlide.bulletPoints.join(' • ')}
Anlatım: ${currentSlide.narrationText.slice(0, 400)}
${feedback ? `\nÖğretmen geri bildirimi: ${feedback}` : ''}

${slideNumber}. slaytı şimdi yeniden üret:`
    : `Lesson topic: ${topic}
${description ? `Lesson description: ${description}\n` : ''}
All slide titles (preserve flow):
${siblingList}

Current slide ${slideNumber} (reference — improve on this):
Title: ${currentSlide.title}
Content: ${currentSlide.content.slice(0, 600)}
Bullets: ${currentSlide.bulletPoints.join(' • ')}
Narration: ${currentSlide.narrationText.slice(0, 400)}
${feedback ? `\nTeacher feedback: ${feedback}` : ''}

Regenerate slide ${slideNumber} now:`;
}
