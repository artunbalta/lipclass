import { Teacher, Student, Video, Testimonial, PricingPlan, Feature, VideoStats } from '@/types';

// Mock Credentials (separate from user data)
export const MOCK_CREDENTIALS = {
  teacher: { email: 'ogretmen@demo.com', password: 'demo123' },
  student: { email: 'ogrenci@demo.com', password: 'demo123' },
};

// Mock Users
export const MOCK_USERS = {
  teacher: {
    id: 'teacher-1',
    email: 'ogretmen@demo.com',
    name: 'Ayşe Yılmaz',
    role: 'teacher' as const,
    school: 'Atatürk Ortaokulu',
    subject: 'Matematik',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ayse',
    referenceVideoUrl: undefined,
    referenceVideoStatus: 'none' as const,
    bio: '15 yıllık deneyimli matematik öğretmeni',
    createdAt: new Date('2024-01-15'),
  } as Teacher,
  student: {
    id: 'student-1',
    email: 'ogrenci@demo.com',
    name: 'Mehmet Kaya',
    role: 'student' as const,
    grade: '8. Sınıf',
    school: 'Atatürk Ortaokulu',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mehmet',
    savedVideos: ['video-1', 'video-3'],
    watchedVideos: ['video-1', 'video-2'],
    createdAt: new Date('2024-02-20'),
  } as Student,
};

// Mock Videos
export const MOCK_VIDEOS: Video[] = [
  {
    id: 'video-1',
    teacherId: 'teacher-1',
    teacherName: 'Ayşe Yılmaz',
    teacherAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ayse',
    title: 'Birinci Dereceden Denklemler',
    description: 'Bu derste birinci dereceden denklemlerin çözümünü öğreneceksiniz. Denklem nedir, nasıl çözülür ve günlük hayatta nerelerde kullanılır?',
    subject: 'Matematik',
    grade: '7',
    topic: 'Denklemler',
    thumbnailUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=225&fit=crop',
    videoUrl: '#',
    duration: 720,
    status: 'published',
    viewCount: 245,
    createdAt: new Date('2024-12-01'),
    prompt: 'Birinci dereceden denklemleri basit ve anlaşılır bir şekilde anlat...',
    includesProblemSolving: true,
    problemCount: 3,
    difficulty: 'medium',
  },
  {
    id: 'video-2',
    teacherId: 'teacher-1',
    teacherName: 'Ayşe Yılmaz',
    teacherAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ayse',
    title: 'Üçgenler ve Özellikleri',
    description: 'Üçgenlerin temel özellikleri, alan hesaplama ve üçgen çeşitleri hakkında kapsamlı bir ders.',
    subject: 'Matematik',
    grade: '6',
    topic: 'Geometri',
    thumbnailUrl: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400&h=225&fit=crop',
    videoUrl: '#',
    duration: 900,
    status: 'published',
    viewCount: 189,
    createdAt: new Date('2024-11-28'),
    prompt: 'Üçgenlerin özelliklerini görsellerle destekleyerek anlat...',
    includesProblemSolving: true,
    problemCount: 4,
    difficulty: 'easy',
  },
  {
    id: 'video-3',
    teacherId: 'teacher-1',
    teacherName: 'Ayşe Yılmaz',
    teacherAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ayse',
    title: 'Oran ve Orantı',
    description: 'Oran ve orantı kavramları, doğru ve ters orantı problemleri.',
    subject: 'Matematik',
    grade: '7',
    topic: 'Oran-Orantı',
    thumbnailUrl: 'https://images.unsplash.com/photo-1596495578065-6e0763fa1178?w=400&h=225&fit=crop',
    videoUrl: '#',
    duration: 840,
    status: 'published',
    viewCount: 312,
    createdAt: new Date('2024-11-25'),
    prompt: 'Oran ve orantı konusunu günlük hayattan örneklerle anlat...',
    includesProblemSolving: true,
    problemCount: 5,
    difficulty: 'medium',
  },
  {
    id: 'video-4',
    teacherId: 'teacher-1',
    teacherName: 'Ayşe Yılmaz',
    teacherAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ayse',
    title: 'Kareköklü Sayılar',
    description: 'Kareköklü sayıların tanımı, özellikleri ve işlemleri.',
    subject: 'Matematik',
    grade: '8',
    topic: 'Kareköklü Sayılar',
    thumbnailUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=225&fit=crop',
    videoUrl: '#',
    duration: 660,
    status: 'processing',
    viewCount: 0,
    createdAt: new Date('2024-12-05'),
    prompt: 'Kareköklü sayıları sıfırdan başlayarak detaylı anlat...',
    includesProblemSolving: true,
    problemCount: 3,
    difficulty: 'hard',
  },
  {
    id: 'video-5',
    teacherId: 'teacher-1',
    teacherName: 'Ayşe Yılmaz',
    teacherAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ayse',
    title: 'Doğal Sayılarda Bölünebilme',
    description: 'Bölünebilme kuralları ve pratik çözüm yöntemleri.',
    subject: 'Matematik',
    grade: '5',
    topic: 'Bölünebilme',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?w=400&h=225&fit=crop',
    videoUrl: '#',
    duration: 540,
    status: 'draft',
    viewCount: 0,
    createdAt: new Date('2024-12-03'),
    prompt: 'Bölünebilme kurallarını eğlenceli bir şekilde öğret...',
    includesProblemSolving: false,
  },
];

