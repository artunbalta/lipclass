import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Teacher, Student } from '@/types';
import { MOCK_USERS, MOCK_CREDENTIALS, mockDelay } from '@/lib/mock-data';

type User = Teacher | Student;

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  signup: (data: SignupData) => Promise<boolean>;
  clearError: () => void;
}

interface SignupData {
  name: string;
  email: string;
  password: string;
  role: 'teacher' | 'student';
  school?: string;
  subject?: string;
  grade?: string;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        
        await mockDelay(1000);

        // Check mock users
        if (email === MOCK_CREDENTIALS.teacher.email && password === MOCK_CREDENTIALS.teacher.password) {
          set({
            user: MOCK_USERS.teacher,
            isAuthenticated: true,
            isLoading: false,
          });
          return true;
        }

        if (email === MOCK_CREDENTIALS.student.email && password === MOCK_CREDENTIALS.student.password) {
          set({
            user: MOCK_USERS.student,
            isAuthenticated: true,
            isLoading: false,
          });
          return true;
        }

        set({
          error: 'E-posta veya şifre hatalı',
          isLoading: false,
        });
        return false;
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          error: null,
        });
      },

      signup: async (data: SignupData) => {
        set({ isLoading: true, error: null });
        
        await mockDelay(1500);

        // Simulate email check
        if (data.email === MOCK_CREDENTIALS.teacher.email || data.email === MOCK_CREDENTIALS.student.email) {
          set({
            error: 'Bu e-posta adresi zaten kullanımda',
            isLoading: false,
          });
          return false;
        }

        // Create new user
        const newUser: User = data.role === 'teacher'
          ? {
              id: `teacher-${Date.now()}`,
              email: data.email,
              name: data.name,
              role: 'teacher',
              school: data.school,
              subject: data.subject || 'Matematik',
              avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.name}`,
              referenceVideoStatus: 'none',
              createdAt: new Date(),
            } as Teacher
          : {
              id: `student-${Date.now()}`,
              email: data.email,
              name: data.name,
              role: 'student',
              school: data.school,
              grade: data.grade || '8. Sınıf',
              avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.name}`,
              savedVideos: [],
              watchedVideos: [],
              createdAt: new Date(),
            } as Student;

        set({
          user: newUser,
          isAuthenticated: true,
          isLoading: false,
        });
        return true;
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
