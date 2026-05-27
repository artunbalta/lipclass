// GET  /api/assignments?classroom_id=...  — list assignments
//   teacher → assignments they created (optionally filtered by classroom)
//   student → assignments in classrooms they belong to
// POST /api/assignments  — create assignment (teacher)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const classroomId = searchParams.get('classroom_id');

  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).single();

  if (profile?.role === 'teacher') {
    let query = sb
      .from('assignments')
      .select('*, videos(id, title, subject, grade, thumbnailUrl:thumbnail_url, duration, status), classrooms(id, name)')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    if (classroomId) query = query.eq('classroom_id', classroomId);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ assignments: data ?? [] });
  }

  // student: get classrooms they belong to, then assignments for those classrooms
  const { data: memberships } = await sb
    .from('classroom_members')
    .select('classroom_id')
    .eq('student_id', user.id);

  const classroomIds = (memberships ?? []).map((m: any) => m.classroom_id);
  if (classroomIds.length === 0) return NextResponse.json({ assignments: [] });

  const { data, error } = await sb
    .from('assignments')
    .select('*, videos(id, title, subject, grade, thumbnailUrl:thumbnail_url, duration, status), classrooms(id, name)')
    .in('classroom_id', classroomIds)
    .order('deadline', { ascending: true, nullsFirst: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Attach completion status from video_analytics
  const videoIds = (data ?? []).map((a: any) => a.video_id);
  const { data: watched } = videoIds.length > 0
    ? await sb.from('video_analytics').select('video_id').eq('user_id', user.id).in('video_id', videoIds)
    : { data: [] };
  const watchedSet = new Set((watched ?? []).map((w: any) => w.video_id));

  return NextResponse.json({
    assignments: (data ?? []).map((a: any) => ({ ...a, completed: watchedSet.has(a.video_id) })),
  });
}

export async function POST(request: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const { classroom_id, video_id, title, deadline } = body ?? {};
  if (!classroom_id || !video_id) {
    return NextResponse.json({ error: 'classroom_id and video_id required' }, { status: 400 });
  }

  // Verify teacher owns classroom
  const { data: cls } = await sb.from('classrooms').select('id').eq('id', classroom_id).eq('teacher_id', user.id).single();
  if (!cls) return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });

  const { data, error } = await sb
    .from('assignments')
    .upsert({
      classroom_id,
      video_id,
      title: title ?? null,
      deadline: deadline ?? null,
      created_by: user.id,
    }, { onConflict: 'classroom_id,video_id' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify all students in classroom (non-fatal)
  try {
    const { data: members } = await sb
      .from('classroom_members')
      .select('student_id')
      .eq('classroom_id', classroom_id);

    const { data: vid } = await sb.from('videos').select('title').eq('id', video_id).single();
    const videoTitle = vid?.title ?? 'Yeni video';
    const deadlineStr = deadline ? ` (Son tarih: ${new Date(deadline).toLocaleDateString('tr-TR')})` : '';

    if (members && members.length > 0) {
      await sb.from('notifications').insert(
        members.map((m: any) => ({
          user_id: m.student_id,
          type: 'assignment',
          title: 'Yeni ödev atandı',
          body: `${videoTitle}${deadlineStr}`,
          link: '/dashboard/student/assignments',
        }))
      );
    }
  } catch { /* non-fatal */ }

  return NextResponse.json({ assignment: data }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await sb.from('assignments').delete().eq('id', id).eq('created_by', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
