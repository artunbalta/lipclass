'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Send,
  CheckCircle2,
  XCircle,
  Loader2,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { showToast } from '@/lib/utils/toast';
import type { Quiz, MCQQuestion } from '@/types';

export default function QuizDetailPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.id as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAnswers, setShowAnswers] = useState<Record<number, boolean>>({});
  const [attemptStats, setAttemptStats] = useState<{ total: number; avgScore: number } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        // Fetch quiz via list endpoint filtered by teacher
        const res = await fetch(`/api/quizzes?teacherId=all`);
        // Actually, we need to fetch a single quiz. Let's use a workaround:
        // Fetch all and find, or we could add a single-get endpoint.
        // For now, just fetch all teacher quizzes
        // Actually the quiz id approach - let's just use the PATCH endpoint to get it
        // Better: let's fetch directly
        const quizRes = await fetch(`/api/quizzes?teacherId=_`, {
          method: 'GET',
        });
        // This won't work well, let me fetch differently
      } catch {
        // ignore
      }

      // Simplified: fetch by patching status to same value (hacky but works for now)
      // Better approach: just use supabase client directly
      try {
        const res = await fetch('/api/quizzes', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quizId, status: undefined }),
        });
        // This is ugly. Let me just do a direct fetch with a query param approach.
      } catch {
        // ignore
      }

      setIsLoading(false);
    }

    loadQuiz();

    async function loadQuiz() {
      setIsLoading(true);
      try {
        // We'll use the PATCH endpoint to just return the quiz without changing anything
        // Actually, let me create a proper single-quiz fetch via the quizzes route
        // For now, fetch teacher's quizzes and find the one we need
        const { useAuthStore } = await import('@/stores/auth-store');
        const user = useAuthStore.getState().user;
        if (!user) {
          router.push('/signin');
          return;
        }

        const res = await fetch(`/api/quizzes?teacherId=${user.id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        const found = data.quizzes?.find(
          (q: Record<string, unknown>) => q.id === quizId
        );
        if (!found) {
          showToast.error('Quiz bulunamadı');
          router.push('/dashboard/teacher/quizzes');
          return;
        }

        // Map DB row to Quiz type
        const mappedQuiz: Quiz = {
          id: found.id,
          teacherId: found.teacher_id,
          title: found.title,
          description: found.description,
          subject: found.subject,
          grade: found.grade,
          topic: found.topic,
          difficulty: found.difficulty || 'medium',
          questionType: found.question_type || 'mixed',
          language: found.language || 'tr',
          numQuestions: found.num_questions || 15,
          status: found.status,
          summary: found.summary,
          questionsData: found.questions_data,
          sourceType: found.source_type || 'upload',
          createdAt: new Date(found.created_at),
        };
        setQuiz(mappedQuiz);

        // Fetch attempt stats
        const attRes = await fetch(`/api/quiz-attempts?quizId=${quizId}`);
        const attData = await attRes.json();
        if (attRes.ok && attData.attempts?.length > 0) {
          const attempts = attData.attempts;
          const avgScore =
            attempts.reduce(
              (sum: number, a: { score: number }) => sum + a.score,
              0
            ) / attempts.length;
          setAttemptStats({ total: attempts.length, avgScore });
        }
      } catch (error) {
        showToast.error('Quiz yüklenemedi');
      } finally {
        setIsLoading(false);
      }
    }
  }, [quizId, router]);

  const handlePublish = async () => {
    if (!quiz) return;
    try {
      const res = await fetch('/api/quizzes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId: quiz.id, status: 'published' }),
      });
      if (!res.ok) throw new Error();
      setQuiz({ ...quiz, status: 'published' });
      showToast.success('Quiz yayınlandı');
    } catch {
      showToast.error('Yayınlama başarısız');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!quiz) return null;

  const questions: MCQQuestion[] = quiz.questionsData || [];
  const optionLetters = ['A', 'B', 'C', 'D'];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/dashboard/teacher/quizzes')}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{quiz.title}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
            <span>{quiz.subject}</span>
            <span>{quiz.grade}. sınıf</span>
            {quiz.topic && <span>{quiz.topic}</span>}
            <Badge variant="outline">
              {quiz.status === 'published' ? 'Yayında' : 'Hazır'}
            </Badge>
          </div>
        </div>
        {quiz.status === 'ready' && (
          <Button onClick={handlePublish} className="gap-2">
            <Send className="w-4 h-4" />
            Yayınla
          </Button>
        )}
      </div>

      {/* Stats */}
      {attemptStats && (
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="border border-border rounded-xl p-4 bg-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <BarChart3 className="w-4 h-4" />
              <span className="text-sm">Toplam Çözüm</span>
            </div>
            <p className="text-2xl font-bold">{attemptStats.total}</p>
          </div>
          <div className="border border-border rounded-xl p-4 bg-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm">Ortalama Puan</span>
            </div>
            <p className="text-2xl font-bold">
              {attemptStats.avgScore.toFixed(1)} / {questions.length}
            </p>
          </div>
        </div>
      )}

      {/* Questions */}
      <div className="space-y-6">
        {questions.map((q, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="border border-border rounded-xl p-5 bg-card"
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-medium">
                <span className="text-primary mr-2">S{idx + 1}.</span>
                {q.question}
              </h3>
              <Badge variant="outline" className="shrink-0 ml-3">
                {q.difficulty === 'easy'
                  ? 'Kolay'
                  : q.difficulty === 'hard'
                  ? 'Zor'
                  : 'Orta'}
              </Badge>
            </div>

            <div className="space-y-2 mb-4">
              {q.options.map((opt, optIdx) => (
                <div
                  key={optIdx}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border ${
                    showAnswers[idx]
                      ? optIdx === q.correctAnswer
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                        : 'border-border opacity-60'
                      : 'border-border'
                  }`}
                >
                  <span className="font-medium text-sm w-6">
                    {optionLetters[optIdx]}
                  </span>
                  {showAnswers[idx] && optIdx === q.correctAnswer && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  )}
                  {showAnswers[idx] && optIdx !== q.correctAnswer && (
                    <XCircle className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                  )}
                  <span className="text-sm">{opt}</span>
                </div>
              ))}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setShowAnswers((prev) => ({ ...prev, [idx]: !prev[idx] }))
              }
            >
              {showAnswers[idx] ? 'Cevabı Gizle' : 'Cevabı Göster'}
            </Button>

            {showAnswers[idx] && q.explanation && (
              <div className="mt-3 p-3 bg-muted rounded-lg text-sm">
                <strong>Açıklama:</strong> {q.explanation}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
