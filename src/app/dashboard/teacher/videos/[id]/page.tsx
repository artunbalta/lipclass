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
  QrCode,
  GitBranch,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { getVideos } from '@/lib/api/videos';
import type { Video } from '@/types';
import { useVideoStore } from '@/stores/video-store';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { SlidePlayer } from '@/components/dashboard';
import { getReferenceVideoUrl } from '@/lib/api/storage';
import { useAuthStore } from '@/stores/auth-store';
import { formatDuration, formatDate } from '@/lib/mock-data';
import { showToast } from '@/lib/utils/toast';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const statusMap = {
  draft: { label: 'Taslak', color: 'bg-muted text-muted-foreground' },
  slides_ready: { label: 'Slaytlar hazır', color: 'bg-indigo-500/10 text-indigo-500' },
  processing: { label: 'İşleniyor', color: 'bg-amber-500/10 text-amber-500' },
  published: { label: 'Yayında', color: 'bg-emerald-500/10 text-emerald-500' },
  failed: { label: 'Hata', color: 'bg-destructive/10 text-destructive' },
};

interface QuizStat {
  slideNumber: number;
  question: string;
  correctAnswer: number;
  options: string[];
  totalAttempts: number;
  correctCount: number;
  correctRate: number;
  optionCounts: [number, number, number, number];
}

