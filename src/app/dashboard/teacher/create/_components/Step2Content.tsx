// Step 2 of the Create Video flow: description, tone, whiteboard upload,
// MEB curriculum picker, source documents (RAG).

'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, FileText, Sparkles, Camera, X, Loader2, Library } from 'lucide-react';
import type { RefObject } from 'react';
import type { UseFormRegister, UseFormSetValue, FieldErrors } from 'react-hook-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { KazanimPicker } from '@/components/shared/KazanimPicker';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { cn } from '@/lib/utils';
import { VoiceMicButton } from './VoiceMicButton';
import type { CreateVideoForm } from '../_lib/schema';

interface TeacherDoc {
  id: string;
  original_name: string;
  status: string;
  chunk_count: number;
}

interface Step2Props {
  register: UseFormRegister<CreateVideoForm>;
  setValue: UseFormSetValue<CreateVideoForm>;
  errors: FieldErrors<CreateVideoForm>;
  tone: CreateVideoForm['tone'];
  subject: string;
  grade: string;
  curriculumCodes: string[];
  sourceDocumentIds: string[];
  descriptionVoice: ReturnType<typeof useVoiceInput>;
  whiteboardPreview: string | null;
  isExtractingWhiteboard: boolean;
  whiteboardInputRef: RefObject<HTMLInputElement | null>;
  teacherDocs: TeacherDoc[];
  onPickWhiteboard: (file: File) => void;
  onClearWhiteboard: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export function Step2Content({
  register,
  setValue,
  errors,
  tone,
  subject,
  grade,
  curriculumCodes,
  sourceDocumentIds,
  descriptionVoice,
  whiteboardPreview,
  isExtractingWhiteboard,
  whiteboardInputRef,
  teacherDocs,
  onPickWhiteboard,
  onClearWhiteboard,
  onPrev,
  onNext,
}: Step2Props) {
  return (
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

      {/* Description + voice + tone */}
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

          <div className="space-y-2">
            <Label>Anlatım Tonu</Label>
            <div className="flex gap-2">
              {[
                { value: 'formal' as const, label: 'Formal' },
                { value: 'friendly' as const, label: 'Samimi' },
                { value: 'energetic' as const, label: 'Enerjik' },
              ].map((t) => (
                <Button
                  key={t.value}
                  type="button"
                  variant={tone === t.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setValue('tone', t.value)}
                >
                  {t.label}
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
              onClick={onClearWhiteboard}
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
                if (file) onPickWhiteboard(file);
              }}
            />
          </label>
        )}
      </div>

      {/* MEB Kazanımları */}
      <div className="p-6 rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold flex items-center gap-2">🎯 MEB Kazanımları</h3>
          {curriculumCodes.length > 0 && (
            <Badge variant="secondary">{curriculumCodes.length} kazanım</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Bu dersle hangi MEB kazanımları işleniyor?
        </p>
        <KazanimPicker
          subject={subject}
          grade={grade}
          selectedCodes={curriculumCodes}
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
                      sourceDocumentIds.includes(doc.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/30',
                    )}
                  >
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-input text-primary"
                      checked={sourceDocumentIds.includes(doc.id)}
                      onChange={(e) => {
                        setValue(
                          'sourceDocumentIds',
                          e.target.checked
                            ? [...sourceDocumentIds, doc.id]
                            : sourceDocumentIds.filter((id) => id !== doc.id),
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
        <Button type="button" variant="outline" onClick={onPrev}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Geri
        </Button>
        <Button type="button" onClick={onNext}>
          Devam Et
          <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
        </Button>
      </div>
    </motion.div>
  );
}
