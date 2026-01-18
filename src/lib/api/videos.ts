import { createClient } from '@/lib/supabase/client';
import { Video, CreateVideoFormData, VideoStats } from '@/types';

const supabase = createClient();

export async function getVideos(filters?: {
  teacherId?: string;
  status?: 'draft' | 'processing' | 'published' | 'failed';
  subject?: string;
  grade?: string;
}) {
  let query = supabase
    .from('videos')
    .select(`
      *,
      profiles!videos_teacher_id_fkey (
        name,
        avatar_url
      )
    `)
    .order('created_at', { ascending: false });

  if (filters?.teacherId) {
    query = query.eq('teacher_id', filters.teacherId);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.subject) {
    query = query.eq('subject', filters.subject);
  }

  if (filters?.grade) {
    query = query.eq('grade', filters.grade);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return data.map(mapDbVideoToVideo);
}

export async function getVideoById(id: string): Promise<Video | null> {
  const { data, error } = await supabase
    .from('videos')
    .select(`
      *,
      profiles!videos_teacher_id_fkey (
        name,
        avatar_url
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(error.message);
  }

  return mapDbVideoToVideo(data);
}

export async function createVideo(teacherId: string, videoData: CreateVideoFormData): Promise<Video> {
  const { data, error } = await supabase
    .from('videos')
    .insert({
      teacher_id: teacherId,
      title: videoData.topic,
      description: videoData.description,
      subject: videoData.subject,
      grade: videoData.grade,
      topic: videoData.topic,
      prompt: videoData.prompt,
      tone: videoData.tone,
      includes_problem_solving: videoData.includesProblemSolving,
      problem_count: videoData.problemCount || null,
      difficulty: videoData.difficulty || null,
      estimated_duration: videoData.estimatedDuration,
      language: videoData.language,
      status: 'processing',
      thumbnail_url: null,
      video_url: null,
      duration: null,
    })
    .select(`
      *,
      profiles!videos_teacher_id_fkey (
        name,
        avatar_url
      )
    `)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapDbVideoToVideo(data);
}

export async function updateVideo(id: string, updates: Partial<Video>) {
  const { data, error } = await supabase
    .from('videos')
    .update({
      title: updates.title,
      description: updates.description,
      status: updates.status,
      thumbnail_url: updates.thumbnailUrl,
      video_url: updates.videoUrl,
      duration: updates.duration,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapDbVideoToVideo(data);
}

export async function deleteVideo(id: string) {
  const { error } = await supabase
    .from('videos')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function getVideoStats(teacherId: string): Promise<VideoStats> {
  const { data: videos, error } = await supabase
    .from('videos')
    .select('id, status, view_count, created_at')
    .eq('teacher_id', teacherId);

  if (error) {
    throw new Error(error.message);
  }

  if (!videos) {
    return {
      totalVideos: 0,
      totalViews: 0,
      videosThisMonth: 0,
      studentCount: 0,
    };
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const totalVideos = videos.length;
  const totalViews = videos.reduce((sum: number, v: any) => sum + (v.view_count || 0), 0);
  const videosThisMonth = videos.filter(
    (v: any) => new Date(v.created_at) >= startOfMonth
  ).length;

  // Get student count from analytics (unique users who watched videos)
  const { data: analytics, error: analyticsError } = await supabase
    .from('video_analytics')
    .select('user_id')
    .in('video_id', videos.map((v: any) => v.id));

  const studentCount = analyticsError
    ? 0
    : new Set(analytics?.map((a: any) => a.user_id).filter(Boolean)).size;

  return {
    totalVideos,
    totalViews,
    videosThisMonth,
    studentCount,
  };
}

export async function incrementVideoView(videoId: string, userId?: string, watchedDuration?: number) {
  const { error } = await supabase
    .from('video_analytics')
    .insert({
      video_id: videoId,
      user_id: userId || null,
      watched_duration: watchedDuration || 0,
      completed: false,
      liked: false,
    });

  if (error) {
    // Silently fail - analytics should not break video playback
    console.error('Analytics error:', error);
  }
}

// Helper function to map database video to Video type
function mapDbVideoToVideo(dbVideo: any): Video {
  const profile = Array.isArray(dbVideo.profiles) ? dbVideo.profiles[0] : (dbVideo.profiles || {});

  return {
    id: dbVideo.id,
    teacherId: dbVideo.teacher_id,
    teacherName: profile?.name || 'Öğretmen',
    teacherAvatar: profile?.avatar_url,
    title: dbVideo.title,
    description: dbVideo.description,
    subject: dbVideo.subject,
    grade: dbVideo.grade,
    topic: dbVideo.topic,
    thumbnailUrl: dbVideo.thumbnail_url || 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=225&fit=crop',
    videoUrl: dbVideo.video_url || '#',
    duration: dbVideo.duration || 0,
    status: dbVideo.status,
    viewCount: dbVideo.view_count || 0,
    createdAt: new Date(dbVideo.created_at),
    prompt: dbVideo.prompt,
    includesProblemSolving: dbVideo.includes_problem_solving || false,
    problemCount: dbVideo.problem_count || undefined,
    difficulty: dbVideo.difficulty || undefined,
  };
}
