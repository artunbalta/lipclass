import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/auth-store';
import { useVideoStore } from '@/stores/video-store';
import { generateVideo, GenerationProgress } from '@/lib/api/generation';
import { getReferenceVideoUrl } from '@/lib/api/storage';
import { getDocuments } from '@/lib/api/documents';
import { SUBJECTS, GRADES, TONES, DIFFICULTIES, LANGUAGES } from '@/lib/constants';
import { TeacherDocument } from '@/types';

const STEPS = ['Ders Bilgileri', 'İçerik', 'Ayarlar'];

type Tone = 'formal' | 'friendly' | 'energetic';
type Difficulty = 'easy' | 'medium' | 'hard';
type Language = 'tr' | 'en';

export default function CreateVideoScreen() {
  const { user } = useAuthStore();
  const { createVideo } = useVideoStore();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress>({ stage: 'idle' });

  // Step 1
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [grade, setGrade] = useState(GRADES[3].value);
  const [topic, setTopic] = useState('');
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [showGradePicker, setShowGradePicker] = useState(false);

  // Step 2
  const [description, setDescription] = useState('');
  const [tone, setTone] = useState<Tone>('friendly');
  const [sourceOnly, setSourceOnly] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [docs, setDocs] = useState<TeacherDocument[]>([]);

  // Step 3
  const [includesProblemSolving, setIncludesProblemSolving] = useState(true);
  const [problemCount, setProblemCount] = useState('3');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [duration, setDuration] = useState(15);
  const [language, setLanguage] = useState<Language>('tr');

  const fetchDocs = useCallback(async () => {
    if (!user?.id) return;
    try {
      const fetchedDocs = await getDocuments(user.id);
      setDocs(fetchedDocs.filter((d) => d.status === 'embedded'));
    } catch {
      // Non-critical
    }
  }, [user?.id]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const toggleDoc = (id: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const validateStep = (): boolean => {
    if (step === 0) {
      if (!topic.trim()) { Alert.alert('Hata', 'Konu başlığı gereklidir.'); return false; }
    }
    if (step === 1) {
      if (!description.trim() || description.trim().length < 10) {
        Alert.alert('Hata', 'Açıklama en az 10 karakter olmalıdır.');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!user || user.role !== 'teacher') return;

    setIsCreating(true);
    setProgress({ stage: 'generating_slides', progress: 0 });

    try {
      const video = await createVideo({
        subject,
        grade,
        topic: topic.trim(),
        description: description.trim(),
        learningObjectives: [],
        keyConcepts: [],
        prompt: '',
        tone,
        includesProblemSolving,
        problemCount: parseInt(problemCount) || 3,
        difficulty,
        estimatedDuration: duration,
        language,
        sourceOnly,
        sourceDocumentIds: selectedDocIds,
      });

      setIsCreating(false);
      setIsSuccess(true);

      const refVideoUrl = await getReferenceVideoUrl(user.id).catch(() => null);

      generateVideo({
        videoId: video.id,
        teacherId: user.id,
        topic: topic.trim(),
        description: description.trim(),
        prompt: '',
        language,
        tone,
        includesProblemSolving,
        problemCount: parseInt(problemCount) || 3,
        difficulty,
        referenceVideoUrl: refVideoUrl ?? undefined,
        sourceOnly,
        sourceDocumentIds: selectedDocIds.length > 0 ? selectedDocIds : undefined,
        onProgress: setProgress,
      })
        .then(() => {
          setTimeout(() => router.push('/(teacher)/videos'), 2000);
        })
        .catch((err) => {
          Alert.alert('Hata', err.message || 'Video oluşturulurken hata oluştu.');
        });
    } catch (err: any) {
      setIsCreating(false);
      Alert.alert('Hata', err.message || 'Video başlatılamadı.');
    }
  };

  if (isSuccess) {
    const stageLabel: Record<string, string> = {
      generating_slides: 'Slaytlar oluşturuluyor...',
      creating_audio: 'Ses dosyaları oluşturuluyor...',
      creating_lipsync: 'Video senkronizasyonu yapılıyor...',
      saving: 'Kaydediliyor...',
      completed: 'Ders hazır! ✅',
      failed: 'Hata oluştu ❌',
    };

    const progressValue =
      'progress' in progress ? (progress as any).progress : progress.stage === 'completed' ? 100 : 0;

    return (
      <View className="flex-1 bg-background items-center justify-center px-8">
        {progress.stage === 'completed' ? (
          <Ionicons name="checkmark-circle" size={72} color="#10b981" />
        ) : progress.stage === 'failed' ? (
          <Ionicons name="close-circle" size={72} color="#ef4444" />
        ) : (
          <ActivityIndicator size="large" color="#6366f1" />
        )}
        <Text className="text-white text-xl font-bold mt-6 text-center">
          {stageLabel[progress.stage] ?? 'Hazırlanıyor...'}
        </Text>
        {progress.stage !== 'completed' && progress.stage !== 'failed' && (
          <>
            <View className="w-full bg-muted rounded-full h-2 mt-6">
              <View
                className="bg-primary h-2 rounded-full"
                style={{ width: `${progressValue}%` }}
              />
            </View>
            <Text className="text-muted-foreground text-sm mt-2">{progressValue}%</Text>
          </>
        )}
        <Text className="text-muted-foreground text-center mt-4 text-sm">
          Oluşturma tamamlandığında bildirim alacaksınız.
        </Text>
        <TouchableOpacity
          className="mt-6 h-12 bg-card border border-border rounded-xl px-6 items-center justify-center"
          onPress={() => router.push('/(teacher)/videos')}
        >
          <Text className="text-white font-semibold">Videolar Sayfasına Git</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="px-5 pt-14 pb-4">
        <Text className="text-white text-2xl font-bold">Yeni Video Oluştur</Text>

        {/* Step indicator */}
        <View className="flex-row items-center mt-4 gap-2">
          {STEPS.map((s, i) => (
            <View key={i} className="flex-row items-center flex-1">
              <View
                className={`w-6 h-6 rounded-full items-center justify-center ${
                  i <= step ? 'bg-primary' : 'bg-muted'
                }`}
              >
                {i < step ? (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                ) : (
                  <Text className="text-white text-xs font-bold">{i + 1}</Text>
                )}
              </View>
              <Text
                className={`ml-1 text-xs font-medium flex-1 ${
                  i <= step ? 'text-white' : 'text-muted-foreground'
                }`}
                numberOfLines={1}
              >
                {s}
              </Text>
              {i < STEPS.length - 1 && <View className="w-4 h-0.5 bg-muted mx-1" />}
            </View>
          ))}
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {/* Step 0 — Lesson Info */}
        {step === 0 && (
          <View className="space-y-4">
            <View>
              <Text className="text-white text-sm font-medium mb-2">Ders *</Text>
              <TouchableOpacity
                className="flex-row items-center bg-card border border-border rounded-xl px-4 h-12"
                onPress={() => setShowSubjectPicker(!showSubjectPicker)}
              >
                <Ionicons name="book-outline" size={18} color="#a1a1aa" />
                <Text className="flex-1 ml-3 text-white">{subject}</Text>
                <Ionicons name="chevron-down" size={16} color="#a1a1aa" />
              </TouchableOpacity>
              {showSubjectPicker && (
                <View className="bg-card border border-border rounded-xl mt-1 overflow-hidden max-h-48">
                  <ScrollView>
                    {SUBJECTS.map((s) => (
                      <TouchableOpacity
                        key={s}
                        className={`px-4 py-3 ${subject === s ? 'bg-primary/20' : ''}`}
                        onPress={() => { setSubject(s); setShowSubjectPicker(false); }}
                      >
                        <Text className={`text-sm ${subject === s ? 'text-primary font-semibold' : 'text-white'}`}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <View className="mt-4">
              <Text className="text-white text-sm font-medium mb-2">Sınıf Seviyesi *</Text>
              <TouchableOpacity
                className="flex-row items-center bg-card border border-border rounded-xl px-4 h-12"
                onPress={() => setShowGradePicker(!showGradePicker)}
              >
                <Ionicons name="layers-outline" size={18} color="#a1a1aa" />
                <Text className="flex-1 ml-3 text-white">
                  {GRADES.find((g) => g.value === grade)?.label ?? grade}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#a1a1aa" />
              </TouchableOpacity>
              {showGradePicker && (
                <View className="bg-card border border-border rounded-xl mt-1 overflow-hidden">
                  {GRADES.map((g) => (
                    <TouchableOpacity
                      key={g.value}
                      className={`px-4 py-3 ${grade === g.value ? 'bg-primary/20' : ''}`}
                      onPress={() => { setGrade(g.value); setShowGradePicker(false); }}
                    >
                      <Text className={`text-sm ${grade === g.value ? 'text-primary font-semibold' : 'text-white'}`}>{g.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View className="mt-4">
              <Text className="text-white text-sm font-medium mb-2">Konu Başlığı *</Text>
              <View className="bg-card border border-border rounded-xl px-4 h-12 justify-center">
                <TextInput
                  className="text-white text-base"
                  placeholder="Örn: Birinci Dereceden Denklemler"
                  placeholderTextColor="#a1a1aa"
                  value={topic}
                  onChangeText={setTopic}
                />
              </View>
            </View>
          </View>
        )}

        {/* Step 1 — Content */}
        {step === 1 && (
          <View className="space-y-4">
            <View>
              <Text className="text-white text-sm font-medium mb-2">Ders Açıklaması *</Text>
              <View className="bg-card border border-border rounded-xl px-4 py-3">
                <TextInput
                  className="text-white text-base"
                  placeholder="Bu derste neler öğretilecek? Detaylı açıklama yazın..."
                  placeholderTextColor="#a1a1aa"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={5}
                  style={{ minHeight: 120, textAlignVertical: 'top' }}
                />
              </View>
            </View>

            <View className="mt-4">
              <Text className="text-white text-sm font-medium mb-2">Anlatım Tonu</Text>
              <View className="flex-row gap-2">
                {TONES.map((t) => (
                  <TouchableOpacity
                    key={t.value}
                    className={`flex-1 h-10 rounded-xl items-center justify-center border ${
                      tone === t.value ? 'bg-primary border-primary' : 'bg-card border-border'
                    }`}
                    onPress={() => setTone(t.value as Tone)}
                  >
                    <Text className={`text-xs font-semibold ${tone === t.value ? 'text-white' : 'text-muted-foreground'}`}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Source documents */}
            {docs.length > 0 && (
              <View className="mt-4">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-white text-sm font-medium">Kaynak Dökümanlar</Text>
                  <View className="flex-row items-center gap-2">
                    <Text className="text-muted-foreground text-xs">Sadece kendi kaynaklarım</Text>
                    <Switch
                      value={sourceOnly}
                      onValueChange={setSourceOnly}
                      trackColor={{ false: '#3a3a3a', true: '#6366f1' }}
                      thumbColor="#fff"
                    />
                  </View>
                </View>
                {docs.map((doc) => (
                  <TouchableOpacity
                    key={doc.id}
                    className={`flex-row items-center p-3 rounded-xl border mb-2 ${
                      selectedDocIds.includes(doc.id) ? 'border-primary bg-primary/10' : 'border-border bg-card'
                    }`}
                    onPress={() => toggleDoc(doc.id)}
                  >
                    <Ionicons
                      name={selectedDocIds.includes(doc.id) ? 'checkbox' : 'square-outline'}
                      size={18}
                      color={selectedDocIds.includes(doc.id) ? '#6366f1' : '#a1a1aa'}
                    />
                    <View className="flex-1 ml-3">
                      <Text className="text-white text-sm" numberOfLines={1}>{doc.original_name}</Text>
                      <Text className="text-muted-foreground text-xs">{doc.chunk_count} parça</Text>
                    </View>
                    <View className="bg-success/20 px-2 py-0.5 rounded-full">
                      <Text className="text-success text-xs">Hazır</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Step 2 — Settings */}
        {step === 2 && (
          <View className="space-y-4">
            <View className="bg-card border border-border rounded-xl p-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 mr-4">
                  <Text className="text-white font-medium">Soru Çözümü Ekle</Text>
                  <Text className="text-muted-foreground text-xs mt-0.5">
                    Video içinde interaktif soru çözümü göster
                  </Text>
                </View>
                <Switch
                  value={includesProblemSolving}
                  onValueChange={setIncludesProblemSolving}
                  trackColor={{ false: '#3a3a3a', true: '#6366f1' }}
                  thumbColor="#fff"
                />
              </View>
            </View>

            {includesProblemSolving && (
              <View className="space-y-4">
                <View>
                  <Text className="text-white text-sm font-medium mb-2">Soru Sayısı</Text>
                  <View className="bg-card border border-border rounded-xl px-4 h-12 justify-center">
                    <TextInput
                      className="text-white text-base"
                      value={problemCount}
                      onChangeText={setProblemCount}
                      keyboardType="number-pad"
                      placeholder="3"
                      placeholderTextColor="#a1a1aa"
                    />
                  </View>
                </View>

                <View className="mt-4">
                  <Text className="text-white text-sm font-medium mb-2">Zorluk Seviyesi</Text>
                  <View className="flex-row gap-2">
                    {DIFFICULTIES.map((d) => (
                      <TouchableOpacity
                        key={d.value}
                        className={`flex-1 h-10 rounded-xl items-center justify-center border ${
                          difficulty === d.value ? 'bg-primary border-primary' : 'bg-card border-border'
                        }`}
                        onPress={() => setDifficulty(d.value as Difficulty)}
                      >
                        <Text className={`text-xs font-semibold ${difficulty === d.value ? 'text-white' : 'text-muted-foreground'}`}>
                          {d.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            )}

            <View className="mt-4">
              <Text className="text-white text-sm font-medium mb-2">
                Tahmini Süre: {duration} dakika
              </Text>
              <View className="flex-row items-center gap-3">
                <TouchableOpacity
                  onPress={() => setDuration(Math.max(5, duration - 5))}
                  className="w-10 h-10 bg-card border border-border rounded-xl items-center justify-center"
                >
                  <Ionicons name="remove" size={18} color="#fff" />
                </TouchableOpacity>
                <View className="flex-1 bg-card border border-border rounded-xl h-10 items-center justify-center">
                  <Text className="text-white font-semibold">{duration} dk</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setDuration(Math.min(60, duration + 5))}
                  className="w-10 h-10 bg-card border border-border rounded-xl items-center justify-center"
                >
                  <Ionicons name="add" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            <View className="mt-4">
              <Text className="text-white text-sm font-medium mb-2">Dil</Text>
              <View className="flex-row gap-2">
                {LANGUAGES.map((l) => (
                  <TouchableOpacity
                    key={l.value}
                    className={`flex-1 h-10 rounded-xl items-center justify-center border ${
                      language === l.value ? 'bg-primary border-primary' : 'bg-card border-border'
                    }`}
                    onPress={() => setLanguage(l.value as Language)}
                  >
                    <Text className={`text-xs font-semibold ${language === l.value ? 'text-white' : 'text-muted-foreground'}`}>
                      {l.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Summary */}
            <View className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-xl">
              <Text className="text-white font-semibold mb-3">Özet</Text>
              <View className="space-y-1">
                {[
                  ['Ders', subject],
                  ['Sınıf', `${GRADES.find((g) => g.value === grade)?.label}`],
                  ['Konu', topic],
                  ['Süre', `${duration} dakika`],
                ].map(([label, value]) => (
                  <View key={label} className="flex-row">
                    <Text className="text-muted-foreground text-sm w-16">{label}:</Text>
                    <Text className="text-white text-sm font-medium flex-1">{value}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Navigation buttons */}
      <View className="flex-row px-5 pb-8 gap-3">
        {step > 0 && (
          <TouchableOpacity
            className="flex-1 h-12 bg-card border border-border rounded-xl items-center justify-center flex-row gap-2"
            onPress={() => setStep(step - 1)}
          >
            <Ionicons name="arrow-back" size={16} color="#fff" />
            <Text className="text-white font-semibold">Geri</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          className={`flex-1 h-12 rounded-xl items-center justify-center flex-row gap-2 ${
            isCreating ? 'bg-primary/50' : 'bg-primary'
          }`}
          onPress={() => {
            if (!validateStep()) return;
            if (step < STEPS.length - 1) {
              setStep(step + 1);
            } else {
              handleSubmit();
            }
          }}
          disabled={isCreating}
        >
          {isCreating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text className="text-white font-semibold">
                {step < STEPS.length - 1 ? 'Devam Et' : 'Video Oluştur'}
              </Text>
              {step < STEPS.length - 1 && (
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              )}
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
