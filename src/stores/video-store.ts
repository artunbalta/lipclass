import { create } from 'zustand';
import { Video, VideoStats, CreateVideoFormData } from '@/types';
import { MOCK_VIDEOS, MOCK_VIDEO_STATS, mockDelay } from '@/lib/mock-data';

interface VideoState {
  videos: Video[];
  stats: VideoStats;
  isLoading: boolean;
  selectedVideo: Video | null;
  filter: 'all' | 'published' | 'draft' | 'processing';
  
  // Actions
  fetchVideos: () => Promise<void>;
  fetchVideoById: (id: string) => Promise<Video | null>;
  createVideo: (data: CreateVideoFormData) => Promise<Video>;
  deleteVideo: (id: string) => Promise<void>;
  setFilter: (filter: 'all' | 'published' | 'draft' | 'processing') => void;
  getFilteredVideos: () => Video[];
}

export const useVideoStore = create<VideoState>((set, get) => ({
  videos: [],
  stats: MOCK_VIDEO_STATS,
  isLoading: false,
  selectedVideo: null,
  filter: 'all',

  fetchVideos: async () => {
    set({ isLoading: true });
    await mockDelay(800);
    set({ videos: MOCK_VIDEOS, isLoading: false });
  },

  fetchVideoById: async (id: string) => {
    set({ isLoading: true });
    await mockDelay(500);
    const video = MOCK_VIDEOS.find((v) => v.id === id) || null;
    set({ selectedVideo: video, isLoading: false });
    return video;
  },

  createVideo: async (data: CreateVideoFormData) => {
    set({ isLoading: true });
    await mockDelay(2000);

    const newVideo: Video = {
      id: `video-${Date.now()}`,
      teacherId: 'teacher-1',
      teacherName: 'Ayşe Yılmaz',
      teacherAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ayse',
      title: data.topic,
      description: data.description,
      subject: data.subject,
      grade: data.grade,
      topic: data.topic,
      thumbnailUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=225&fit=crop',
      videoUrl: '#',
      duration: data.estimatedDuration * 60,
      status: 'processing',
      viewCount: 0,
      createdAt: new Date(),
      prompt: data.prompt,
      includesProblemSolving: data.includesProblemSolving,
      problemCount: data.problemCount,
      difficulty: data.difficulty,
    };

    set((state) => ({
      videos: [newVideo, ...state.videos],
      isLoading: false,
    }));

    return newVideo;
  },

  deleteVideo: async (id: string) => {
    set({ isLoading: true });
    await mockDelay(500);
    set((state) => ({
      videos: state.videos.filter((v) => v.id !== id),
      isLoading: false,
    }));
  },

  setFilter: (filter) => {
    set({ filter });
  },

  getFilteredVideos: () => {
    const { videos, filter } = get();
    if (filter === 'all') return videos;
    return videos.filter((v) => v.status === filter);
  },
}));
