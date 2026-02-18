'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileText,
  Settings2,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthStore } from '@/stores/auth-store';
import { showToast } from '@/lib/utils/toast';
import { generateQuiz } from '@/lib/api/quiz-generation';
import { SUBJECTS, GRADES } from '@/lib/constants';
import type { QuizGenerationProgress, CreateQuizFormData } from '@/types';

const STEPS = [
  { id: 'source', label: 'Kaynak', icon: Upload },
  { id: 'config', label: 'Ayarlar', icon: Settings2 },
  { id: 'generate', label: 'Oluştur', icon: Sparkles },
];

const STAGE_LABELS: Record<string, string> = {
  idle: 'Hazırlanıyor...',
  uploading: 'Dosya yükleniyor...',
  extracting: 'Metin çıkarılıyor...',
  ocr: 'OCR işleniyor (taranmış PDF)...',
  summarizing: 'Döküman özetleniyor...',
  generating: 'Sorular oluşturuluyor...',
  deduplicating: 'Tekrar sorular ayıklanıyor...',
  enhancing: 'Soru kalitesi iyileştiriliyor...',
  saving: 'Quiz kaydediliyor...',
  completed: 'Tamamlandı!',
  failed: 'Hata oluştu',
};

export default function CreateQuizPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [step, setStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<QuizGenerationProgress>({
    stage: 'idle',
    progress: 0,
  });

  // Source state
  const [sourceType, setSourceType] = useState<'upload' | 'text'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [sourceText, setSourceText] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Config state
  const [formData, setFormData] = useState<CreateQuizFormData>({
    title: '',
    subject: '',
    grade: '',
    topic: '',
    numQuestions: 15,
    difficulty: 'medium',
    questionType: 'mixed',
    language: 'tr',
    sourceType: 'upload',
  });

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) setFile(droppedFile);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  }, []);

  const canProceedStep0 =
    (sourceType === 'upload' && file) || (sourceType === 'text' && sourceText.length > 50);
  const canProceedStep1 = formData.title && formData.subject && formData.grade;

  const handleGenerate = async () => {
    if (!user?.id) return;

    setIsGenerating(true);
    setProgress({ stage: 'idle', progress: 0 });

    try {
      const result = await generateQuiz({
        ...formData,
        sourceType,
        sourceText: sourceType === 'text' ? sourceText : undefined,
        teacherId: user.id,
        file: sourceType === 'upload' ? file || undefined : undefined,
        onProgress: setProgress,
      });

      showToast.success(`Quiz oluşturuldu! ${result.questions.length} soru hazır.`);
      router.push(`/dashboard/teacher/quizzes/${result.quizId}`);
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Quiz oluşturulamadı');
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Yeni Quiz Oluştur</h1>
      <p className="text-muted-foreground mb-8">
        Dökümanınızdan otomatik çoktan seçmeli sorular oluşturun
      </p>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-10">
        {STEPS.map((s, i) => {
          const StepIcon = s.icon;
          const isActive = i === step;
          const isDone = i < step;
          return (
            <div key={s.id} className="flex items-center gap-2">
              {i > 0 && (
                <div className={`w-8 h-px ${isDone ? 'bg-primary' : 'bg-border'}`} />
              )}
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : isDone
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <StepIcon className="w-4 h-4" />
                {s.label}
              </div>
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 0: Source */}
        {step === 0 && (
          <motion.div
            key="source"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="flex gap-3 mb-6">
              <Button
                variant={sourceType === 'upload' ? 'default' : 'outline'}
                onClick={() => setSourceType('upload')}
                className="gap-2"
              >
                <FileUp className="w-4 h-4" />
                Dosya Yükle
              </Button>
              <Button
                variant={sourceType === 'text' ? 'default' : 'outline'}
                onClick={() => setSourceType('text')}
                className="gap-2"
              >
                <FileText className="w-4 h-4" />
                Metin Yapıştır
              </Button>
            </div>

            {sourceType === 'upload' && (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : file
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFile(null)}
                      className="mt-2"
                    >
                      Değiştir
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <Upload className="w-10 h-10 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        PDF, TXT veya DOCX dosyası sürükleyin
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        veya dosya seçmek için tıklayın (maks. 200MB)
                      </p>
                    </div>
                    <label>
                      <input
                        type="file"
                        accept=".pdf,.txt,.md,.docx"
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                      <Button variant="outline" asChild>
                        <span>Dosya Seç</span>
                      </Button>
                    </label>
                  </div>
                )}
              </div>
            )}

            {sourceType === 'text' && (
              <div>
                <Label htmlFor="sourceText">Metin İçeriği</Label>
                <Textarea
                  id="sourceText"
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  placeholder="Ders notlarınızı veya döküman içeriğinizi buraya yapıştırın..."
                  rows={12}
                  className="mt-2"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  {sourceText.length} karakter (minimum 50)
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Step 1: Configuration */}
        {step === 1 && (
          <motion.div
            key="config"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-5"
          >
            <div>
              <Label htmlFor="title">Quiz Başlığı *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="örn: Termodinamik - 1. Yasası"
                className="mt-1.5"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ders *</Label>
                <Select
                  value={formData.subject}
                  onValueChange={(v) => setFormData({ ...formData, subject: v })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Ders seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sınıf *</Label>
                <Select
                  value={formData.grade}
                  onValueChange={(v) => setFormData({ ...formData, grade: v })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Sınıf seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADES.map((g) => (
                      <SelectItem key={g.value} value={g.value}>
                        {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="topic">Konu</Label>
              <Input
                id="topic"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                placeholder="örn: Newton'un Hareket Yasaları"
                className="mt-1.5"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Soru Sayısı</Label>
                <Select
                  value={String(formData.numQuestions)}
                  onValueChange={(v) => setFormData({ ...formData, numQuestions: Number(v) })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 15, 20, 25, 30].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} soru
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Zorluk</Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(v) => setFormData({ ...formData, difficulty: v as CreateQuizFormData['difficulty'] })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Kolay</SelectItem>
                    <SelectItem value="medium">Orta</SelectItem>
                    <SelectItem value="hard">Zor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Soru Tipi</Label>
                <Select
                  value={formData.questionType}
                  onValueChange={(v) => setFormData({ ...formData, questionType: v as CreateQuizFormData['questionType'] })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mixed">Karışık</SelectItem>
                    <SelectItem value="theoretical">Teorik</SelectItem>
                    <SelectItem value="mathematical">Matematiksel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Dil</Label>
              <Select
                value={formData.language}
                onValueChange={(v) => setFormData({ ...formData, language: v as 'tr' | 'en' })}
              >
                <SelectTrigger className="mt-1.5 w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tr">Türkçe</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </motion.div>
        )}

        {/* Step 2: Generate */}
        {step === 2 && (
          <motion.div
            key="generate"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center"
          >
            {!isGenerating ? (
              <div className="py-12">
                <Sparkles className="w-16 h-16 text-primary mx-auto mb-6" />
                <h2 className="text-xl font-semibold mb-2">Her şey hazır!</h2>
                <p className="text-muted-foreground mb-2">
                  <strong>{formData.title}</strong> — {formData.subject}, {formData.grade}. sınıf
                </p>
                <p className="text-muted-foreground mb-8">
                  {formData.numQuestions} {formData.difficulty === 'easy' ? 'kolay' : formData.difficulty === 'hard' ? 'zor' : 'orta'} seviye {formData.questionType === 'mixed' ? 'karışık' : formData.questionType === 'theoretical' ? 'teorik' : 'matematiksel'} soru oluşturulacak
                </p>
                <Button size="lg" className="gap-2" onClick={handleGenerate}>
                  <Sparkles className="w-5 h-5" />
                  Quiz Oluştur
                </Button>
              </div>
            ) : (
              <div className="py-12">
                {progress.stage === 'failed' ? (
                  <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-6" />
                ) : progress.stage === 'completed' ? (
                  <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-6" />
                ) : (
                  <Loader2 className="w-16 h-16 text-primary mx-auto mb-6 animate-spin" />
                )}
                <h2 className="text-xl font-semibold mb-2">
                  {STAGE_LABELS[progress.stage] || progress.stage}
                </h2>
                {progress.message && (
                  <p className="text-muted-foreground mb-4">{progress.message}</p>
                )}
                {/* Progress bar */}
                <div className="w-full max-w-md mx-auto bg-muted rounded-full h-2 mt-6">
                  <motion.div
                    className="bg-primary h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress.progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {Math.round(progress.progress)}%
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation buttons */}
      {!isGenerating && (
        <div className="flex justify-between mt-10">
          <Button
            variant="outline"
            onClick={() => (step === 0 ? router.back() : setStep(step - 1))}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            {step === 0 ? 'İptal' : 'Geri'}
          </Button>
          {step < 2 && (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={step === 0 ? !canProceedStep0 : !canProceedStep1}
              className="gap-2"
            >
              İleri
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