// Mock Video Stats
export const MOCK_VIDEO_STATS: VideoStats = {
  totalVideos: 24,
  totalViews: 1250,
  videosThisMonth: 8,
  studentCount: 45,
};

// Mock Testimonials
export const MOCK_TESTIMONIALS: Testimonial[] = [
  {
    id: 'testimonial-1',
    name: 'Mustafa Demir',
    role: 'Matematik Öğretmeni',
    school: 'Cumhuriyet Ortaokulu',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mustafa',
    content: 'Chalk sayesinde ders videolarımı hazırlamak artık saatler değil dakikalar sürüyor. Öğrencilerim de videoları çok seviyor!',
    rating: 5,
  },
  {
    id: 'testimonial-2',
    name: 'Zeynep Kara',
    role: 'Fen Bilimleri Öğretmeni',
    school: 'Atatürk İlkokulu',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Zeynep',
    content: 'Müfredata uygun içerikler oluşturabilmek harika. Artık her konuyu kendi sesim ve yüzümle öğrencilerime anlatabilirim.',
    rating: 5,
  },
  {
    id: 'testimonial-3',
    name: 'Ali Yıldız',
    role: 'Okul Müdürü',
    school: 'Mehmet Akif Ersoy Ortaokulu',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ali',
    content: 'Okulumuzda tüm öğretmenler Chalk kullanıyor. Eğitim kalitemiz gözle görülür şekilde arttı.',
    rating: 5,
  },
];

// Pricing Plans
export const MOCK_PRICING_PLANS: PricingPlan[] = [
  {
    id: 'starter',
    name: 'Başlangıç',
    nameEn: 'Starter',
    description: 'Platformu keşfetmek isteyenler için',
    price: 0,
    currency: '₺',
    period: 'ay',
    features: [
      'Ayda 3 video oluşturma',
      '1 referans video',
      'Temel soru çözümü',
      'E-posta desteği',
      '720p video kalitesi',
    ],
    highlighted: false,
    cta: 'Ücretsiz Başla',
  },
  {
    id: 'pro',
    name: 'Profesyonel',
    nameEn: 'Pro',
    description: 'Aktif öğretmenler için ideal',
    price: 299,
    currency: '₺',
    period: 'ay',
    features: [
      'Sınırsız video oluşturma',
      '5 referans video',
      'Gelişmiş soru çözümü',
      'Öncelikli destek',
      '1080p video kalitesi',
      'İstatistik paneli',
      'Özel prompt şablonları',
    ],
    highlighted: true,
    cta: 'Pro\'ya Geç',
  },
  {
    id: 'school',
    name: 'Okul',
    nameEn: 'School',
    description: 'Tüm okul için kurumsal çözüm',
    price: 1999,
    currency: '₺',
    period: 'ay',
    features: [
      'Sınırsız öğretmen hesabı',
      'Sınırsız video oluşturma',
      'Sınırsız referans video',
      'Tüm özellikler dahil',
      '4K video kalitesi',
      'Özel API erişimi',
      'Dedicated hesap yöneticisi',
      'Özel eğitim ve destek',
    ],
    highlighted: false,
    cta: 'İletişime Geç',
  },
];

