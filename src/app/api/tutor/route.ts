// AI Tutor — slide-contextual Q&A using Gemini Flash.
//
// POST /api/tutor
//   { slideContext: {title,content,narrationText,bulletPoints},
//     conversationHistory: [{role,content}],
//     userMessage: string,
//     language?: 'tr' | 'en' }
// → { response: string }
//
// The slide's content is injected as a system-level context so Gemini only
// answers questions that are grounded in the current lesson material.

import { NextRequest, NextResponse } from 'next/server';
import { falRequest } from '@/lib/llm/fal-client';

interface TutorMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface SlideContext {
  title?: string;
  content?: string;
  narrationText?: string;
  bulletPoints?: string[];
}

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      slideContext,
      conversationHistory = [],
      userMessage,
      language = 'tr',
    } = body as {
      slideContext?: SlideContext;
      conversationHistory?: TutorMessage[];
      userMessage: string;
      language?: 'tr' | 'en';
    };

    if (!userMessage?.trim()) {
      return NextResponse.json({ error: 'userMessage is required' }, { status: 400 });
    }

    const isTR = language === 'tr';

    const contextBlock = slideContext
      ? [
          slideContext.title && `Slide title: ${slideContext.title}`,
          slideContext.content && `Slide content: ${slideContext.content}`,
          slideContext.bulletPoints?.length
            ? `Key points: ${slideContext.bulletPoints.join(' | ')}`
            : null,
          slideContext.narrationText &&
            `Teacher narration: ${slideContext.narrationText}`,
        ]
          .filter(Boolean)
          .join('\n')
      : '';

    const systemPrompt = isTR
      ? `Sen yardımcı bir AI öğretmen asistanısın. Aşağıdaki ders slaytını öğrenciye öğretmen gibi açıklıyorsun.

DERS SLAYT İÇERİĞİ:
${contextBlock || '(Slayt içeriği mevcut değil)'}

KURALLAR:
- Sadece bu slaytın konusuyla ilgili sorulara cevap ver.
- Türkçe yaz, samimi ve teşvik edici bir ton kullan.
- Cevaplar kısa ve net olsun (3-5 cümle max).
- Formüller için LaTeX notasyonu (\\(...\\) satır içi, \\[...\\] blok) kullan.
- Öğrencinin anlamadığı kavramı farklı bir örnekle açıkla.
- Konu dışı sorular için nazikçe slayta yönlendir.`
      : `You are a helpful AI tutor assistant. You are explaining the following lesson slide to a student.

SLIDE CONTENT:
${contextBlock || '(No slide content available)'}

RULES:
- Only answer questions related to this slide's topic.
- Be concise and encouraging (3-5 sentences max).
- Use LaTeX notation (\\(...\\) inline, \\[...\\] block) for formulas.
- Use different examples to clarify concepts the student didn't understand.
- For off-topic questions, gently redirect to the slide material.`;

    // Keep conversation history to last 6 turns (3 user + 3 assistant) to stay within context
    const recentHistory = conversationHistory.slice(-6);

    const messages = [
      { role: 'system', content: systemPrompt },
      ...recentHistory.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage },
    ];

    const response = await falRequest<{ output: string }>('fal-ai/any-llm', {
      model: 'google/gemini-2.5-flash',
      messages,
      max_tokens: 400,
      temperature: 0.6,
    });

    const text = response.output?.trim() || (isTR ? 'Üzgünüm, bir yanıt oluşturamadım.' : 'Sorry, I could not generate a response.');
    return NextResponse.json({ response: text });
  } catch (error) {
    console.error('[Tutor] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'AI tutor request failed' },
      { status: 500 }
    );
  }
}
