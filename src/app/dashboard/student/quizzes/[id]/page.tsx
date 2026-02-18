'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Trophy,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { showToast } from '@/lib/utils/toast';
import { useAuthStore } from '@/stores/auth-store';
import type { MCQQuestion } from '@/types';

type QuizPhase = 'loading' | 'ready' | 'taking' | 'submitted';

export default function TakeQuizPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.id as string;
  const { user } = useAuthStore();

  const [phase, setPhase] = useState<QuizPhase>('loading');
  const [quizTitle, setQuizTitle] = useState('');
  const [quizMeta, setQuizMeta] = useState({ subject: '', grade: '', difficulty: '' });
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [results, setResults] = useState<{
    score: number;
    total: number;
    answers: { questionIndex: number; selectedAnswer: number; isCorrect: boolean }[];
  } | null>(null);
  const startTime = useRef(Date.now());

  // Load quiz
  useEffect(() => {
    async function loadQuiz() {
      try {
        const res = await fetch(`/api/quizzes?published=true`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        const found = data.quizzes?.find(
          (q: Record<string, unknown>) => q.id === quizId
        );
        if (!found) {
          showToast.error('Quiz bulunamadı');
          router.push('/dashboard/student/quizzes');
          return;
        }

        setQuizTitle(found.title);
        setQuizMeta({
          subject: found.subject,
          grade: found.grade,
          difficulty: found.difficulty || 'medium',
        });
        setQuestions(found.questions_data || []);
        setPhase('ready');
      } catch {
        showToast.error('Quiz yüklenemedi');
        router.push('/dashboard/student/quizzes');
      }
    }

    loadQuiz();
  }, [quizId, router]);

  const handleSelectAnswer = (optionIdx: number) => {
    setAnswers((prev) => ({ ...prev, [currentIdx]: optionIdx }));
  };

  const handleSubmit = async () => {
    if (!user?.id) return;

    const timeSpent = Math.round((Date.now() - startTime.current) / 1000);

    const answersList = Object.entries(answers).map(([qIdx, selectedAnswer]) => ({
      questionIndex: Number(qIdx),
      selectedAnswer,
    }));

    try {
      const res = await fetch('/api/quiz-attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId,
          studentId: user.id,
          answers: answersList,
          timeSpent,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setResults({
        score: data.attempt.score,
        total: data.attempt.total_questions,
        answers: data.attempt.answers,
      });
      setPhase('submitted');
    } catch (error) {
      showToast.error('Sonuçlar gönderilemedi');
    }
  };

  const optionLetters = ['A', 'B', 'C', 'D'];
  const allAnswered = questions.length > 0 && Object.keys(answers).length === questions.length;

  // Loading
  if (phase === 'loading') {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Ready to start
  if (phase === 'ready') {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center py-20">
        <h1 className="text-2xl font-bold mb-2">{quizTitle}</h1>
        <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground mb-8">
          <Badge variant="outline">{quizMeta.subject}</Badge>
          <span>{quizMeta.grade}. sınıf</span>
          <span>{questions.length} soru</span>
        </div>
        <Button
          size="lg"
          onClick={() => {
            startTime.current = Date.now();
            setPhase('taking');
          }}
          className="gap-2"
        >
          Quiz&apos;e Başla
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
    );
  }

  // Results
  if (phase === 'submitted' && results) {
    const percentage = Math.round((results.score / results.total) * 100);

    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard/student/quizzes')}
          className="gap-2 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Quizlere Dön
        </Button>

        {/* Score */}
        <div className="text-center mb-10">
          <Trophy
            className={`w-16 h-16 mx-auto mb-4 ${
              percentage >= 70 ? 'text-amber-400' : 'text-muted-foreground'
            }`}
          />
          <h1 className="text-3xl font-bold mb-2">
            {results.score} / {results.total}
          </h1>
          <p className="text-xl text-muted-foreground">%{percentage} Başarı</p>
          <div className="flex items-center justify-center gap-2 mt-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>
              {Math.floor((Date.now() - startTime.current) / 60000)} dk{' '}
              {Math.floor(((Date.now() - startTime.current) / 1000) % 60)} sn
            </span>
          </div>
        </div>

        {/* Review */}
        <h2 className="text-lg font-semibold mb-4">Sonuçlar</h2>
        <div className="space-y-4">
          {questions.map((q, idx) => {
            const answer = results.answers.find((a) => a.questionIndex === idx);
            const isCorrect = answer?.isCorrect;
            const selected = answer?.selectedAnswer;

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className={`border rounded-xl p-4 ${
                  isCorrect ? 'border-emerald-300 bg-emerald-50/50' : 'border-red-300 bg-red-50/50'
                }`}
              >
                <div className="flex items-start gap-2 mb-3">
                  {isCorrect ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  )}
                  <span className="font-medium text-sm">{q.question}</span>
                </div>
                <div className="space-y-1.5 ml-7">
                  {q.options.map((opt, optIdx) => (
                    <div
                      key={optIdx}
                      className={`px-3 py-1.5 rounded text-sm ${
                        optIdx === q.correctAnswer
                          ? 'bg-emerald-100 text-emerald-700 font-medium'
                          : optIdx === selected && !isCorrect
                          ? 'bg-red-100 text-red-700 line-through'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {optionLetters[optIdx]}. {opt}
                    </div>
                  ))}
                </div>
                {q.explanation && (
                  <p className="mt-2 ml-7 text-sm text-muted-foreground">
                    <strong>Açıklama:</strong> {q.explanation}
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>

        <div className="flex gap-3 mt-8">
          <Button
            variant="outline"
            onClick={() => {
              setAnswers({});
              setResults(null);
              setCurrentIdx(0);
              setPhase('ready');
            }}
            className="gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Tekrar Çöz
          </Button>
          <Button onClick={() => router.push('/dashboard/student/quizzes')}>
            Quizlere Dön
          </Button>
        </div>
      </div>
    );
  }

  // Taking quiz
  const currentQ = questions[currentIdx];
  if (!currentQ) return null;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Progress */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm text-muted-foreground">
          Soru {currentIdx + 1} / {questions.length}
        </span>
        <span className="text-sm text-muted-foreground">
          {Object.keys(answers).length} / {questions.length} cevaplandı
        </span>
      </div>
      <div className="w-full bg-muted rounded-full h-1.5 mb-8">
        <div
          className="bg-primary h-1.5 rounded-full transition-all"
          style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <motion.div
        key={currentIdx}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-8"
      >
        <h2 className="text-lg font-medium mb-6">{currentQ.question}</h2>
        <div className="space-y-3">
          {currentQ.options.map((opt, optIdx) => (
            <button
              key={optIdx}
              onClick={() => handleSelectAnswer(optIdx)}
              className={`w-full text-left flex items-center gap-4 px-5 py-3.5 rounded-xl border-2 transition-all ${
                answers[currentIdx] === optIdx
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40'
              }`}
            >
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0 ${
                  answers[currentIdx] === optIdx
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {optionLetters[optIdx]}
              </span>
              <span className="text-sm">{opt}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
          disabled={currentIdx === 0}
        >
          Önceki
        </Button>

        {currentIdx < questions.length - 1 ? (
          <Button
            onClick={() => setCurrentIdx(currentIdx + 1)}
            disabled={answers[currentIdx] === undefined}
          >
            Sonraki
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!allAnswered}
            className="gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Sınavı Bitir
          </Button>
        )}
      </div>

      {/* Question dots */}
      <div className="flex flex-wrap gap-2 justify-center mt-8">
        {questions.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIdx(idx)}
            className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
              idx === currentIdx
                ? 'bg-primary text-primary-foreground'
                : answers[idx] !== undefined
                ? 'bg-primary/20 text-primary'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {idx + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
