'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BookmarkCheck, Search, Grid3X3, List, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { VideoCard } from '@/components/dashboard';
import { useVideoStore } from '@/stores/video-store';
import { useAuthStore } from '@/stores/auth-store';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function StudentSavedPage() {
  const { user } = useAuthStore();
  const { videos, isLoading, fetchVideos } = useVideoStore();
  const [savedVideoIds, setSavedVideoIds] = useState<string[]>(() => {
    // Load from localStorage
    if (typeof window !== 'undefined') {
      return JSON.parse(localStorage.getItem('savedVideos') || '[]');
    }
    return [];
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // Sync with localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('savedVideos', JSON.stringify(savedVideoIds));
    }
  }, [savedVideoIds]);

  const savedVideos = videos.filter((video) => savedVideoIds.includes(video.id));

  const filteredVideos = savedVideos.filter((video) => {
    const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.teacherName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch && video.status === 'published';
  });

  const handleRemove = (videoId: string) => {
    setSavedVideoIds((prev) => prev.filter((id) => id !== videoId));
    toast.success('Video kaydedilenlerden kaldırıldı', {
      description: 'İstediğiniz zaman tekrar kaydedebilirsiniz.',
    });
  };

  const handleSave = (videoId: string) => {
    if (savedVideoIds.includes(videoId)) {
      handleRemove(videoId);
    } else {
      setSavedVideoIds((prev) => [...prev, videoId]);
      toast.success('Video kaydedildi', {
        description: 'Kaydedilenler sayfasından erişebilirsiniz.',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
            <BookmarkCheck className="w-6 h-6 text-primary" />
            Kaydedilenler
          </h1>
          <p className="text-muted-foreground mt-1">
            {savedVideos.length} kaydedilmiş video
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Kaydedilen videolarda ara..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex border border-border rounded-lg overflow-hidden">
            <Button
              variant="ghost"
              size="icon"
              className={cn('rounded-none', viewMode === 'grid' && 'bg-muted')}
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn('rounded-none', viewMode === 'list' && 'bg-muted')}
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Videos */}
      {isLoading ? (
        <div className={cn(
          viewMode === 'grid' 
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
            : 'space-y-4'
        )}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={cn(
              'rounded-xl border border-border overflow-hidden',
              viewMode === 'list' && 'flex gap-4 p-4'
            )}>
              <Skeleton className={viewMode === 'grid' ? 'aspect-video' : 'w-48 aspect-video shrink-0'} />
              <div className={cn('p-4 space-y-3', viewMode === 'list' && 'p-0 flex-1')}>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredVideos.length > 0 ? (
        <div className={cn(
          viewMode === 'grid' 
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
            : 'space-y-4'
        )}>
          {filteredVideos.map((video, index) => (
            <motion.div
              key={video.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="relative">
                <VideoCard 
                  video={video}
                  variant={viewMode === 'list' ? 'horizontal' : 'default'}
                  showTeacher
                  showActions={false}
                  onSave={handleSave}
                  isSaved={true}
                />
                {viewMode === 'grid' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white"
                    onClick={() => handleRemove(video.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 rounded-xl border border-dashed border-border">
          <BookmarkCheck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">
            {searchQuery ? 'Sonuç bulunamadı' : 'Henüz kaydedilmiş video yok'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {searchQuery
              ? 'Farklı arama terimleri deneyin'
              : 'Beğendiğiniz videoları kaydedip daha sonra izleyebilirsiniz'}
          </p>
        </div>
      )}
    </div>
  );
}
