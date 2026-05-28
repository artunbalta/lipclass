// POST /api/videos/[id]/derive
//
// Creates a derivative of the parent video — same slide structure (titles,
// content, bullets, quiz) but with its own (potentially translated) narration,
// language, tone, and variant label. Media URLs (audio, lipsync, animation)
// are intentionally NOT copied — the derivative goes through its own finalize
// pipeline.
//
// Body params:
//   { language: 'tr'|'en', tone: 'formal'|'friendly'|'energetic',
//     variantLabel: string,
//     translateNarration?: boolean }
//
// When translateNarration=true AND the target language differs from the
// parent's, every slide is sent through the LLM translator (per-slide,
// concurrency-limited). KaTeX, Mermaid, units, and variable names are
// preserved verbatim. Quiz options keep their order so correctAnswer is
// still valid. See src/lib/llm/translate.ts for details.
//
// Auth: only the parent video's owner can derive from it.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { translateSlides, type TranslationLanguage } from '@/lib/llm/translate';
import type { Slide } from '@/types';

export const maxDuration = 180; // up to 10 slides × ~5-10s translate each

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: parentId } = await context.params;
  if (!parentId) {
    return NextResponse.json({ error: 'videoId required' }, { status: 400 });
  }

  const sb = await createClient();
  if (!sb) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const language = (body.language as 'tr' | 'en') || 'tr';
  const tone = (body.tone as 'formal' | 'friendly' | 'energetic') || 'friendly';
  const variantLabel: string = (body.variantLabel || '').toString().trim();
  const translateNarration: boolean = body.translateNarration === true;

  if (!variantLabel) {
    return NextResponse.json({ error: 'variantLabel is required' }, { status: 400 });
  }
  if (!['tr', 'en'].includes(language)) {
    return NextResponse.json({ error: 'language must be tr or en' }, { status: 400 });
  }
  if (!['formal', 'friendly', 'energetic'].includes(tone)) {
    return NextResponse.json({ error: 'tone invalid' }, { status: 400 });
  }

  // Load parent
  const { data: parent, error: readErr } = await sb
    .from('videos')
    .select('*')
    .eq('id', parentId)
    .maybeSingle();

  if (readErr) {
    return NextResponse.json({ error: readErr.message }, { status: 500 });
  }
  if (!parent) {
    return NextResponse.json({ error: 'Parent video not found' }, { status: 404 });
  }
  if (parent.teacher_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!parent.slides_data || !Array.isArray(parent.slides_data.slides) || parent.slides_data.slides.length === 0) {
    return NextResponse.json({ error: 'Parent has no slides yet' }, { status: 400 });
  }

  // Copy slides but strip media URLs and dirty flags — derivative needs its
  // own TTS/lipsync. Quiz slides keep their question/options/correctAnswer.
  const copiedSlides: Slide[] = parent.slides_data.slides.map((s: Slide) => {
    const copy: Slide = {
      slideNumber: s.slideNumber,
      title: s.title,
      content: s.content,
      bulletPoints: [...(s.bulletPoints || [])],
      narrationText: s.narrationText,
      intent: s.intent,
      visualHint: s.visualHint,
    };
    if (s.slideType === 'quiz' && s.quiz) {
      copy.slideType = 'quiz';
      copy.quiz = { ...s.quiz, options: [...s.quiz.options] as [string, string, string, string] };
    }
    return copy;
  });

  // Translate slides when the target language differs from the parent and
  // the caller explicitly asked for it. This is the expensive step (~10s ×
  // slide count parallel) so it gates on the flag.
  const parentLanguage = (parent.language as TranslationLanguage | null) ?? 'tr';
  const needsTranslation =
    translateNarration && language !== parentLanguage;

  const finalSlides: Slide[] = needsTranslation
    ? await translateSlides(copiedSlides, language as TranslationLanguage)
    : copiedSlides;

  // Build a derivative title that's distinguishable. We also translate the
  // title itself when translation was requested — using a thin prompt would
  // be overkill for ~5 words, so just keep the parent title + variantLabel
  // and rely on the slide-1 title (which IS translated) to convey the topic.
  const baseTitle: string = parent.title || 'Ders';
  const derivedTitle = `${baseTitle} — ${variantLabel}`.slice(0, 200);

  // Insert derivative row in 'slides_ready' state (skip the LLM, slides already present)
  const { data: inserted, error: insertErr } = await sb
    .from('videos')
    .insert({
      teacher_id: user.id,
      title: derivedTitle,
      description: parent.description,
      subject: parent.subject,
      grade: parent.grade,
      topic: parent.topic,
      thumbnail_url: parent.thumbnail_url,
      video_url: null,
      duration: null,
      status: 'slides_ready',
      prompt: parent.prompt,
      tone,
      includes_problem_solving: parent.includes_problem_solving,
      problem_count: parent.problem_count,
      difficulty: parent.difficulty,
      estimated_duration: parent.estimated_duration,
      language,
      slides_data: { slides: finalSlides },
      parent_video_id: parentId,
      variant_label: variantLabel,
      curriculum_codes: parent.curriculum_codes || [],
    })
    .select('id')
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({
    videoId: inserted.id,
    parentVideoId: parentId,
    variantLabel,
    language,
    tone,
    translated: needsTranslation,
    message: needsTranslation
      ? 'Derivative created and translated — open the editor to review and finalize.'
      : 'Derivative created in slides_ready state — open the editor to review and finalize.',
  });
}
