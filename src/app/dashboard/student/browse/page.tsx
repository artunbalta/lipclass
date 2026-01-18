'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, Filter, Grid3X3, List, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { VideoCard } from '@/components/dashboard';
import { useVideoStore } from '@/stores/video-store';
import { Skeleton } from '@/components/ui/skeleton';
import { SUBJECTS, GRADES } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

export default function StudentBrowsePage() {
  const searchParams = useSearchParams();
  const initialSubject = searchParams.get('subject') || '';
  
  const { videos, isLoading, fetchVideos } = useVideoStore();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState(initialSubject);
  const [selectedGrade, setSelectedGrade] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [savedVideos, setSavedVideos] = useState<string[]>([]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const filteredVideos = videos.filter((video) => {
    const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.teacherName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = !selectedSubject || video.subject === selectedSubject;
    const matchesGrade = !selectedGrade || video.grade === selectedGrade;
    return matchesSearch && matchesSubject && matchesGrade && video.status === 'published';
  });

  const handleSaveVideo = (id: string) => {
    setSavedVideos((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const clearFilters = () => {
    setSelectedSubject('');
    setSelectedGrade('');
    setSearchQuery('');
  };

  const hasActiveFilters = selectedSubject || selectedGrade || searchQuery;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">Keşfet</h1>
        <p className="text-muted-foreground mt-1">
          Tüm ders videolarını keşfet ve öğrenmeye başla
        </p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Video, konu veya öğretmen ara..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtrele
            {hasActiveFilters && (
              <Badge className="ml-1 px-1.5 py-0.5 text-xs">
                {[selectedSubject, selectedGrade, searchQuery].filter(Boolean).length}
              </Badge>
            )}
          </Button>
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

      {/* Filter Panel */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="p-4 rounded-xl border border-border bg-card"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Filtreler</h3>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2">
                <X className="w-4 h-4" />
                Temizle
              </Button>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Ders</label>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
              >
                <option value="">Tüm Dersler</option>
                {SUBJECTS.map((subject) => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sınıf</label>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
              >
                <option value="">Tüm Sınıflar</option>
                {GRADES.map((grade) => (
                  <option key={grade.value} value={grade.value}>{grade.label}</option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>
      )}

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Aktif filtreler:</span>
          {selectedSubject && (
            <Badge variant="secondary" className="gap-1">
              {selectedSubject}
              <button onClick={() => setSelectedSubject('')}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {selectedGrade && (
            <Badge variant="secondary" className="gap-1">
              {selectedGrade}. Sınıf
              <button onClick={() => setSelectedGrade('')}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {searchQuery && (
            <Badge variant="secondary" className="gap-1">
              &quot;{searchQuery}&quot;
              <button onClick={() => setSearchQuery('')}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      {/* Results Count */}
      <p className="text-sm text-muted-foreground">
        {filteredVideos.length} video bulundu
      </p>

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
              <VideoCard 
                video={video}
                variant={viewMode === 'list' ? 'horizontal' : 'default'}
                showTeacher
                showActions={false}
                onSave={handleSaveVideo}
                isSaved={savedVideos.includes(video.id)}
              />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 rounded-xl border border-dashed border-border">
          <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">Sonuç Bulunamadı</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Farklı filtreler veya arama terimleri deneyin
          </p>
          <Button variant="outline" onClick={clearFilters}>
            Filtreleri Temizle
          </Button>
        </div>
      )}
    </div>
  );
}
