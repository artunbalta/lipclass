// Step 1 of the Create Video flow: subject, grade(s), topic.
// Pure presentation — all state lives in the parent's react-hook-form.

'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Layers } from 'lucide-react';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SUBJECTS, GRADES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { VoiceMicButton } from './VoiceMicButton';
import type { CreateVideoForm } from '../_lib/schema';

interface Step1Props {
  register: UseFormRegister<CreateVideoForm>;
  errors: FieldErrors<CreateVideoForm>;
  grades: string[];
  onToggleGrade: (grade: string) => void;
  topicVoice: ReturnType<typeof useVoiceInput>;
  onNext: () => void;
}

export function Step1LessonInfo({
  register,
  errors,
  grades,
  onToggleGrade,
  topicVoice,
  onNext,
}: Step1Props) {
  return (
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
              errors.subject ? 'border-destructive' : 'border-input',
            )}
            {...register('subject')}
          >
            <option value="">Ders seçin</option>
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
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
              const isSelected = grades.includes(grade.value);
              return (
                <button
                  key={grade.value}
                  type="button"
                  onClick={() => onToggleGrade(grade.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border hover:border-primary/50',
                  )}
                >
                  {grade.label}
                </button>
              );
            })}
          </div>
          {errors.grades && (
            <p className="text-xs text-destructive">
              {(errors.grades as { message?: string }).message}
            </p>
          )}
          {grades.length > 1 && (
            <p className="text-xs text-amber-500 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              Toplu üretim: {grades.length} farklı sınıf için ayrı ayrı video oluşturulacak.
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
        <Button type="button" onClick={onNext}>
          Devam Et
          <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
        </Button>
      </div>
    </motion.div>
  );
}
