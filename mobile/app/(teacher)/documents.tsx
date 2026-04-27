import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/auth-store';
import { getDocuments, uploadDocument, deleteDocument } from '@/lib/api/documents';
import { TeacherDocument } from '@/types';

const STATUS_COLORS: Record<string, string> = {
  embedded: '#10b981',
  embedding: '#f59e0b',
  pending: '#a1a1aa',
  failed: '#ef4444',
};

const STATUS_LABELS: Record<string, string> = {
  embedded: 'Hazır',
  embedding: 'İşleniyor',
  pending: 'Bekliyor',
  failed: 'Hata',
};

export default function DocumentsScreen() {
  const { user } = useAuthStore();
  const [docs, setDocs] = useState<TeacherDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fetchDocs = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const fetched = await getDocuments(user.id);
      setDocs(fetched);
    } catch (e: any) {
      Alert.alert('Hata', e.message);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleUpload = async () => {
    if (!user?.id) return;

    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'text/plain'],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setIsUploading(true);
    try {
      const doc = await uploadDocument(
        user.id,
        asset.uri,
        asset.name,
        asset.mimeType ?? 'application/pdf'
      );
      setDocs((prev) => [doc, ...prev]);
      Alert.alert('Başarılı', 'Döküman yüklendi ve işleniyor. Hazır olduğunda bildirim alacaksınız.');
    } catch (e: any) {
      Alert.alert('Hata', e.message || 'Döküman yüklenemedi.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = (doc: TeacherDocument) => {
    Alert.alert(
      'Dökümanı Sil',
      `"${doc.original_name}" dökümanını silmek istediğine emin misin?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDocument(doc.id);
              setDocs((prev) => prev.filter((d) => d.id !== doc.id));
            } catch (e: any) {
              Alert.alert('Hata', e.message);
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
          <View>
            <Text className="text-white text-2xl font-bold">Kaynaklar</Text>
            <Text className="text-muted-foreground text-sm mt-0.5">
              {docs.length} döküman yüklendi
            </Text>
          </View>
          <TouchableOpacity
            className={`flex-row items-center gap-2 px-4 h-10 rounded-xl ${
              isUploading ? 'bg-primary/50' : 'bg-primary'
            }`}
            onPress={handleUpload}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
                <Text className="text-white font-semibold text-sm">Yükle</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View className="mx-5 mb-4 p-3 bg-card border border-border rounded-xl flex-row gap-3">
        <Ionicons name="information-circle-outline" size={18} color="#6366f1" />
        <Text className="text-muted-foreground text-xs flex-1">
          PDF veya TXT dosyaları yükleyin. AI ders oluştururken bu kaynaklardan faydalanır.
          Dosyalar işlendikten sonra "Hazır" durumuna geçer.
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
        <FlatList
          data={docs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchDocs} tintColor="#6366f1" />}
          renderItem={({ item }) => (
            <View className="bg-card border border-border rounded-xl p-4 flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center">
                <Ionicons name="document-text-outline" size={20} color="#6366f1" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-medium text-sm" numberOfLines={1}>
                  {item.original_name}
                </Text>
                <View className="flex-row items-center gap-2 mt-1">
                  <View
                    className="px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${STATUS_COLORS[item.status]}20` }}
                  >
                    <Text
                      className="text-xs font-medium"
                      style={{ color: STATUS_COLORS[item.status] }}
                    >
                      {STATUS_LABELS[item.status]}
                    </Text>
                  </View>
                  {item.chunk_count > 0 && (
                    <Text className="text-muted-foreground text-xs">{item.chunk_count} parça</Text>
                  )}
                </View>
              </View>
              {item.status === 'embedding' ? (
                <ActivityIndicator size="small" color="#f59e0b" />
              ) : (
                <TouchableOpacity onPress={() => handleDelete(item)}>
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              )}
            </View>
          )}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-16">
              <Ionicons name="folder-open-outline" size={52} color="#a1a1aa" />
              <Text className="text-white font-semibold text-lg mt-4">Kaynak Yok</Text>
              <Text className="text-muted-foreground text-center mt-2 px-4">
                PDF veya TXT dosyaları yükleyin. AI ders oluştururken bu kaynaklardan faydalanır.
              </Text>
              <TouchableOpacity
                className="mt-6 h-10 bg-primary rounded-xl px-6 items-center justify-center"
                onPress={handleUpload}
              >
                <Text className="text-white font-semibold text-sm">Döküman Yükle</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}
