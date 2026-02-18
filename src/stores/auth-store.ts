import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Teacher, Student } from '@/types';
import * as authAPI from '@/lib/api/auth';

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
  updateUser: (updates: Partial<Teacher | Student>) => Promise<boolean>;
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
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          const user = await authAPI.signIn(email, password);
          set({
            user: user as User,
            isAuthenticated: true,
            isLoading: false,
          });
          return true;
        } catch (error: any) {
          set({
            error: error.message || 'Giriş başarısız',
            isLoading: false,
          });
          return false;
        }
      },

      logout: async () => {
        try {
          await authAPI.signOut();
        } catch (error) {
          console.error('Logout error:', error);
        }
        set({
          user: null,
          isAuthenticated: false,
          error: null,
        });
      },

      signup: async (data: SignupData) => {
        set({ isLoading: true, error: null });

        try {
          const user = await authAPI.signUp(data);
          set({
            user: user as User,
            isAuthenticated: true,
            isLoading: false,
          });
          return true;
        } catch (error: any) {
          set({
            error: error.message || 'Kayıt başarısız',
            isLoading: false,
          });
          return false;
        }
      },

      updateUser: async (updates: Partial<Teacher | Student>) => {
        const { user } = get();
        if (!user) return false;

        try {
          const updatedUser = await authAPI.updateProfile(user.id, updates);
          set({ user: updatedUser as User });
          return true;
        } catch (error: any) {
          set({ error: error.message || 'Güncelleme başarısız' });
          return false;
        }
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
