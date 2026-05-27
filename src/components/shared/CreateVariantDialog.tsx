'use client';

import { useState } from 'react';
import { Loader2, Wand2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Video, CreateVideoFormData } from '@/types';
import { useVideoStore } from '@/stores/video-store';
import { useAuthStore } from '@/stores/auth-store';
import { generateSlidesOnly } from '@/lib/api/generation';
import { showToast } from '@/lib/utils/toast';
import { cn } from '@/lib/utils';

interface CreateVariantDialogProps {
  video: Video | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DIFFICULTY_OPTIONS: Array<{ value: 'easy' | 'medium' | 'hard'; label: string; description: string }> = [
  { value: 'easy', label: 'Kolay', description: 'Temel kavramlar, az teknik detay' },
  { value: 'medium', label: 'Orta', description: 'Standart müfredat düzeyi' },
  { value: 'hard', label: 'Zor', description: 'İleri düzey, zengin içerik' },
];

export function CreateVariantDialog({ video, open, onOpenChange }: CreateVariantDialogProps) {
  const router = useRouter();
  const { createVideo } = useVideoStore();
  const { user } = useAuthStore();

  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [variantLabel, setVariantLabel] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!video || !user) return;

    const label = variantLabel.trim() || `${difficulty === 'easy' ? 'Kolay' : difficulty === 'medium' ? 'Orta' : 'Zor'} Varyant`;

    setIsCreating(true);

    try {
      const videoData: CreateVideoFormData = {
        subject: video.subject,
        grade: video.grade,
        topic: video.topic,
        description: video.description || '',
        learningObjectives: [],
        keyConcepts: [],
        prompt: video.prompt || '',
        tone: (video.tone as 'formal' | 'friendly' | 'energetic') || 'friendly',
        includesProblemSolving: video.includesProblemSolving,
        problemCount: video.problemCount || 3,
        difficulty,
        estimatedDuration: 15,
        language: video.language || 'tr',
        curriculumCodes: video.curriculumCodes || [],
      };

      const newVideo = await createVideo(videoData);

      // Patch parentVideoId + variantLabel immediately after creation
      // (createVideo doesn't expose these fields in CreateVideoFormData, so we
      // update separately via the API)
      await fetch(`/api/videos/${newVideo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent_video_id: video.id,
          variant_label: label,
        }),
      }).catch(() => {
        // Non-fatal: label is cosmetic
      });

      onOpenChange(false);
      showToast.success('Varyant oluşturuluyor', 'Slaytlar hazırlanıyor...');

      await generateSlidesOnly({
        videoId: newVideo.id,
        teacherId: user.id,
        topic: video.topic,
        description: video.description || '',
        prompt: video.prompt || '',
        language: video.language || 'tr',
        tone: (video.tone as 'formal' | 'friendly' | 'energetic') || 'friendly',
        includesProblemSolving: video.includesProblemSolving,
        problemCount: video.problemCount || 3,
        difficulty,
        sourceDocumentIds: undefined,
      });

      showToast.success('Slaytlar hazır!', `"${label}" varyantı düzenlemeye hazır.`);
      router.push(`/dashboard/teacher/videos/${newVideo.id}/edit`);
    } catch (err) {
      showToast.error(
        'Hata',
        err instanceof Error ? err.message : 'Varyant oluşturulamadı.'
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !isCreating && onOpenChange(v)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Varyant Oluştur</DialogTitle>
          <DialogDescription>
            "{video?.title}" videosunun farklı zorluk düzeyinde bir versiyonunu oluşturun.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Difficulty */}
          <div className="space-y-2">
            <Label>Zorluk Düzeyi</Label>
            <div className="grid grid-cols-3 gap-2">
              {DIFFICULTY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDifficulty(opt.value)}
                  className={cn(
                    'p-3 rounded-xl border text-left transition-all',
                    difficulty === opt.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40'
                  )}
                >
                  <p className="text-sm font-semibold">{opt.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{opt.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Label */}
          <div className="space-y-2">
            <Label htmlFor="variant-label">Varyant Etiketi</Label>
            <Input
              id="variant-label"
              placeholder={`Örn: ${difficulty === 'easy' ? 'Kolay Versiyon' : difficulty === 'hard' ? 'İleri Düzey' : 'Orta Düzey'}`}
              value={variantLabel}
              onChange={(e) => setVariantLabel(e.target.value)}
              disabled={isCreating}
            />
            <p className="text-xs text-muted-foreground">
              Boş bırakırsanız zorluk adı kullanılır.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            İptal
          </Button>
          <Button onClick={handleCreate} disabled={isCreating} className="gap-2">
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Oluşturuluyor...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Oluştur
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
