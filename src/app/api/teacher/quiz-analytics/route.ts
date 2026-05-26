// GET /api/teacher/quiz-analytics?videoId=...
//
// Returns per-quiz-slide stats for the teacher's video:
//   { slides: [ { slideNumber, question, totalAttempts, correctCount, correctRate, optionCounts: [n,n,n,n] } ] }
//
// Auth: only the video's owning teacher can read.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Slide } from '@/types';

interface AttemptRow {
  slide_number: number;
  selected_option: number;
  is_correct: boolean;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');

  if (!videoId) {
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

  const { data: video, error: readErr } = await sb
    .from('videos')
    .select('teacher_id, slides_data')
    .eq('id', videoId)
    .maybeSingle();

  if (readErr) {
    return NextResponse.json({ error: readErr.message }, { status: 500 });
  }
  if (!video) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  }
  if (video.teacher_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const quizSlides = (video.slides_data?.slides || []).filter(
    (s: Slide) => s.slideType === 'quiz' && s.quiz
  );

  if (quizSlides.length === 0) {
    return NextResponse.json({ slides: [] });
  }

  const { data: attempts, error: attemptsErr } = await sb
    .from('quiz_attempts')
    .select('slide_number, selected_option, is_correct')
    .eq('video_id', videoId);

  if (attemptsErr) {
    console.error('[QuizAnalytics] attempts read failed:', attemptsErr.message);
    return NextResponse.json({ error: attemptsErr.message }, { status: 500 });
  }

  const stats = quizSlides.map((s: Slide) => {
    const own = (attempts as AttemptRow[] | null || []).filter((a) => a.slide_number === s.slideNumber);
    const total = own.length;
    const correct = own.filter((a) => a.is_correct).length;
    const optionCounts: [number, number, number, number] = [0, 0, 0, 0];
    for (const a of own) {
      if (a.selected_option >= 0 && a.selected_option < 4) {
        optionCounts[a.selected_option as 0 | 1 | 2 | 3]++;
      }
    }
    return {
      slideNumber: s.slideNumber,
      question: s.quiz!.question,
      correctAnswer: s.quiz!.correctAnswer,
      options: s.quiz!.options,
      totalAttempts: total,
      correctCount: correct,
      correctRate: total > 0 ? Math.round((correct / total) * 100) : 0,
      optionCounts,
    };
  });

  return NextResponse.json({ slides: stats });
}
