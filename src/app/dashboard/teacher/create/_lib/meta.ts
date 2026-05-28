// UI metadata for the slide outline row + step navigator. Lifted out of the
// create page so each Step component imports only what it needs.

import { BookOpen, FileText, Settings2, type LucideIcon } from 'lucide-react';
import type { SlideRole, VisualNeed } from '@/types';

export interface RoleMeta {
  label: string;
  emoji: string;
  tone: string;
}

export interface VisualMeta {
  icon: string;
  title: string;
}

export const ROLE_META: Record<SlideRole, RoleMeta> = {
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

export const VISUAL_META: Record<VisualNeed, VisualMeta> = {
  static:    { icon: '📝', title: 'Sadece metin / formül' },
  diagram:   { icon: '🗺️', title: 'Diyagram (Mermaid)' },
  chart:     { icon: '📊', title: 'Veri grafiği' },
  animation: { icon: '🎬', title: 'Manim animasyonu' },
  photo:     { icon: '🖼️', title: 'Görsel referans' },
};

export interface StepDef {
  id: number;
  title: string;
  icon: LucideIcon;
}

export const STEPS: StepDef[] = [
  { id: 1, title: 'Ders Bilgileri', icon: BookOpen },
  { id: 2, title: 'İçerik',         icon: FileText },
  { id: 3, title: 'Ayarlar',        icon: Settings2 },
];
