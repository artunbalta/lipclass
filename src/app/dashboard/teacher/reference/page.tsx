'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Upload, 
  Video, 
  Check, 
  X, 
  AlertCircle, 
  Loader2,
  Play,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useAuthStore } from '@/stores/auth-store';
import { showToast } from '@/lib/utils/toast';
import { cn } from '@/lib/utils';
import { uploadReferenceVideo, getReferenceVideoUrl, deleteFile } from '@/lib/api/storage';

const requirements = [
  { id: 1, text: 'Minimum 2 dakika, maksimum 5 dakika süre', important: true },
  { id: 2, text: 'Yüzünüz net görünmeli, gözleriniz kameraya bakmalı', important: true },
  { id: 3, text: 'Düz ve sade arka plan tercih edin', important: false },
  { id: 4, text: 'Doğal ışık veya iyi aydınlatma kullanın', important: false },
  { id: 5, text: 'Net ve anlaşılır konuşun', important: true },
  { id: 6, text: 'Harici mikrofon kullanmanız önerilir', important: false },
  { id: 7, text: 'MP4, MOV veya WebM formatında yükleyin', important: false },
  { id: 8, text: 'Maksimum dosya boyutu: 500MB', important: false },
];

export default function ReferenceVideoPage() {
  const { user } = useAuthStore();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);
  const [referenceVideoUrl, setReferenceVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoDuration, setVideoDuration] = useState<string>('');
  const [uploadDate, setUploadDate] = useState<Date | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Check for existing reference video on mount
  useEffect(() => {
    const checkReferenceVideo = async () => {
      if (user?.id) {
        try {
          const url = await getReferenceVideoUrl(user.id);
          if (url) {
            setHasVideo(true);
            setReferenceVideoUrl(url);
            // Upload date'i storage metadata'sından alabilirsiniz, şimdilik yeni tarih
            setUploadDate(new Date());
          }
        } catch (error) {
          console.error('Error checking reference video:', error);
        }
      }
    };
    checkReferenceVideo();
  }, [user?.id]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!user?.id) {
      showToast.error('Hata', 'Giriş yapmanız gerekiyor.');
      return;
    }

    // Validate file
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      showToast.error('Dosya çok büyük', 'Maksimum dosya boyutu 500MB.');
      return;
    }

    const validTypes = ['video/mp4', 'video/mov', 'video/webm', 'video/quicktime'];
    if (!validTypes.includes(file.type)) {
      showToast.error('Geçersiz format', 'Sadece MP4, MOV veya WebM formatları desteklenir.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Upload to Supabase Storage
      const url = await uploadReferenceVideo(user.id, file);
      
      setUploadProgress(100);
      setIsUploading(false);
      setUploadComplete(true);
      
      setTimeout(() => {
        setHasVideo(true);
        setReferenceVideoUrl(url);
        setUploadDate(new Date());
        setUploadComplete(false);
        showToast.success('Video yüklendi!', 'Referans videonuz başarıyla yüklendi.');
      }, 1500);
    } catch (error) {
      setIsUploading(false);
      setUploadProgress(0);
      showToast.error('Yükleme hatası', error instanceof Error ? error.message : 'Video yüklenirken bir hata oluştu.');
    }
  };

  const [deleteDialog, setDeleteDialog] = useState(false);

  const handleDeleteVideo = () => {
    setDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!user?.id || !referenceVideoUrl) {
      setHasVideo(false);
      setDeleteDialog(false);
      return;
    }

    try {
      // Extract path from URL and delete from storage
      // URL format: https://xxx.supabase.co/storage/v1/object/public/reference-videos/userId/filename
      const urlParts = referenceVideoUrl.split('/reference-videos/');
      if (urlParts.length > 1) {
        const path = `reference-videos/${urlParts[1]}`;
        // Note: deleteFile expects bucket and path separately
        // We need to extract the path correctly
        const pathParts = urlParts[1].split('/');
        if (pathParts.length >= 2) {
          const filePath = `${pathParts[0]}/${pathParts[1]}`;
          await deleteFile('reference-videos', filePath);
        }
      }

      setHasVideo(false);
      setReferenceVideoUrl(null);
      setDeleteDialog(false);
      showToast.success('Video silindi', 'Referans videonuz kaldırıldı.');
    } catch (error) {
      console.error('Error deleting video:', error);
      showToast.error('Silme hatası', 'Video silinirken bir hata oluştu.');
      setDeleteDialog(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">Referans Video</h1>
        <p className="text-muted-foreground mt-1">
          AI video oluşturmak için önce kendinizin bir referans videosunu yükleyin
        </p>
      </div>

      {/* Current Video or Upload Zone */}
      {hasVideo ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-xl border border-border bg-card"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Check className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h3 className="font-semibold">Referans Video Yüklendi</h3>
                <p className="text-sm text-muted-foreground">Video işlendi ve kullanıma hazır</p>
              </div>
            </div>
            <Badge className="bg-emerald-500/10 text-emerald-500">Aktif</Badge>
          </div>

          {/* Video Preview */}
          <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 mb-4 group">
            {referenceVideoUrl && (
              <video
                ref={videoRef}
                src={referenceVideoUrl}
                className="w-full h-full object-contain"
                controls={isPlaying}
                onLoadedMetadata={(e) => {
                  const video = e.currentTarget;
                  const duration = video.duration;
                  const minutes = Math.floor(duration / 60);
                  const seconds = Math.floor(duration % 60);
                  setVideoDuration(`${minutes}:${seconds.toString().padStart(2, '0')}`);
                }}
                onClick={() => setIsPlaying(true)}
              />
            )}
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 group-hover:bg-slate-900/30 transition-colors">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.play();
                      setIsPlaying(true);
                    }
                  }}
                  className="w-16 h-16 rounded-full bg-primary/90 hover:bg-primary flex items-center justify-center shadow-lg z-10"
                >
                  <Play className="w-7 h-7 text-primary-foreground ml-1" fill="currentColor" />
                </motion.button>
              </div>
            )}
            {videoDuration && (
              <div className="absolute bottom-4 right-4 px-2 py-1 rounded bg-black/70 text-white text-sm pointer-events-none">
                {videoDuration}
              </div>
            )}
          </div>

          {/* Video Info */}
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <div className="text-sm font-medium">Süre</div>
              <div className="text-xs text-muted-foreground">
                {videoDuration || 'Yükleniyor...'}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <div className="text-sm font-medium">Yüklenme</div>
              <div className="text-xs text-muted-foreground">
                {uploadDate ? new Date(uploadDate).toLocaleDateString('tr-TR') : 'Yakın zamanda'}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 gap-2">
              <RefreshCw className="w-4 h-4" />
              Yeni Video Yükle
            </Button>
            <Button 
              variant="outline" 
              className="text-destructive hover:text-destructive gap-2"
              onClick={handleDeleteVideo}
            >
              <Trash2 className="w-4 h-4" />
              Sil
            </Button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'relative p-8 rounded-xl border-2 border-dashed transition-all duration-300',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border bg-card hover:border-primary/50'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isUploading ? (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
              <h3 className="font-semibold mb-2">Video Yükleniyor...</h3>
              <div className="max-w-xs mx-auto">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2">{uploadProgress}%</p>
              </div>
            </div>
          ) : uploadComplete ? (
            <div className="text-center py-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4"
              >
                <Check className="w-8 h-8 text-emerald-500" />
              </motion.div>
              <h3 className="font-semibold mb-2">Yükleme Tamamlandı!</h3>
              <p className="text-sm text-muted-foreground">Video işleniyor...</p>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Referans Videonuzu Yükleyin</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Videoyu sürükleyip bırakın veya bilgisayarınızdan seçin
              </p>
              <label>
                <input
                  type="file"
                  accept="video/mp4,video/mov,video/webm"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Button asChild>
                  <span className="cursor-pointer">
                    <Video className="w-4 h-4 mr-2" />
                    Video Seç
                  </span>
                </Button>
              </label>
            </div>
          )}
        </motion.div>
      )}

      {/* Requirements */}
      <div className="p-6 rounded-xl border border-border bg-card">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-primary" />
          Video Gereksinimleri
        </h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {requirements.map((req) => (
            <div
              key={req.id}
              className={cn(
                'flex items-start gap-2 p-3 rounded-lg',
                req.important ? 'bg-primary/5' : 'bg-muted/50'
              )}
            >
              <Check className={cn(
                'w-4 h-4 mt-0.5 shrink-0',
                req.important ? 'text-primary' : 'text-muted-foreground'
              )} />
              <span className="text-sm">{req.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="p-6 rounded-xl border border-amber-500/30 bg-amber-500/5">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <span className="text-2xl">💡</span>
          İpuçları
        </h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• Doğal ve rahat konuşun, yazılı metin okumaktan kaçının</li>
          <li>• Kameraya doğrudan bakın, sanki bir öğrenciye ders anlatıyormuş gibi</li>
          <li>• El hareketleri kullanabilirsiniz ancak abartmayın</li>
          <li>• Gözlük kullanıyorsanız, yansımayı minimize edin</li>
          <li>• Sessiz bir ortamda kayıt yapın</li>
        </ul>
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={deleteDialog}
        onOpenChange={setDeleteDialog}
        onConfirm={handleDeleteConfirm}
        title="Referans Videoyu Sil"
        description="Referans videonuzu silmek istediğinize emin misiniz? Yeni video oluşturmak için tekrar yüklemeniz gerekecek."
        confirmText="Sil"
        cancelText="İptal"
        variant="destructive"
      />
    </div>
  );
}
