import { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/auth-store';
import { useVideoStore } from '@/stores/video-store';
import { VideoCard } from '@/components/VideoCard';
import { Student } from '@/types';

export default function StudentHomeScreen() {
  const { user } = useAuthStore();
  const { videos, isLoading, fetchVideos } = useVideoStore();
  const router = useRouter();

  const student = user as Student | null;

  useEffect(() => {
    fetchVideos();
  }, []);

  const publishedVideos = videos.filter((v) => v.status === 'published');
  const recentVideos = publishedVideos.slice(0, 6);

  // Group by subject for "Featured" section
  const subjects = [...new Set(publishedVideos.map((v) => v.subject))].slice(0, 4);

  return (
    <ScrollView
      className="flex-1 bg-background"
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchVideos} tintColor="#6366f1" />}
    >
      {/* Header */}
      <View className="px-5 pt-14 pb-6">
        <Text className="text-muted-foreground text-sm">Hoş geldin,</Text>
        <Text className="text-white text-2xl font-bold mt-0.5">
          {user?.name?.split(' ')[0] ?? 'Öğrenci'} 👋
        </Text>
        {student?.grade && (
          <Text className="text-muted-foreground text-sm mt-1">{student.grade}. Sınıf</Text>
        )}
      </View>

      {/* Quick search */}
      <TouchableOpacity
        className="mx-5 mb-6 flex-row items-center bg-card border border-border rounded-xl px-4 h-12"
        onPress={() => router.push('/(student)/browse')}
      >
        <Ionicons name="search-outline" size={18} color="#a1a1aa" />
        <Text className="ml-3 text-muted-foreground text-base">Ders veya konu ara...</Text>
      </TouchableOpacity>

      {/* Stats row */}
      <View className="flex-row px-5 mb-6 gap-3">
        <View className="flex-1 bg-card border border-border rounded-xl p-4">
          <Ionicons name="play-circle-outline" size={22} color="#6366f1" />
          <Text className="text-white font-bold text-xl mt-2">
            {student?.watchedVideos?.length ?? 0}
          </Text>
          <Text className="text-muted-foreground text-xs mt-0.5">İzlenen</Text>
        </View>
        <View className="flex-1 bg-card border border-border rounded-xl p-4">
          <Ionicons name="bookmark-outline" size={22} color="#6366f1" />
          <Text className="text-white font-bold text-xl mt-2">
            {student?.savedVideos?.length ?? 0}
          </Text>
          <Text className="text-muted-foreground text-xs mt-0.5">Kaydedilen</Text>
        </View>
        <View className="flex-1 bg-card border border-border rounded-xl p-4">
          <Ionicons name="library-outline" size={22} color="#6366f1" />
          <Text className="text-white font-bold text-xl mt-2">{publishedVideos.length}</Text>
          <Text className="text-muted-foreground text-xs mt-0.5">Toplam Ders</Text>
        </View>
      </View>

      {/* Recent videos */}
      <View className="mb-6">
        <View className="flex-row items-center justify-between px-5 mb-4">
          <Text className="text-white text-lg font-bold">Son Yüklenen Dersler</Text>
          <TouchableOpacity onPress={() => router.push('/(student)/browse')}>
            <Text className="text-primary text-sm">Tümü</Text>
          </TouchableOpacity>
        </View>

        {isLoading && recentVideos.length === 0 ? (
          <ActivityIndicator color="#6366f1" style={{ marginTop: 20 }} />
        ) : recentVideos.length === 0 ? (
          <View className="items-center py-10 px-5">
            <Ionicons name="videocam-off-outline" size={40} color="#a1a1aa" />
            <Text className="text-muted-foreground text-center mt-3">
              Henüz ders yok. Öğretmenler yüklemeye başladığında burada görünecek.
            </Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 20, paddingRight: 8 }}>
            {recentVideos.map((video) => (
              <View key={video.id} className="mr-3" style={{ width: 200 }}>
                <VideoCard
                  video={video}
                  onPress={() => router.push(`/(student)/watch/${video.id}` as any)}
                />
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Subjects */}
      {subjects.length > 0 && (
        <View className="mb-8">
          <Text className="text-white text-lg font-bold px-5 mb-4">Dersler</Text>
          <View className="flex-row flex-wrap px-5 gap-3">
            {subjects.map((subject) => {
              const count = publishedVideos.filter((v) => v.subject === subject).length;
              return (
                <TouchableOpacity
                  key={subject}
                  className="bg-card border border-border rounded-xl px-4 py-3 flex-row items-center gap-2"
                  onPress={() => router.push({ pathname: '/(student)/browse', params: { subject } } as any)}
                >
                  <Ionicons name="book-outline" size={16} color="#6366f1" />
                  <Text className="text-white text-sm font-medium">{subject}</Text>
                  <Text className="text-muted-foreground text-xs">({count})</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </ScrollView>
  );
}
