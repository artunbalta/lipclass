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

export default function CoursesScreen() {
  const { user } = useAuthStore();
  const { videos, isLoading, fetchVideos } = useVideoStore();
  const router = useRouter();

  const student = user as Student | null;

  useEffect(() => {
    fetchVideos();
  }, []);

  const watchedIds = student?.watchedVideos ?? [];
  const watchedVideos = videos.filter(
    (v) => v.status === 'published' && watchedIds.includes(v.id)
  );

  // Group by subject
  const bySubject: Record<string, typeof watchedVideos> = {};
  for (const v of watchedVideos) {
    if (!bySubject[v.subject]) bySubject[v.subject] = [];
    bySubject[v.subject].push(v);
  }

  const subjects = Object.keys(bySubject);

  return (
    <View className="flex-1 bg-background">
      <View className="px-5 pt-14 pb-6">
        <Text className="text-white text-2xl font-bold">Derslerim</Text>
        <Text className="text-muted-foreground text-sm mt-1">
          {watchedVideos.length} ders izlediniz
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : watchedVideos.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="play-circle-outline" size={60} color="#a1a1aa" />
          <Text className="text-white font-semibold text-lg mt-4 text-center">
            Henüz Ders İzlemediniz
          </Text>
          <Text className="text-muted-foreground text-center mt-2">
            Keşfet sekmesinden dersleri bulup izlemeye başlayın.
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
          data={subjects}
          keyExtractor={(item) => item}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={fetchVideos} tintColor="#6366f1" />
          }
          renderItem={({ item: subject }) => (
            <View className="mb-6">
              <View className="flex-row items-center px-5 mb-3">
                <Ionicons name="book-outline" size={16} color="#6366f1" />
                <Text className="text-white font-semibold ml-2">{subject}</Text>
                <Text className="text-muted-foreground ml-2 text-sm">
                  ({bySubject[subject].length})
                </Text>
              </View>
              <FlatList
                horizontal
                data={bySubject[subject]}
                keyExtractor={(v) => v.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingLeft: 20, paddingRight: 8 }}
                renderItem={({ item }) => (
                  <View className="mr-3" style={{ width: 180 }}>
                    <VideoCard
                      video={item}
                      onPress={() => router.push(`/(student)/watch/${item.id}` as any)}
                    />
                  </View>
                )}
              />
            </View>
          )}
        />
      )}
    </View>
  );
}
