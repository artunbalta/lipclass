import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, Modal } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { uploadReferenceVideo, updateReferenceVideoStatus } from '@/lib/api/storage';

interface ReferenceVideoUploaderProps {
  teacherId: string;
  currentStatus: 'none' | 'processing' | 'ready';
  onStatusChange: (status: 'none' | 'processing' | 'ready') => void;
}

export function ReferenceVideoUploader({
  teacherId,
  currentStatus,
  onStatusChange,
}: ReferenceVideoUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [cameraRef, setCameraRef] = useState<CameraView | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const handlePickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Galeri erişimi gereklidir.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 1,
    });

    if (result.canceled || !result.assets?.[0]) return;
    await uploadVideo(result.assets[0].uri);
  };

  const handleRecord = async () => {
    if (!cameraPermission?.granted) {
      const { granted } = await requestCameraPermission();
      if (!granted) {
        Alert.alert('İzin Gerekli', 'Kamera erişimi gereklidir.');
        return;
      }
    }
    setShowCamera(true);
  };

  const startRecording = async () => {
    if (!cameraRef) return;
    setIsRecording(true);
    try {
      const video = await (cameraRef as any).recordAsync({ maxDuration: 60 });
      setIsRecording(false);
      setShowCamera(false);
      if (video?.uri) {
        await uploadVideo(video.uri);
      }
    } catch {
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (cameraRef) {
      (cameraRef as any).stopRecording();
    }
  };

  const uploadVideo = async (uri: string) => {
    setIsUploading(true);
    onStatusChange('processing');

    try {
      await uploadReferenceVideo(teacherId, uri);
      await updateReferenceVideoStatus(teacherId, 'ready');
      onStatusChange('ready');
      Alert.alert('Başarılı', 'Referans video başarıyla yüklendi.');
    } catch (e: any) {
      onStatusChange('none');
      Alert.alert('Hata', e.message || 'Video yüklenemedi.');
    } finally {
      setIsUploading(false);
    }
  };

  const statusConfig = {
    none: { color: '#a1a1aa', bg: 'bg-muted', label: 'Yüklenmedi', icon: 'videocam-off-outline' },
    processing: { color: '#f59e0b', bg: 'bg-yellow-500/10', label: 'İşleniyor...', icon: 'time-outline' },
    ready: { color: '#10b981', bg: 'bg-success/10', label: 'Hazır ✓', icon: 'checkmark-circle-outline' },
  } as const;

  const cfg = statusConfig[currentStatus];

  return (
    <>
      <View className="bg-card border border-border rounded-xl p-4">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-white font-semibold">Referans Video (Lipsync)</Text>
          <View className={`flex-row items-center gap-1 px-2 py-1 rounded-full ${cfg.bg}`}>
            <Ionicons name={cfg.icon} size={12} color={cfg.color} />
            <Text className="text-xs font-medium" style={{ color: cfg.color }}>{cfg.label}</Text>
          </View>
        </View>

        <Text className="text-muted-foreground text-xs mb-4">
          Lipsync özelliği için 30-60 saniyelik bir tanıtım videosu yükleyin. Bu video AI tarafından derslerde kullanılır.
        </Text>

        {isUploading ? (
          <View className="flex-row items-center gap-3 p-3 bg-primary/10 rounded-xl">
            <ActivityIndicator color="#6366f1" />
            <Text className="text-primary text-sm">Video yükleniyor...</Text>
          </View>
        ) : (
          <View className="flex-row gap-2">
            <TouchableOpacity
              className="flex-1 flex-row items-center justify-center gap-2 h-10 bg-primary/20 border border-primary/40 rounded-xl"
              onPress={handlePickFromGallery}
            >
              <Ionicons name="images-outline" size={16} color="#6366f1" />
              <Text className="text-primary text-sm font-semibold">Galeriden Seç</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 flex-row items-center justify-center gap-2 h-10 bg-card border border-border rounded-xl"
              onPress={handleRecord}
            >
              <Ionicons name="videocam-outline" size={16} color="#fff" />
              <Text className="text-white text-sm font-semibold">Video Çek</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Camera modal */}
      <Modal visible={showCamera} animationType="slide">
        <View className="flex-1 bg-black">
          <CameraView
            style={{ flex: 1 }}
            mode="video"
            facing="front"
            ref={(ref) => setCameraRef(ref)}
          >
            <View className="absolute top-14 left-0 right-0 items-center">
              <Text className="text-white text-sm bg-black/50 px-3 py-1 rounded-full">
                {isRecording ? '⏺ Kayıt yapılıyor...' : 'Kayıt için butona basın (max 60 sn)'}
              </Text>
            </View>

            <View className="absolute bottom-12 left-0 right-0 flex-row items-center justify-center gap-6">
              <TouchableOpacity
                className="w-14 h-14 rounded-full bg-gray-800/80 items-center justify-center"
                onPress={() => { setShowCamera(false); setIsRecording(false); }}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                className={`w-20 h-20 rounded-full items-center justify-center border-4 ${
                  isRecording ? 'bg-red-500 border-red-300' : 'bg-white border-gray-300'
                }`}
                onPress={isRecording ? stopRecording : startRecording}
              >
                {isRecording ? (
                  <View className="w-8 h-8 bg-white rounded" />
                ) : (
                  <View className="w-12 h-12 bg-red-500 rounded-full" />
                )}
              </TouchableOpacity>

              <View className="w-14 h-14" />
            </View>
          </CameraView>
        </View>
      </Modal>
    </>
  );
}
