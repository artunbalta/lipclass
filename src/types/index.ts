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
  videoUrl: string;
  duration: number; // seconds
  status: 'draft' | 'processing' | 'published' | 'failed';
  viewCount: number;
  createdAt: Date;
  prompt: string;
  includesProblemSolving: boolean;
  problemCount?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
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
