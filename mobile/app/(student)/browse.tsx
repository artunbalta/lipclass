import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useVideoStore } from '@/stores/video-store';
import { VideoCard } from '@/components/VideoCard';
import { SUBJECTS, GRADES } from '@/lib/constants';
import { Video } from '@/types';

export default function BrowseScreen() {
  const { videos, isLoading, fetchVideos } = useVideoStore();
  const router = useRouter();
  const params = useLocalSearchParams<{ subject?: string }>();

  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>(params.subject ?? '');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [showSubjectFilter, setShowSubjectFilter] = useState(false);
  const [showGradeFilter, setShowGradeFilter] = useState(false);

  useEffect(() => {
    fetchVideos();
  }, []);

  useEffect(() => {
    if (params.subject) setSelectedSubject(params.subject);
  }, [params.subject]);

  const published = videos.filter((v) => v.status === 'published');

  const filtered = published.filter((v) => {
    const matchesSearch =
      !search ||
      v.title.toLowerCase().includes(search.toLowerCase()) ||
      v.topic.toLowerCase().includes(search.toLowerCase()) ||
      v.subject.toLowerCase().includes(search.toLowerCase());
    const matchesSubject = !selectedSubject || v.subject === selectedSubject;
    const matchesGrade = !selectedGrade || v.grade === selectedGrade;
    return matchesSearch && matchesSubject && matchesGrade;
  });

  const hasFilters = selectedSubject || selectedGrade;

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="px-5 pt-14 pb-4">
        <Text className="text-white text-2xl font-bold mb-4">Keşfet</Text>

        {/* Search */}
        <View className="flex-row items-center bg-card border border-border rounded-xl px-4 h-12 mb-3">
          <Ionicons name="search-outline" size={18} color="#a1a1aa" />
          <TextInput
            className="flex-1 ml-3 text-white text-base"
            placeholder="Ders veya konu ara..."
            placeholderTextColor="#a1a1aa"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#a1a1aa" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
          <TouchableOpacity
            className={`flex-row items-center gap-1 px-3 h-8 rounded-full border mr-2 ${
              selectedSubject ? 'bg-primary/20 border-primary' : 'bg-card border-border'
            }`}
            onPress={() => setShowSubjectFilter(!showSubjectFilter)}
          >
            <Text className={`text-sm ${selectedSubject ? 'text-primary' : 'text-muted-foreground'}`}>
              {selectedSubject || 'Ders'}
            </Text>
            <Ionicons name="chevron-down" size={12} color={selectedSubject ? '#6366f1' : '#a1a1aa'} />
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-row items-center gap-1 px-3 h-8 rounded-full border mr-2 ${
              selectedGrade ? 'bg-primary/20 border-primary' : 'bg-card border-border'
            }`}
            onPress={() => setShowGradeFilter(!showGradeFilter)}
          >
            <Text className={`text-sm ${selectedGrade ? 'text-primary' : 'text-muted-foreground'}`}>
              {GRADES.find((g) => g.value === selectedGrade)?.label || 'Sınıf'}
            </Text>
            <Ionicons name="chevron-down" size={12} color={selectedGrade ? '#6366f1' : '#a1a1aa'} />
          </TouchableOpacity>

          {hasFilters && (
            <TouchableOpacity
              className="flex-row items-center gap-1 px-3 h-8 rounded-full border border-destructive/50 bg-destructive/10"
              onPress={() => { setSelectedSubject(''); setSelectedGrade(''); }}
            >
              <Text className="text-destructive text-sm">Temizle</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* Subject dropdown */}
      {showSubjectFilter && (
        <View className="mx-5 mb-2 bg-card border border-border rounded-xl overflow-hidden">
          <TouchableOpacity
            className="px-4 py-3"
            onPress={() => { setSelectedSubject(''); setShowSubjectFilter(false); }}
          >
            <Text className="text-muted-foreground text-sm">Tümü</Text>
          </TouchableOpacity>
          {SUBJECTS.map((s) => (
            <TouchableOpacity
              key={s}
              className={`px-4 py-3 ${selectedSubject === s ? 'bg-primary/20' : ''}`}
              onPress={() => { setSelectedSubject(s); setShowSubjectFilter(false); }}
            >
              <Text className={`text-sm ${selectedSubject === s ? 'text-primary font-semibold' : 'text-white'}`}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Grade dropdown */}
      {showGradeFilter && (
        <View className="mx-5 mb-2 bg-card border border-border rounded-xl overflow-hidden">
          <TouchableOpacity
            className="px-4 py-3"
            onPress={() => { setSelectedGrade(''); setShowGradeFilter(false); }}
          >
            <Text className="text-muted-foreground text-sm">Tümü</Text>
          </TouchableOpacity>
          {GRADES.map((g) => (
            <TouchableOpacity
              key={g.value}
              className={`px-4 py-3 ${selectedGrade === g.value ? 'bg-primary/20' : ''}`}
              onPress={() => { setSelectedGrade(g.value); setShowGradeFilter(false); }}
            >
              <Text className={`text-sm ${selectedGrade === g.value ? 'text-primary font-semibold' : 'text-white'}`}>{g.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Results */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          columnWrapperStyle={{ gap: 12 }}
          renderItem={({ item }) => (
            <View style={{ flex: 1 }}>
              <VideoCard
                video={item}
                onPress={() => router.push(`/(student)/watch/${item.id}` as any)}
              />
            </View>
          )}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20">
              <Ionicons name="search-outline" size={40} color="#a1a1aa" />
              <Text className="text-muted-foreground text-center mt-3">
                {search || hasFilters ? 'Aramanıza uygun ders bulunamadı.' : 'Henüz ders yok.'}
              </Text>
            </View>
          }
          ListHeaderComponent={
            <Text className="text-muted-foreground text-sm mb-3">
              {filtered.length} ders bulundu
            </Text>
          }
        />
      )}
    </View>
  );
}
