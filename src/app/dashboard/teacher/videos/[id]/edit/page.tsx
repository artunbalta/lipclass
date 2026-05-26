'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  HelpCircle,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Volume2,
  Wand2,
  X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import SlideRenderer from '@/components/dashboard/SlideRenderer';
import { KazanimPicker } from '@/components/shared/KazanimPicker';
import { useAuthStore } from '@/stores/auth-store';
import { getVideoById, updateVideo } from '@/lib/api/videos';
import { getReferenceVideoUrl } from '@/lib/api/storage';
import { persistSlideEdits, regenerateSlide, generateQuizForSlide } from '@/lib/api/generation';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';
import { showToast } from '@/lib/utils/toast';
import { cn } from '@/lib/utils';
import type { Slide, Video } from '@/types';

// Mirrors the server-side stages written to videos.generation_progress
interface ServerProgress {
  stage:
    | 'queued'
    | 'creating_audio'
    | 'creating_lipsync'
    | 'creating_animations'
    | 'ingesting_bunny'
    | 'saving'
    | 'completed'
    | 'failed';
  progress: number;
  currentSlide?: number;
  totalSlides?: number;
  error?: string;
  updatedAt?: string;
}

export default function EditVideoPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.id as string;
  const { user } = useAuthStore();

  const [video, setVideo] = useState<Video | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [regeneratingIdx, setRegeneratingIdx] = useState<number | null>(null);
  const [regenFeedback, setRegenFeedback] = useState('');
  const [regenModalOpen, setRegenModalOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeProgress, setFinalizeProgress] = useState<ServerProgress>({ stage: 'queued', progress: 0 });
  const [generatingQuizForIdx, setGeneratingQuizForIdx] = useState<number | null>(null);
  const [curriculumCodes, setCurriculumCodes] = useState<string[]>([]);
  const [curriculumSaving, setCurriculumSaving] = useState(false);

  // ── Load video ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const v = await getVideoById(videoId);
        if (cancelled) return;
        if (!v) {
          showToast.error('Bulunamadı', 'Video bulunamadı.');
          router.push('/dashboard/teacher/videos');
          return;
        }
        setVideo(v);
        setSlides(v.slidesData?.slides || []);
        setCurriculumCodes(v.curriculumCodes || []);
      } catch (err) {
        console.error('[Editor] Load failed:', err);
        showToast.error('Yüklenemedi', err instanceof Error ? err.message : 'Bilinmeyen hata');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [videoId, router]);

  const currentSlide = slides[selectedIdx];
  const siblingTitles = useMemo(() => slides.map((s) => s.title), [slides]);
  const dirtyCount = dirty.size;

  // ── Slide mutation helpers ──
  const markDirty = useCallback((slideNumber: number) => {
    setDirty((prev) => {
      if (prev.has(slideNumber)) return prev;
      const next = new Set(prev);
      next.add(slideNumber);
      return next;
    });
  }, []);

  const updateCurrent = useCallback(
    (mut: (s: Slide) => Slide) => {
      setSlides((prev) => {
        const next = [...prev];
        const orig = next[selectedIdx];
        const updated = mut(orig);
        const narrationChanged = updated.narrationText !== orig.narrationText;
        next[selectedIdx] = {
          ...updated,
          editedAt: new Date().toISOString(),
          narrationDirtyAt: narrationChanged
            ? new Date().toISOString()
            : updated.narrationDirtyAt,
        };
        return next;
      });
      markDirty(slides[selectedIdx]?.slideNumber);
    },
    [selectedIdx, slides, markDirty]
  );

  const handleTitleChange = (value: string) =>
    updateCurrent((s) => ({ ...s, title: value }));
  const handleContentChange = (value: string) =>
    updateCurrent((s) => ({ ...s, content: value }));
  const handleNarrationChange = (value: string) =>
    updateCurrent((s) => ({ ...s, narrationText: value }));

  const handleBulletChange = (idx: number, value: string) =>
    updateCurrent((s) => {
      const next = [...s.bulletPoints];
      next[idx] = value;
      return { ...s, bulletPoints: next };
    });
  const handleBulletAdd = () =>
    updateCurrent((s) => ({ ...s, bulletPoints: [...s.bulletPoints, ''] }));
  const handleBulletRemove = (idx: number) =>
    updateCurrent((s) => ({
      ...s,
      bulletPoints: s.bulletPoints.filter((_, i) => i !== idx),
    }));

  // ── Quiz helpers ──
  const renumberSlides = (arr: Slide[]): Slide[] =>
    arr.map((s, i) => ({ ...s, slideNumber: i + 1 }));

  const insertSlideAfter = (idx: number, newSlide: Slide) => {
    setSlides((prev) => {
      const next = [...prev.slice(0, idx + 1), newSlide, ...prev.slice(idx + 1)];
      return renumberSlides(next);
    });
    // Mark all touched (numbers shifted) — easy: mark them all as dirty
    setDirty((prev) => {
      const next = new Set(prev);
      for (let i = 0; i <= slides.length; i++) next.add(i + 1);
      return next;
    });
    setSelectedIdx(idx + 1);
  };

  const handleAddBlankQuiz = () => {
    const blank: Slide = {
      slideNumber: 0, // will be renumbered
      title: 'Yeni Quiz',
      content: '',
      bulletPoints: [],
      narrationText: '',
      slideType: 'quiz',
      quiz: {
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        explanation: '',
      },
      editedAt: new Date().toISOString(),
    };
    insertSlideAfter(selectedIdx, blank);
  };

  const handleGenerateQuizFromCurrent = async () => {
    if (!video || !currentSlide) return;
    setGeneratingQuizForIdx(selectedIdx);
    try {
      const quiz = await generateQuizForSlide({
        topic: video.topic,
        language: 'tr',
        sourceSlide: {
          title: currentSlide.title,
          content: currentSlide.content,
          bulletPoints: currentSlide.bulletPoints,
        },
        difficulty: video.difficulty,
      });
      const newSlide: Slide = {
        slideNumber: 0,
        title: `Quiz — ${currentSlide.title}`.slice(0, 80),
        content: '',
        bulletPoints: [],
        narrationText: '',
        slideType: 'quiz',
        quiz,
        editedAt: new Date().toISOString(),
      };
      insertSlideAfter(selectedIdx, newSlide);
      showToast.success('Quiz oluşturuldu', 'Düzenleyip kaydet, ya da olduğu gibi bırak.');
    } catch (err) {
      showToast.error('Quiz hatası', err instanceof Error ? err.message : 'Bilinmeyen hata');
    } finally {
      setGeneratingQuizForIdx(null);
    }
  };

  const handleDeleteSlide = (idx: number) => {
    if (slides.length <= 1) {
      showToast.error('Silinemez', 'En az 1 slayt olmalı.');
      return;
    }
    setSlides((prev) => renumberSlides(prev.filter((_, i) => i !== idx)));
    setSelectedIdx((cur) => Math.max(0, cur >= idx ? cur - 1 : cur));
    setDirty((prev) => {
      const next = new Set(prev);
      for (let i = 1; i <= slides.length; i++) next.add(i);
      return next;
    });
  };

  // Quiz field handlers (only valid when slideType==='quiz')
  const handleQuizQuestion = (value: string) =>
    updateCurrent((s) => ({ ...s, quiz: { ...(s.quiz || { question: '', options: ['', '', '', ''], correctAnswer: 0 }), question: value } as Slide['quiz'] }));

  const handleQuizOption = (optIdx: number, value: string) =>
    updateCurrent((s) => {
      const cur = s.quiz || { question: '', options: ['', '', '', ''] as [string, string, string, string], correctAnswer: 0 as 0 | 1 | 2 | 3 };
      const newOpts = [...cur.options] as [string, string, string, string];
      newOpts[optIdx] = value;
      return { ...s, quiz: { ...cur, options: newOpts } };
    });

  const handleQuizCorrect = (optIdx: 0 | 1 | 2 | 3) =>
    updateCurrent((s) => {
      const cur = s.quiz || { question: '', options: ['', '', '', ''] as [string, string, string, string], correctAnswer: 0 as 0 | 1 | 2 | 3 };
      return { ...s, quiz: { ...cur, correctAnswer: optIdx } };
    });

  const handleQuizExplanation = (value: string) =>
    updateCurrent((s) => {
      const cur = s.quiz || { question: '', options: ['', '', '', ''] as [string, string, string, string], correctAnswer: 0 as 0 | 1 | 2 | 3 };
      return { ...s, quiz: { ...cur, explanation: value } };
    });

  // ── Save edits ──
  const handleSaveAll = async () => {
    if (dirtyCount === 0) return;
    setSaving(true);
    try {
      await persistSlideEdits(videoId, { slides });
      setDirty(new Set());
      showToast.success('Kaydedildi', `${dirtyCount} slayttaki değişiklikler kaydedildi.`);
    } catch (err) {
      showToast.error('Kayıt hatası', err instanceof Error ? err.message : 'Bilinmeyen hata');
    } finally {
      setSaving(false);
    }
  };

  // ── Regenerate one slide ──
  const openRegenModal = () => {
    setRegenFeedback('');
    setRegenModalOpen(true);
  };

  const handleRegenerate = async () => {
    if (!video || !currentSlide) return;
    setRegenModalOpen(false);
    setRegeneratingIdx(selectedIdx);

    try {
      const newSlide = await regenerateSlide({
        topic: video.topic,
        description: video.description,
        language: 'tr',
        tone: 'friendly',
        slideNumber: currentSlide.slideNumber,
        totalSlides: slides.length,
        currentSlide,
        siblingTitles,
        feedback: regenFeedback || undefined,
      });

      setSlides((prev) => {
        const next = [...prev];
        next[selectedIdx] = newSlide;
        return next;
      });
      markDirty(currentSlide.slideNumber);
      showToast.success('Slayt güncellendi', 'Yeniden üretilen içerik yüklendi. Beğenirsen kaydet.');
    } catch (err) {
      showToast.error('Yeniden üretme hatası', err instanceof Error ? err.message : 'Bilinmeyen hata');
    } finally {
      setRegeneratingIdx(null);
    }
  };

  // ── Approve & finalize (server-side, Realtime progress) ──
  const handleFinalize = async () => {
    if (!video || !user) return;

    // Save edits first if anything is unsaved
    if (dirtyCount > 0) {
      try {
        await persistSlideEdits(videoId, { slides });
        setDirty(new Set());
      } catch (err) {
        showToast.error('Kayıt hatası', err instanceof Error ? err.message : 'Bilinmeyen hata');
        return;
      }
    }

    setFinalizing(true);
    setFinalizeProgress({ stage: 'queued', progress: 0 });

    try {
      const refVideoUrl = await getReferenceVideoUrl(user.id);

      const resp = await fetch(`/api/videos/${videoId}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referenceVideoUrl: refVideoUrl || undefined,
          incremental: true,
        }),
      });

      if (!resp.ok && resp.status !== 202) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err?.error || 'Finalize başlatılamadı');
      }
      // Progress updates arrive via Realtime subscription below.
    } catch (err) {
      setFinalizeProgress({
        stage: 'failed',
        progress: 0,
        error: err instanceof Error ? err.message : 'Bilinmeyen hata',
      });
      showToast.error('Üretim hatası', err instanceof Error ? err.message : 'Bilinmeyen hata');
    }
  };

  // ── Realtime: listen for videos.generation_progress updates ──
  useEffect(() => {
    if (!finalizing) return;

    const sb = createSupabaseClient();
    const channel = sb
      .channel(`video-${videoId}-finalize`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        { event: 'UPDATE', schema: 'public', table: 'videos', filter: `id=eq.${videoId}` },
        (payload: { new: Record<string, unknown> }) => {
          const newRow = payload.new as { generation_progress?: ServerProgress | null; status?: string };
          if (newRow.generation_progress) {
            setFinalizeProgress(newRow.generation_progress);
          }
          if (newRow.status === 'published') {
            showToast.success('Ders yayında!', 'Tüm slaytlar için ses ve video hazır.');
            setTimeout(() => router.push(`/dashboard/teacher/videos`), 1500);
          }
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [finalizing, videoId, router]);

  // ── Loading state ──
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <div className="grid grid-cols-12 gap-4">
          <Skeleton className="col-span-2 h-96" />
          <Skeleton className="col-span-6 h-96" />
          <Skeleton className="col-span-4 h-96" />
        </div>
      </div>
    );
  }

  if (!video || slides.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Düzenlenecek slayt bulunamadı.</p>
        <Button className="mt-4" onClick={() => router.push('/dashboard/teacher/videos')}>
          Videolar Sayfasına Dön
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard/teacher/videos')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl lg:text-2xl font-bold truncate">{video.title}</h1>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-[10px]">{video.subject}</Badge>
              <span>{video.grade}. Sınıf</span>
              <span>•</span>
              <span>{slides.length} slayt</span>
              {dirtyCount > 0 && (
                <span className="text-amber-500 font-medium">
                  • {dirtyCount} kaydedilmemiş değişiklik
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            disabled={dirtyCount === 0 || saving}
            onClick={handleSaveAll}
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
            Kaydet
          </Button>
        </div>
      </div>

      {/* Main grid: slide list | editor | preview */}
      <div className="grid grid-cols-12 gap-4">
        {/* Slide list */}
        <div className="col-span-12 lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-2 max-h-[calc(100vh-12rem)] overflow-y-auto">
            {slides.map((s, i) => {
              const isDirty = dirty.has(s.slideNumber);
              const isSelected = i === selectedIdx;
              const isRegen = regeneratingIdx === i;
              const narrationDirty = !!s.narrationDirtyAt;
              return (
                <button
                  key={s.slideNumber}
                  onClick={() => setSelectedIdx(i)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 transition-colors mb-0.5',
                    isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted'
                  )}
                >
                  <span className={cn(
                    'flex items-center justify-center w-6 h-6 rounded text-xs font-mono shrink-0',
                    isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  )}>
                    {s.slideNumber}
                  </span>
                  <span className="text-xs truncate flex-1">{s.title || `Slayt ${s.slideNumber}`}</span>
                  {s.slideType === 'quiz' && (
                    <HelpCircle className="w-3 h-3 text-indigo-500 shrink-0" />
                  )}
                  {isRegen && <Loader2 className="w-3 h-3 animate-spin text-primary shrink-0" />}
                  {!isRegen && isDirty && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Kaydedilmemiş" />
                  )}
                  {!isRegen && narrationDirty && (
                    <Volume2 className="w-3 h-3 text-amber-500 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Editor */}
        <div className="col-span-12 lg:col-span-6">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">
                  Slayt {currentSlide.slideNumber} / {slides.length}
                </h3>
                {currentSlide.slideType === 'quiz' && (
                  <Badge className="bg-indigo-500/10 text-indigo-600 gap-1 text-[10px]">
                    <HelpCircle className="w-3 h-3" /> Quiz
                  </Badge>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                {currentSlide.slideType !== 'quiz' && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleGenerateQuizFromCurrent}
                      disabled={generatingQuizForIdx === selectedIdx}
                      className="gap-2"
                      title="Bu slaytın içeriğinden LLM ile bir quiz üret ve sonraya ekle"
                    >
                      {generatingQuizForIdx === selectedIdx ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <HelpCircle className="w-3.5 h-3.5" />
                      )}
                      Quiz Oluştur (LLM)
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={openRegenModal}
                      disabled={regeneratingIdx === selectedIdx}
                      className="gap-2"
                    >
                      {regeneratingIdx === selectedIdx ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      Yeniden üret
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddBlankQuiz}
                  className="gap-2"
                  title="Boş bir quiz slayt ekle"
                >
                  <Plus className="w-3.5 h-3.5" /> Quiz ekle
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeleteSlide(selectedIdx)}
                  disabled={slides.length <= 1}
                  className="gap-2 text-rose-500 hover:text-rose-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Başlık</Label>
              <Input
                value={currentSlide.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Slayt başlığı"
              />
            </div>

            {currentSlide.slideType === 'quiz' ? (
              // ── QUIZ FIELDS ────────────────────────────────────────────
              <>
                <div className="space-y-2">
                  <Label>Soru</Label>
                  <Textarea
                    value={currentSlide.quiz?.question || ''}
                    onChange={(e) => handleQuizQuestion(e.target.value)}
                    placeholder="Öğrenciye sorulacak soru..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>4 Şık (doğru olanı işaretle)</Label>
                  <div className="space-y-2">
                    {([0, 1, 2, 3] as const).map((i) => {
                      const isCorrect = currentSlide.quiz?.correctAnswer === i;
                      return (
                        <div
                          key={i}
                          className={cn(
                            'flex items-center gap-2 rounded-lg border p-2',
                            isCorrect ? 'border-emerald-400 bg-emerald-50/40' : 'border-border'
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => handleQuizCorrect(i)}
                            className={cn(
                              'flex items-center justify-center w-7 h-7 rounded-full border-2 shrink-0 transition-colors',
                              isCorrect
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'border-gray-300 hover:border-emerald-400'
                            )}
                            title={isCorrect ? 'Doğru cevap' : 'Doğru olarak işaretle'}
                          >
                            {String.fromCharCode(65 + i)}
                          </button>
                          <Input
                            value={currentSlide.quiz?.options[i] || ''}
                            onChange={(e) => handleQuizOption(i, e.target.value)}
                            placeholder={`Şık ${String.fromCharCode(65 + i)}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Yeşil A/B/C/D rozet = doğru cevap. KaTeX destekli ($...$).
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Açıklama (opsiyonel)</Label>
                  <Textarea
                    value={currentSlide.quiz?.explanation || ''}
                    onChange={(e) => handleQuizExplanation(e.target.value)}
                    placeholder="Cevabın neden doğru olduğunu kısaca açıkla..."
                    rows={3}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Öğrenci cevap verdikten sonra gösterilir. Boş bırakabilirsin.
                  </p>
                </div>
              </>
            ) : (
              // ── CONTENT FIELDS ─────────────────────────────────────────
              <>
                <div className="space-y-2">
                  <Label>İçerik (KaTeX & Mermaid destekli)</Label>
                  <Textarea
                    value={currentSlide.content}
                    onChange={(e) => handleContentChange(e.target.value)}
                    placeholder="$$E = mc^2$$ ..."
                    rows={10}
                    className="font-mono text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    İpucu: <code className="text-xs">$...$</code> inline, <code className="text-xs">$$...$$</code> blok formül.
                    Mermaid diyagramı için <code className="text-xs">```mermaid ... ```</code> bloğu kullan.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Maddeler</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={handleBulletAdd}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Madde ekle
                    </Button>
                  </div>
                  <div className="space-y-1.5">
                    {currentSlide.bulletPoints.map((bp, i) => (
                      <div key={i} className="flex gap-2">
                        <Input
                          value={bp}
                          onChange={(e) => handleBulletChange(i, e.target.value)}
                          placeholder={`Madde ${i + 1}`}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleBulletRemove(i)}
                        >
                          <Trash2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </div>
                    ))}
                    {currentSlide.bulletPoints.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">Madde yok.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Anlatım (TTS metni)</Label>
                    {currentSlide.narrationDirtyAt && (
                      <Badge className="bg-amber-500/10 text-amber-500 gap-1">
                        <Volume2 className="w-3 h-3" /> TTS yeniden üretilecek
                      </Badge>
                    )}
                  </div>
                  <Textarea
                    value={currentSlide.narrationText}
                    onChange={(e) => handleNarrationChange(e.target.value)}
                    placeholder="Öğretmenin sesli okuyacağı anlatım..."
                    rows={6}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    60-100 kelime önerilir. Formülleri okunuşuyla yaz ("F eşittir m çarpı a"). LaTeX/$ kullanma.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="col-span-12 lg:col-span-4">
          <div className="sticky top-4">
            <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
              <span>Önizleme</span>
              {regeneratingIdx === selectedIdx && (
                <span className="text-primary flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Yeniden üretiliyor
                </span>
              )}
            </div>
            <div className="rounded-xl border border-border bg-gray-50 dark:bg-gray-900 p-2 aspect-video">
              <SlideRenderer
                slide={currentSlide}
                isPlaying={false}
                className="h-full"
              />
            </div>
            <div className="mt-3 text-[11px] text-muted-foreground space-y-1">
              <p>• Animasyon onaylama sonrası üretilir.</p>
              <p>• Öğrenci tarafında öğretmen video overlay'i sol-altta görünür.</p>
            </div>

            {/* MEB Kazanımları */}
            <div className="mt-4 rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-sm flex items-center gap-1.5">
                  🎯 MEB Kazanımları
                </h4>
                {curriculumCodes.length > 0 && (
                  <Badge variant="secondary" className="text-[10px]">
                    {curriculumCodes.length}
                  </Badge>
                )}
              </div>
              {video && (
                <KazanimPicker
                  subject={video.subject}
                  grade={video.grade}
                  selectedCodes={curriculumCodes}
                  onChange={async (codes) => {
                    setCurriculumCodes(codes);
                    setCurriculumSaving(true);
                    try {
                      await updateVideo(videoId, { curriculumCodes: codes } as Parameters<typeof updateVideo>[1]);
                    } catch (err) {
                      showToast.error('Kaydedilemedi', err instanceof Error ? err.message : 'Bilinmeyen hata');
                    } finally {
                      setCurriculumSaving(false);
                    }
                  }}
                  compact
                />
              )}
              {curriculumSaving && (
                <p className="text-[10px] text-muted-foreground mt-1.5">Kaydediliyor...</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky footer: approve & finalize */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 backdrop-blur"
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            {dirtyCount > 0 ? (
              <span className="text-amber-500 font-medium">
                {dirtyCount} kaydedilmemiş değişiklik var
              </span>
            ) : (
              <span>Tüm değişiklikler kaydedildi</span>
            )}
          </div>
          <Button
            size="lg"
            onClick={handleFinalize}
            disabled={finalizing}
            className="gap-2"
          >
            {finalizing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Wand2 className="w-5 h-5" />
            )}
            Onayla ve Üret →
          </Button>
        </div>
      </motion.div>

      {/* Regen modal */}
      <Dialog open={regenModalOpen} onOpenChange={setRegenModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Slayt {currentSlide.slideNumber} yeniden üretilsin mi?</DialogTitle>
            <DialogDescription>
              Geri bildirim ver (opsiyonel). LLM bu yönde içeriği yeniden üretecek.
              Mevcut slayt referans alınır; tamamen sıfırdan değil iyileştirilmiş bir versiyon gelir.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Geri bildirim</Label>
            <Textarea
              value={regenFeedback}
              onChange={(e) => setRegenFeedback(e.target.value)}
              placeholder="Örn: daha kısa olsun, bir örnek soru ekle, formülü adım adım göster..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegenModalOpen(false)}>
              <X className="w-4 h-4 mr-2" /> İptal
            </Button>
            <Button onClick={handleRegenerate}>
              <Sparkles className="w-4 h-4 mr-2" /> Yeniden üret
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Finalize progress overlay */}
      {finalizing && (
        <FinalizeOverlay
          progress={finalizeProgress}
          onClose={() => {
            if (finalizeProgress.stage === 'failed' || finalizeProgress.stage === 'completed') {
              setFinalizing(false);
            }
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Finalize progress overlay
// ─────────────────────────────────────────────────────────────────────────────

function FinalizeOverlay({
  progress,
  onClose,
}: {
  progress: ServerProgress;
  onClose: () => void;
}) {
  const label = (() => {
    switch (progress.stage) {
      case 'queued':
        return 'Sıraya alındı...';
      case 'creating_audio':
        if (progress.currentSlide && progress.totalSlides) {
          return `Ses oluşturuluyor (${progress.currentSlide}/${progress.totalSlides})...`;
        }
        return 'Ses dosyaları oluşturuluyor...';
      case 'creating_lipsync':
        if (progress.currentSlide && progress.totalSlides) {
          return `Lipsync (${progress.currentSlide}/${progress.totalSlides}) — paralel üretiliyor...`;
        }
        return 'Lipsync hazırlanıyor...';
      case 'creating_animations':
        return 'Animasyonlar üretiliyor...';
      case 'ingesting_bunny':
        return 'CDN’e yükleniyor...';
      case 'saving':
        return 'Kaydediliyor...';
      case 'completed':
        return 'Tamamlandı!';
      case 'failed':
        return 'Hata oluştu';
      default:
        return 'Hazırlanıyor...';
    }
  })();

  const pct = progress.progress ?? (progress.stage === 'completed' ? 100 : 0);
  const isDone = progress.stage === 'completed' || progress.stage === 'failed';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-border shadow-2xl max-w-md w-full p-8 text-center">
        {progress.stage === 'failed' ? (
          <>
            <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
              <X className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold mb-2">Üretim Başarısız</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {'error' in progress ? progress.error : 'Bilinmeyen hata'}
            </p>
            <Button variant="outline" onClick={onClose}>
              Editöre Dön
            </Button>
          </>
        ) : progress.stage === 'completed' ? (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold mb-2">Tamamlandı!</h2>
            <p className="text-sm text-muted-foreground">Yönlendiriliyorsun...</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <h2 className="text-xl font-bold mb-2">{label}</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Üretim sunucu tarafında çalışıyor. Sekmeyi kapatabilir veya başka bir şey yapabilirsin — bittiğinde geri dönüp kontrol edebilirsin.
            </p>
            <div className="w-full bg-muted rounded-full h-2 mb-2">
              <motion.div
                className="bg-primary h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{pct}%</p>
          </>
        )}
        {isDone && progress.stage !== 'completed' && (
          <Button variant="ghost" size="sm" className="mt-3" onClick={onClose}>
            Kapat
          </Button>
        )}
      </div>
    </div>
  );
}
