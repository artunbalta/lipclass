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
export type SlideType = 'content' | 'quiz';

export interface QuizData {
  question: string;
  options: [string, string, string, string]; // exactly 4 options
  correctAnswer: 0 | 1 | 2 | 3;               // index of correct option
  explanation?: string;
}

// ── Slide Intent System ────────────────────────────────────────────────────
// Each slide self-elects its pedagogical role and visual treatment during
// Pass 1 (outline) so Pass 2 can specialise the generation prompt and the
// finalize pipeline can route Manim / Mermaid / chart rendering deterministically.

export type SlideRole =
  | 'hook'           // Opening attention grabber
  | 'definition'     // Term / concept definition
  | 'concept'        // Conceptual explanation
  | 'derivation'     // Step-by-step mathematical derivation
  | 'worked_example' // Worked problem with full solution
  | 'comparison'     // Side-by-side comparison of items
  | 'experiment'     // Lab / scientific procedure
  | 'visualization'  // Animation / chart / diagram is the centerpiece
  | 'quiz'           // Interactive 4-option quiz
  | 'summary';       // Recap / wrap-up

export type VisualNeed =
  | 'static'      // Text + formulas only
  | 'diagram'     // Mermaid concept map / flowchart
  | 'chart'       // Data chart (bar/line/pie)
  | 'animation'   // Manim motion animation
  | 'photo';      // Real-world image / illustration

export interface SlideIntent {
  role: SlideRole;
  complexity: 1 | 2 | 3;            // Cognitive load (1=intro, 3=peak)
  visualNeed: VisualNeed;
  motionJustification?: string;     // Filled when visualNeed='animation'
  estimatedDurationSec?: number;    // 30..120
}

export interface VisualHint {
  diagramKind?: 'flowchart' | 'sequence' | 'pie' | 'graph' | 'mindmap';
  chartKind?: 'bar' | 'line' | 'pie';
  animationKind?:
    | 'graph'
    | 'vector_field'
    | 'geometry_construction'
    | 'oscillation'
    | 'transformation'
    | 'process_flow';
  hasFormulas?: boolean;
}

export interface SlideOutline {
  slideNumber: number;
  title: string;
  oneLineGoal: string;
  intent: SlideIntent;
  prerequisiteSlides?: number[];
}

export interface Slide {
  slideNumber: number;
  title: string;
  content: string; // HTML/KaTeX content
  bulletPoints: string[];
  narrationText: string; // What the teacher says for this slide (also used for lipsync)
  audioUrl?: string; // TTS audio URL for this slide
  videoUrl?: string; // Per-slide lipsync video URL
  animationUrl?: string; // Manim-generated animation video URL for this slide
  bunnyVideoGuid?: string; // Bunny Stream video GUID (when provider=bunny)
  bunnyEmbedUrl?: string; // Bunny Stream embed URL (when provider=bunny)

  // Slide type discriminator. When 'quiz', `quiz` field is required and the
  // player renders the interactive quiz UI instead of slide content.
  slideType?: SlideType;
  quiz?: QuizData;

  // Slide-intent metadata produced by the outline + materialize pipeline.
  // Optional for backwards compatibility with slides created before this system.
  intent?: SlideIntent;
  visualHint?: VisualHint;

  // Editor / regen state — set when teacher edits a slide between
  // slides_ready and the next finalize. Both fields are ISO timestamps.
  editedAt?: string;          // any field changed manually
  narrationDirtyAt?: string;  // narration changed → TTS+lipsync must re-run on finalize
  mediaStatus?: 'pending' | 'ready' | 'failed'; // populated during finalize pipeline
}

export interface SlidesData {
  slides: Slide[];
  outline?: SlideOutline[]; // Pass 1 output; persisted so editor can render
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
  status: 'draft' | 'slides_ready' | 'processing' | 'published' | 'failed';
  viewCount: number;
  createdAt: Date;
  slidesApprovedAt?: Date; // Set when teacher clicks "Onayla ve Üret"
  prompt: string;
  includesProblemSolving: boolean;
  problemCount?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  videoProvider?: 'fal' | 'bunny';
  bunnyIngestionStatus?: 'pending' | 'success' | 'failed' | null;
  contentHash?: string;            // sha256 of generation inputs — cache key
  curriculumCodes?: string[];      // MEB kazanım kodları (e.g. ['8.2.1.1', '8.2.1.2'])
  parentVideoId?: string;          // If this video is a derivative, points at original
  variantLabel?: string;           // Human label, e.g. 'İngilizce', 'İlkokul'
  language?: 'tr' | 'en';          // Stored in DB; used for variant differentiation
  tone?: 'formal' | 'friendly' | 'energetic';
  generationProgress?: {
    stage: string;
    progress: number;              // 0-100
    currentSlide?: number;
    totalSlides?: number;
    error?: string;
    updatedAt: string;             // ISO timestamp
  } | null;
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
  curriculumCodes?: string[];
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
