import { create } from 'zustand';
import { Video, VideoStats, CreateVideoFormData } from '@/types';
import * as videoAPI from '@/lib/api/videos';

const emptyStats: VideoStats = {
  totalVideos: 0,
  totalViews: 0,
  videosThisMonth: 0,
  studentCount: 0,
};

interface VideoState {
  videos: Video[];
  stats: VideoStats;
  isLoading: boolean;
  selectedVideo: Video | null;
  filter: 'all' | 'published' | 'draft' | 'processing';

  fetchVideos: () => Promise<void>;
  fetchVideoById: (id: string) => Promise<Video | null>;
  createVideo: (data: CreateVideoFormData) => Promise<Video>;
  deleteVideo: (id: string) => Promise<void>;
  setFilter: (filter: 'all' | 'published' | 'draft' | 'processing') => void;
  getFilteredVideos: () => Video[];
  clearSelectedVideo: () => void;
}

export const useVideoStore = create<VideoState>((set, get) => ({
  videos: [],
  stats: emptyStats,
  isLoading: false,
  selectedVideo: null,
  filter: 'all',

  fetchVideos: async () => {
    set({ isLoading: true });
    try {
      const { useAuthStore } = await import('./auth-store');
      const user = useAuthStore.getState().user;

      if (!user) {
        set({ videos: [], isLoading: false });
        return;
      }

      const currentFilter = get().filter;
      const filters =
        user.role === 'teacher'
          ? {
              teacherId: user.id,
              status:
                currentFilter !== 'all'
                  ? (currentFilter as 'published' | 'draft' | 'processing' | 'failed')
                  : undefined,
            }
          : { status: 'published' as const };

      const fetched = await videoAPI.getVideos(filters);
      set({ videos: fetched, isLoading: false });

      if (user.role === 'teacher') {
        try {
          const stats = await videoAPI.getVideoStats(user.id);
          set({ stats });
        } catch {
          // Non-critical
        }
      }
    } catch {
      set({ videos: [], isLoading: false });
    }
  },

  fetchVideoById: async (id) => {
    set({ isLoading: true });
    try {
      const video = await videoAPI.getVideoById(id);
      set({ selectedVideo: video, isLoading: false });
      return video;
    } catch {
      set({ selectedVideo: null, isLoading: false });
      return null;
    }
  },

  createVideo: async (data) => {
    set({ isLoading: true });
    try {
      const { useAuthStore } = await import('./auth-store');
      const user = useAuthStore.getState().user;

      if (!user || user.role !== 'teacher') throw new Error('Only teachers can create videos');

      const newVideo = await videoAPI.createVideo(user.id, data);
      set((state) => ({ videos: [newVideo, ...state.videos], isLoading: false }));
      return newVideo;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  deleteVideo: async (id) => {
    set({ isLoading: true });
    try {
      await videoAPI.deleteVideo(id);
      set((state) => ({
        videos: state.videos.filter((v) => v.id !== id),
        selectedVideo: state.selectedVideo?.id === id ? null : state.selectedVideo,
        isLoading: false,
      }));
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  setFilter: (filter) => set({ filter }),

  getFilteredVideos: () => {
    const { videos, filter } = get();
    if (filter === 'all') return videos;
    return videos.filter((v) => v.status === filter);
  },

  clearSelectedVideo: () => set({ selectedVideo: null }),
}));
