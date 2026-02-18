// User Types
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

// Slide Types
export interface Slide {
  slideNumber: number;
  title: string;
  content: string; // HTML/KaTeX content
  bulletPoints: string[];
  narrationText: string; // What the teacher says for this slide (also used for lipsync)
  audioUrl?: string; // TTS audio URL for this slide
  videoUrl?: string; // Per-slide lipsync video URL (future: generated from narrationText + reference video)
  bunnyVideoGuid?: string; // Bunny Stream video GUID (when provider=bunny)
  bunnyEmbedUrl?: string; // Bunny Stream embed URL (when provider=bunny)
}

export interface SlidesData {
  slides: Slide[];
}

// Video Types
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
  videoUrl?: string; // Optional - legacy MP4 videos
  slidesData?: SlidesData; // New slide-based content
  duration: number; // seconds (sum of all slide audio durations)
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

// Form Types
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
}

// Testimonial Type
export interface Testimonial {
  id: string;
  name: string;
  role: string;
  school: string;
  avatar: string;
  content: string;
  rating: number;
}

// Pricing Type
export interface PricingPlan {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  price: number;
  currency: string;
  period: string;
  features: string[];
  highlighted: boolean;
  cta: string;
}

// Navigation Type
export interface NavItem {
  label: string;
  href: string;
  icon?: string;
}

// Feature Type
export interface Feature {
  icon: string;
  title: string;
  description: string;
  color: string;
}

// Subject Type
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

// Grade Type
export type Grade = '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12';

// MCQ / Quiz Types
export interface MCQQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
}

export interface Quiz {
  id: string;
  teacherId: string;
  teacherName?: string;
  documentId?: string;
  title: string;
  description?: string;
  subject: string;
  grade: string;
  topic?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionType: 'theoretical' | 'mathematical' | 'mixed';
  language: 'tr' | 'en';
  numQuestions: number;
  status: 'draft' | 'generating' | 'ready' | 'published' | 'failed';
  summary?: string;
  questionsData?: MCQQuestion[];
  sourceType: 'document' | 'text' | 'upload';
  sourceText?: string;
  uploadedFilePath?: string;
  uploadedFileName?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  studentId: string;
  answers: QuizAnswer[];
  score: number;
  totalQuestions: number;
  timeSpent?: number;
  completedAt: Date;
  createdAt: Date;
}

export interface QuizAnswer {
  questionIndex: number;
  selectedAnswer: number;
  isCorrect: boolean;
}

export interface CreateQuizFormData {
  title: string;
  subject: string;
  grade: string;
  topic: string;
  numQuestions: number;
  difficulty: 'easy' | 'medium' | 'hard';
  questionType: 'theoretical' | 'mathematical' | 'mixed';
  language: 'tr' | 'en';
  sourceType: 'document' | 'text' | 'upload';
  documentId?: string;
  sourceText?: string;
}

export type QuizGenerationStage =
  | 'idle'
  | 'uploading'
  | 'extracting'
  | 'ocr'
  | 'summarizing'
  | 'generating'
  | 'deduplicating'
  | 'enhancing'
  | 'saving'
  | 'completed'
  | 'failed';

export interface QuizGenerationProgress {
  stage: QuizGenerationStage;
  progress: number;
  message?: string;
  error?: string;
}
