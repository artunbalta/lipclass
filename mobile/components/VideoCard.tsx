import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video } from '@/types';

interface VideoCardProps {
  video: Video;
  onPress: () => void;
  showStatus?: boolean;
}

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

function formatDuration(seconds: number): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function VideoCard({ video, onPress, showStatus = false }: VideoCardProps) {
  const slideCount = video.slidesData?.slides.length ?? 0;

  return (
    <TouchableOpacity
      className="bg-card border border-border rounded-xl overflow-hidden"
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Thumbnail */}
      <View className="relative aspect-video bg-muted items-center justify-center">
        {video.thumbnailUrl ? (
          <Image
            source={{ uri: video.thumbnailUrl }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <Ionicons name="play-circle-outline" size={32} color="#a1a1aa" />
        )}

        {/* Duration badge */}
        <View className="absolute bottom-1.5 right-1.5 bg-black/70 px-1.5 py-0.5 rounded">
          <Text className="text-white text-xs">
            {slideCount > 0 ? `${slideCount} slayt` : formatDuration(video.duration)}
          </Text>
        </View>

        {/* Processing overlay */}
        {video.status === 'processing' && (
          <View className="absolute inset-0 bg-black/50 items-center justify-center">
            <Ionicons name="time-outline" size={24} color="#f59e0b" />
          </View>
        )}
      </View>

      {/* Info */}
      <View className="p-3">
        <Text className="text-white text-sm font-medium" numberOfLines={2}>
          {video.title}
        </Text>
        <Text className="text-muted-foreground text-xs mt-1">
          {video.teacherName}
        </Text>
        <View className="flex-row items-center justify-between mt-2">
          <View className="flex-row items-center gap-1">
            <View className="bg-primary/20 px-1.5 py-0.5 rounded">
              <Text className="text-primary text-xs">{video.subject}</Text>
            </View>
            <Text className="text-muted-foreground text-xs">{video.grade}.</Text>
          </View>

          {showStatus ? (
            <View
              className="px-1.5 py-0.5 rounded"
              style={{ backgroundColor: `${STATUS_COLORS[video.status]}20` }}
            >
              <Text className="text-xs" style={{ color: STATUS_COLORS[video.status] }}>
                {STATUS_LABELS[video.status]}
              </Text>
            </View>
          ) : (
            <View className="flex-row items-center gap-0.5">
              <Ionicons name="eye-outline" size={11} color="#a1a1aa" />
              <Text className="text-muted-foreground text-xs">{video.viewCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
