'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Video, Eye, Users, TrendingUp, Plus, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatsCard, VideoCard } from '@/components/dashboard';
import { useAuthStore } from '@/stores/auth-store';
import { useVideoStore } from '@/stores/video-store';
import { Skeleton } from '@/components/ui/skeleton';

export default function TeacherDashboardPage() {
  const { user } = useAuthStore();
  const { videos, stats, isLoading, fetchVideos } = useVideoStore();

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const recentVideos = videos.slice(0, 4);

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">
            Hoş geldin, {user?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            İşte bugünkü özet ve son aktiviteler
          </p>
        </div>
        <Link href="/dashboard/teacher/create">
          <Button className="gap-2">
            <Plus className="w-5 h-5" />
            Yeni Video Oluştur
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Toplam Video"
          value={stats.totalVideos}
          icon={Video}
          trend={{ value: 12, isPositive: true }}
          color="primary"
        />
        <StatsCard
          title="Toplam İzlenme"
          value={stats.totalViews.toLocaleString()}
          icon={Eye}
          trend={{ value: 8, isPositive: true }}
          color="accent"
        />
        <StatsCard
          title="Bu Ay Oluşturulan"
          value={stats.videosThisMonth}
          icon={TrendingUp}
          color="emerald"
        />
        <StatsCard
          title="Öğrenci Sayısı"
          value={stats.studentCount}
          icon={Users}
          color="amber"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-xl border border-border bg-gradient-to-br from-primary/10 to-primary/5"
        >
          <h3 className="font-semibold mb-2">Referans Video</h3>
          <p className="text-sm text-muted-foreground mb-4">
            AI video oluşturmak için önce referans videonuzu yüklemeniz gerekiyor.
          </p>
          <Link href="/dashboard/teacher/reference">
            <Button variant="secondary" className="gap-2">
              Referans Video Yükle
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-xl border border-border bg-gradient-to-br from-accent/10 to-accent/5"
        >
          <h3 className="font-semibold mb-2">Hızlı Başlangıç</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Hazır şablonlarla dakikalar içinde yeni ders videosu oluşturun.
          </p>
          <Link href="/dashboard/teacher/create">
            <Button variant="secondary" className="gap-2">
              Video Oluştur
              <Plus className="w-4 h-4" />
            </Button>
          </Link>
        </motion.div>
      </div>

      {/* Recent Videos */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Son Videolar</h2>
          <Link href="/dashboard/teacher/videos">
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
        ) : recentVideos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentVideos.map((video, index) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <VideoCard video={video} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 rounded-xl border border-dashed border-border">
            <Video className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">Henüz video yok</h3>
            <p className="text-sm text-muted-foreground mb-4">
              İlk ders videonuzu oluşturmaya başlayın
            </p>
            <Link href="/dashboard/teacher/create">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Video Oluştur
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
