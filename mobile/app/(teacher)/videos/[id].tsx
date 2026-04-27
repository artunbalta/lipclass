import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useVideoStore } from '@/stores/video-store';
import { SlidePlayer } from '@/components/SlidePlayer';
import { getReferenceVideoUrl } from '@/lib/api/storage';
import { useAuthStore } from '@/stores/auth-store';
import { useFullscreen } from '@/hooks/useFullscreen';

const STATUS_COLORS: Record<string, string> = {
  published: '#10b981',
  processing: '#f59e0b',
  draft: '#a1a1aa',
  failed: '#ef4444',
};

const STATUS_LABELS: Record<string, string> = {
  published: 'Yayında',
  processing: 'İşleniyor',
  draft: 'Taslak',
  failed: 'Hata',
};

export default function TeacherVideoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { selectedVideo, isLoading, fetchVideoById, deleteVideo } = useVideoStore();
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const [refVideoUrl, setRefVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (id) fetchVideoById(id);
  }, [id]);

  useEffect(() => {
    if (user?.id) {
      getReferenceVideoUrl(user.id).then(setRefVideoUrl).catch(() => {});
    }
  }, [user?.id]);

  const handleDelete = () => {
    Alert.alert(
      'Videoyu Sil',
      'Bu videoyu silmek istediğine emin misin?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            if (!selectedVideo) return;
            try {
              await deleteVideo(selectedVideo.id);
              router.back();
            } catch (e: any) {
              Alert.alert('Hata', e.message);
            }
          },
        },
      ]
    );
  };

  if (isLoading || !selectedVideo) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  const slideCount = selectedVideo.slidesData?.slides.length ?? 0;
  const statusColor = STATUS_COLORS[selectedVideo.status];

  return (
    <View className="flex-1 bg-background">
      <View style={{ display: isFullscreen ? 'none' : 'flex' }} className="px-4 pt-14 pb-2 flex-row items-center justify-between">
        <TouchableOpacity
          className="w-10 h-10 rounded-xl bg-card border border-border items-center justify-center"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          className="w-10 h-10 rounded-xl bg-destructive/10 border border-destructive/30 items-center justify-center"
          onPress={handleDelete}
        >
          <Ionicons name="trash-outline" size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* Preview */}
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
      {/* Info */}
      <View className="px-5 mt-4">
        <View className="flex-row items-start justify-between">
          <Text className="text-white text-xl font-bold flex-1 mr-3">{selectedVideo.title}</Text>
          <View
            className="px-3 py-1 rounded-full"
            style={{ backgroundColor: `${statusColor}20` }}
          >
            <Text className="text-xs font-semibold" style={{ color: statusColor }}>
              {STATUS_LABELS[selectedVideo.status]}
            </Text>
          </View>
        </View>

        <View className="flex-row gap-2 mt-2">
          <View className="bg-primary/20 px-2 py-1 rounded-full">
            <Text className="text-primary text-xs">{selectedVideo.subject}</Text>
          </View>
          <View className="bg-card border border-border px-2 py-1 rounded-full">
            <Text className="text-white text-xs">{selectedVideo.grade}. Sınıf</Text>
          </View>
        </View>
      </View>

      {/* Stats */}
      <View className="flex-row px-5 mt-4 gap-3">
        {[
          { icon: 'eye-outline', value: selectedVideo.viewCount, label: 'Görüntülenme' },
          { icon: 'layers-outline', value: slideCount, label: 'Slayt' },
          { icon: 'time-outline', value: `${Math.ceil(selectedVideo.duration / 60)} dk`, label: 'Süre' },
        ].map((s) => (
          <View key={s.label} className="flex-1 bg-card border border-border rounded-xl p-3 items-center">
            <Ionicons name={s.icon as any} size={20} color="#6366f1" />
            <Text className="text-white font-bold text-base mt-1">{s.value}</Text>
            <Text className="text-muted-foreground text-xs">{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Description */}
      <View className="mx-5 mt-4 mb-8">
        <Text className="text-white font-semibold mb-2">Açıklama</Text>
        <Text className="text-muted-foreground text-sm leading-6">{selectedVideo.description}</Text>

        {selectedVideo.includesProblemSolving && (
          <View className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-xl">
            <Text className="text-white text-sm">
              ✏️ {selectedVideo.problemCount ?? 0} adet soru çözümü — {selectedVideo.difficulty === 'easy' ? 'Kolay' : selectedVideo.difficulty === 'medium' ? 'Orta' : 'Zor'}
            </Text>
          </View>
        )}

        {selectedVideo.status === 'processing' && (
          <View className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex-row items-center gap-2">
            <ActivityIndicator size="small" color="#f59e0b" />
            <Text className="text-yellow-400 text-sm">Bu video hâlâ işleniyor. Tamamlandığında bildirim alacaksınız.</Text>
          </View>
        )}

        {selectedVideo.status === 'failed' && (
          <View className="mt-3 p-3 bg-destructive/10 border border-destructive/30 rounded-xl">
            <Text className="text-destructive text-sm">Video oluşturma başarısız. Lütfen tekrar deneyin.</Text>
          </View>
        )}
      </View>
      </ScrollView>
    </View>
  );
}
