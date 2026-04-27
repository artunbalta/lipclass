import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Teacher, Student } from '@/types';
import * as authAPI from '@/lib/api/auth';

type User = Teacher | Student;

interface SignupData {
  name: string;
  email: string;
  password: string;
  role: 'teacher' | 'student';
  school?: string;
  subject?: string;
  grade?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  signup: (data: SignupData) => Promise<boolean>;
  updateUser: (updates: Partial<Teacher | Student>) => Promise<boolean>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,

      initialize: async () => {
        set({ isLoading: true });
        try {
          const user = await authAPI.getCurrentUser();
          set({ user: user as User | null, isAuthenticated: !!user, isLoading: false });
        } catch {
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const user = await authAPI.signIn(email, password);
          set({ user: user as User, isAuthenticated: true, isLoading: false });
          return true;
        } catch (error: any) {
          set({ error: error.message || 'Giriş başarısız', isLoading: false });
          return false;
        }
      },

      logout: async () => {
        try {
          await authAPI.signOut();
        } catch {
          // Ignore
        }
        set({ user: null, isAuthenticated: false, error: null });
      },

      signup: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const user = await authAPI.signUp(data);
          set({ user: user as User, isAuthenticated: true, isLoading: false });
          return true;
        } catch (error: any) {
          set({ error: error.message || 'Kayıt başarısız', isLoading: false });
          return false;
        }
      },

      updateUser: async (updates) => {
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

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