export default function VideoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { selectedVideo, isLoading, fetchVideoById, deleteVideo } = useVideoStore();
  const { user } = useAuthStore();
  const [copied, setCopied] = useState(false);
  const [refVideoUrl, setRefVideoUrl] = useState<string | null>(null);
  const [quizStats, setQuizStats] = useState<QuizStat[] | null>(null);
  const [variants, setVariants] = useState<Video[]>([]);
  const [deriveOpen, setDeriveOpen] = useState(false);
  const [deriveLanguage, setDeriveLanguage] = useState<'tr' | 'en'>('en');
  const [deriveTone, setDeriveTone] = useState<'formal' | 'friendly' | 'energetic'>('friendly');
  const [deriveLabel, setDeriveLabel] = useState('İngilizce');
  const [deriving, setDeriving] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchVideoById(params.id as string);
    }
  }, [params.id, fetchVideoById]);

  // Fetch reference video URL for the teacher
  useEffect(() => {
    if (user?.id) {
      getReferenceVideoUrl(user.id).then((url) => {
        console.log('[VideoDetail] Reference video URL:', url);
        setRefVideoUrl(url);
      }).catch((err) => {
        console.error('[VideoDetail] Failed to get reference video:', err);
      });
    }
  }, [user?.id]);

  // Fetch quiz analytics when the video has quiz slides
  useEffect(() => {
    if (!selectedVideo?.id) return;
    const hasQuiz = selectedVideo.slidesData?.slides.some((s) => s.slideType === 'quiz');
    if (!hasQuiz) {
      setQuizStats([]);
      return;
    }
    fetch(`/api/teacher/quiz-analytics?videoId=${selectedVideo.id}`)
      .then((r) => (r.ok ? r.json() : { slides: [] }))
      .then((data) => setQuizStats(data.slides || []))
      .catch((err) => {
        console.warn('[VideoDetail] quiz analytics fetch failed:', err);
        setQuizStats([]);
      });
  }, [selectedVideo?.id, selectedVideo?.slidesData]);

  // Fetch variants — siblings under same parent, or children if we ARE the parent
  useEffect(() => {
    if (!selectedVideo?.id || !user?.id) return;
    (async () => {
      try {
        const all = await getVideos({ teacherId: user.id });
        const rootId = selectedVideo.parentVideoId || selectedVideo.id;
        const sibs = all.filter(
          (v: Video) => v.id !== selectedVideo.id && (v.id === rootId || v.parentVideoId === rootId)
        );
        setVariants(sibs);
      } catch (err) {
        console.warn('[VideoDetail] variants fetch failed:', err);
      }
    })();
  }, [selectedVideo?.id, selectedVideo?.parentVideoId, user?.id]);

  const handleDerive = async () => {
    if (!selectedVideo) return;
    const label = deriveLabel.trim();
    if (!label) {
      showToast.error('Etiket gerekli', 'Versiyon için kısa bir etiket gir.');
      return;
    }
    setDeriving(true);
    try {
      const resp = await fetch(`/api/videos/${selectedVideo.id}/derive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: deriveLanguage, tone: deriveTone, variantLabel: label }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err?.error || 'Türev oluşturulamadı');
      }
      const { videoId: newId } = await resp.json();
      showToast.success('Versiyon oluşturuldu', 'Editör açılıyor.');
      setDeriveOpen(false);
      router.push(`/dashboard/teacher/videos/${newId}/edit`);
    } catch (err) {
      showToast.error('Hata', err instanceof Error ? err.message : 'Bilinmeyen hata');
    } finally {
      setDeriving(false);
    }
  };

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
    navigator.clipboard.writeText(`https://app.chalk.com/watch/${params.id}`);
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
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge className={cn('text-xs', status.color)}>
                {status.label}
              </Badge>
              {selectedVideo.variantLabel && (
                <Badge className="text-xs bg-violet-500/10 text-violet-600 gap-1">
                  <GitBranch className="w-3 h-3" />
                  {selectedVideo.variantLabel}
                </Badge>
              )}
              <span className="text-sm text-muted-foreground">
                {formatDate(selectedVideo.createdAt)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => router.push(`/dashboard/teacher/videos/${selectedVideo.id}/edit`)}
          >
            <Edit className="w-4 h-4" />
            <span className="hidden sm:inline">Düzenle</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setDeriveOpen(true)}
            disabled={!selectedVideo.slidesData}
            title="Bu dersten farklı dil/ton versiyonu oluştur"
          >
            <GitBranch className="w-4 h-4" />
            <span className="hidden sm:inline">Versiyon</span>
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
        {/* Slide Player / Video Player */}
        <div className="lg:col-span-2 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {selectedVideo.slidesData && selectedVideo.slidesData.slides.length > 0 ? (
              <SlidePlayer
                slidesData={selectedVideo.slidesData}
                referenceVideoUrl={refVideoUrl}
                title={selectedVideo.title}
                videoId={selectedVideo.id}
              />
            ) : (
              <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center">
                <div className="text-center text-white/60">
                  <Play className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {selectedVideo.status === 'processing' 
                      ? 'Ders içeriği hazırlanıyor...'
                      : selectedVideo.status === 'failed'
                      ? 'Oluşturma başarısız oldu'
                      : 'İçerik henüz mevcut değil'}
                  </p>
                </div>
              </div>
            )}
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

          {/* Quiz Analytics */}
          {quizStats && quizStats.length > 0 && (
            <div className="p-6 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-1 flex items-center gap-2">
                ❓ Quiz Analitiği
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Her quiz için öğrencilerin cevap dağılımı.
              </p>

              <div className="space-y-5">
                {quizStats.map((q) => {
                  const total = Math.max(q.totalAttempts, 1);
                  return (
                    <div key={q.slideNumber} className="rounded-lg border border-border p-4">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <p className="text-sm font-medium line-clamp-2">
                          <span className="text-muted-foreground mr-1">#{q.slideNumber}</span>
                          {q.question || 'Soru metni boş'}
                        </p>
                        <Badge className={cn(
                          'text-xs shrink-0',
                          q.correctRate >= 80 ? 'bg-emerald-500/10 text-emerald-600'
                            : q.correctRate >= 50 ? 'bg-amber-500/10 text-amber-600'
                            : 'bg-rose-500/10 text-rose-600'
                        )}>
                          %{q.correctRate} doğru
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        {q.totalAttempts} cevap • {q.correctCount} doğru
                      </p>
                      <div className="space-y-1.5">
                        {q.options.map((opt, i) => {
                          const count = q.optionCounts[i] || 0;
                          const pct = Math.round((count / total) * 100);
                          const isCorrect = i === q.correctAnswer;
                          return (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <span className={cn(
                                'w-5 h-5 flex items-center justify-center rounded font-mono shrink-0',
                                isCorrect ? 'bg-emerald-500/20 text-emerald-700' : 'bg-muted text-muted-foreground'
                              )}>
                                {String.fromCharCode(65 + i)}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between mb-0.5">
                                  <span className="truncate">{opt || '—'}</span>
                                  <span className="text-muted-foreground ml-2">{count}</span>
                                </div>
                                <div className="h-1 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className={cn('h-full rounded-full', isCorrect ? 'bg-emerald-500' : 'bg-gray-400')}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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

          {/* Versions Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 }}
            className="p-6 rounded-xl border border-border bg-card"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <GitBranch className="w-4 h-4" /> Versiyonlar
              </h3>
              <Button size="sm" variant="outline" onClick={() => setDeriveOpen(true)} disabled={!selectedVideo.slidesData}>
                + Yeni
              </Button>
            </div>
            {variants.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                Bu dersin başka versiyonu yok. Farklı dil/ton ile türev oluşturabilirsin.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {variants.map((v) => (
                  <li key={v.id}>
                    <Link
                      href={`/dashboard/teacher/videos/${v.id}`}
                      className="flex items-center gap-2 text-xs hover:bg-muted/50 rounded-md p-2 transition-colors"
                    >
                      <Badge className="text-[10px] bg-violet-500/10 text-violet-600 shrink-0">
                        {v.variantLabel || (v.id === selectedVideo.parentVideoId ? 'Orijinal' : 'Versiyon')}
                      </Badge>
                      <span className="flex-1 truncate">{v.title}</span>
                      <span className="text-[10px] text-muted-foreground">{v.language?.toUpperCase()}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
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

      {/* Derive Dialog */}
      <Dialog open={deriveOpen} onOpenChange={setDeriveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Versiyon Oluştur</DialogTitle>
            <DialogDescription>
              Aynı slayt yapısından farklı bir dil/ton versiyonu üret. Slaytlar kopyalanır;
              ses ve video versiyon onaylandığında yeniden üretilir.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Etiket</Label>
              <Input
                value={deriveLabel}
                onChange={(e) => setDeriveLabel(e.target.value)}
                placeholder="Örn: İngilizce, İlkokul seviyesi, Resmi ton..."
              />
              <p className="text-[11px] text-muted-foreground">
                Bu etiket video kartında ve listede gösterilir.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Dil</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={deriveLanguage === 'tr' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDeriveLanguage('tr')}
                >
                  🇹🇷 Türkçe
                </Button>
                <Button
                  type="button"
                  variant={deriveLanguage === 'en' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDeriveLanguage('en')}
                >
                  🇬🇧 English
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Ton</Label>
              <div className="flex gap-2">
                {([
                  { value: 'formal', label: 'Resmi' },
                  { value: 'friendly', label: 'Samimi' },
                  { value: 'energetic', label: 'Enerjik' },
                ] as const).map((t) => (
                  <Button
                    key={t.value}
                    type="button"
                    variant={deriveTone === t.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDeriveTone(t.value)}
                  >
                    {t.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
              💡 Versiyon "slides_ready" durumunda oluşacak. Anlatımı yeni dile çevirip
              kaydet, sonra "Onayla ve Üret" ile sesi/lipsync'i üret.
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeriveOpen(false)} disabled={deriving}>
              İptal
            </Button>
            <Button onClick={handleDerive} disabled={deriving} className="gap-2">
              {deriving ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitBranch className="w-4 h-4" />}
              Versiyon Oluştur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
