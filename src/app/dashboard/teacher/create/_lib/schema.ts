// Zod schema + inferred form type for the Create Video form. Kept separate
// so Step components can import the type without dragging the page module.

import { z } from 'zod';
import type { Slide } from '@/types';

export const createVideoSchema = z.object({
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

export type CreateVideoForm = z.infer<typeof createVideoSchema>;

// Status of a per-grade job in the batch (multi-class) flow.
export interface BatchItem {
  grade: string;
  videoId: string | null;
  status: 'pending' | 'generating' | 'done' | 'failed';
  slides: Slide[];
}
