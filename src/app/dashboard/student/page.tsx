'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Play, Clock, BookOpen, ArrowRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

export default function StudentDashboardPage() {
  const { user } = useAuthStore();
  const { videos, isLoading, fetchVideos } = useVideoStore();

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const continueWatching = videos.slice(0, 2);
  const recommended = videos.slice(2, 6);

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">
            Merhaba, {user?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Bugün ne öğrenmek istersin?
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Video ara..." className="pl-9" />
        </div>
      </div>

      {/* Continue Watching */}
      {continueWatching.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Play className="w-5 h-5 text-primary" />
              İzlemeye Devam Et
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {continueWatching.map((video, index) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link href={`/dashboard/student/watch/${video.id}`}>
                  <div className="group flex gap-4 p-4 rounded-xl border border-border bg-card hover:shadow-lg transition-all duration-300">
                    <div className="relative w-40 aspect-video rounded-lg overflow-hidden bg-muted shrink-0">
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                      {/* Progress Bar */}
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30">
                        <div 
                          className="h-full bg-primary" 
                          style={{ width: `${Math.random() * 60 + 20}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold line-clamp-1 group-hover:text-primary transition-colors">
                        {video.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {video.teacherName}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        Kaldığın yer: 8:24
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Subject Categories */}
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

      {/* Recommended Videos */}
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

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border overflow-hidden">
                <Skeleton className="aspect-video" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recommended.map((video, index) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <VideoCard 
                  video={video} 
                  showTeacher 
                  showActions={false}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
