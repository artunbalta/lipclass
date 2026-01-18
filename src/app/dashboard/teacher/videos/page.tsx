'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Plus, Search, Grid3X3, List, Video, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { VideoCard } from '@/components/dashboard';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useVideoStore } from '@/stores/video-store';
import { Skeleton } from '@/components/ui/skeleton';
import { showToast } from '@/lib/utils/toast';
import { cn } from '@/lib/utils';

type SortOption = 'newest' | 'oldest' | 'title' | 'views' | 'subject';

export default function TeacherVideosPage() {
  const { videos, isLoading, fetchVideos, filter, setFilter, deleteVideo } = useVideoStore();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; videoId: string | null }>({
    open: false,
    videoId: null,
  });

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const filteredVideos = videos.filter((video) => {
    const matchesFilter = filter === 'all' || video.status === filter;
    const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.topic.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Sort videos
  const sortedVideos = [...filteredVideos].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'title':
        return a.title.localeCompare(b.title, 'tr');
      case 'views':
        return b.viewCount - a.viewCount;
      case 'subject':
        return a.subject.localeCompare(b.subject, 'tr');
      default:
        return 0;
    }
  });

  const handleDeleteClick = (id: string) => {
    setDeleteDialog({ open: true, videoId: id });
  };

  const handleDeleteConfirm = async () => {
    if (deleteDialog.videoId) {
      await deleteVideo(deleteDialog.videoId);
      setDeleteDialog({ open: false, videoId: null });
      showToast.success('Video silindi', 'Video başarıyla kaldırıldı.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Videolarım</h1>
          <p className="text-muted-foreground mt-1">
            {sortedVideos.length} video bulundu
          </p>
        </div>
        <Link href="/dashboard/teacher/create">
          <Button className="gap-2">
            <Plus className="w-5 h-5" />
            Yeni Video
          </Button>
        </Link>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Tabs 
          value={filter} 
          onValueChange={(v) => setFilter(v as typeof filter)}
          className="w-full sm:w-auto"
        >
          <TabsList className="grid grid-cols-4 w-full sm:w-auto">
            <TabsTrigger value="all">Tümü</TabsTrigger>
            <TabsTrigger value="published">Yayında</TabsTrigger>
            <TabsTrigger value="draft">Taslak</TabsTrigger>
            <TabsTrigger value="processing">İşleniyor</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex-1 flex gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Video ara..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <ArrowUpDown className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {sortBy === 'newest' && 'En Yeni'}
                  {sortBy === 'oldest' && 'En Eski'}
                  {sortBy === 'title' && 'Başlık'}
                  {sortBy === 'views' && 'İzlenme'}
                  {sortBy === 'subject' && 'Ders'}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortBy('newest')}>
                En Yeni
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('oldest')}>
                En Eski
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('title')}>
                Başlık (A-Z)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('views')}>
                En Çok İzlenen
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('subject')}>
                Ders
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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

      {/* Video Grid/List */}
      {isLoading ? (
        <div className={cn(
          viewMode === 'grid' 
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
            : 'space-y-4'
        )}>
          {Array.from({ length: 8 }).map((_, i) => (
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
      ) : sortedVideos.length > 0 ? (
        <div className={cn(
          viewMode === 'grid' 
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
            : 'space-y-4'
        )}>
          {sortedVideos.map((video, index) => (
            <motion.div
              key={video.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <VideoCard 
                video={video} 
                variant={viewMode === 'list' ? 'horizontal' : 'default'}
                onDelete={handleDeleteClick}
              />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 rounded-xl border border-dashed border-border">
          <Video className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">
            {searchQuery ? 'Sonuç bulunamadı' : 'Henüz video yok'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {searchQuery 
              ? 'Farklı anahtar kelimeler deneyin'
              : 'İlk ders videonuzu oluşturmaya başlayın'}
          </p>
          {!searchQuery && (
            <Link href="/dashboard/teacher/create">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Video Oluştur
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, videoId: null })}
        onConfirm={handleDeleteConfirm}
        title="Videoyu Sil"
        description="Bu videoyu silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
        confirmText="Sil"
        cancelText="İptal"
        variant="destructive"
      />
    </div>
  );
}
