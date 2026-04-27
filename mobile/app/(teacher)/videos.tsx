import { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useVideoStore } from '@/stores/video-store';
import { VideoCard } from '@/components/VideoCard';
import { Video } from '@/types';

const STATUS_FILTERS = [
  { value: 'all', label: 'Tümü' },
  { value: 'published', label: 'Yayında' },
  { value: 'processing', label: 'İşleniyor' },
  { value: 'draft', label: 'Taslak' },
] as const;

const STATUS_COLORS: Record<string, string> = {
  published: '#10b981',
  processing: '#f59e0b',
  draft: '#a1a1aa',
  failed: '#ef4444',
};

export default function TeacherVideosScreen() {
  const { videos, isLoading, filter, setFilter, getFilteredVideos, fetchVideos, deleteVideo } = useVideoStore();
  const router = useRouter();

  useEffect(() => {
    fetchVideos();
  }, [filter]);

  const filteredVideos = getFilteredVideos();

  const handleDelete = (video: Video) => {
    Alert.alert(
      'Videoyu Sil',
      `"${video.title}" videosunu silmek istediğine emin misin?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteVideo(video.id);
            } catch (e: any) {
              Alert.alert('Hata', e.message || 'Video silinemedi.');
            }
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="px-5 pt-14 pb-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-white text-2xl font-bold">Videolarım</Text>
          <TouchableOpacity
            className="w-10 h-10 bg-primary/20 rounded-xl items-center justify-center"
            onPress={() => router.push('/(teacher)/create')}
          >
            <Ionicons name="add" size={22} color="#6366f1" />
          </TouchableOpacity>
        </View>

        {/* Filter tabs */}
        <View className="flex-row mt-4 gap-2">
          {STATUS_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.value}
              className={`px-3 h-8 rounded-full border ${
                filter === f.value ? 'bg-primary border-primary' : 'bg-card border-border'
              }`}
              onPress={() => setFilter(f.value)}
            >
              <Text className={`text-xs font-semibold leading-8 ${filter === f.value ? 'text-white' : 'text-muted-foreground'}`}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
        <FlatList
          data={filteredVideos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchVideos} tintColor="#6366f1" />}
          renderItem={({ item }) => (
            <View className="bg-card border border-border rounded-xl overflow-hidden">
              <TouchableOpacity
                className="flex-row p-3 gap-3"
                onPress={() => router.push(`/(teacher)/videos/${item.id}` as any)}
              >
                {/* Thumbnail placeholder */}
                <View className="w-20 h-14 rounded-lg bg-muted items-center justify-center overflow-hidden">
                  <Ionicons name="play-circle" size={28} color="#a1a1aa" />
                </View>

                <View className="flex-1">
                  <Text className="text-white font-medium text-sm" numberOfLines={2}>{item.title}</Text>
                  <View className="flex-row items-center gap-2 mt-1">
                    <View
                      className="px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${STATUS_COLORS[item.status]}20` }}
                    >
                      <Text
                        className="text-xs font-medium"
                        style={{ color: STATUS_COLORS[item.status] }}
                      >
                        {item.status === 'published' ? 'Yayında' :
                         item.status === 'processing' ? 'İşleniyor' :
                         item.status === 'draft' ? 'Taslak' : 'Hata'}
                      </Text>
                    </View>
                    <Text className="text-muted-foreground text-xs">{item.viewCount} görüntülenme</Text>
                  </View>
                  <Text className="text-muted-foreground text-xs mt-0.5">{item.subject} • {item.grade}. Sınıf</Text>
                </View>

                <TouchableOpacity
                  className="w-8 h-8 items-center justify-center"
                  onPress={() => handleDelete(item)}
                >
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                </TouchableOpacity>
              </TouchableOpacity>

              {item.status === 'processing' && (
                <View className="bg-yellow-500/10 px-3 py-2 flex-row items-center gap-2">
                  <ActivityIndicator size="small" color="#f59e0b" />
                  <Text className="text-yellow-400 text-xs">AI işleniyor...</Text>
                </View>
              )}
            </View>
          )}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20">
              <Ionicons name="videocam-off-outline" size={48} color="#a1a1aa" />
              <Text className="text-muted-foreground text-center mt-3">
                {filter !== 'all' ? 'Bu filtre için video yok.' : 'Henüz video yok.'}
              </Text>
              <TouchableOpacity
                className="mt-4 h-10 bg-primary rounded-xl px-6 items-center justify-center"
                onPress={() => router.push('/(teacher)/create')}
              >
                <Text className="text-white font-semibold text-sm">İlk Videoyu Oluştur</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}
