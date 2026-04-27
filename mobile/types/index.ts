export interface User {
  id: string;
  email: string;
  name: string;
  role: 'teacher' | 'student';
  avatar?: string;
  school?: string;
  createdAt: Date;
}

export interface Teacher extends User {
  role: 'teacher';
  subject: string;
  referenceVideoUrl?: string;
  referenceVideoStatus: 'none' | 'processing' | 'ready';
  bio?: string;
}

export interface Student extends User {
  role: 'student';
  grade: string;
  savedVideos: string[];
  watchedVideos: string[];
}

export interface Slide {
  slideNumber: number;
  title: string;
  content: string;
  bulletPoints: string[];
  narrationText: string;
  audioUrl?: string;
  videoUrl?: string;
  bunnyVideoGuid?: string;
  bunnyEmbedUrl?: string;
}

export interface SlidesData {
  slides: Slide[];
}

export interface Video {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherAvatar?: string;
  title: string;
  description: string;
  subject: string;
  grade: string;
  topic: string;
  thumbnailUrl: string;
  videoUrl?: string;
  slidesData?: SlidesData;
  duration: number;
  status: 'draft' | 'processing' | 'published' | 'failed';
  viewCount: number;
  createdAt: Date;
  prompt: string;
  includesProblemSolving: boolean;
  problemCount?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  videoProvider?: 'fal' | 'bunny';
  bunnyIngestionStatus?: 'pending' | 'success' | 'failed' | null;
}

export interface VideoStats {
  totalVideos: number;
  totalViews: number;
  videosThisMonth: number;
  studentCount: number;
}

export interface CreateVideoFormData {
  subject: string;
  grade: string;
  topic: string;
  description: string;
  learningObjectives: string[];
  keyConcepts: string[];
  prompt: string;
  tone: 'formal' | 'friendly' | 'energetic';
  includesProblemSolving: boolean;
  problemCount: number;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedDuration: number;
  language: 'tr' | 'en';
  sourceOnly?: boolean;
  sourceDocumentIds?: string[];
}

export interface TeacherDocument {
  id: string;
  original_name: string;
  status: 'pending' | 'embedding' | 'embedded' | 'failed';
  chunk_count: number;
  created_at: string;
}

export type Subject =
  | 'Matematik'
  | 'Fizik'
  | 'Kimya'
  | 'Biyoloji'
  | 'Türkçe'
  | 'Edebiyat'
  | 'Tarih'
  | 'Coğrafya'
  | 'İngilizce'
  | 'Fen Bilimleri';

export type Grade = '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12';
