import { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVideoStore } from '@/stores/video-store';
import { StatsCard } from '@/components/StatsCard';

export default function AnalyticsScreen() {
  const { videos, stats, isLoading, fetchVideos } = useVideoStore();

  useEffect(() => {
    fetchVideos();
  }, []);

  const published = videos.filter((v) => v.status === 'published');
  const topVideos = [...published]
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, 5);

  const subjectBreakdown: Record<string, number> = {};
  for (const v of published) {
    subjectBreakdown[v.subject] = (subjectBreakdown[v.subject] ?? 0) + v.viewCount;
  }

  const sortedSubjects = Object.entries(subjectBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <ScrollView
      className="flex-1 bg-background"
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchVideos} tintColor="#6366f1" />}
    >
      <View className="px-5 pt-14 pb-6">
        <Text className="text-white text-2xl font-bold">Analitik</Text>
        <Text className="text-muted-foreground text-sm mt-1">Performans özeti</Text>
      </View>

      {/* Stats */}
      <View className="flex-row flex-wrap px-5 gap-3 mb-6">
        <View className="w-[47%]">
          <StatsCard title="Toplam Video" value={stats.totalVideos} icon="play-circle-outline" color="#6366f1" />
        </View>
        <View className="w-[47%]">
          <StatsCard title="Toplam İzlenme" value={stats.totalViews} icon="eye-outline" color="#10b981" />
        </View>
        <View className="w-[47%]">
          <StatsCard title="Bu Ay" value={stats.videosThisMonth} icon="calendar-outline" color="#f59e0b" />
        </View>
        <View className="w-[47%]">
          <StatsCard title="Öğrenci" value={stats.studentCount} icon="people-outline" color="#ec4899" />
        </View>
      </View>

      {/* Top videos */}
      {topVideos.length > 0 && (
        <View className="mx-5 mb-6">
          <Text className="text-white font-semibold mb-3">En Çok İzlenen Videolar</Text>
          {topVideos.map((video, index) => (
            <View key={video.id} className="flex-row items-center gap-3 mb-3 bg-card border border-border rounded-xl p-3">
              <Text className="text-muted-foreground font-bold w-5 text-center">{index + 1}</Text>
              <View className="flex-1">
                <Text className="text-white text-sm font-medium" numberOfLines={1}>{video.title}</Text>
                <Text className="text-muted-foreground text-xs mt-0.5">{video.subject} • {video.grade}. Sınıf</Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Ionicons name="eye-outline" size={14} color="#a1a1aa" />
                <Text className="text-white text-sm font-semibold">{video.viewCount}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Subject breakdown */}
      {sortedSubjects.length > 0 && (
        <View className="mx-5 mb-8">
          <Text className="text-white font-semibold mb-3">Derse Göre İzlenme</Text>
          {sortedSubjects.map(([subject, views]) => {
            const maxViews = sortedSubjects[0][1];
            const pct = maxViews > 0 ? (views / maxViews) * 100 : 0;
            return (
              <View key={subject} className="mb-3">
                <View className="flex-row justify-between mb-1">
                  <Text className="text-white text-sm">{subject}</Text>
                  <Text className="text-muted-foreground text-sm">{views} izlenme</Text>
                </View>
                <View className="bg-muted rounded-full h-2">
                  <View
                    className="bg-primary h-2 rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}

      {published.length === 0 && !isLoading && (
        <View className="flex-1 items-center justify-center px-8 py-16">
          <Ionicons name="bar-chart-outline" size={52} color="#a1a1aa" />
          <Text className="text-muted-foreground text-center mt-3">
            Analitik verisi için yayınlanmış video gereklidir.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
