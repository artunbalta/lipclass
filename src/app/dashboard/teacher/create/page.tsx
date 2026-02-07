'use client';

import { useState } from 'react';
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
import { generateVideo, GenerationProgress } from '@/lib/api/generation';
import { getReferenceVideoUrl } from '@/lib/api/storage';
import { useAuthStore } from '@/stores/auth-store';

const createVideoSchema = z.object({
  subject: z.string().min(1, 'Ders seçin'),
  grade: z.string().min(1, 'Sınıf seçin'),
  topic: z.string().min(3, 'Konu en az 3 karakter olmalı'),
  description: z.string().min(10, 'Açıklama en az 10 karakter olmalı'),
  prompt: z.string().optional().default(''),
  tone: z.enum(['formal', 'friendly', 'energetic']),
  includesProblemSolving: z.boolean(),
  problemCount: z.number().min(1).max(10),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  estimatedDuration: z.number().min(5).max(60),
  language: z.enum(['tr', 'en']),
});

type CreateVideoForm = z.infer<typeof createVideoSchema>;

const steps = [
  { id: 1, title: 'Ders Bilgileri', icon: BookOpen },
  { id: 2, title: 'İçerik', icon: FileText },
  { id: 3, title: 'Ayarlar', icon: Settings2 },
];

export default function CreateVideoPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress>({ stage: 'idle' });
  const router = useRouter();
  const { createVideo } = useVideoStore();
  const { user } = useAuthStore();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateVideoForm>({
    resolver: zodResolver(createVideoSchema),
    defaultValues: {
      subject: '',
      grade: '',
      topic: '',
      description: '',
      prompt: '',
      tone: 'friendly',
      includesProblemSolving: true,
      problemCount: 3,
      difficulty: 'medium',
      estimatedDuration: 15,
      language: 'tr',
    },
  });

  const watchAll = watch();

  const onSubmit = async (data: CreateVideoForm) => {
    if (!user || user.role !== 'teacher') {
      showToast.error('Hata', 'Sadece öğretmenler video oluşturabilir.');
      return;
    }

    setIsCreating(true);
    setGenerationProgress({ stage: 'generating_slides', progress: 0 });

    try {
      // Step 1: Create video record in database
      const video = await createVideo({
        ...data,
        learningObjectives: [],
        keyConcepts: [],
      });

      // Step 2: Fetch teacher's reference video URL for lipsync
      const refVideoUrl = await getReferenceVideoUrl(user.id);
      if (refVideoUrl) {
        console.log('[Create] Reference video found for lipsync');
      } else {
        console.warn('[Create] No reference video - lipsync will be skipped');
      }

      // Step 3: Start full pipeline (LLM → TTS → Lipsync → Save)
      generateVideo({
        videoId: video.id,
        teacherId: user.id,
        topic: data.topic,
        description: data.description,
        prompt: data.prompt || '',
        language: data.language,
        tone: data.tone,
        includesProblemSolving: data.includesProblemSolving,
        problemCount: data.problemCount,
        difficulty: data.difficulty,
        referenceVideoUrl: refVideoUrl || undefined,
        onProgress: (progress) => {
          setGenerationProgress(progress);
        },
      }).then(() => {
        setGenerationProgress({ stage: 'completed' });
        showToast.success('Ders hazır!', 'Ders sunumunuz başarıyla oluşturuldu.');
        setTimeout(() => {
          router.push('/dashboard/teacher/videos');
        }, 2000);
      }).catch((error) => {
        console.error('Generation error:', error);
        setGenerationProgress({
          stage: 'failed',
          error: error instanceof Error ? error.message : 'Ders oluşturulurken bir hata oluştu.',
        });
        showToast.error('Generation hatası', error instanceof Error ? error.message : 'Hata oluştu.');
      });

      setIsCreating(false);
      setIsSuccess(true);
    } catch (error) {
      setIsCreating(false);
      setGenerationProgress({ 
        stage: 'failed', 
        error: error instanceof Error ? error.message : 'Bilinmeyen hata' 
      });
      showToast.error('Hata oluştu', 'Ders oluşturulurken bir sorun yaşandı. Lütfen tekrar deneyin.');
    }
  };

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 3));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  if (isSuccess) {
    const getProgressLabel = () => {
      switch (generationProgress.stage) {
        case 'generating_slides':
          return 'Slaytlar oluşturuluyor...';
        case 'creating_audio': {
          const audioProgress = generationProgress as { currentSlide?: number; totalSlides?: number };
          if (audioProgress.currentSlide && audioProgress.totalSlides) {
            return `Ses oluşturuluyor (${audioProgress.currentSlide}/${audioProgress.totalSlides})...`;
          }
          return 'Ses dosyaları oluşturuluyor...';
        }
        case 'creating_lipsync': {
          const lipsyncProgress = generationProgress as { currentSlide?: number; totalSlides?: number };
          if (lipsyncProgress.currentSlide && lipsyncProgress.totalSlides) {
            return `Lipsync oluşturuluyor (${lipsyncProgress.currentSlide}/${lipsyncProgress.totalSlides})...`;
          }
          return 'Video senkronizasyonu yapılıyor...';
        }
        case 'saving':
          return 'Kaydediliyor...';
        case 'completed':
          return 'Ders hazır!';
        case 'failed':
          return 'Hata oluştu';
        default:
          return 'Hazırlanıyor...';
      }
    };

    const getProgressValue = () => {
      if (generationProgress.stage === 'idle') return 0;
      if ('progress' in generationProgress) return generationProgress.progress;
      return 0;
    };

    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-md w-full"
        >
          {generationProgress.stage === 'completed' ? (
            <>
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Ders Hazır!</h2>
              <p className="text-muted-foreground mb-4">
                Ders sunumunuz başarıyla oluşturuldu. Videolar sayfasına yönlendiriliyorsunuz...
              </p>
            </>
          ) : generationProgress.stage === 'failed' ? (
            <>
              <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-10 h-10 text-destructive" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Hata Oluştu</h2>
              <p className="text-muted-foreground mb-4">
                {'error' in generationProgress ? generationProgress.error : 'Bilinmeyen hata'}
              </p>
              <Button onClick={() => router.push('/dashboard/teacher/videos')}>
                Videolar Sayfasına Dön
              </Button>
            </>
          ) : (
            <>
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              </div>
              <h2 className="text-2xl font-bold mb-2">{getProgressLabel()}</h2>
              <p className="text-muted-foreground mb-6">
                Ders sunumunuz hazırlanıyor. Bu işlem birkaç dakika sürebilir.
              </p>
              
              {/* Progress Bar */}
              <div className="w-full bg-muted rounded-full h-2 mb-2">
                <motion.div
                  className="bg-primary h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${getProgressValue()}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-sm text-muted-foreground">{getProgressValue()}%</p>
            </>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Yeni Video Oluştur</h1>
          <p className="text-muted-foreground">
            AI ile ders videosu oluşturmak için bilgileri doldurun
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <button
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
            {index < steps.length - 1 && (
              <div className={cn(
                'w-8 lg:w-16 h-0.5 mx-2',
                currentStep > step.id ? 'bg-primary' : 'bg-muted'
              )} />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <AnimatePresence mode="wait">
          {/* Step 1: Lesson Info */}
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
                
                <div className="grid sm:grid-cols-2 gap-4">
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
                      {SUBJECTS.map((subject) => (
                        <option key={subject} value={subject}>{subject}</option>
                      ))}
                    </select>
                    {errors.subject && (
                      <p className="text-xs text-destructive">{errors.subject.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="grade">Sınıf Seviyesi *</Label>
                    <select
                      id="grade"
                      className={cn(
                        'w-full h-10 px-3 rounded-md border bg-background text-sm',
                        errors.grade ? 'border-destructive' : 'border-input'
                      )}
                      {...register('grade')}
                    >
                      <option value="">Sınıf seçin</option>
                      {GRADES.map((grade) => (
                        <option key={grade.value} value={grade.value}>{grade.label}</option>
                      ))}
                    </select>
                    {errors.grade && (
                      <p className="text-xs text-destructive">{errors.grade.message}</p>
                    )}
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <Label htmlFor="topic">Konu Başlığı *</Label>
                  <Input
                    id="topic"
                    placeholder="Örn: Birinci Dereceden Denklemler"
                    className={errors.topic ? 'border-destructive' : ''}
                    {...register('topic')}
                  />
                  {errors.topic && (
                    <p className="text-xs text-destructive">{errors.topic.message}</p>
                  )}
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

          {/* Step 2: Content */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="p-6 rounded-xl border border-border bg-card">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Ders İçeriği
                </h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="description">Ders Açıklaması *</Label>
                    <Textarea
                      id="description"
                      placeholder={"Bu derste neler öğretilecek? Detaylı açıklama yazın.\n\nÖrnek: \"Birinci dereceden denklemlerin çözümünü anlat. Günlük hayattan örnekler ver. Eğlenceli ve samimi bir anlatım olsun.\""}
                      rows={6}
                      className={errors.description ? 'border-destructive' : ''}
                      {...register('description')}
                    />
                    {errors.description && (
                      <p className="text-xs text-destructive">{errors.description.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Anlatım stilini de burada belirtebilirsiniz (eğlenceli, öğretici, samimi vb.). Belirtmezseniz detaylı ve samimi bir sunum oluşturulur.
                    </p>
                  </div>

                  <Separator />

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

          {/* Step 3: Settings */}
          {currentStep === 3 && (
            <motion.div
              key="step4"
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
                    <Label htmlFor="duration">Tahmini Süre: {watchAll.estimatedDuration} dakika</Label>
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
                </div>
              </div>

              {/* Summary */}
              <div className="p-6 rounded-xl border border-primary/30 bg-primary/5">
                <h3 className="font-semibold mb-4">Özet</h3>
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Ders:</span>{' '}
                    <span className="font-medium">{watchAll.subject || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Sınıf:</span>{' '}
                    <span className="font-medium">{watchAll.grade ? `${watchAll.grade}. Sınıf` : '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Konu:</span>{' '}
                    <span className="font-medium">{watchAll.topic || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Süre:</span>{' '}
                    <span className="font-medium">{watchAll.estimatedDuration} dakika</span>
                  </div>
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
                      Video Oluştur
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
