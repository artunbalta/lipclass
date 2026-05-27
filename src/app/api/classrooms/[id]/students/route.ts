// GET /api/classrooms/[id]/students
// Teacher gets student list with per-student watch + quiz stats.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify teacher owns this classroom
  const { data: cls } = await sb.from('classrooms').select('id').eq('id', id).eq('teacher_id', user.id).single();
  if (!cls) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Members with profile info
  const { data: members } = await sb
    .from('classroom_members')
    .select('student_id, joined_at, profiles(id, name, email, avatar)')
    .eq('classroom_id', id);

  if (!members || members.length === 0) return NextResponse.json({ students: [] });

  const studentIds = members.map((m: any) => m.student_id);

  // Videos watched per student
  const { data: analytics } = await sb
    .from('video_analytics')
    .select('user_id, video_id')
    .in('user_id', studentIds);

  // Quiz attempts per student
  const { data: quizAttempts } = await sb
    .from('quiz_attempts')
    .select('user_id, is_correct')
    .in('user_id', studentIds);

  const students = members.map((m: any) => {
    const prof = m.profiles as { id: string; name: string; email: string; avatar?: string };
    const watchedCount = new Set((analytics ?? []).filter((a: any) => a.user_id === m.student_id).map((a: any) => a.video_id)).size;
    const attempts = (quizAttempts ?? []).filter((q: any) => q.user_id === m.student_id);
    const correctCount = attempts.filter((q: any) => q.is_correct).length;
    const quizScore = attempts.length > 0 ? Math.round((correctCount / attempts.length) * 100) : null;
    return {
      id: prof.id,
      name: prof.name,
      email: prof.email,
      avatar: prof.avatar,
      joinedAt: m.joined_at,
      watchedVideos: watchedCount,
      quizAttempts: attempts.length,
      quizScore,
    };
  });

  return NextResponse.json({ students });
}
