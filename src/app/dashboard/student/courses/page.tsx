'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Search, Filter, BookmarkCheck, Play, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { VideoCard } from '@/components/dashboard';
import { useVideoStore } from '@/stores/video-store';
import { useAuthStore } from '@/stores/auth-store';
import { Skeleton } from '@/components/ui/skeleton';
import { SUBJECTS } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function StudentCoursesPage() {
  const { user } = useAuthStore();
  const { videos, isLoading, fetchVideos } = useVideoStore();
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const studentGrade = (user as { grade?: string })?.grade?.replace('. Sınıf', '') || '';

  const filteredVideos = videos.filter((video) => {
    const matchesGrade = !studentGrade || video.grade === studentGrade;
    const matchesSubject = !selectedSubject || video.subject === selectedSubject;
    const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.topic.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesGrade && matchesSubject && matchesSearch && video.status === 'published';
  });

  const groupedBySubject = SUBJECTS.reduce((acc, subject) => {
    const subjectVideos = filteredVideos.filter(v => v.subject === subject);
    if (subjectVideos.length > 0) {
      acc[subject] = subjectVideos;
    }
    return acc;
  }, {} as Record<string, typeof filteredVideos>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" />
          Derslerim
        </h1>
        <p className="text-muted-foreground mt-1">
          Kayıt olduğunuz derslere ve içeriklerine buradan ulaşabilirsiniz
        </p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Ders veya konu ara..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button
            variant={selectedSubject === '' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedSubject('')}
          >
            Tümü
          </Button>
          {SUBJECTS.slice(0, 6).map((subject) => (
            <Button
              key={subject}
              variant={selectedSubject === subject ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedSubject(subject)}
            >
              {subject}
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-8">
          {[1, 2].map((i) => (
            <div key={i}>
              <Skeleton className="h-6 w-32 mb-4" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="rounded-xl border border-border overflow-hidden">
                    <Skeleton className="aspect-video" />
                    <div className="p-4 space-y-3">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : Object.keys(groupedBySubject).length > 0 ? (
        <div className="space-y-8">
          {Object.entries(groupedBySubject).map(([subject, subjectVideos], index) => (
            <motion.div
              key={subject}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">{subject}</h2>
                <Badge variant="secondary">{subjectVideos.length} video</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {subjectVideos.map((video) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    showTeacher
                    showActions={false}
                  />
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 rounded-xl border border-dashed border-border">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">
            {searchQuery || selectedSubject ? 'Sonuç bulunamadı' : 'Henüz ders kaydınız yok'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {searchQuery || selectedSubject
              ? 'Farklı arama terimleri deneyin'
              : 'Derslere kayıt olmak için Keşfet sayfasını ziyaret edin'}
          </p>
          <Link href="/dashboard/student/browse">
            <Button>
              <Play className="w-4 h-4 mr-2" />
              Videoları Keşfet
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
