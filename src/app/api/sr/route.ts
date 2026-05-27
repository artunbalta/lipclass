// Spaced Repetition API — SM-2 scheduling.
//
// GET  /api/sr?action=due          → { items: SrItem[] }
// GET  /api/sr?action=difficulty   → { suggestedDifficulty, successRate, totalAttempts }
// POST /api/sr                     → upsert an sr_item (called on wrong quiz answer)
// POST /api/sr?action=review       → record review quality, update SM-2 state

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export interface SrItem {
  id: string;
  userId: string;
  videoId: string;
  slideNumber: number;
  question: string;
  options: [string, string, string, string];
  correctAnswer: 0 | 1 | 2 | 3;
  explanation?: string;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  dueDate: string; // ISO date string
  lastReviewedAt?: string;
}

// SM-2 algorithm
function sm2(
  easeFactor: number,
  interval: number,
  repetitions: number,
  quality: number // 1=wrong, 3=hard, 5=easy
): { easeFactor: number; intervalDays: number; repetitions: number; dueDate: string } {
  let newEF = easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  newEF = Math.max(1.3, newEF);

  let newInterval: number;
  let newRep: number;

  if (quality >= 3) {
    if (repetitions === 0) newInterval = 1;
    else if (repetitions === 1) newInterval = 6;
    else newInterval = Math.round(interval * easeFactor);
    newRep = repetitions + 1;
  } else {
    newInterval = 1;
    newRep = 0;
    newEF = easeFactor; // EF stays the same on failure (reset repetitions only)
  }

  const due = new Date();
  due.setDate(due.getDate() + newInterval);

  return {
    easeFactor: newEF,
    intervalDays: newInterval,
    repetitions: newRep,
    dueDate: due.toISOString().split('T')[0],
  };
}

export async function GET(request: NextRequest) {
  const sb = await createClient();
  if (!sb) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const action = request.nextUrl.searchParams.get('action') || 'due';

  // ── due items (for review page) ────────────────────────────────────────────
  if (action === 'due') {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await sb
      .from('sr_items')
      .select('*')
      .eq('user_id', user.id)
      .lte('due_date', today)
      .order('due_date', { ascending: true })
      .limit(50);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const items: SrItem[] = (data || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      videoId: row.video_id,
      slideNumber: row.slide_number,
      question: row.question,
      options: row.options as [string, string, string, string],
      correctAnswer: row.correct_answer as 0 | 1 | 2 | 3,
      explanation: row.explanation || undefined,
      easeFactor: row.ease_factor,
      intervalDays: row.interval_days,
      repetitions: row.repetitions,
      dueDate: row.due_date,
      lastReviewedAt: row.last_reviewed_at || undefined,
    }));

    return NextResponse.json({ items, total: items.length });
  }

  // ── difficulty suggestion (adaptive quiz) ─────────────────────────────────
  if (action === 'difficulty') {
    const { data, error } = await sb
      .from('quiz_attempts')
      .select('is_correct')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const attempts = data || [];
    const totalAttempts = attempts.length;

    if (totalAttempts < 5) {
      return NextResponse.json({
        suggestedDifficulty: 'medium',
        successRate: null,
        totalAttempts,
        note: 'insufficient_data',
      });
    }

    const correctCount = attempts.filter((a: any) => a.is_correct).length;
    const successRate = correctCount / totalAttempts;

    let suggestedDifficulty: 'easy' | 'medium' | 'hard';
    if (successRate >= 0.8) suggestedDifficulty = 'hard';
    else if (successRate < 0.5) suggestedDifficulty = 'easy';
    else suggestedDifficulty = 'medium';

    return NextResponse.json({ suggestedDifficulty, successRate, totalAttempts });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const sb = await createClient();
  if (!sb) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const action = request.nextUrl.searchParams.get('action');

  // ── record review + SM-2 update ───────────────────────────────────────────
  if (action === 'review') {
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

    const { id, quality } = body as { id: string; quality: 1 | 3 | 5 };
    if (!id || ![1, 3, 5].includes(quality)) {
      return NextResponse.json({ error: 'id and quality (1|3|5) are required' }, { status: 400 });
    }

    const { data: item, error: fetchErr } = await sb
      .from('sr_items')
      .select('ease_factor, interval_days, repetitions')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchErr || !item) {
      return NextResponse.json({ error: 'SR item not found' }, { status: 404 });
    }

    const result = sm2(item.ease_factor, item.interval_days, item.repetitions, quality);

    const { error: updateErr } = await sb
      .from('sr_items')
      .update({
        ease_factor: result.easeFactor,
        interval_days: result.intervalDays,
        repetitions: result.repetitions,
        due_date: result.dueDate,
        last_reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id);

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    return NextResponse.json({
      newInterval: result.intervalDays,
      newDueDate: result.dueDate,
      easeFactor: result.easeFactor,
    });
  }

  // ── upsert new SR item ────────────────────────────────────────────────────
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const { videoId, slideNumber, question, options, correctAnswer, explanation } = body as {
    videoId: string;
    slideNumber: number;
    question: string;
    options: string[];
    correctAnswer: number;
    explanation?: string;
  };

  if (!videoId || typeof slideNumber !== 'number' || !question || !options) {
    return NextResponse.json({ error: 'videoId, slideNumber, question, options are required' }, { status: 400 });
  }

  const { data, error } = await sb
    .from('sr_items')
    .upsert(
      {
        user_id: user.id,
        video_id: videoId,
        slide_number: slideNumber,
        question,
        options,
        correct_answer: correctAnswer,
        explanation: explanation || null,
        // Reset to "due today" so the student reviews it soon
        due_date: new Date().toISOString().split('T')[0],
        interval_days: 1,
        repetitions: 0,
      },
      { onConflict: 'user_id,video_id,slide_number', ignoreDuplicates: false }
    )
    .select('id, due_date')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ id: data.id, dueDate: data.due_date });
}
