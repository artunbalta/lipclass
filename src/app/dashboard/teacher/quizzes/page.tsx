'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Trash2,
  Eye,
  ClipboardList,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useQuizStore } from '@/stores/quiz-store';
import { useAuthStore } from '@/stores/auth-store';
import { showToast } from '@/lib/utils/toast';
import type { Quiz } from '@/types';

function statusConfig(status: Quiz['status']) {
  switch (status) {
    case 'draft':
      return { label: 'Taslak', color: 'bg-gray-100 text-gray-700', icon: Clock };
    case 'generating':
      return { label: 'Oluşturuluyor', color: 'bg-blue-100 text-blue-700', icon: Loader2 };
    case 'ready':
      return { label: 'Hazır', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 };
    case 'published':
      return { label: 'Yayında', color: 'bg-purple-100 text-purple-700', icon: Send };
    case 'failed':
      return { label: 'Hata', color: 'bg-red-100 text-red-700', icon: AlertCircle };
    default:
      return { label: status, color: 'bg-gray-100 text-gray-700', icon: Clock };
  }
}

export default function TeacherQuizzesPage() {
  const { quizzes, isLoading, fetchQuizzes, deleteQuiz } = useQuizStore();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; quizId: string | null }>({
    open: false,
    quizId: null,
  });

  useEffect(() => {
    if (user?.id) {
      fetchQuizzes(user.id);
    }
  }, [user?.id, fetchQuizzes]);

  const filteredQuizzes = quizzes.filter(
    (q) =>
      q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.topic || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async () => {
    if (!deleteDialog.quizId) return;
    const success = await deleteQuiz(deleteDialog.quizId);
    if (success) {
      showToast.success('Quiz silindi');
    } else {
      showToast.error('Quiz silinemedi');
    }
    setDeleteDialog({ open: false, quizId: null });
  };

  const handlePublish = async (quizId: string) => {
    try {
      const res = await fetch('/api/quizzes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId, status: 'published' }),
      });
      if (!res.ok) throw new Error();
      useQuizStore.getState().updateQuizInList(quizId, { status: 'published' });
      showToast.success('Quiz yayınlandı');
    } catch {
      showToast.error('Yayınlama başarısız');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Quizlerim</h1>
          <p className="text-muted-foreground mt-1">
            Dökümanlarınızdan otomatik çoktan seçmeli sorular oluşturun
          </p>
        </div>
        <Link href="/dashboard/teacher/quizzes/create">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Yeni Quiz
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Quiz ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && quizzes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ClipboardList className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium mb-2">Henüz quiz oluşturmadınız</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            Dökümanlarınızdan otomatik olarak çoktan seçmeli sorular oluşturmak için
            &quot;Yeni Quiz&quot; butonuna tıklayın.
          </p>
          <Link href="/dashboard/teacher/quizzes/create">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              İlk Quizinizi Oluşturun
            </Button>
          </Link>
        </div>
      )}

      {/* Quiz List */}
      <AnimatePresence mode="popLayout">
        <div className="grid gap-4">
          {filteredQuizzes.map((quiz) => {
            const config = statusConfig(quiz.status);
            const StatusIcon = config.icon;

            return (
              <motion.div
                key={quiz.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="border border-border rounded-xl p-5 bg-card hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg truncate">{quiz.title}</h3>
                      <Badge variant="outline" className={config.color}>
                        <StatusIcon className={`w-3 h-3 mr-1 ${quiz.status === 'generating' ? 'animate-spin' : ''}`} />
                        {config.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{quiz.subject}</span>
                      <span>{quiz.grade}. sınıf</span>
                      {quiz.topic && <span>{quiz.topic}</span>}
                      <span>{quiz.numQuestions} soru</span>
                      <span>
                        {new Date(quiz.createdAt).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {quiz.status === 'ready' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePublish(quiz.id)}
                      >
                        <Send className="w-3 h-3 mr-1" />
                        Yayınla
                      </Button>
                    )}
                    {(quiz.status === 'ready' || quiz.status === 'published') && (
                      <Link href={`/dashboard/teacher/quizzes/${quiz.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="w-3 h-3 mr-1" />
                          Görüntüle
                        </Button>
                      </Link>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteDialog({ open: true, quizId: quiz.id })}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </AnimatePresence>

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, quizId: open ? deleteDialog.quizId : null })}
        title="Quiz'i Sil"
        description="Bu quiz ve tüm öğrenci sonuçları kalıcı olarak silinecek. Bu işlem geri alınamaz."
        onConfirm={handleDelete}
      />
    </div>
  );
}