// Features for Landing Page
export const MOCK_FEATURES: Feature[] = [
  {
    icon: 'Video',
    title: 'Lipsync Teknolojisi',
    description: 'Dudak hareketleri mükemmel senkronize. Videonuz tamamen doğal görünür.',
    color: 'primary',
  },
  {
    icon: 'PenTool',
    title: 'Soru Çözümü Entegrasyonu',
    description: 'Her derste interaktif problem çözme. Nano Banana Pro tarzı tablet yazımı.',
    color: 'accent',
  },
  {
    icon: 'BookOpen',
    title: 'Müfredata Uygun',
    description: 'MEB müfredatıyla tam uyumlu içerik. Her sınıf seviyesine özel.',
    color: 'emerald',
  },
  {
    icon: 'Zap',
    title: 'Dakikalar İçinde',
    description: 'Saatler değil, dakikalar içinde hazır. Zamandan %90 tasarruf.',
    color: 'amber',
  },
  {
    icon: 'Target',
    title: 'Kişiselleştirilmiş',
    description: 'Her sınıf seviyesine, her konuya özel videolar. Tamamen sizin kontrolünüzde.',
    color: 'rose',
  },
  {
    icon: 'Shield',
    title: 'Güvenli',
    description: 'Okul verileri tamamen korumalı. KVKK uyumlu altyapı.',
    color: 'cyan',
  },
];

// Subject Options
export const SUBJECTS = [
  'Matematik',
  'Fizik',
  'Kimya',
  'Biyoloji',
  'Türkçe',
  'Edebiyat',
  'Tarih',
  'Coğrafya',
  'İngilizce',
  'Fen Bilimleri',
];

// Grade Options
export const GRADES = [
  { value: '5', label: '5. Sınıf' },
  { value: '6', label: '6. Sınıf' },
  { value: '7', label: '7. Sınıf' },
  { value: '8', label: '8. Sınıf' },
  { value: '9', label: '9. Sınıf' },
  { value: '10', label: '10. Sınıf' },
  { value: '11', label: '11. Sınıf' },
  { value: '12', label: '12. Sınıf' },
];

// Prompt Templates
export const PROMPT_TEMPLATES = [
  {
    id: 'basic',
    name: 'Temel Anlatım',
    template: '{konu} konusunu {sinif}. sınıf öğrencilerine uygun şekilde, temel kavramlardan başlayarak anlat.',
  },
  {
    id: 'detailed',
    name: 'Detaylı Anlatım',
    template: '{konu} konusunu detaylı bir şekilde ele al. Örneklerle destekle ve öğrencilerin sıkça yaptığı hataları belirt.',
  },
  {
    id: 'interactive',
    name: 'İnteraktif',
    template: '{konu} konusunu öğrencilerin aktif katılımını sağlayacak şekilde anlat. Sorular sor ve düşünmeye teşvik et.',
  },
  {
    id: 'practical',
    name: 'Pratik Odaklı',
    template: '{konu} konusunu günlük hayattan örneklerle anlat. Nerede ve nasıl kullanıldığını göster.',
  },
];

// Stats for Landing Page
export const LANDING_STATS = [
  { value: '500+', label: 'Öğretmen' },
  { value: '10,000+', label: 'Video' },
  { value: '50+', label: 'Okul' },
  { value: '100,000+', label: 'Öğrenci' },
];

// Helper function to simulate API delay
export const mockDelay = (ms: number = 800): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// Helper function to format duration
export const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// Helper function to format date
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
};
