// Step 3 of the Create Video flow: problem solving, duration, language,
// voice mode, summary card, submit.

'use client';

import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Wand2,
  Loader2,
  Settings2,
  Layers,
  Mic2,
  Bot,
} from 'lucide-react';
import type { UseFormRegister, UseFormSetValue } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { CreateVideoForm } from '../_lib/schema';

interface Step3Props {
  register: UseFormRegister<CreateVideoForm>;
  setValue: UseFormSetValue<CreateVideoForm>;
  // We pass watched values explicitly so the parent decides when to re-render.
  values: CreateVideoForm;
  hasTeacherVoice: boolean | null;
  isCreating: boolean;
  onPrev: () => void;
}

export function Step3Settings({
  register,
  setValue,
  values,
  hasTeacherVoice,
  isCreating,
  onPrev,
}: Step3Props) {
  const multipleGrades = (values.grades?.length || 0) > 1;
  return (
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

          {values.includesProblemSolving && (
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
                    { value: 'easy' as const, label: 'Kolay' },
                    { value: 'medium' as const, label: 'Orta' },
                    { value: 'hard' as const, label: 'Zor' },
                  ].map((diff) => (
                    <Button
                      key={diff.value}
                      type="button"
                      variant={values.difficulty === diff.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setValue('difficulty', diff.value)}
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
            <Label>Tahmini Süre: {values.estimatedDuration} dakika</Label>
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
                variant={values.language === 'tr' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setValue('language', 'tr')}
              >
                🇹🇷 Türkçe
              </Button>
              <Button
                type="button"
                variant={values.language === 'en' ? 'default' : 'outline'}
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
                    values.voiceMode === 'teacher'
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
                    values.voiceMode === 'robot'
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
            <span className="font-medium">{values.subject || '-'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Sınıf:</span>{' '}
            <span className="font-medium">
              {(values.grades?.length || 0) > 0
                ? values.grades.map((g) => `${g}.`).join(', ')
                : '-'}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Konu:</span>{' '}
            <span className="font-medium">{values.topic || '-'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Süre:</span>{' '}
            <span className="font-medium">{values.estimatedDuration} dakika</span>
          </div>
          {multipleGrades && (
            <div className="col-span-2">
              <span className="text-amber-500 font-medium flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" />
                {values.grades.length} video oluşturulacak (toplu üretim)
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onPrev}>
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
              {multipleGrades ? `${values.grades.length} Video Oluştur` : 'Video Oluştur'}
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
