'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Play, 
  Share2, 
  Download, 
  Edit, 
  Trash2, 
  Eye, 
  Clock,
  BookOpen,
  Users,
  Copy,
  Check,
  QrCode
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useVideoStore } from '@/stores/video-store';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { formatDuration, formatDate } from '@/lib/mock-data';
import { showToast } from '@/lib/utils/toast';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const statusMap = {
  draft: { label: 'Taslak', color: 'bg-muted text-muted-foreground' },
  processing: { label: 'İşleniyor', color: 'bg-amber-500/10 text-amber-500' },
  published: { label: 'Yayında', color: 'bg-emerald-500/10 text-emerald-500' },
  failed: { label: 'Hata', color: 'bg-destructive/10 text-destructive' },
};

export default function VideoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { selectedVideo, isLoading, fetchVideoById, deleteVideo } = useVideoStore();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchVideoById(params.id as string);
    }
  }, [params.id, fetchVideoById]);

  const [deleteDialog, setDeleteDialog] = useState(false);

  const handleDelete = () => {
    setDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    await deleteVideo(params.id as string);
    setDeleteDialog(false);
    router.push('/dashboard/teacher/videos');
    toast.success('Video silindi', { description: 'Video başarıyla kaldırıldı.' });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://app.lipclass.com/watch/${params.id}`);
    setCopied(true);
    toast.success('Link kopyalandı!', { description: 'Video linki panoya kopyalandı.' });
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading || !selectedVideo) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="aspect-video rounded-xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  const status = statusMap[selectedVideo.status];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold">{selectedVideo.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={cn('text-xs', status.color)}>
                {status.label}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {formatDate(selectedVideo.createdAt)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Edit className="w-4 h-4" />
            <span className="hidden sm:inline">Düzenle</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 text-destructive hover:text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Sil</span>
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Video Player */}
        <div className="lg:col-span-2 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative aspect-video rounded-xl overflow-hidden bg-slate-900"
          >
            {/* Mock Video Player */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center shadow-lg shadow-primary/30"
              >
                <Play className="w-8 h-8 text-primary-foreground ml-1" fill="currentColor" />
              </motion.button>
            </div>
            {/* Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
              <div className="h-full w-0 bg-primary" />
            </div>
            {/* Duration */}
            <div className="absolute bottom-4 right-4 px-2 py-1 rounded bg-black/70 text-white text-sm font-medium">
              {formatDuration(selectedVideo.duration)}
            </div>
          </motion.div>

          {/* Video Info */}
          <div className="p-6 rounded-xl border border-border bg-card">
            <h3 className="font-semibold mb-3">Video Açıklaması</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {selectedVideo.description}
            </p>

            <Separator className="my-4" />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <BookOpen className="w-5 h-5 mx-auto mb-1 text-primary" />
                <div className="text-sm font-medium">{selectedVideo.subject}</div>
                <div className="text-xs text-muted-foreground">Ders</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <Users className="w-5 h-5 mx-auto mb-1 text-accent" />
                <div className="text-sm font-medium">{selectedVideo.grade}. Sınıf</div>
                <div className="text-xs text-muted-foreground">Seviye</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <Eye className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
                <div className="text-sm font-medium">{selectedVideo.viewCount}</div>
                <div className="text-xs text-muted-foreground">İzlenme</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <Clock className="w-5 h-5 mx-auto mb-1 text-amber-500" />
                <div className="text-sm font-medium">{formatDuration(selectedVideo.duration)}</div>
                <div className="text-xs text-muted-foreground">Süre</div>
              </div>
            </div>

            {selectedVideo.includesProblemSolving && (
              <>
                <Separator className="my-4" />
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    ✏️ Soru Çözümü: {selectedVideo.problemCount} soru
                  </Badge>
                  <Badge variant="secondary">
                    📊 Zorluk: {selectedVideo.difficulty === 'easy' ? 'Kolay' : selectedVideo.difficulty === 'medium' ? 'Orta' : 'Zor'}
                  </Badge>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Share Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-6 rounded-xl border border-border bg-card"
          >
            <h3 className="font-semibold mb-4">Paylaş</h3>
            <div className="space-y-3">
              <Button className="w-full gap-2" onClick={handleCopyLink}>
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Kopyalandı!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Linki Kopyala
                  </>
                )}
              </Button>
              <Button variant="outline" className="w-full gap-2">
                <QrCode className="w-4 h-4" />
                QR Kod Oluştur
              </Button>
              <Button variant="outline" className="w-full gap-2">
                <Download className="w-4 h-4" />
                Videoyu İndir
              </Button>
            </div>
          </motion.div>

          {/* Stats Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 rounded-xl border border-border bg-card"
          >
            <h3 className="font-semibold mb-4">İstatistikler</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Toplam İzlenme</span>
                <span className="font-medium">{selectedVideo.viewCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tamamlanma Oranı</span>
                <span className="font-medium">78%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Ortalama İzlenme</span>
                <span className="font-medium">8:24</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Beğeni</span>
                <span className="font-medium">42</span>
              </div>
            </div>
          </motion.div>

          {/* AI Prompt Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="p-6 rounded-xl border border-border bg-card"
          >
            <h3 className="font-semibold mb-4">AI Prompt</h3>
            <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
              {selectedVideo.prompt}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={deleteDialog}
        onOpenChange={setDeleteDialog}
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
