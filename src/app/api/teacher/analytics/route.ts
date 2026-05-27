// GET /api/teacher/analytics?range=week|month|year
//
// Real analytics aggregated from video_analytics + quiz_attempts for the
// authenticated teacher's videos. Replaces the mock data on the analytics
// dashboard.
//
// Response shape (see TeacherAnalyticsResponse in the UI):
//   {
//     range: 'week' | 'month' | 'year',
//     totals: { totalViews, totalVideos, studentCount, completionRate,
//               avgWatchSeconds, likeRate, quizAvgScore, quizAttempts },
//     trend: { views: [{label,value}], completion: [{label,value}] },
//     topVideos: [{ id, title, views, completionRate, likeCount, trend }]
//   }
//
// Auth: requires an authenticated user with role='teacher'. RLS on
// video_analytics and quiz_attempts already restricts rows to the teacher's
// own videos, so the queries are safe with the standard SSR client.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Range = 'week' | 'month' | 'year';

interface Bucket {
  label: string;
  start: Date;
  end: Date;
}

interface AnalyticsRow {
  video_id: string;
  user_id: string | null;
  watched_duration: number | null;
  completed: boolean | null;
  liked: boolean | null;
  created_at: string;
}

interface QuizRow {
  video_id: string;
  is_correct: boolean;
  created_at: string;
}

const TR_DAY = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
const TR_MONTH = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

