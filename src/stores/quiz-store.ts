import { create } from 'zustand';
import type { Quiz } from '@/types';

interface QuizState {
  quizzes: Quiz[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchQuizzes: (teacherId: string) => Promise<void>;
  fetchPublishedQuizzes: (filters?: { subject?: string; grade?: string }) => Promise<void>;
  deleteQuiz: (quizId: string) => Promise<boolean>;
  updateQuizInList: (quizId: string, updates: Partial<Quiz>) => void;
  clearError: () => void;
}

function mapDbToQuiz(row: Record<string, unknown>): Quiz {
  return {
    id: row.id as string,
    teacherId: row.teacher_id as string,
    teacherName: (row.teacher_name as string) || undefined,
    documentId: (row.document_id as string) || undefined,
    title: row.title as string,
    description: (row.description as string) || undefined,
    subject: row.subject as string,
    grade: row.grade as string,
    topic: (row.topic as string) || undefined,
    difficulty: (row.difficulty as Quiz['difficulty']) || 'medium',
    questionType: (row.question_type as Quiz['questionType']) || 'mixed',
    language: (row.language as Quiz['language']) || 'tr',
    numQuestions: (row.num_questions as number) || 15,
    status: (row.status as Quiz['status']) || 'draft',
    summary: (row.summary as string) || undefined,
    questionsData: (row.questions_data as Quiz['questionsData']) || undefined,
    sourceType: (row.source_type as Quiz['sourceType']) || 'upload',
    sourceText: (row.source_text as string) || undefined,
    uploadedFilePath: (row.uploaded_file_path as string) || undefined,
    uploadedFileName: (row.uploaded_file_name as string) || undefined,
    errorMessage: (row.error_message as string) || undefined,
    createdAt: new Date(row.created_at as string),
    updatedAt: row.updated_at ? new Date(row.updated_at as string) : undefined,
  };
}

export const useQuizStore = create<QuizState>((set) => ({
  quizzes: [],
  isLoading: false,
  error: null,

  fetchQuizzes: async (teacherId: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/quizzes?teacherId=${teacherId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch quizzes');
      set({ quizzes: (data.quizzes || []).map(mapDbToQuiz), isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch quizzes',
        isLoading: false,
      });
    }
  },

  fetchPublishedQuizzes: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams({ published: 'true' });
      if (filters?.subject) params.set('subject', filters.subject);
      if (filters?.grade) params.set('grade', filters.grade);

      const res = await fetch(`/api/quizzes?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch quizzes');
      set({ quizzes: (data.quizzes || []).map(mapDbToQuiz), isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch quizzes',
        isLoading: false,
      });
    }
  },

  deleteQuiz: async (quizId: string) => {
    try {
      const res = await fetch(`/api/quizzes?quizId=${quizId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Delete failed');
      }
      set((state) => ({
        quizzes: state.quizzes.filter((q) => q.id !== quizId),
      }));
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Delete failed' });
      return false;
    }
  },

  updateQuizInList: (quizId: string, updates: Partial<Quiz>) => {
    set((state) => ({
      quizzes: state.quizzes.map((q) =>
        q.id === quizId ? { ...q, ...updates } : q
      ),
    }));
  },

  clearError: () => set({ error: null }),
}));
