// GET /api/student/home
// Returns all data needed for the student home dashboard in one request:
//   - recently_watched: last 4 watched videos with titles
//   - recommended: up to 8 published videos matching student's grade
//   - pending_assignments: count of unwatched assignments
//   - sr_due_count: count of SR items due today

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await sb
    .from('profiles')
    .select('grade')
    .eq('id', user.id)
    .single();

  // Grade stored as "8. Sınıf" → extract number
  const gradeNum = profile?.grade?.replace('. Sınıf', '') ?? null;

  const [analyticsRes, srRes, assignmentsRes, videosRes] = await Promise.allSettled([
    // Recently watched (distinct video_ids, ordered by latest)
    sb
      .from('video_analytics')
      .select('video_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),

    // SR due count
    sb
      .from('sr_items')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .lte('due_date', new Date().toISOString().split('T')[0]),

    // Pending assignments (not yet watched)
    sb
      .from('assignments')
      .select('video_id, classroom_members!inner(student_id)')
      .eq('classroom_members.student_id', user.id),

    // Published videos (for recommendation)
    sb
      .from('videos')
      .select('id, title, subject, grade, thumbnail_url, duration, teacher_id, status')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  // Recently watched video IDs (deduped)
  const analyticsData = analyticsRes.status === 'fulfilled' ? (analyticsRes.value.data ?? []) : [];
  const seenVideoIds = [...new Set(analyticsData.map((a: any) => a.video_id as string))];
  const recentVideoIds = seenVideoIds.slice(0, 4);

  // Fetch video details for recently watched
  let recentlyWatched: any[] = [];
  if (recentVideoIds.length > 0) {
    const { data: rv } = await sb
      .from('videos')
      .select('id, title, subject, grade, thumbnail_url, teacher_id')
      .in('id', recentVideoIds)
      .eq('status', 'published');
    recentlyWatched = rv ?? [];
    // Preserve watch order
    recentlyWatched.sort((a, b) => recentVideoIds.indexOf(a.id) - recentVideoIds.indexOf(b.id));
  }

  // SR due count
  const srDueCount = srRes.status === 'fulfilled' ? (srRes.value.count ?? 0) : 0;

  // Pending assignments count (videos not yet watched)
  const allAssignments = assignmentsRes.status === 'fulfilled' ? (assignmentsRes.value.data ?? []) : [];
  const pendingAssignments = (allAssignments as any[]).filter(
    (a) => !seenVideoIds.includes(a.video_id)
  ).length;

  // Recommended: grade-matched videos not yet watched
  const allVideos = videosRes.status === 'fulfilled' ? (videosRes.value.data ?? []) : [];
  const recommended = (allVideos as any[])
    .filter((v) => !seenVideoIds.includes(v.id))
    .filter((v) => !gradeNum || v.grade === gradeNum)
    .slice(0, 8)
    .map((v) => ({
      id: v.id,
      title: v.title,
      subject: v.subject,
      grade: v.grade,
      thumbnailUrl: v.thumbnail_url,
      duration: v.duration,
      teacherId: v.teacher_id,
    }));

  return NextResponse.json({
    recentlyWatched,
    recommended,
    srDueCount,
    pendingAssignments,
  });
}
