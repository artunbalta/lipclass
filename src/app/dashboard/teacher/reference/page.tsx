'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Video,
  Check,
  AlertCircle,
  Loader2,
  Play,
  Trash2,
  RefreshCw,
  Mic2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useAuthStore } from '@/stores/auth-store';
import { showToast } from '@/lib/utils/toast';
import { cn } from '@/lib/utils';
import { uploadReferenceVideo, getReferenceVideoUrl, deleteFile } from '@/lib/api/storage';
import { createClient } from '@/lib/supabase/client';

const requirements = [
  { id: 1, text: 'Minimum 1 dakika, ideal 2-3 dakika süre', important: true },
  { id: 2, text: 'Yüzünüz net görünmeli, gözleriniz kameraya bakmalı', important: true },
  { id: 3, text: 'Düz ve sade arka plan tercih edin', important: false },
  { id: 4, text: 'Doğal ışık veya iyi aydınlatma kullanın', important: false },
  { id: 5, text: 'Net ve anlaşılır konuşun (ses klonu için kritik)', important: true },
  { id: 6, text: 'Sessiz bir ortamda kayıt yapın', important: true },
  { id: 7, text: 'MP4, MOV veya WebM formatında yükleyin', important: false },
  { id: 8, text: 'Maksimum dosya boyutu: 500MB', important: false },
];

type VoiceStatus =
  | 'none'
  | 'uploading'
  | 'extracting_audio'
  | 'cloning_voice'
  | 'awaiting_approval'
  | 'ready'
  | 'failed';

interface VoiceCloneState {
  status: VoiceStatus;
  hasActiveClone: boolean;
  hasPendingClone: boolean;
  pendingTestAudioUrl: string | null;
  consentAt: string | null;
  lastUsedAt: string | null;
}

const STAGE_LABELS: Record<VoiceStatus, { title: string; subtitle: string }> = {
  none: { title: '', subtitle: '' },
  uploading: { title: 'Video yükleniyor', subtitle: '' },
  extracting_audio: {
    title: 'Ses ayıklanıyor',
    subtitle: 'Referans videondan konuşma sesi çıkarılıyor — ~30 sn',
  },
  cloning_voice: {
    title: 'Ses modeli oluşturuluyor',
    subtitle: 'ElevenLabs sesini öğreniyor — ~1 dk',
  },
  awaiting_approval: {
    title: 'Onayına hazır 🎙️',
    subtitle: 'Aşağıdaki örneği dinle, beğenirsen onayla.',
  },
  ready: {
    title: 'Sesin hazır',
    subtitle: 'Üreteceğin tüm derslerde varsayılan olarak kullanılacak.',
  },
  failed: { title: 'Bir şey ters gitti', subtitle: 'Aşağıdan yeniden dene.' },
};

