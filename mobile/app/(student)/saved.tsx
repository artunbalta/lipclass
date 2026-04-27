import { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/auth-store';
import { useVideoStore } from '@/stores/video-store';
import { VideoCard } from '@/components/VideoCard';
import { Student } from '@/types';

export default function SavedScreen() {
  const { user } = useAuthStore();
  const { videos, isLoading, fetchVideos } = useVideoStore();
  const router = useRouter();

  const student = user as Student | null;

  useEffect(() => {
    fetchVideos();
  }, []);

  const savedIds = student?.savedVideos ?? [];
  const savedVideos = videos.filter(
    (v) => v.status === 'published' && savedIds.includes(v.id)
  );

  return (
    <View className="flex-1 bg-background">
      <View className="px-5 pt-14 pb-6">
        <Text className="text-white text-2xl font-bold">Kaydedilenler</Text>
        <Text className="text-muted-foreground text-sm mt-1">
          {savedVideos.length} kayıtlı ders
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : savedVideos.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="bookmark-outline" size={60} color="#a1a1aa" />
          <Text className="text-white font-semibold text-lg mt-4 text-center">
            Kaydedilen Ders Yok
          </Text>
          <Text className="text-muted-foreground text-center mt-2">
            Bir dersi izlerken kaydet butonuna basarak buraya ekleyebilirsiniz.
          </Text>
          <TouchableOpacity
            className="mt-6 h-12 bg-primary rounded-xl px-6 items-center justify-center"
            onPress={() => router.push('/(student)/browse')}
          >
            <Text className="text-white font-semibold">Dersleri Keşfet</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={savedVideos}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          columnWrapperStyle={{ gap: 12 }}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={fetchVideos} tintColor="#6366f1" />
          }
          renderItem={({ item }) => (
            <View style={{ flex: 1 }}>
              <VideoCard
                video={item}
                onPress={() => router.push(`/(student)/watch/${item.id}` as any)}
              />
            </View>
          )}
        />
      )}
    </View>
  );
}
