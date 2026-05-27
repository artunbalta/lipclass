'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Check, X, Loader2, RefreshCw, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SrItem } from '@/app/api/sr/route';

type ReviewPhase = 'loading' | 'question' | 'revealed' | 'done' | 'empty';

export default function ReviewPage() {
  const [items, setItems] = useState<SrItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<ReviewPhase>('loading');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  const loadDueItems = useCallback(async () => {
    setPhase('loading');
    try {
      const res = await fetch('/api/sr?action=due');
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      const loaded: SrItem[] = data.items || [];
      setItems(loaded);
      setCurrentIndex(0);
      setDoneCount(0);
      setCorrectCount(0);
      setSelectedOption(null);
      setPhase(loaded.length === 0 ? 'empty' : 'question');
    } catch {
      setPhase('empty');
    }
  }, []);

  useEffect(() => {
    loadDueItems();
  }, [loadDueItems]);

  const current = items[currentIndex];

  const handleSelectOption = (idx: number) => {
    if (phase !== 'question') return;
    setSelectedOption(idx);
    setPhase('revealed');
  };

  const handleRate = async (quality: 1 | 3 | 5) => {
    if (!current || isSubmitting) return;
    setIsSubmitting(true);

    try {
      await fetch('/api/sr?action=review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: current.id, quality }),
      });
    } catch { /* non-fatal */ }

    const wasCorrect = selectedOption === current.correctAnswer;
    setDoneCount((n) => n + 1);
    if (wasCorrect) setCorrectCount((n) => n + 1);

    setIsSubmitting(false);
    setSelectedOption(null);

    if (currentIndex + 1 >= items.length) {
      setPhase('done');
    } else {
      setCurrentIndex((i) => i + 1);
      setPhase('question');
    }
  };

  const optionLabels = ['A', 'B', 'C', 'D'];

  // ── EMPTY ──────────────────────────────────────────────────────────────────
  if (phase === 'empty') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <Trophy className="w-10 h-10 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold">Bugün tekrar yok!</h2>
        <p className="text-muted-foreground">
          Tüm tekrarlar tamamlandı. Yanlış yaptığın sorular otomatik olarak burada belirir.
        </p>
      </div>
    );
  }

  // ── LOADING ────────────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── DONE ───────────────────────────────────────────────────────────────────
  if (phase === 'done') {
    const pct = doneCount > 0 ? Math.round((correctCount / doneCount) * 100) : 0;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-6 max-w-sm mx-auto"
      >
        <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
          <Brain className="w-12 h-12 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-1">Tekrar Tamamlandı!</h2>
          <p className="text-muted-foreground">
            {doneCount} sorudan {correctCount} tanesini doğru yaptın.
          </p>
        </div>
        <div className="w-full bg-muted rounded-full h-3">
          <motion.div
            className="bg-primary h-3 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ delay: 0.3, duration: 0.6 }}
          />
        </div>
        <p className="text-3xl font-bold">{pct}%</p>
        <Button onClick={loadDueItems} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Tekrar Kontrol Et
        </Button>
      </motion.div>
    );
  }

  // ── QUESTION / REVEALED ───────────────────────────────────────────────────
  return (
    <div className="max-w-xl mx-auto space-y-6 py-4">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Aralıklı Tekrar
          </span>
          <span>{currentIndex + 1} / {items.length}</span>
        </div>
        <div className="w-full bg-muted rounded-full h-1.5">
          <div
            className="bg-primary h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex) / items.length) * 100}%` }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          className="space-y-4"
        >
          {/* Due badge */}
          <Badge variant="secondary" className="text-xs">
            SM-2 · {current.intervalDays === 1 ? 'Bugün' : `${current.intervalDays} gün`}
          </Badge>

          {/* Question */}
          <div className="p-5 rounded-xl border border-border bg-card">
            <p className="font-medium text-base leading-relaxed">{current.question}</p>
          </div>

          {/* Options */}
          <div className="space-y-2">
            {(current.options as string[]).map((opt, idx) => {
              const isSelected = selectedOption === idx;
              const isCorrect = idx === current.correctAnswer;
              const revealed = phase === 'revealed';

              let style = 'border-border bg-card hover:border-primary/50';
              if (revealed && isCorrect) style = 'border-emerald-500 bg-emerald-500/10';
              else if (revealed && isSelected && !isCorrect) style = 'border-destructive bg-destructive/10';
              else if (isSelected && !revealed) style = 'border-primary bg-primary/5';

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(idx)}
                  disabled={phase !== 'question'}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                    style
                  )}
                >
                  <span className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                    revealed && isCorrect
                      ? 'bg-emerald-500 text-white'
                      : revealed && isSelected && !isCorrect
                        ? 'bg-destructive text-white'
                        : 'bg-muted text-muted-foreground'
                  )}>
                    {revealed && isCorrect ? <Check className="w-3 h-3" /> :
                     revealed && isSelected && !isCorrect ? <X className="w-3 h-3" /> :
                     optionLabels[idx]}
                  </span>
                  <span className="text-sm">{opt}</span>
                </button>
              );
            })}
          </div>

          {/* Explanation + rating buttons */}
          {phase === 'revealed' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {current.explanation && (
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <p className="text-sm text-muted-foreground">{current.explanation}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground mb-2 text-center">Bu soruyu nasıl buldun?</p>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRate(1)}
                    disabled={isSubmitting}
                    className="border-destructive/50 text-destructive hover:bg-destructive/10 gap-1"
                  >
                    <X className="w-3 h-3" />
                    Bilmiyordum
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRate(3)}
                    disabled={isSubmitting}
                    className="gap-1"
                  >
                    Zordu
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRate(5)}
                    disabled={isSubmitting}
                    className="border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10 gap-1"
                  >
                    <Check className="w-3 h-3" />
                    Kolaydı
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
