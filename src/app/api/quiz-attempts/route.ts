// POST /api/quiz-attempts
//
// Student answers a quiz slide. Server verifies the slide is actually
// a quiz, computes whether the answer is correct, persists to
// quiz_attempts, and returns { isCorrect, correctAnswer, explanation }.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Slide } from '@/types';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { videoId, slideNumber, selectedOption } = body as {
    videoId?: string;
    slideNumber?: number;
    selectedOption?: number;
  };

  if (!videoId || typeof slideNumber !== 'number' || typeof selectedOption !== 'number') {
    return NextResponse.json(
      { error: 'videoId, slideNumber, and selectedOption are required' },
      { status: 400 }
    );
  }
  if (selectedOption < 0 || selectedOption > 3) {
    return NextResponse.json({ error: 'selectedOption must be 0..3' }, { status: 400 });
  }

  const sb = await createClient();
  if (!sb) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Load slide data to validate + grade
  const { data: video, error: readErr } = await sb
    .from('videos')
    .select('slides_data')
    .eq('id', videoId)
    .maybeSingle();

  if (readErr) {
    return NextResponse.json({ error: readErr.message }, { status: 500 });
  }
  if (!video?.slides_data?.slides) {
    return NextResponse.json({ error: 'Video has no slides' }, { status: 404 });
  }

  const slide = (video.slides_data.slides as Slide[]).find((s) => s.slideNumber === slideNumber);
  if (!slide) {
    return NextResponse.json({ error: 'Slide not found' }, { status: 404 });
  }
  if (slide.slideType !== 'quiz' || !slide.quiz) {
    return NextResponse.json({ error: 'Slide is not a quiz' }, { status: 400 });
  }

  const correctAnswer = slide.quiz.correctAnswer;
  const isCorrect = selectedOption === correctAnswer;

  const { error: insertErr } = await sb.from('quiz_attempts').insert({
    video_id: videoId,
    slide_number: slideNumber,
    student_id: user.id,
    selected_option: selectedOption,
    is_correct: isCorrect,
  });

  if (insertErr) {
    // Don't fail the user-facing answer — log and still return the result
    console.error('[QuizAttempts] insert failed:', insertErr.message);
  }

  // Wrong answer → upsert into sr_items so the student reviews it later
  if (!isCorrect && slide.quiz) {
    await sb
      .from('sr_items')
      .upsert(
        {
          user_id: user.id,
          video_id: videoId,
          slide_number: slideNumber,
          question: slide.quiz.question,
          options: slide.quiz.options,
          correct_answer: slide.quiz.correctAnswer,
          explanation: slide.quiz.explanation || null,
          due_date: new Date().toISOString().split('T')[0],
          interval_days: 1,
          repetitions: 0,
        },
        { onConflict: 'user_id,video_id,slide_number', ignoreDuplicates: false }
      )
      .then(({ error }: { error: { message: string } | null }) => {
        if (error) console.error('[SR] upsert failed:', error.message);
      });
  }

  return NextResponse.json({
    isCorrect,
    correctAnswer,
    explanation: slide.quiz.explanation || null,
  });
}