export default function ReferenceVideoPage() {
  const { user } = useAuthStore();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);
  const [referenceVideoUrl, setReferenceVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoDuration, setVideoDuration] = useState<string>('');
  const [uploadDate, setUploadDate] = useState<Date | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Voice clone state
  const [voiceState, setVoiceState] = useState<VoiceCloneState | null>(null);
  const [consentOpen, setConsentOpen] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [pendingUploadUrl, setPendingUploadUrl] = useState<string | null>(null);
  const [isRetestingVoice, setIsRetestingVoice] = useState(false);
  const [isActingOnClone, setIsActingOnClone] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteCloneDialog, setDeleteCloneDialog] = useState(false);

  // ── Initial load ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    (async () => {
      const url = await getReferenceVideoUrl(user.id).catch(() => null);
      if (url) {
        setHasVideo(true);
        setReferenceVideoUrl(url);
        setUploadDate(new Date());
      }
    })();

    fetch('/api/teacher/voice-clone')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: VoiceCloneState | null) => {
        if (data) setVoiceState(data);
      })
      .catch(() => {});
  }, [user?.id]);

  // ── Realtime: subscribe to profiles updates so status flips live ───────
  useEffect(() => {
    if (!user?.id) return;
    const sb = createClient();
    const ch = sb
      .channel(`profile-voice-${user.id}`)
      .on(
        'postgres_changes' as never,
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const row = payload.new as {
            reference_video_status?: VoiceStatus;
            elevenlabs_voice_id?: string | null;
            voice_pending_voice_id?: string | null;
            voice_pending_test_audio_url?: string | null;
            voice_consent_at?: string | null;
            voice_last_used_at?: string | null;
          };
          setVoiceState({
            status: (row.reference_video_status as VoiceStatus) ?? 'none',
            hasActiveClone: !!row.elevenlabs_voice_id,
            hasPendingClone: !!row.voice_pending_voice_id,
            pendingTestAudioUrl: row.voice_pending_test_audio_url ?? null,
            consentAt: row.voice_consent_at ?? null,
            lastUsedAt: row.voice_last_used_at ?? null,
          });
        },
      )
      .subscribe();

    return () => {
      sb.removeChannel(ch);
    };
  }, [user?.id]);

  // ── Upload (raw file → Supabase) ───────────────────────────────────────
  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!user?.id) {
        showToast.error('Hata', 'Giriş yapmanız gerekiyor.');
        return;
      }

      const maxSize = 500 * 1024 * 1024;
      if (file.size > maxSize) {
        showToast.error('Dosya çok büyük', 'Maksimum 500MB.');
        return;
      }
      const validTypes = ['video/mp4', 'video/mov', 'video/webm', 'video/quicktime'];
      if (!validTypes.includes(file.type)) {
        showToast.error('Geçersiz format', 'Sadece MP4, MOV veya WebM desteklenir.');
        return;
      }

      setIsUploading(true);
      setUploadProgress(0);
      try {
        const url = await uploadReferenceVideo(user.id, file);
        setUploadProgress(100);
        setIsUploading(false);
        setHasVideo(true);
        setReferenceVideoUrl(url);
        setUploadDate(new Date());

        // Trigger consent modal BEFORE kicking off the clone job.
        setPendingUploadUrl(url);
        setConsentOpen(true);
        showToast.success('Video yüklendi', 'Sesini klonlamaya devam etmek için onay ver.');
      } catch (err) {
        setIsUploading(false);
        setUploadProgress(0);
        showToast.error(
          'Yükleme hatası',
          err instanceof Error ? err.message : 'Video yüklenirken bir hata oluştu.',
        );
      }
    },
    [user?.id],
  );

  // ── Consent → start clone job ──────────────────────────────────────────
  const startCloneJob = async () => {
    if (!pendingUploadUrl || !consentChecked) return;
    try {
      const res = await fetch('/api/teacher/voice-clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referenceVideoUrl: pendingUploadUrl,
          consent: true,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Sunucu hatası ${res.status}`);
      }
      setConsentOpen(false);
      setConsentChecked(false);
      showToast.success('Onay alındı', 'Sesin hazırlanıyor. Bittiğinde bildirim göndereceğim.');
    } catch (err) {
      showToast.error('Hata', err instanceof Error ? err.message : 'Başlatılamadı');
    }
  };

  // ── Approve / reject / retest ──────────────────────────────────────────
  const handleApprove = async () => {
    setIsActingOnClone(true);
    try {
      const res = await fetch('/api/teacher/voice-clone/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: 'approve' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Onay başarısız');
      }
      showToast.success('Onaylandı', 'Yeni derslerinde kendi sesini kullanabilirsin.');
    } catch (err) {
      showToast.error('Hata', err instanceof Error ? err.message : 'İşlenemedi');
    } finally {
      setIsActingOnClone(false);
    }
  };

  const handleReject = async () => {
    setIsActingOnClone(true);
    try {
      const res = await fetch('/api/teacher/voice-clone/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: 'reject' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Reddetme başarısız');
      }
      showToast.success('Klon reddedildi', 'Eski klonun (varsa) korundu.');
    } catch (err) {
      showToast.error('Hata', err instanceof Error ? err.message : 'İşlenemedi');
    } finally {
      setIsActingOnClone(false);
    }
  };

  const handleRetest = async () => {
    setIsRetestingVoice(true);
    try {
      const res = await fetch('/api/teacher/voice-clone/test', { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Test başarısız');
      }
    } catch (err) {
      showToast.error('Hata', err instanceof Error ? err.message : 'Test sesi alınamadı');
    } finally {
      setIsRetestingVoice(false);
    }
  };

  const handleDeleteClone = async () => {
    setIsActingOnClone(true);
    try {
      const res = await fetch('/api/teacher/voice-clone', { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Silinemedi');
      }
      setDeleteCloneDialog(false);
      showToast.success('Ses klonu silindi', 'KVKK silme hakkın uygulandı.');
    } catch (err) {
      showToast.error('Hata', err instanceof Error ? err.message : 'Silme başarısız');
    } finally {
      setIsActingOnClone(false);
    }
  };

  // ── Drag-drop helpers ──────────────────────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) handleFileUpload(e.dataTransfer.files[0]);
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) handleFileUpload(e.target.files[0]);
  };

  // ── Delete reference video ─────────────────────────────────────────────
  const handleDeleteVideo = () => setDeleteDialog(true);
  const handleDeleteConfirm = async () => {
    if (!user?.id || !referenceVideoUrl) {
      setHasVideo(false);
      setDeleteDialog(false);
      return;
    }
    try {
      const urlParts = referenceVideoUrl.split('/reference-videos/');
      if (urlParts.length > 1) {
        const pathParts = urlParts[1].split('/');
        if (pathParts.length >= 2) {
          await deleteFile('reference-videos', `${pathParts[0]}/${pathParts[1]}`);
        }
      }
      setHasVideo(false);
      setReferenceVideoUrl(null);
      setDeleteDialog(false);
      showToast.success('Video silindi', 'Referans videon kaldırıldı.');
    } catch (err) {
      console.error(err);
      showToast.error('Silme hatası', 'Video silinirken bir hata oluştu.');
      setDeleteDialog(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  const status: VoiceStatus = voiceState?.status ?? 'none';
  const isProcessing = status === 'extracting_audio' || status === 'cloning_voice';

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">Referans Video & Ses Klonu</h1>
        <p className="text-muted-foreground mt-1">
          Referans videodan yüzünü hareket ettirip sesini klonlayacağız.
        </p>
      </div>

      {/* Voice clone status banner */}
      {voiceState && status !== 'none' && (
        <VoiceStatusBanner
          state={voiceState}
          isProcessing={isProcessing}
          isRetestingVoice={isRetestingVoice}
          isActing={isActingOnClone}
          onApprove={handleApprove}
          onReject={handleReject}
          onRetest={handleRetest}
          onDelete={() => setDeleteCloneDialog(true)}
        />
      )}

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
                <p className="text-sm text-muted-foreground">
                  Yeni video yüklersen onayla, ses klonu yenilenir.
                </p>
              </div>
            </div>
            <Badge className="bg-emerald-500/10 text-emerald-500">Aktif</Badge>
          </div>

          <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 mb-4 group">
            {referenceVideoUrl ? (
              <>
                <video
                  ref={videoRef}
                  src={referenceVideoUrl}
                  className="w-full h-full object-contain"
                  controls={isPlaying}
                  onLoadedMetadata={(e) => {
                    const v = e.currentTarget;
                    const mm = Math.floor(v.duration / 60);
                    const ss = Math.floor(v.duration % 60);
                    setVideoDuration(`${mm}:${ss.toString().padStart(2, '0')}`);
                  }}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
                {!isPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 group-hover:bg-slate-900/30 transition-colors pointer-events-none">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        videoRef.current?.play();
                        setIsPlaying(true);
                      }}
                      className="w-16 h-16 rounded-full bg-primary/90 hover:bg-primary flex items-center justify-center shadow-lg pointer-events-auto"
                    >
                      <Play className="w-7 h-7 text-primary-foreground ml-1" fill="currentColor" />
                    </motion.button>
                  </div>
                )}
                {videoDuration && !isPlaying && (
                  <div className="absolute bottom-4 right-4 px-2 py-1 rounded bg-black/70 text-white text-sm pointer-events-none z-20">
                    {videoDuration}
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
              </div>
            )}
          </div>

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
                {uploadDate ? new Date(uploadDate).toLocaleDateString('tr-TR') : '—'}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <label className="flex-1">
              <input
                type="file"
                accept="video/mp4,video/mov,video/webm"
                className="hidden"
                onChange={handleFileSelect}
                disabled={isProcessing}
              />
              <Button variant="outline" className="w-full gap-2" asChild>
                <span className="cursor-pointer">
                  <RefreshCw className="w-4 h-4" />
                  Yeni Video Yükle
                </span>
              </Button>
            </label>
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
              : 'border-border bg-card hover:border-primary/50',
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
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Referans Videonu Yükle</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Videoyu sürükleyip bırak veya seç. Yükledikten sonra ses klonlama onayı isteyeceğiz.
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
                req.important ? 'bg-primary/5' : 'bg-muted/50',
              )}
            >
              <Check
                className={cn(
                  'w-4 h-4 mt-0.5 shrink-0',
                  req.important ? 'text-primary' : 'text-muted-foreground',
                )}
              />
              <span className="text-sm">{req.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Consent modal */}
      <AnimatePresence>
        {consentOpen && (
          <ConsentModal
            checked={consentChecked}
            onChange={setConsentChecked}
            onConfirm={startCloneJob}
            onClose={() => {
              setConsentOpen(false);
              setConsentChecked(false);
              setPendingUploadUrl(null);
            }}
          />
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={deleteDialog}
        onOpenChange={setDeleteDialog}
        onConfirm={handleDeleteConfirm}
        title="Referans Videoyu Sil"
        description="Referans videon silinecek. Ses klonu ayrıca silinmez — onu da silmek istersen 'Ses Klonumu Sil' butonunu kullan."
        confirmText="Sil"
        cancelText="İptal"
        variant="destructive"
      />

      <ConfirmDialog
        open={deleteCloneDialog}
        onOpenChange={setDeleteCloneDialog}
        onConfirm={handleDeleteClone}
        title="Ses Klonunu Sil"
        description="ElevenLabs'te tutulan ses modelin ve ses örneğin kalıcı olarak silinecek. Bu KVKK kapsamındaki silme hakkındır."
        confirmText="Klonu Sil"
        cancelText="İptal"
        variant="destructive"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VoiceStatusBanner — live progress + approval CTAs
// ─────────────────────────────────────────────────────────────────────────────

function VoiceStatusBanner({
  state,
  isProcessing,
  isRetestingVoice,
  isActing,
  onApprove,
  onReject,
  onRetest,
  onDelete,
}: {
  state: VoiceCloneState;
  isProcessing: boolean;
  isRetestingVoice: boolean;
  isActing: boolean;
  onApprove: () => void;
  onReject: () => void;
  onRetest: () => void;
  onDelete: () => void;
}) {
  const label = STAGE_LABELS[state.status];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 rounded-xl border border-primary/20 bg-primary/5"
    >
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
          {state.status === 'ready' ? (
            <Mic2 className="w-5 h-5 text-primary" />
          ) : state.status === 'failed' ? (
            <AlertCircle className="w-5 h-5 text-destructive" />
          ) : isProcessing ? (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          ) : (
            <Mic2 className="w-5 h-5 text-primary" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold">{label.title}</h3>
            {state.status === 'ready' && (
              <Badge className="bg-emerald-500/15 text-emerald-600">Onaylı</Badge>
            )}
            {state.status === 'awaiting_approval' && (
              <Badge className="bg-amber-500/15 text-amber-600">Onayını Bekliyor</Badge>
            )}
          </div>
          {label.subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{label.subtitle}</p>
          )}

          {/* Awaiting approval: audio player + Approve/Reject/Retest */}
          {state.status === 'awaiting_approval' && state.pendingTestAudioUrl && (
            <div className="mt-4 space-y-3">
              <audio
                src={state.pendingTestAudioUrl}
                controls
                preload="none"
                className="w-full"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={onApprove}
                  disabled={isActing}
                >
                  {isActing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Onayla ve Kullan
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={onRetest}
                  disabled={isRetestingVoice || isActing}
                >
                  {isRetestingVoice ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Tekrar Dinlet
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2 text-destructive hover:text-destructive"
                  onClick={onReject}
                  disabled={isActing}
                >
                  <X className="w-4 h-4" />
                  Reddet
                </Button>
              </div>
            </div>
          )}

          {/* Ready: existing clone management */}
          {state.status === 'ready' && state.hasActiveClone && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={onRetest}
                disabled={isRetestingVoice}
              >
                {isRetestingVoice ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Sesini Dinle
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive gap-2"
                onClick={onDelete}
              >
                <Trash2 className="w-4 h-4" />
                Ses Klonumu Sil
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ConsentModal — KVKK açık rıza
// ─────────────────────────────────────────────────────────────────────────────

function ConsentModal({
  checked,
  onChange,
  onConfirm,
  onClose,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <Mic2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Ses Klonlama Onayı</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              KVKK md. 6 — Özel nitelikli kişisel veri (biyometrik) işleme rızası
            </p>
          </div>
        </div>

        <div className="text-sm text-muted-foreground space-y-3 leading-relaxed">
          <p>
            Yüklediğin videodan sesin <strong>ayıklanacak</strong> ve ElevenLabs servisinde sadece
            sana özel bir dijital ses modeli (klon) oluşturulacak.
          </p>
          <ul className="space-y-1.5 list-disc list-inside ml-1">
            <li>Ses örneğin özel bucket'ta saklanır; sadece bu hesap erişebilir.</li>
            <li>Klon yalnızca senin oluşturacağın derslerde TTS olarak kullanılır.</li>
            <li>
              <strong>İstediğin zaman silebilirsin</strong> — Ayarlar &gt; Ses Klonumu Sil.
            </li>
            <li>30 gün hiç kullanılmayan klonlar otomatik silinir.</li>
            <li>Onay tarihi ve metin sürümü hesabına kaydedilir.</li>
          </ul>
        </div>

        <label className="flex items-start gap-3 mt-5 p-3 rounded-lg bg-muted/50 cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-input text-primary"
          />
          <span className="text-sm">
            6698 sayılı KVKK kapsamında biyometrik ses verimi yukarıdaki amaçla işlenmesine{' '}
            <strong>açık rıza</strong> veriyorum.
          </span>
        </label>

        <div className="mt-5 flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>
            Vazgeç
          </Button>
          <Button onClick={onConfirm} disabled={!checked}>
            Onaylıyorum ve Devam Et
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
