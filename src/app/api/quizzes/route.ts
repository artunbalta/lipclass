import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase is not configured');
  return createClient(url, key);
}

// ── GET: List quizzes ───────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');
    const status = searchParams.get('status');
    const subject = searchParams.get('subject');
    const grade = searchParams.get('grade');
    const published = searchParams.get('published'); // 'true' for student browsing

    const supabase = getSupabaseAdmin();

    let query = supabase.from('quizzes').select('*');

    if (published === 'true') {
      // Student browsing: only published quizzes
      query = query.eq('status', 'published');
    } else if (teacherId) {
      // Teacher's own quizzes
      query = query.eq('teacher_id', teacherId);
    } else {
      return NextResponse.json(
        { error: 'teacherId or published=true is required' },
        { status: 400 }
      );
    }

    if (status) query = query.eq('status', status);
    if (subject) query = query.eq('subject', subject);
    if (grade) query = query.eq('grade', grade);

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    // For published quizzes, join teacher name
    if (published === 'true' && data) {
      const teacherIds = [...new Set(data.map((q) => q.teacher_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', teacherIds);

      const nameMap = new Map(profiles?.map((p) => [p.id, p.name]) || []);
      for (const quiz of data) {
        (quiz as Record<string, unknown>).teacher_name = nameMap.get(quiz.teacher_id) || '';
      }
    }

    return NextResponse.json({ quizzes: data || [] });
  } catch (error) {
    console.error('[Quizzes] List error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'List failed' },
      { status: 500 }
    );
  }
}

// ── POST: Create quiz ───────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      teacherId,
      title,
      description,
      subject,
      grade,
      topic,
      difficulty = 'medium',
      questionType = 'mixed',
      language = 'tr',
      numQuestions = 15,
      sourceType = 'upload',
      documentId,
      sourceText,
      uploadedFilePath,
      uploadedFileName,
      summary,
      questionsData,
      status = 'draft',
    } = body;

    if (!teacherId || !title || !subject || !grade) {
      return NextResponse.json(
        { error: 'teacherId, title, subject, and grade are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: quiz, error } = await supabase
      .from('quizzes')
      .insert({
        teacher_id: teacherId,
        title,
        description: description || null,
        subject,
        grade,
        topic: topic || null,
        difficulty,
        question_type: questionType,
        language,
        num_questions: numQuestions,
        source_type: sourceType,
        document_id: documentId || null,
        source_text: sourceText || null,
        uploaded_file_path: uploadedFilePath || null,
        uploaded_file_name: uploadedFileName || null,
        summary: summary || null,
        questions_data: questionsData || null,
        status,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ quiz });
  } catch (error) {
    console.error('[Quizzes] Create error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Create failed' },
      { status: 500 }
    );
  }
}

// ── PATCH: Update quiz ──────────────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { quizId, ...updates } = body;

    if (!quizId) {
      return NextResponse.json(
        { error: 'quizId is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Map camelCase to snake_case for DB columns
    const dbUpdates: Record<string, unknown> = {};
    const fieldMap: Record<string, string> = {
      title: 'title',
      description: 'description',
      status: 'status',
      summary: 'summary',
      questionsData: 'questions_data',
      errorMessage: 'error_message',
      numQuestions: 'num_questions',
    };

    for (const [key, value] of Object.entries(updates)) {
      const dbKey = fieldMap[key] || key;
      dbUpdates[dbKey] = value;
    }

    const { data: quiz, error } = await supabase
      .from('quizzes')
      .update(dbUpdates)
      .eq('id', quizId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ quiz });
  } catch (error) {
    console.error('[Quizzes] Update error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Update failed' },
      { status: 500 }
    );
  }
}

// ── DELETE: Remove quiz ─────────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const quizId = searchParams.get('quizId');

    if (!quizId) {
      return NextResponse.json(
        { error: 'quizId query parameter is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Get quiz to clean up uploaded file
    const { data: quiz } = await supabase
      .from('quizzes')
      .select('uploaded_file_path')
      .eq('id', quizId)
      .single();

    // Delete uploaded file from storage if present
    if (quiz?.uploaded_file_path) {
      await supabase.storage
        .from('quiz-documents')
        .remove([quiz.uploaded_file_path]);
    }

    // Delete quiz (cascades to quiz_attempts)
    const { error } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', quizId);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Quizzes] Delete error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Delete failed' },
      { status: 500 }
    );
  }
}
