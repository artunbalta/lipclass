import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useVideoStore } from '@/stores/video-store';
import { useAuthStore } from '@/stores/auth-store';
import { useFullscreen } from '@/hooks/useFullscreen';
import { SlidePlayer } from '@/components/SlidePlayer';
import { VideoCard } from '@/components/VideoCard';
import { getReferenceVideoUrl } from '@/lib/api/storage';
import { incrementVideoView } from '@/lib/api/videos';
import { supabase } from '@/lib/supabase/client';
import { Student } from '@/types';

export default function WatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { selectedVideo, videos, isLoading, fetchVideoById, fetchVideos } = useVideoStore();
  const { user } = useAuthStore();
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  const [refVideoUrl, setRefVideoUrl] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    if (id) {
      fetchVideoById(id);
      fetchVideos();
    }
  }, [id]);

  useEffect(() => {
    if (selectedVideo?.teacherId) {
      getReferenceVideoUrl(selectedVideo.teacherId).then(setRefVideoUrl).catch(() => {});
    }
  }, [selectedVideo?.teacherId]);

  useEffect(() => {
    if (selectedVideo && user) {
      incrementVideoView(selectedVideo.id, user.id).catch(() => {});
      const student = user as Student;
      setIsSaved(student.savedVideos?.includes(selectedVideo.id) ?? false);
    }
  }, [selectedVideo?.id]);

  const handleSave = async () => {
    if (!user || !selectedVideo) return;
    const student = user as Student;
    const currentSaved = student.savedVideos ?? [];
    const newSaved = isSaved
      ? currentSaved.filter((v) => v !== selectedVideo.id)
      : [...currentSaved, selectedVideo.id];

    setIsSaved(!isSaved);
    await supabase
      .from('profiles')
      .update({ saved_videos: newSaved })
      .eq('id', user.id);
  };

  const handleShare = async () => {
    if (!selectedVideo) return;
    await Share.share({
      message: `Chalk AI'da "${selectedVideo.title}" dersine göz at!`,
    });
  };

  const relatedVideos = videos
    .filter((v) => v.id !== id && v.status === 'published')
    .slice(0, 4);

  if (isLoading || !selectedVideo) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Back button */}
      <View style={{ display: isFullscreen ? 'none' : 'flex' }} className="px-4 pt-14 pb-2">
        <TouchableOpacity
          className="w-10 h-10 rounded-xl bg-card border border-border items-center justify-center"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Slide Player */}
      <View style={isFullscreen ? { flex: 1, zIndex: 999 } : {}}>
        <SlidePlayer
          slidesData={selectedVideo.slidesData}
          referenceVideoUrl={refVideoUrl}
          title={selectedVideo.title}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />
      </View>

      <ScrollView style={{ display: isFullscreen ? 'none' : 'flex' }} className="flex-1">
        {/* Video info */}
      <View className="px-5 mt-4">
        <Text className="text-white text-xl font-bold">{selectedVideo.title}</Text>
        <View className="flex-row items-center gap-2 mt-2 flex-wrap">
          <View className="bg-primary/20 px-2 py-1 rounded-full">
            <Text className="text-primary text-xs font-medium">{selectedVideo.subject}</Text>
          </View>
          <View className="bg-card border border-border px-2 py-1 rounded-full">
            <Text className="text-white text-xs">{selectedVideo.grade}. Sınıf</Text>
          </View>
          <Text className="text-muted-foreground text-xs">{selectedVideo.viewCount} görüntülenme</Text>
        </View>
      </View>

      {/* Actions */}
      <View className="flex-row px-5 mt-4 gap-3">
        <TouchableOpacity
          className={`flex-row items-center gap-2 px-4 h-10 rounded-xl border ${
            isLiked ? 'bg-primary/20 border-primary' : 'bg-card border-border'
          }`}
          onPress={() => setIsLiked(!isLiked)}
        >
          <Ionicons
            name={isLiked ? 'thumbs-up' : 'thumbs-up-outline'}
            size={16}
            color={isLiked ? '#6366f1' : '#a1a1aa'}
          />
          <Text className={`text-sm ${isLiked ? 'text-primary' : 'text-muted-foreground'}`}>Beğen</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`flex-row items-center gap-2 px-4 h-10 rounded-xl border ${
            isSaved ? 'bg-primary/20 border-primary' : 'bg-card border-border'
          }`}
          onPress={handleSave}
        >
          <Ionicons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={16}
            color={isSaved ? '#6366f1' : '#a1a1aa'}
          />
          <Text className={`text-sm ${isSaved ? 'text-primary' : 'text-muted-foreground'}`}>
            {isSaved ? 'Kaydedildi' : 'Kaydet'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-row items-center gap-2 px-4 h-10 rounded-xl border bg-card border-border"
          onPress={handleShare}
        >
          <Ionicons name="share-outline" size={16} color="#a1a1aa" />
          <Text className="text-muted-foreground text-sm">Paylaş</Text>
        </TouchableOpacity>
      </View>

      {/* Teacher info */}
      <View className="mx-5 mt-4 p-4 bg-card border border-border rounded-xl flex-row items-center">
        <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center mr-3">
          <Text className="text-primary font-bold text-sm">
            {selectedVideo.teacherName.slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-white font-semibold">{selectedVideo.teacherName}</Text>
          <Text className="text-muted-foreground text-xs">{selectedVideo.subject} Öğretmeni</Text>
        </View>
      </View>

      {/* Description */}
      <View className="mx-5 mt-4">
        <Text className="text-white font-semibold mb-2">Video Hakkında</Text>
        <Text className="text-muted-foreground text-sm leading-6">
          {selectedVideo.description}
        </Text>
        {selectedVideo.includesProblemSolving && (
          <View className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-xl">
            <Text className="text-white text-sm">
              ✏️ Bu video {selectedVideo.problemCount ?? 0} adet soru çözümü içermektedir
            </Text>
          </View>
        )}
      </View>

      {/* Related videos */}
      {relatedVideos.length > 0 && (
        <View className="mt-6 mb-8">
          <Text className="text-white font-semibold px-5 mb-3">İlgili Dersler</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 20, paddingRight: 8 }}>
            {relatedVideos.map((video) => (
              <View key={video.id} className="mr-3" style={{ width: 180 }}>
                <VideoCard
                  video={video}
                  onPress={() => router.push(`/(student)/watch/${video.id}` as any)}
                />
              </View>
            ))}
          </ScrollView>
        </View>
      )}
      </ScrollView>
    </View>
  );
}
