import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase is not configured');
  return createClient(url, key);
}

// ── POST: Submit quiz attempt ───────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { quizId, studentId, answers, timeSpent } = body;

    if (!quizId || !studentId || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: 'quizId, studentId, and answers are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Fetch quiz to auto-score
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('questions_data')
      .eq('id', quizId)
      .single();

    if (quizError || !quiz?.questions_data) {
      return NextResponse.json(
        { error: 'Quiz not found or has no questions' },
        { status: 404 }
      );
    }

    const questions = quiz.questions_data as Array<{
      correctAnswer: number;
    }>;

    // Score the answers
    const scoredAnswers = answers.map(
      (answer: { questionIndex: number; selectedAnswer: number }) => ({
        questionIndex: answer.questionIndex,
        selectedAnswer: answer.selectedAnswer,
        isCorrect:
          questions[answer.questionIndex]?.correctAnswer === answer.selectedAnswer,
      })
    );

    const score = scoredAnswers.filter(
      (a: { isCorrect: boolean }) => a.isCorrect
    ).length;

    // Insert attempt
    const { data: attempt, error: insertError } = await supabase
      .from('quiz_attempts')
      .insert({
        quiz_id: quizId,
        student_id: studentId,
        answers: scoredAnswers,
        score,
        total_questions: questions.length,
        time_spent: timeSpent || null,
      })
      .select()
      .single();

    if (insertError) throw new Error(insertError.message);

    return NextResponse.json({ attempt });
  } catch (error) {
    console.error('[Quiz Attempts] Submit error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Submit failed' },
      { status: 500 }
    );
  }
}

// ── GET: List attempts ──────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const quizId = searchParams.get('quizId');
    const studentId = searchParams.get('studentId');

    const supabase = getSupabaseAdmin();

    let query = supabase.from('quiz_attempts').select('*');

    if (quizId) query = query.eq('quiz_id', quizId);
    if (studentId) query = query.eq('student_id', studentId);

    if (!quizId && !studentId) {
      return NextResponse.json(
        { error: 'quizId or studentId is required' },
        { status: 400 }
      );
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    return NextResponse.json({ attempts: data || [] });
  } catch (error) {
    console.error('[Quiz Attempts] List error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'List failed' },
      { status: 500 }
    );
  }
}
