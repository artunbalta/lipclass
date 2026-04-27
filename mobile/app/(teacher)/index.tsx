import { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/auth-store';
import { useVideoStore } from '@/stores/video-store';
import { StatsCard } from '@/components/StatsCard';
import { VideoCard } from '@/components/VideoCard';
import { Teacher } from '@/types';

export default function TeacherDashboard() {
  const { user } = useAuthStore();
  const { videos, stats, isLoading, fetchVideos } = useVideoStore();
  const router = useRouter();

  const teacher = user as Teacher | null;

  useEffect(() => {
    fetchVideos();
  }, []);

  const recentVideos = videos.slice(0, 4);
  const publishedCount = videos.filter((v) => v.status === 'published').length;
  const processingCount = videos.filter((v) => v.status === 'processing').length;

  return (
    <ScrollView
      className="flex-1 bg-background"
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchVideos} tintColor="#6366f1" />}
    >
      {/* Header */}
      <View className="px-5 pt-14 pb-6">
        <Text className="text-muted-foreground text-sm">Öğretmen Paneli</Text>
        <Text className="text-white text-2xl font-bold mt-0.5">
          Merhaba, {user?.name?.split(' ')[0] ?? 'Öğretmen'} 👋
        </Text>
        {teacher?.subject && (
          <Text className="text-muted-foreground text-sm mt-1">{teacher.subject} Öğretmeni</Text>
        )}
      </View>

      {/* Stats */}
      <View className="flex-row flex-wrap px-5 gap-3 mb-6">
        <View className="w-[47%]">
          <StatsCard
            title="Toplam Video"
            value={stats.totalVideos}
            icon="play-circle-outline"
            color="#6366f1"
          />
        </View>
        <View className="w-[47%]">
          <StatsCard
            title="Toplam İzlenme"
            value={stats.totalViews}
            icon="eye-outline"
            color="#10b981"
          />
        </View>
        <View className="w-[47%]">
          <StatsCard
            title="Bu Ay"
            value={stats.videosThisMonth}
            icon="calendar-outline"
            color="#f59e0b"
          />
        </View>
        <View className="w-[47%]">
          <StatsCard
            title="Öğrenci"
            value={stats.studentCount}
            icon="people-outline"
            color="#ec4899"
          />
        </View>
      </View>

      {/* Quick Actions */}
      <View className="px-5 mb-6">
        <Text className="text-white font-semibold mb-3">Hızlı İşlemler</Text>
        <View className="flex-row gap-3">
          <TouchableOpacity
            className="flex-1 bg-primary/20 border border-primary/40 rounded-xl p-4 items-center"
            onPress={() => router.push('/(teacher)/create')}
          >
            <Ionicons name="add-circle" size={28} color="#6366f1" />
            <Text className="text-white text-sm font-semibold mt-2">Yeni Video</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-card border border-border rounded-xl p-4 items-center"
            onPress={() => router.push('/(teacher)/documents')}
          >
            <Ionicons name="cloud-upload-outline" size={28} color="#a1a1aa" />
            <Text className="text-white text-sm font-semibold mt-2">Kaynak Yükle</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-card border border-border rounded-xl p-4 items-center"
            onPress={() => router.push('/(teacher)/analytics')}
          >
            <Ionicons name="bar-chart-outline" size={28} color="#a1a1aa" />
            <Text className="text-white text-sm font-semibold mt-2">Analitik</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Processing videos */}
      {processingCount > 0 && (
        <View className="mx-5 mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex-row items-center gap-3">
          <ActivityIndicator size="small" color="#f59e0b" />
          <Text className="text-yellow-400 text-sm flex-1">
            {processingCount} video işleniyor...
          </Text>
          <TouchableOpacity onPress={() => router.push('/(teacher)/videos')}>
            <Text className="text-yellow-400 text-sm font-semibold">Görüntüle</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Reference video warning */}
      {teacher?.referenceVideoStatus === 'none' && (
        <View className="mx-5 mb-4 p-4 bg-primary/10 border border-primary/30 rounded-xl flex-row items-center gap-3">
          <Ionicons name="videocam-outline" size={20} color="#6366f1" />
          <Text className="text-primary text-sm flex-1">
            Lipsync için referans video yükleyin.
          </Text>
          <TouchableOpacity onPress={() => router.push('/(teacher)/settings')}>
            <Text className="text-primary text-sm font-semibold">Yükle</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Recent videos */}
      <View className="mb-8">
        <View className="flex-row items-center justify-between px-5 mb-3">
          <Text className="text-white font-semibold">Son Videolar</Text>
          <TouchableOpacity onPress={() => router.push('/(teacher)/videos')}>
            <Text className="text-primary text-sm">Tümü</Text>
          </TouchableOpacity>
        </View>

        {recentVideos.length === 0 ? (
          <View className="items-center py-8 px-5">
            <Ionicons name="videocam-off-outline" size={40} color="#a1a1aa" />
            <Text className="text-muted-foreground text-center mt-3">
              Henüz video yok. Yeni video oluşturun.
            </Text>
            <TouchableOpacity
              className="mt-4 h-10 bg-primary rounded-xl px-6 items-center justify-center"
              onPress={() => router.push('/(teacher)/create')}
            >
              <Text className="text-white font-semibold text-sm">Video Oluştur</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 20, paddingRight: 8 }}>
            {recentVideos.map((video) => (
              <View key={video.id} className="mr-3" style={{ width: 200 }}>
                <VideoCard
                  video={video}
                  showStatus
                  onPress={() => router.push(`/(teacher)/videos/${video.id}` as any)}
                />
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </ScrollView>
  );
}
