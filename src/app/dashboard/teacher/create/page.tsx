'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Wand2,
  Loader2,
  Check,
  BookOpen,
  FileText,
  Settings2,
  Library,
  Mic,
  MicOff,
  Mic2,
  Bot,
  Camera,
  X,
  Layers,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useVideoStore } from '@/stores/video-store';
import { showToast } from '@/lib/utils/toast';
import { SUBJECTS, GRADES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import {
  generateSlidesOnly,
  generateSlidesStream,
  GenerationProgress,
  extractWhiteboardContent,
  parseVoiceCommand,
} from '@/lib/api/generation';
import { useAuthStore } from '@/stores/auth-store';
import { KazanimPicker } from '@/components/shared/KazanimPicker';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import type { CreateVideoFormData, Slide, SlideOutline, SlideRole, VisualNeed } from '@/types';

// ─── Schema ────────────────────────────────────────────────────────────────────

const createVideoSchema = z.object({
  subject: z.string().min(1, 'Ders seçin'),
  grades: z.array(z.string()).min(1, 'En az bir sınıf seçin'),
  topic: z.string().min(3, 'Konu en az 3 karakter olmalı'),
  description: z.string().min(10, 'Açıklama en az 10 karakter olmalı'),
  prompt: z.string(),
  tone: z.enum(['formal', 'friendly', 'energetic']),
  includesProblemSolving: z.boolean(),
  problemCount: z.number().min(1).max(10),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  estimatedDuration: z.number().min(5).max(60),
  language: z.enum(['tr', 'en']),
  sourceOnly: z.boolean(),
  sourceDocumentIds: z.array(z.string()),
  curriculumCodes: z.array(z.string()),
  voiceMode: z.enum(['teacher', 'robot']),
});

type CreateVideoForm = z.infer<typeof createVideoSchema>;

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const max = 1024;
        let { width, height } = img;
        if (width > max || height > max) {
          const ratio = Math.min(max / width, max / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(e.target?.result as string); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// ─── Sub-components ────────────────────────────────────────────────────────────

// ─── Outline visual helpers ────────────────────────────────────────────────────

const ROLE_META: Record<SlideRole, { label: string; emoji: string; tone: string }> = {
  hook:           { label: 'Giriş',          emoji: '✨', tone: 'bg-pink-500/10 text-pink-600 dark:text-pink-400' },
  definition:     { label: 'Tanım',          emoji: '📖', tone: 'bg-sky-500/10 text-sky-600 dark:text-sky-400' },
  concept:        { label: 'Kavram',         emoji: '💡', tone: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  derivation:     { label: 'Türetme',        emoji: '∑',  tone: 'bg-violet-500/10 text-violet-600 dark:text-violet-400' },
  worked_example: { label: 'Örnek Çözüm',    emoji: '🔍', tone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  comparison:     { label: 'Karşılaştırma',  emoji: '⚖️', tone: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' },
  experiment:     { label: 'Deney',          emoji: '🧪', tone: 'bg-teal-500/10 text-teal-600 dark:text-teal-400' },
  visualization:  { label: 'Görsel',         emoji: '🎬', tone: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
  quiz:           { label: 'Quiz',           emoji: '❓', tone: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
  summary:        { label: 'Özet',           emoji: '📋', tone: 'bg-slate-500/10 text-slate-600 dark:text-slate-400' },
};

const VISUAL_META: Record<VisualNeed, { icon: string; title: string }> = {
  static:    { icon: '📝', title: 'Sadece metin / formül' },
  diagram:   { icon: '🗺️', title: 'Diyagram (Mermaid)' },
  chart:     { icon: '📊', title: 'Veri grafiği' },
  animation: { icon: '🎬', title: 'Manim animasyonu' },
  photo:     { icon: '🖼️', title: 'Görsel referans' },
};

function SlideOutlineRow({
  outline,
  slide,
  total,
}: {
  outline?: SlideOutline;
  slide?: Slide;
  total: number;
}) {
  const slideNumber = outline?.slideNumber ?? slide?.slideNumber ?? 0;
  const title = slide?.title || outline?.title || `Slayt ${slideNumber}`;
  const goal = outline?.oneLineGoal || slide?.bulletPoints?.[0] || '';
  const role = outline?.intent.role ?? slide?.intent?.role;
  const visualNeed = outline?.intent.visualNeed ?? slide?.intent?.visualNeed;
  const duration = outline?.intent.estimatedDurationSec ?? slide?.intent?.estimatedDurationSec;
  const isReady = !!slide?.content || !!slide?.bulletPoints?.length;

  const roleMeta = role ? ROLE_META[role] : null;
  const visualMeta = visualNeed ? VISUAL_META[visualNeed] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        'flex items-start gap-3 p-3 rounded-xl border bg-card transition-colors',
        isReady ? 'border-emerald-500/30' : 'border-border'
      )}
    >
      <div className="shrink-0 w-8 text-center">
        <p className="text-xs font-mono text-muted-foreground">
          {slideNumber.toString().padStart(2, '0')}
        </p>
        <p className="text-[9px] text-muted-foreground/60">/{total}</p>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          {roleMeta && (
            <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1', roleMeta.tone)}>
              <span>{roleMeta.emoji}</span>
              {roleMeta.label}
            </span>
          )}
          {visualMeta && (
            <span
              title={visualMeta.title}
              className="px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground"
            >
              {visualMeta.icon}
            </span>
          )}
          {duration ? (
            <span className="text-[10px] text-muted-foreground/70 font-mono">~{duration}sn</span>
          ) : null}
        </div>
        <p className={cn('text-sm font-semibold leading-snug', !isReady && 'text-muted-foreground')}>
          {title}
        </p>
        {goal && (
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{goal}</p>
        )}
      </div>

      <div className="shrink-0 w-5 flex items-center justify-center">
        {isReady ? (
          <Check className="w-4 h-4 text-emerald-500" />
        ) : outline ? (
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
        )}
      </div>
    </motion.div>
  );
}

function VoiceMicButton({
  voice,
  title = 'Sesle yaz',
}: {
  voice: ReturnType<typeof useVoiceInput>;
  title?: string;
}) {
  if (!voice.isSupported) return null;
  return (
    <Button
      type="button"
      variant={voice.isListening ? 'default' : 'outline'}
      size="icon"
      onClick={voice.toggle}
      title={title}
      className={cn('shrink-0', voice.isListening && 'animate-pulse')}
    >
      {voice.isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
    </Button>
  );
}

// ─── Batch status type ─────────────────────────────────────────────────────────

interface BatchItem {
  grade: string;
  videoId: string | null;
  status: 'pending' | 'generating' | 'done' | 'failed';
  slides: Slide[];
}

// ─── Steps ─────────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, title: 'Ders Bilgileri', icon: BookOpen },
  { id: 2, title: 'İçerik', icon: FileText },
  { id: 3, title: 'Ayarlar', icon: Settings2 },
];

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CreateVideoPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress>({ stage: 'idle' });
  const [generatedSlides, setGeneratedSlides] = useState<Slide[]>([]);
  const [generatedOutline, setGeneratedOutline] = useState<SlideOutline[]>([]);
  const [batchStatus, setBatchStatus] = useState<BatchItem[]>([]);

  // Whiteboard
  const [whiteboardPreview, setWhiteboardPreview] = useState<string | null>(null);
  const [isExtractingWhiteboard, setIsExtractingWhiteboard] = useState(false);
  const whiteboardInputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();
  const { createVideo } = useVideoStore();
  const { user } = useAuthStore();

  // ── Teacher docs ────────────────────────────────────────────────────────────
  interface TeacherDoc { id: string; original_name: string; status: string; chunk_count: number; }
  const [teacherDocs, setTeacherDocs] = useState<TeacherDoc[]>([]);

  const fetchTeacherDocs = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/documents?teacherId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setTeacherDocs((data.documents || []).filter((d: TeacherDoc) => d.status === 'embedded'));
      }
    } catch { /* silent */ }
  }, [user?.id]);

  useEffect(() => { fetchTeacherDocs(); }, [fetchTeacherDocs]);

  // ── Voice clone status — drives the "Kendi sesim / Robot" toggle ──────────
  // hasTeacherVoice=null → still loading; false → no clone (lock to robot);
  // true → clone exists, teacher can pick either mode.
  const [hasTeacherVoice, setHasTeacherVoice] = useState<boolean | null>(null);
  useEffect(() => {
    fetch('/api/teacher/voice-clone')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { hasActiveClone?: boolean } | null) => {
        setHasTeacherVoice(!!d?.hasActiveClone);
      })
      .catch(() => setHasTeacherVoice(false));
  }, []);

  // ── Form ─────────────────────────────────────────────────────────────────────
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CreateVideoForm>({
    resolver: zodResolver(createVideoSchema),
    defaultValues: {
      subject: '',
      grades: [],
      topic: '',
      description: '',
      prompt: '',
      tone: 'friendly',
      includesProblemSolving: true,
      problemCount: 3,
      difficulty: 'medium',
      estimatedDuration: 15,
      language: 'tr',
      sourceOnly: false,
      sourceDocumentIds: [],
      curriculumCodes: [],
      voiceMode: 'teacher',
    },
  });
  const watchAll = watch();

  // Lock voiceMode to 'robot' once we know the teacher has no active clone.
  useEffect(() => {
    if (hasTeacherVoice === false) {
      setValue('voiceMode', 'robot');
    }
  }, [hasTeacherVoice, setValue]);

  // ── Voice input ──────────────────────────────────────────────────────────────
  const topicVoice = useVoiceInput({
    onResult: (text) => setValue('topic', text),
    onError: (err) => showToast.error('Ses hatası', err),
  });

  const descriptionVoice = useVoiceInput({
    onResult: (text) => {
      const current = watchAll.description || '';
      setValue('description', current ? `${current} ${text}` : text);
    },
    onError: (err) => showToast.error('Ses hatası', err),
  });

  const commandVoice = useVoiceInput({
    onResult: async (text) => {
      const trimmed = (text || '').trim();
      if (!trimmed) {
        showToast.error('Komut hatası', 'Sesinizi algılayamadık, daha yüksek konuşup tekrar deneyin.');
        return;
      }
      try {
        const parsed = await parseVoiceCommand(trimmed);
        const filled: string[] = [];
        if (parsed.subject) { setValue('subject', parsed.subject); filled.push('Ders'); }
        if (parsed.grade) { setValue('grades', [parsed.grade]); filled.push('Sınıf'); }
        if (parsed.topic) { setValue('topic', parsed.topic); filled.push('Konu'); }
        if (parsed.description) { setValue('description', parsed.description); filled.push('Açıklama'); }
        if (parsed.tone) { setValue('tone', parsed.tone); filled.push('Ton'); }

        if (filled.length === 0) {
          showToast.error(
            'Komuttan alan çıkarılamadı',
            `Söylediğin: "${trimmed.slice(0, 80)}". Örnek: "8. sınıf matematik, üçgenler konusu"`
          );
        } else {
          showToast.success('Komut işlendi', `${filled.join(', ')} dolduruldu.`);
        }
      } catch (e) {
        showToast.error(
          'Komut hatası',
          e instanceof Error ? e.message : 'Ses komutu işlenemedi.'
        );
      }
    },
    onError: (err) => showToast.error('Ses hatası', err),
  });

  // ── Whiteboard ───────────────────────────────────────────────────────────────
  const handleWhiteboardUpload = async (file: File) => {
    const preview = URL.createObjectURL(file);
    setWhiteboardPreview(preview);
    setIsExtractingWhiteboard(true);
    try {
      const compressed = await compressImage(file);
      const extracted = await extractWhiteboardContent(compressed);
      if (extracted.topic && !watchAll.topic) setValue('topic', extracted.topic);
      if (extracted.description) {
        const current = watchAll.description || '';
        setValue('description', current ? `${current}\n${extracted.description}` : extracted.description);
      }
      showToast.success('Tahta analiz edildi', 'İçerik form alanlarına aktarıldı.');
    } catch {
      showToast.error('Hata', 'Tahta içeriği çıkarılamadı.');
    } finally {
      setIsExtractingWhiteboard(false);
    }
  };

  // ── Grade toggle ─────────────────────────────────────────────────────────────
  const toggleGrade = (gradeValue: string) => {
    const current = watchAll.grades || [];
    if (current.includes(gradeValue)) {
      setValue('grades', current.filter((g) => g !== gradeValue), { shouldValidate: true });
    } else {
      setValue('grades', [...current, gradeValue], { shouldValidate: true });
    }
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const onSubmit = async (data: CreateVideoForm) => {
    if (!user || user.role !== 'teacher') {
      showToast.error('Hata', 'Sadece öğretmenler video oluşturabilir.');
      return;
    }

    // Template picker has been replaced by the outline-driven pipeline.
    // The teacher's prompt is passed through unchanged; pedagogical structure
    // is now decided per-slide by the Pass 1 outline generator.
    const fullPrompt = data.prompt;

    const isBatch = data.grades.length > 1;
    setIsCreating(true);

    if (isBatch) {
      const initial: BatchItem[] = data.grades.map((grade) => ({
        grade,
        videoId: null,
        status: 'pending',
        slides: [],
      }));
      setBatchStatus(initial);
      setIsSuccess(true);
      setIsCreating(false);

      const gradePromises = data.grades.map(async (grade) => {
        setBatchStatus((prev) =>
          prev.map((item) => item.grade === grade ? { ...item, status: 'generating' } : item)
        );
        try {
          const videoData: CreateVideoFormData = {
            subject: data.subject,
            grade,
            topic: data.topic,
            description: data.description,
            learningObjectives: [],
            keyConcepts: [],
            prompt: fullPrompt,
            tone: data.tone,
            includesProblemSolving: data.includesProblemSolving,
            problemCount: data.problemCount,
            difficulty: data.difficulty,
            estimatedDuration: data.estimatedDuration,
            language: data.language,
            curriculumCodes: data.curriculumCodes,
            voiceMode: data.voiceMode,
          };
          const video = await createVideo(videoData);
          setBatchStatus((prev) =>
            prev.map((item) => item.grade === grade ? { ...item, videoId: video.id } : item)
          );
          const slidesData = await generateSlidesStream({
            videoId: video.id,
            teacherId: user.id,
            topic: data.topic,
            description: data.description,
            prompt: fullPrompt,
            language: data.language,
            tone: data.tone,
            includesProblemSolving: data.includesProblemSolving,
            problemCount: data.problemCount,
            difficulty: data.difficulty,
            sourceOnly: data.sourceOnly,
            sourceDocumentIds: data.sourceDocumentIds.length > 0 ? data.sourceDocumentIds : undefined,
          });
          setBatchStatus((prev) =>
            prev.map((item) =>
              item.grade === grade ? { ...item, status: 'done', slides: slidesData.slides } : item
            )
          );
        } catch {
          setBatchStatus((prev) =>
            prev.map((item) => item.grade === grade ? { ...item, status: 'failed' } : item)
          );
        }
      });

      await Promise.allSettled(gradePromises);
      showToast.success('Toplu üretim tamamlandı', `${data.grades.length} sınıf için slaytlar hazır.`);
      return;
    }

    // Single grade flow
    try {
      const videoData: CreateVideoFormData = {
        subject: data.subject,
        grade: data.grades[0],
        topic: data.topic,
        description: data.description,
        learningObjectives: [],
        keyConcepts: [],
        prompt: fullPrompt,
        tone: data.tone,
        includesProblemSolving: data.includesProblemSolving,
        problemCount: data.problemCount,
        difficulty: data.difficulty,
        estimatedDuration: data.estimatedDuration,
        language: data.language,
        curriculumCodes: data.curriculumCodes,
        voiceMode: data.voiceMode,
      };

      const video = await createVideo(videoData);
      setIsSuccess(true);
      setIsCreating(false);
      setGenerationProgress({ stage: 'generating_slides', progress: 0 });

      const slidesData = await generateSlidesStream({
        videoId: video.id,
        teacherId: user.id,
        topic: data.topic,
        description: data.description,
        prompt: fullPrompt,
        language: data.language,
        tone: data.tone,
        includesProblemSolving: data.includesProblemSolving,
        problemCount: data.problemCount,
        difficulty: data.difficulty,
        sourceOnly: data.sourceOnly,
        sourceDocumentIds: data.sourceDocumentIds.length > 0 ? data.sourceDocumentIds : undefined,
        onProgress: (p) => setGenerationProgress(p),
        onOutline: (outline) => setGeneratedOutline(outline),
        onSlide: (slide) => setGeneratedSlides(prev => [...prev, slide]),
      });

      setGeneratedSlides(slidesData.slides);
      if (slidesData.outline) setGeneratedOutline(slidesData.outline);
      showToast.success('Slaytlar hazır!', 'Şimdi düzenle ve onayla.');

      // Navigate after stagger animation finishes
      setTimeout(() => {
        router.push(`/dashboard/teacher/videos/${video.id}/edit`);
      }, slidesData.slides.length * 150 + 800);
    } catch (error) {
      setIsCreating(false);
      setGenerationProgress({
        stage: 'failed',
        error: error instanceof Error ? error.message : 'Bilinmeyen hata',
      });
      showToast.error('Hata oluştu', 'Slaytlar oluşturulurken bir sorun yaşandı.');
    }
  };

  const nextStep = () => setCurrentStep((p) => Math.min(p + 1, 3));
  const prevStep = () => setCurrentStep((p) => Math.max(p - 1, 1));

  // ─────────────────────────────────────────────────────────────────────────────
  // SUCCESS / LOADING SCREEN
  // ─────────────────────────────────────────────────────────────────────────────

  if (isSuccess) {
    // BATCH progress view
    if (batchStatus.length > 0) {
      const doneCount = batchStatus.filter((i) => i.status === 'done').length;
      const allDone = batchStatus.every((i) => i.status === 'done' || i.status === 'failed');

      return (
        <div className="min-h-[60vh] flex items-center justify-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                {allDone ? (
                  <Check className="w-8 h-8 text-emerald-500" />
                ) : (
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                )}
              </div>
              <h2 className="text-2xl font-bold">
                {allDone ? 'Toplu Üretim Tamamlandı' : 'Slaytlar Oluşturuluyor...'}
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                {doneCount}/{batchStatus.length} sınıf hazır
              </p>
            </div>

            <div className="space-y-2">
              {batchStatus.map((item) => (
                <div
                  key={item.grade}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card"
                >
                  <div className="text-sm font-semibold w-20 shrink-0">{item.grade}. Sınıf</div>
                  <div className="flex-1">
                    {item.status === 'done' && item.slides.length > 0 && (
                      <p className="text-xs text-muted-foreground">{item.slides.length} slayt</p>
                    )}
                    {item.status === 'pending' && (
                      <p className="text-xs text-muted-foreground">Bekliyor...</p>
                    )}
                    {item.status === 'failed' && (
                      <p className="text-xs text-destructive">Hata oluştu</p>
                    )}
                  </div>
                  <div className="shrink-0">
                    {item.status === 'pending' && <div className="w-4 h-4 rounded-full bg-muted" />}
                    {item.status === 'generating' && (
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    )}
                    {item.status === 'done' && <Check className="w-4 h-4 text-emerald-500" />}
                    {item.status === 'failed' && (
                      <AlertCircle className="w-4 h-4 text-destructive" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {allDone && (
              <div className="mt-6 flex gap-2 justify-center">
                <Button onClick={() => router.push('/dashboard/teacher/videos')} className="gap-2">
                  <Check className="w-4 h-4" />
                  Videolarıma Git
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      );
    }

    // SINGLE grade — loading / stagger preview
    if (generationProgress.stage === 'failed') {
      return (
        <div className="min-h-[60vh] flex items-center justify-center">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center max-w-md"
          >
            <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Hata Oluştu</h2>
            <p className="text-muted-foreground mb-4">
              {'error' in generationProgress ? generationProgress.error : 'Bilinmeyen hata'}
            </p>
            <Button onClick={() => router.push('/dashboard/teacher/videos')}>
              Videolar Sayfasına Dön
            </Button>
          </motion.div>
        </div>
      );
    }

    const slidesReady = generatedSlides.length > 0
      && generatedOutline.length > 0
      && generatedSlides.length >= generatedOutline.length;

    // Build a slide-by-slide view: outline gives the skeleton row count and
    // role badges; slides hydrate the cards as they materialize in parallel.
    const rows = generatedOutline.length > 0
      ? generatedOutline.map((o) => ({
          outline: o,
          slide: generatedSlides.find((s) => s.slideNumber === o.slideNumber),
        }))
      : generatedSlides.map((s) => ({ outline: undefined as SlideOutline | undefined, slide: s }));

    const completedCount = generatedSlides.length;
    const totalCount = generatedOutline.length || Math.max(generatedSlides.length, 10);

    return (
      <div className="min-h-[60vh] flex items-start justify-center py-10">
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-3xl w-full"
        >
          {/* Header */}
          <div className="text-center mb-6">
            <div
              className={cn(
                'w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4',
                slidesReady ? 'bg-emerald-500/20' : 'bg-primary/20'
              )}
            >
              {slidesReady ? (
                <Check className="w-8 h-8 text-emerald-500" />
              ) : (
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              )}
            </div>
            <h2 className="text-2xl font-bold mb-1">
              {slidesReady ? 'Slaytlar Hazır!' : 'AI ders planını çıkarıyor...'}
            </h2>
            <p className="text-muted-foreground text-sm">
              {slidesReady
                ? 'Düzenleyiciye yönlendiriliyorsun...'
                : generatedOutline.length === 0
                  ? 'Her slaytın rolünü ve görsel ihtiyacını belirliyor (~3 sn)'
                  : `${completedCount}/${totalCount} slayt üretildi — paralel çalışıyor`}
            </p>
          </div>

          {/* Progress bar */}
          {!slidesReady && (
            <div className="w-full bg-muted rounded-full h-1 mb-6 max-w-md mx-auto">
              <motion.div
                className="bg-primary h-1 rounded-full"
                initial={{ width: 0 }}
                animate={{
                  width: `${'progress' in generationProgress ? generationProgress.progress : 0}%`,
                }}
                transition={{ duration: 0.4 }}
              />
            </div>
          )}

          {/* Outline rows — skeleton until each slide materializes */}
          {rows.length > 0 && (
            <div className="space-y-2 text-left">
              {rows.map(({ outline, slide }, i) => (
                <SlideOutlineRow
                  key={outline?.slideNumber ?? slide?.slideNumber ?? i}
                  outline={outline}
                  slide={slide}
                  total={totalCount}
                />
              ))}
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // FORM
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Yeni Video Oluştur</h1>
          <p className="text-muted-foreground text-sm">AI ile ders videosu oluşturmak için bilgileri doldurun</p>
        </div>
        {/* Komut Modu */}
        {commandVoice.isSupported && (
          <Button
            type="button"
            variant={commandVoice.isListening ? 'default' : 'outline'}
            size="sm"
            onClick={commandVoice.toggle}
            className={cn('gap-2 shrink-0', commandVoice.isListening && 'animate-pulse')}
          >
            {commandVoice.isListening ? (
              <><MicOff className="w-4 h-4" />Dinleniyor...</>
            ) : (
              <><Mic className="w-4 h-4" />Komut Modu</>
            )}
          </Button>
        )}
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <button
              type="button"
              onClick={() => setCurrentStep(step.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg transition-all',
                currentStep === step.id
                  ? 'bg-primary text-primary-foreground'
                  : currentStep > step.id
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
              )}
            >
              <step.icon className="w-4 h-4" />
              <span className="hidden sm:inline text-sm font-medium">{step.title}</span>
            </button>
            {index < STEPS.length - 1 && (
              <div className={cn('w-8 lg:w-16 h-0.5 mx-2', currentStep > step.id ? 'bg-primary' : 'bg-muted')} />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <AnimatePresence mode="wait">

          {/* ── Step 1: Lesson Info ─────────────────────────────────────────── */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="p-6 rounded-xl border border-border bg-card">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  Ders Bilgileri
                </h3>

                {/* Subject */}
                <div className="space-y-2">
                  <Label htmlFor="subject">Ders *</Label>
                  <select
                    id="subject"
                    className={cn(
                      'w-full h-10 px-3 rounded-md border bg-background text-sm',
                      errors.subject ? 'border-destructive' : 'border-input'
                    )}
                    {...register('subject')}
                  >
                    <option value="">Ders seçin</option>
                    {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {errors.subject && <p className="text-xs text-destructive">{errors.subject.message}</p>}
                </div>

                {/* Grade multi-select */}
                <div className="mt-4 space-y-2">
                  <Label>
                    Sınıf Seviyesi *
                    <span className="ml-2 text-xs text-muted-foreground font-normal">
                      (birden fazla seçilebilir)
                    </span>
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {GRADES.map((grade) => {
                      const isSelected = watchAll.grades?.includes(grade.value);
                      return (
                        <button
                          key={grade.value}
                          type="button"
                          onClick={() => toggleGrade(grade.value)}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background border-border hover:border-primary/50'
                          )}
                        >
                          {grade.label}
                        </button>
                      );
                    })}
                  </div>
                  {errors.grades && (
                    <p className="text-xs text-destructive">{(errors.grades as { message?: string }).message}</p>
                  )}
                  {(watchAll.grades?.length || 0) > 1 && (
                    <p className="text-xs text-amber-500 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      Toplu üretim: {watchAll.grades.length} farklı sınıf için ayrı ayrı video oluşturulacak.
                    </p>
                  )}
                </div>

                {/* Topic with voice */}
                <div className="mt-4 space-y-2">
                  <Label htmlFor="topic">Konu Başlığı *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="topic"
                      placeholder="Örn: Birinci Dereceden Denklemler"
                      className={cn('flex-1', errors.topic ? 'border-destructive' : '')}
                      {...register('topic')}
                    />
                    <VoiceMicButton voice={topicVoice} title="Konuyu sesle söyle" />
                  </div>
                  {errors.topic && <p className="text-xs text-destructive">{errors.topic.message}</p>}
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="button" onClick={nextStep}>
                  Devam Et
                  <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── Step 2: Content ─────────────────────────────────────────────── */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* AI plans each slide individually — no template lock-in */}
              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">AI her slayt için en uygun yapıyı seçiyor</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Giriş, türetme, örnek, karşılaştırma, animasyon… Önce ders planı çıkar, sonra düzenleyebilirsin.
                  </p>
                </div>
              </div>

              {/* Description + voice */}
              <div className="p-6 rounded-xl border border-border bg-card">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Ders İçeriği
                </h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="description">Ders Açıklaması *</Label>
                      <VoiceMicButton voice={descriptionVoice} title="Açıklamayı sesle ekle" />
                    </div>
                    <Textarea
                      id="description"
                      placeholder={'Bu derste neler öğretilecek? Detaylı açıklama yazın.\n\nÖrnek: "Birinci dereceden denklemlerin çözümünü anlat. Günlük hayattan örnekler ver."'}
                      rows={6}
                      className={errors.description ? 'border-destructive' : ''}
                      {...register('description')}
                    />
                    {errors.description && (
                      <p className="text-xs text-destructive">{errors.description.message}</p>
                    )}
                  </div>

                  <Separator />

                  {/* Tone */}
                  <div className="space-y-2">
                    <Label>Anlatım Tonu</Label>
                    <div className="flex gap-2">
                      {[
                        { value: 'formal', label: 'Formal' },
                        { value: 'friendly', label: 'Samimi' },
                        { value: 'energetic', label: 'Enerjik' },
                      ].map((tone) => (
                        <Button
                          key={tone.value}
                          type="button"
                          variant={watchAll.tone === tone.value ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setValue('tone', tone.value as 'formal' | 'friendly' | 'energetic')}
                        >
                          {tone.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Whiteboard upload */}
              <div className="p-6 rounded-xl border border-border bg-card">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-primary" />
                  Tahta Fotoğrafı
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Tahta veya not fotoğrafı yükleyin — AI içeriği otomatik olarak açıklama alanına aktarır.
                </p>
                {whiteboardPreview ? (
                  <div className="relative inline-block">
                    <img
                      src={whiteboardPreview}
                      alt="Tahta önizleme"
                      className="max-w-xs rounded-xl border border-border object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setWhiteboardPreview(null);
                        if (whiteboardInputRef.current) whiteboardInputRef.current.value = '';
                      }}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors"
                    >
                      <X className="w-3.5 h-3.5 text-white" />
                    </button>
                    {isExtractingWhiteboard && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-black/50">
                        <Loader2 className="w-7 h-7 text-white animate-spin mb-1" />
                        <p className="text-xs text-white">Analiz ediliyor...</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed border-border cursor-pointer hover:border-primary/50 transition-colors">
                    <Camera className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Fotoğraf seç</span>
                    <input
                      ref={whiteboardInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleWhiteboardUpload(file);
                      }}
                    />
                  </label>
                )}
              </div>

              {/* MEB Kazanımları */}
              <div className="p-6 rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold flex items-center gap-2">🎯 MEB Kazanımları</h3>
                  {(watchAll.curriculumCodes?.length || 0) > 0 && (
                    <Badge variant="secondary">{watchAll.curriculumCodes.length} kazanım</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Bu dersle hangi MEB kazanımları işleniyor?
                </p>
                <KazanimPicker
                  subject={watchAll.subject}
                  grade={watchAll.grades?.[0] || ''}
                  selectedCodes={watchAll.curriculumCodes || []}
                  onChange={(codes) => setValue('curriculumCodes', codes)}
                  compact
                />
              </div>

              {/* Source Documents (RAG) */}
              <div className="p-6 rounded-xl border border-border bg-card">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Library className="w-5 h-5 text-primary" />
                  Kaynak Dökümanlar
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div>
                      <Label className="font-medium">📚 Kendi kaynaklarımın dışına çıkma</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Aktifken ders sadece yüklediğiniz kaynaklara dayanır.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded border-input text-primary focus:ring-primary"
                      {...register('sourceOnly')}
                    />
                  </div>

                  {teacherDocs.length > 0 ? (
                    <div className="space-y-2">
                      <Label>Kullanılacak Dökümanlar</Label>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {teacherDocs.map((doc) => (
                          <label
                            key={doc.id}
                            className={cn(
                              'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                              watchAll.sourceDocumentIds?.includes(doc.id)
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:bg-muted/30'
                            )}
                          >
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded border-input text-primary"
                              checked={watchAll.sourceDocumentIds?.includes(doc.id) || false}
                              onChange={(e) => {
                                const current = watchAll.sourceDocumentIds || [];
                                setValue(
                                  'sourceDocumentIds',
                                  e.target.checked
                                    ? [...current, doc.id]
                                    : current.filter((id: string) => id !== doc.id)
                                );
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{doc.original_name}</p>
                              <p className="text-xs text-muted-foreground">{doc.chunk_count} parça</p>
                            </div>
                            <Badge variant="secondary" className="text-[10px]">Hazır</Badge>
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-5 text-muted-foreground">
                      <Library className="w-7 h-7 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Henüz kaynak döküman yüklenmemiş.</p>
                      <p className="text-xs mt-1">
                        <a href="/dashboard/teacher/documents" className="text-primary hover:underline">
                          Dökümanlar
                        </a>{' '}
                        sayfasını ziyaret edin.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={prevStep}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Geri
                </Button>
                <Button type="button" onClick={nextStep}>
                  Devam Et
                  <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── Step 3: Settings ─────────────────────────────────────────────── */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="p-6 rounded-xl border border-border bg-card">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-primary" />
                  Video Ayarları
                </h3>
                <div className="space-y-6">
                  {/* Problem Solving */}
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div>
                      <Label className="font-medium">Soru Çözümü Ekle</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Video içinde interaktif soru çözümü göster
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded border-input text-primary focus:ring-primary"
                      {...register('includesProblemSolving')}
                    />
                  </div>

                  {watchAll.includesProblemSolving && (
                    <div className="grid sm:grid-cols-2 gap-4 pl-4 border-l-2 border-primary/30">
                      <div className="space-y-2">
                        <Label htmlFor="problemCount">Soru Sayısı</Label>
                        <Input
                          id="problemCount"
                          type="number"
                          min={1}
                          max={10}
                          {...register('problemCount', { valueAsNumber: true })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Zorluk Seviyesi</Label>
                        <div className="flex gap-2">
                          {[
                            { value: 'easy', label: 'Kolay' },
                            { value: 'medium', label: 'Orta' },
                            { value: 'hard', label: 'Zor' },
                          ].map((diff) => (
                            <Button
                              key={diff.value}
                              type="button"
                              variant={watchAll.difficulty === diff.value ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setValue('difficulty', diff.value as 'easy' | 'medium' | 'hard')}
                            >
                              {diff.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Duration */}
                  <div className="space-y-2">
                    <Label>Tahmini Süre: {watchAll.estimatedDuration} dakika</Label>
                    <input
                      type="range"
                      min={5}
                      max={60}
                      step={5}
                      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                      {...register('estimatedDuration', { valueAsNumber: true })}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>5 dk</span>
                      <span>60 dk</span>
                    </div>
                  </div>

                  {/* Language */}
                  <div className="space-y-2">
                    <Label>Dil</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={watchAll.language === 'tr' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setValue('language', 'tr')}
                      >
                        🇹🇷 Türkçe
                      </Button>
                      <Button
                        type="button"
                        variant={watchAll.language === 'en' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setValue('language', 'en')}
                      >
                        🇬🇧 İngilizce
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Voice mode */}
                  <div className="space-y-2">
                    <Label>Anlatım Sesi</Label>
                    {hasTeacherVoice === null ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Klon durumu kontrol ediliyor...
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={!hasTeacherVoice}
                          onClick={() => setValue('voiceMode', 'teacher')}
                          className={cn(
                            'flex items-start gap-3 p-3 rounded-lg border text-left transition-all',
                            watchAll.voiceMode === 'teacher'
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/40',
                            !hasTeacherVoice && 'opacity-50 cursor-not-allowed',
                          )}
                        >
                          <Mic2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm font-medium">Kendi Sesim</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {hasTeacherVoice
                                ? 'Klonlanan sesin kullanılacak'
                                : 'Önce Referans Video sayfasından sesini klonla'}
                            </p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setValue('voiceMode', 'robot')}
                          className={cn(
                            'flex items-start gap-3 p-3 rounded-lg border text-left transition-all',
                            watchAll.voiceMode === 'robot'
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/40',
                          )}
                        >
                          <Bot className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm font-medium">Robot Ses</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Generic AI sesi (ücretsiz, hızlı)
                            </p>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="p-6 rounded-xl border border-primary/30 bg-primary/5">
                <h3 className="font-semibold mb-4">Özet</h3>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Ders:</span>{' '}
                    <span className="font-medium">{watchAll.subject || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Sınıf:</span>{' '}
                    <span className="font-medium">
                      {(watchAll.grades?.length || 0) > 0
                        ? watchAll.grades.map((g) => `${g}.`).join(', ')
                        : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Konu:</span>{' '}
                    <span className="font-medium">{watchAll.topic || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Süre:</span>{' '}
                    <span className="font-medium">{watchAll.estimatedDuration} dakika</span>
                  </div>
                  {(watchAll.grades?.length || 0) > 1 && (
                    <div className="col-span-2">
                      <span className="text-amber-500 font-medium flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5" />
                        {watchAll.grades.length} video oluşturulacak (toplu üretim)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={prevStep}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Geri
                </Button>
                <Button type="submit" disabled={isCreating} className="gap-2">
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Oluşturuluyor...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      {(watchAll.grades?.length || 0) > 1
                        ? `${watchAll.grades.length} Video Oluştur`
                        : 'Video Oluştur'}
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </form>
    </div>
  );
}