function startOfMonth(d: Date): Date {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function buildBuckets(range: Range, now: Date): Bucket[] {
  const today = startOfDay(now);

  if (range === 'week') {
    // 7 daily buckets ending today, oldest first.
    const buckets: Bucket[] = [];
    for (let i = 6; i >= 0; i--) {
      const start = addDays(today, -i);
      buckets.push({
        label: TR_DAY[start.getDay()],
        start,
        end: addDays(start, 1),
      });
    }
    return buckets;
  }

  if (range === 'month') {
    // 4 weekly buckets covering the last 28 days.
    const buckets: Bucket[] = [];
    for (let i = 3; i >= 0; i--) {
      const start = addDays(today, -((i + 1) * 7 - 1));
      const end = addDays(start, 7);
      buckets.push({
        label: `${4 - i}. Hafta`,
        start,
        end,
      });
    }
    return buckets;
  }

  // year — 12 monthly buckets ending in the current month.
  const buckets: Bucket[] = [];
  const firstOfCurrent = startOfMonth(today);
  for (let i = 11; i >= 0; i--) {
    const start = addMonths(firstOfCurrent, -i);
    const end = addMonths(start, 1);
    buckets.push({
      label: TR_MONTH[start.getMonth()],
      start,
      end,
    });
  }
  return buckets;
}

function inBucket(ts: number, b: Bucket): boolean {
  return ts >= b.start.getTime() && ts < b.end.getTime();
}

export async function GET(request: NextRequest) {
  const sb = await createClient();
  if (!sb) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const rangeParam = (url.searchParams.get('range') || 'month').toLowerCase();
  const range: Range = rangeParam === 'week' || rangeParam === 'year' ? rangeParam : 'month';

  const now = new Date();
  const buckets = buildBuckets(range, now);
  const windowStart = buckets[0].start;
  const windowEnd = buckets[buckets.length - 1].end;

  // Previous window of the same length — used for top-videos trend arrow.
  const windowMs = windowEnd.getTime() - windowStart.getTime();
  const prevStart = new Date(windowStart.getTime() - windowMs);

  // ── Teacher's videos ───────────────────────────────────────────────────────
  interface VideoRow {
    id: string;
    title: string;
    view_count: number | null;
    like_count: number | null;
    created_at: string;
  }

  const { data: videos, error: videosErr } = await sb
    .from('videos')
    .select('id, title, view_count, like_count, created_at')
    .eq('teacher_id', user.id);

  if (videosErr) {
    console.error('[Analytics] videos read failed:', videosErr.message);
    return NextResponse.json({ error: videosErr.message }, { status: 500 });
  }

  const videoRows: VideoRow[] = (videos as VideoRow[] | null) ?? [];
  const videoIds = videoRows.map((v) => v.id);
  const videoMeta = new Map<string, { title: string; viewCount: number; likeCount: number }>();
  for (const v of videoRows) {
    videoMeta.set(v.id, {
      title: v.title,
      viewCount: v.view_count || 0,
      likeCount: v.like_count || 0,
    });
  }

  // Empty teacher → return zeros so the UI still renders cleanly.
  if (videoIds.length === 0) {
    return NextResponse.json({
      range,
      totals: {
        totalViews: 0,
        totalVideos: 0,
        studentCount: 0,
        completionRate: 0,
        avgWatchSeconds: 0,
        likeRate: 0,
        quizAvgScore: null,
        quizAttempts: 0,
      },
      trend: {
        views: buckets.map((b) => ({ label: b.label, value: 0 })),
        completion: buckets.map((b) => ({ label: b.label, value: 0 })),
      },
      topVideos: [],
    });
  }

  // ── video_analytics rows in [prevStart, windowEnd) ─────────────────────────
  const { data: analytics, error: analyticsErr } = await sb
    .from('video_analytics')
    .select('video_id, user_id, watched_duration, completed, liked, created_at')
    .in('video_id', videoIds)
    .gte('created_at', prevStart.toISOString())
    .lt('created_at', windowEnd.toISOString());

  if (analyticsErr) {
    console.error('[Analytics] video_analytics read failed:', analyticsErr.message);
    return NextResponse.json({ error: analyticsErr.message }, { status: 500 });
  }

  const allRows: AnalyticsRow[] = (analytics as AnalyticsRow[] | null) ?? [];
  const inWindow: AnalyticsRow[] = [];
  const inPrev: AnalyticsRow[] = [];
  for (const r of allRows) {
    const t = new Date(r.created_at).getTime();
    if (t >= windowStart.getTime() && t < windowEnd.getTime()) inWindow.push(r);
    else if (t >= prevStart.getTime() && t < windowStart.getTime()) inPrev.push(r);
  }

  // ── quiz_attempts in window ────────────────────────────────────────────────
  const { data: attempts, error: attemptsErr } = await sb
    .from('quiz_attempts')
    .select('video_id, is_correct, created_at')
    .in('video_id', videoIds)
    .gte('created_at', windowStart.toISOString())
    .lt('created_at', windowEnd.toISOString());

  if (attemptsErr) {
    console.warn('[Analytics] quiz_attempts read failed (continuing):', attemptsErr.message);
  }
  const quizRows: QuizRow[] = (attempts as QuizRow[] | null) ?? [];

  // ── Totals ─────────────────────────────────────────────────────────────────
  const totalViews = inWindow.length;
  const totalVideos = videoIds.length;
  const uniqueStudents = new Set(inWindow.map((r) => r.user_id).filter(Boolean) as string[]);
  const completedCount = inWindow.filter((r) => r.completed === true).length;
  const completionRate = totalViews === 0 ? 0 : Math.round((completedCount / totalViews) * 100);
  const watchedSum = inWindow.reduce((sum, r) => sum + (r.watched_duration || 0), 0);
  const avgWatchSeconds = totalViews === 0 ? 0 : Math.round(watchedSum / totalViews);
  const likedCount = inWindow.filter((r) => r.liked === true).length;
  const likeRate = totalViews === 0 ? 0 : Math.round((likedCount / totalViews) * 100);
  const quizAttempts = quizRows.length;
  const quizAvgScore =
    quizAttempts === 0 ? null : Math.round((quizRows.filter((q) => q.is_correct).length / quizAttempts) * 100);

  // ── Trend buckets ──────────────────────────────────────────────────────────
  const bucketViews = buckets.map(() => 0);
  const bucketCompleted = buckets.map(() => 0);
  const bucketTotal = buckets.map(() => 0);

  for (const r of inWindow) {
    const t = new Date(r.created_at).getTime();
    for (let i = 0; i < buckets.length; i++) {
      if (inBucket(t, buckets[i])) {
        bucketViews[i]++;
        bucketTotal[i]++;
        if (r.completed) bucketCompleted[i]++;
        break;
      }
    }
  }

  const trendViews = buckets.map((b, i) => ({ label: b.label, value: bucketViews[i] }));
  const trendCompletion = buckets.map((b, i) => ({
    label: b.label,
    value: bucketTotal[i] === 0 ? 0 : Math.round((bucketCompleted[i] / bucketTotal[i]) * 100),
  }));

  // ── Top videos (by views in window) ────────────────────────────────────────
  const perVideoCurrent = new Map<string, { views: number; completed: number; liked: number }>();
  const perVideoPrev = new Map<string, number>();

  for (const r of inWindow) {
    const cur = perVideoCurrent.get(r.video_id) || { views: 0, completed: 0, liked: 0 };
    cur.views++;
    if (r.completed) cur.completed++;
    if (r.liked) cur.liked++;
    perVideoCurrent.set(r.video_id, cur);
  }
  for (const r of inPrev) {
    perVideoPrev.set(r.video_id, (perVideoPrev.get(r.video_id) || 0) + 1);
  }

  const topVideos = Array.from(perVideoCurrent.entries())
    .map(([videoId, c]) => {
      const prev = perVideoPrev.get(videoId) || 0;
      const meta = videoMeta.get(videoId);
      const trend: 'up' | 'down' | 'flat' =
        c.views > prev * 1.05 ? 'up' : c.views < prev * 0.95 ? 'down' : 'flat';
      return {
        id: videoId,
        title: meta?.title || 'Adsız video',
        views: c.views,
        completionRate: c.views === 0 ? 0 : Math.round((c.completed / c.views) * 100),
        likeCount: c.liked,
        trend,
      };
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  return NextResponse.json({
    range,
    totals: {
      totalViews,
      totalVideos,
      studentCount: uniqueStudents.size,
      completionRate,
      avgWatchSeconds,
      likeRate,
      quizAvgScore,
      quizAttempts,
    },
    trend: {
      views: trendViews,
      completion: trendCompletion,
    },
    topVideos,
  });
}
