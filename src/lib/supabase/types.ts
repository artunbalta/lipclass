export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          name: string
          role: 'teacher' | 'student'
          avatar_url: string | null
          school: string | null
          subject: string | null
          grade: string | null
          bio: string | null
          reference_video_url: string | null
          reference_video_status: string
          saved_videos: string[]
          watched_videos: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name: string
          role: 'teacher' | 'student'
          avatar_url?: string | null
          school?: string | null
          subject?: string | null
          grade?: string | null
          bio?: string | null
          reference_video_url?: string | null
          reference_video_status?: string
          saved_videos?: string[]
          watched_videos?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: 'teacher' | 'student'
          avatar_url?: string | null
          school?: string | null
          subject?: string | null
          grade?: string | null
          bio?: string | null
          reference_video_url?: string | null
          reference_video_status?: string
          saved_videos?: string[]
          watched_videos?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      videos: {
        Row: {
          id: string
          teacher_id: string
          title: string
          description: string
          subject: string
          grade: string
          topic: string
          thumbnail_url: string | null
          video_url: string | null
          duration: number | null
          status: 'draft' | 'processing' | 'published' | 'failed'
          view_count: number
          like_count: number
          prompt: string
          tone: 'formal' | 'friendly' | 'energetic'
          includes_problem_solving: boolean
          problem_count: number | null
          difficulty: 'easy' | 'medium' | 'hard' | null
          estimated_duration: number | null
          language: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          teacher_id: string
          title: string
          description: string
          subject: string
          grade: string
          topic: string
          thumbnail_url?: string | null
          video_url?: string | null
          duration?: number | null
          status?: 'draft' | 'processing' | 'published' | 'failed'
          view_count?: number
          like_count?: number
          prompt: string
          tone?: 'formal' | 'friendly' | 'energetic'
          includes_problem_solving?: boolean
          problem_count?: number | null
          difficulty?: 'easy' | 'medium' | 'hard' | null
          estimated_duration?: number | null
          language?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          teacher_id?: string
          title?: string
          description?: string
          subject?: string
          grade?: string
          topic?: string
          thumbnail_url?: string | null
          video_url?: string | null
          duration?: number | null
          status?: 'draft' | 'processing' | 'published' | 'failed'
          view_count?: number
          like_count?: number
          prompt?: string
          tone?: 'formal' | 'friendly' | 'energetic'
          includes_problem_solving?: boolean
          problem_count?: number | null
          difficulty?: 'easy' | 'medium' | 'hard' | null
          estimated_duration?: number | null
          language?: string
          created_at?: string
          updated_at?: string
        }
      }
      video_analytics: {
        Row: {
          id: string
          video_id: string
          user_id: string | null
          watched_duration: number
          completed: boolean
          liked: boolean
          created_at: string
        }
        Insert: {
          id?: string
          video_id: string
          user_id?: string | null
          watched_duration?: number
          completed?: boolean
          liked?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          video_id?: string
          user_id?: string | null
          watched_duration?: number
          completed?: boolean
          liked?: boolean
          created_at?: string
        }
      }
    }
  }
}
