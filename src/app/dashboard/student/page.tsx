'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Play, BookOpen, ArrowRight, ClipboardList, Brain, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VideoCard } from '@/components/dashboard';
import { useAuthStore } from '@/stores/auth-store';
import { useVideoStore } from '@/stores/video-store';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const subjectCategories = [
  { name: 'Matematik', icon: '📐', color: 'from-blue-500/20 to-indigo-500/20' },
  { name: 'Fizik', icon: '⚡', color: 'from-amber-500/20 to-orange-500/20' },
  { name: 'Kimya', icon: '🧪', color: 'from-emerald-500/20 to-teal-500/20' },
  { name: 'Biyoloji', icon: '🧬', color: 'from-green-500/20 to-lime-500/20' },
  { name: 'Türkçe', icon: '📚', color: 'from-rose-500/20 to-pink-500/20' },
  { name: 'Tarih', icon: '🏛️', color: 'from-purple-500/20 to-violet-500/20' },
];

interface HomeData {
  recentlyWatched: Array<{
    id: string; title: string; subject: string; grade: string;
    thumbnail_url: string | null; teacher_id: string;
  }>;
  recommended: Array<{
    id: string; title: string; subject: string; grade: string;
    thumbnailUrl: string | null; duration: number; teacherId: string;
  }>;
  srDueCount: number;
  pendingAssignments: number;
}

export default function StudentDashboardPage() {
  const { user } = useAuthStore();
  const { videos, isLoading: videosLoading, fetchVideos } = useVideoStore();
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [homeLoading, setHomeLoading] = useState(true);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  useEffect(() => {
    fetch('/api/student/home')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setHomeData(d); })
      .finally(() => setHomeLoading(false));
  }, []);

  const recommended = homeData?.recommended?.length
    ? homeData.recommended
    : videos.slice(0, 8).map(v => ({
        id: v.id, title: v.title, subject: v.subject, grade: v.grade,
        thumbnailUrl: v.thumbnailUrl, duration: v.duration, teacherId: v.teacherId,
      }));

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">
            Merhaba, {user?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">Bugün ne öğrenmek istersin?</p>
        </div>

        {/* Quick stats */}
        {!homeLoading && homeData && (homeData.pendingAssignments > 0 || homeData.srDueCount > 0) && (
          <div className="flex gap-3">
            {homeData.pendingAssignments > 0 && (
              <Link href="/dashboard/student/assignments">
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 transition-colors">
                  <ClipboardList className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-700">
                    {homeData.pendingAssignments} ödev bekliyor
                  </span>
                </div>
              </Link>
            )}
            {homeData.srDueCount > 0 && (
              <Link href="/dashboard/student/review">
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 transition-colors">
                  <Brain className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">
                    {homeData.srDueCount} tekrar hazır
                  </span>
                </div>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Continue watching */}
      {homeLoading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[0, 1].map(i => (
            <div key={i} className="flex gap-4 p-4 rounded-xl border border-border">
              <Skeleton className="w-40 aspect-video rounded-lg shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : (homeData?.recentlyWatched?.length ?? 0) > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Play className="w-5 h-5 text-primary" />
              İzlemeye Devam Et
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {homeData!.recentlyWatched.map((video, index) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link href={`/dashboard/student/watch/${video.id}`}>
                  <div className="group flex gap-4 p-4 rounded-xl border border-border bg-card hover:shadow-lg transition-all duration-300">
                    <div className="relative w-40 aspect-video rounded-lg overflow-hidden bg-muted shrink-0">
                      {video.thumbnail_url ? (
                        <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                          <Play className="w-8 h-8 text-primary/40" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                        {video.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">{video.subject} · {video.grade}. Sınıf</p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Subject categories */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Dersler
          </h2>
          <Link href="/dashboard/student/browse">
            <Button variant="ghost" className="gap-2 text-muted-foreground">
              Tümünü Gör
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {subjectCategories.map((subject, index) => (
            <motion.div
              key={subject.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link href={`/dashboard/student/browse?subject=${subject.name}`}>
                <div className={cn(
                  'p-4 rounded-xl border border-border bg-gradient-to-br text-center hover:shadow-lg transition-all duration-300 hover:-translate-y-1',
                  subject.color
                )}>
                  <span className="text-3xl">{subject.icon}</span>
                  <p className="mt-2 font-medium text-sm">{subject.name}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recommended */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Senin İçin Önerilen</h2>
          <Link href="/dashboard/student/browse">
            <Button variant="ghost" className="gap-2 text-muted-foreground">
              Tümünü Gör
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {(homeLoading || videosLoading) ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border overflow-hidden">
                <Skeleton className="aspect-video" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : recommended.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recommended.slice(0, 4).map((video, index) => {
              // Find the full Video object from the store if available
              const storeVideo = videos.find(v => v.id === video.id);
              if (storeVideo) {
                return (
                  <motion.div
                    key={video.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <VideoCard video={storeVideo} showTeacher showActions={false} />
                  </motion.div>
                );
              }
              // Fallback card if not in store
              return (
                <motion.div
                  key={video.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link href={`/dashboard/student/watch/${video.id}`}>
                    <div className="group rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition-all">
                      <div className="aspect-video bg-muted flex items-center justify-center">
                        {video.thumbnailUrl
                          ? <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                          : <Play className="w-8 h-8 text-muted-foreground/40" />}
                      </div>
                      <div className="p-3">
                        <p className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">{video.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{video.subject} · {video.grade}. Sınıf</p>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 rounded-xl border border-dashed border-border">
            <BookOpen className="w-10 h-10 mx-auto text-muted-foreground mb-3 opacity-50" />
            <p className="text-muted-foreground text-sm">Henüz öneri yok. Videoları keşfet!</p>
            <Link href="/dashboard/student/browse">
              <Button className="mt-4" size="sm">Videolara Göz At</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
