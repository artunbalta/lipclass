'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Play, 
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Maximize,
  BookmarkPlus,
  BookmarkCheck,
  ThumbsUp,
  Share2,
  Clock,
  User,
  BookOpen,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { VideoCard } from '@/components/dashboard';
import { useVideoStore } from '@/stores/video-store';
import { formatDuration, formatDate } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

export default function WatchVideoPage() {
  const params = useParams();
  const router = useRouter();
  const { selectedVideo, videos, isLoading, fetchVideoById, fetchVideos } = useVideoStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (params.id) {
      fetchVideoById(params.id as string);
      fetchVideos();
    }
  }, [params.id, fetchVideoById, fetchVideos]);

  // Simulate video progress
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 100;
          }
          return prev + 0.5;
        });
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const relatedVideos = videos
    .filter((v) => v.id !== params.id && v.status === 'published')
    .slice(0, 4);

  if (isLoading || !selectedVideo) {
    return (
      <div className="space-y-6">
        <Skeleton className="aspect-video rounded-xl" />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-20 w-full" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button - Mobile */}
      <Button 
        variant="ghost" 
        size="sm" 
        className="lg:hidden gap-2"
        onClick={() => router.back()}
      >
        <ArrowLeft className="w-4 h-4" />
        Geri
      </Button>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Video Player */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 group"
          >
            {/* Video Content Area */}
            <div className="absolute inset-0 flex items-center justify-center">
              {!isPlaying && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsPlaying(true)}
                  className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center shadow-lg shadow-primary/30"
                >
                  <Play className="w-8 h-8 text-primary-foreground ml-1" fill="currentColor" />
                </motion.button>
              )}
            </div>

            {/* Controls Overlay */}
            <div className={cn(
              'absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent transition-opacity',
              isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
            )}>
              {/* Progress Bar */}
              <div className="mb-3">
                <div className="h-1 bg-white/30 rounded-full overflow-hidden cursor-pointer">
                  <div 
                    className="h-full bg-primary transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={() => setIsPlaying(!isPlaying)}
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                  >
                    <SkipBack className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                  >
                    <SkipForward className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={() => setIsMuted(!isMuted)}
                  >
                    {isMuted ? (
                      <VolumeX className="w-5 h-5" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </Button>
                  <span className="text-white text-sm ml-2">
                    {Math.floor(progress * selectedVideo.duration / 100 / 60)}:
                    {String(Math.floor((progress * selectedVideo.duration / 100) % 60)).padStart(2, '0')} / 
                    {formatDuration(selectedVideo.duration)}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                >
                  <Maximize className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Video Info */}
          <div>
            <h1 className="text-xl lg:text-2xl font-bold">{selectedVideo.title}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <Badge variant="secondary">{selectedVideo.subject}</Badge>
              <Badge variant="outline">{selectedVideo.grade}. Sınıf</Badge>
              <span className="text-sm text-muted-foreground">
                {selectedVideo.viewCount} görüntülenme
              </span>
              <span className="text-sm text-muted-foreground">
                {formatDate(selectedVideo.createdAt)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={isLiked ? 'default' : 'outline'}
              size="sm"
              className="gap-2"
              onClick={() => setIsLiked(!isLiked)}
            >
              <ThumbsUp className={cn('w-4 h-4', isLiked && 'fill-current')} />
              Beğen
            </Button>
            <Button
              variant={isSaved ? 'default' : 'outline'}
              size="sm"
              className="gap-2"
              onClick={() => setIsSaved(!isSaved)}
            >
              {isSaved ? (
                <BookmarkCheck className="w-4 h-4" />
              ) : (
                <BookmarkPlus className="w-4 h-4" />
              )}
              {isSaved ? 'Kaydedildi' : 'Kaydet'}
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Share2 className="w-4 h-4" />
              Paylaş
            </Button>
          </div>

          <Separator />

          {/* Teacher Info */}
          <div className="flex items-center gap-4">
            <Avatar className="w-12 h-12 border-2 border-primary/20">
              <AvatarImage src={selectedVideo.teacherAvatar} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {selectedVideo.teacherName.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-semibold">{selectedVideo.teacherName}</h3>
              <p className="text-sm text-muted-foreground">{selectedVideo.subject} Öğretmeni</p>
            </div>
          </div>

          <Separator />

          {/* Description */}
          <div>
            <h3 className="font-semibold mb-2">Video Hakkında</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {selectedVideo.description}
            </p>
            {selectedVideo.includesProblemSolving && (
              <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm font-medium flex items-center gap-2">
                  ✏️ Bu video {selectedVideo.problemCount} adet soru çözümü içermektedir
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Related Videos */}
        <div className="space-y-4">
          <h3 className="font-semibold">İlgili Videolar</h3>
          {relatedVideos.map((video, index) => (
            <motion.div
              key={video.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link href={`/dashboard/student/watch/${video.id}`}>
                <div className="group flex gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="relative w-32 aspect-video rounded-lg overflow-hidden bg-muted shrink-0">
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/70 text-white text-xs">
                      {formatDuration(video.duration)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                      {video.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {video.teacherName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {video.viewCount} görüntülenme
                    </p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}

          <Link href="/dashboard/student/browse">
            <Button variant="outline" className="w-full gap-2">
              Daha Fazla Göster
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
