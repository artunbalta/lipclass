import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '@/stores/auth-store';
import { uploadAvatar, updatePassword } from '@/lib/api/auth';
import { SUBJECTS } from '@/lib/constants';
import { Teacher } from '@/types';
import { ReferenceVideoUploader } from '@/components/ReferenceVideoUploader';

export default function TeacherSettingsScreen() {
  const { user, updateUser, logout } = useAuthStore();
  const router = useRouter();
  const teacher = user as Teacher | null;

  const [name, setName] = useState(user?.name ?? '');
  const [school, setSchool] = useState(user?.school ?? '');
  const [bio, setBio] = useState(teacher?.bio ?? '');
  const [subject, setSubject] = useState(teacher?.subject ?? SUBJECTS[0]);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Hata', 'Ad Soyad boş olamaz.');
      return;
    }
    setIsSaving(true);
    const ok = await updateUser({
      name: name.trim(),
      school: school.trim() || undefined,
      bio: bio.trim() || undefined,
      subject,
    } as any);
    setIsSaving(false);
    Alert.alert(ok ? 'Başarılı' : 'Hata', ok ? 'Profil güncellendi.' : 'Güncelleme başarısız.');
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert('Hata', 'Şifre en az 6 karakter olmalıdır.');
      return;
    }
    setIsSaving(true);
    try {
      await updatePassword(newPassword);
      setNewPassword('');
      Alert.alert('Başarılı', 'Şifre güncellendi.');
    } catch (e: any) {
      Alert.alert('Hata', e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('İzin Gerekli', 'Galeri erişimi gereklidir.'); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !user) return;

    setIsUploadingAvatar(true);
    try {
      const url = await uploadAvatar(user.id, result.assets[0].uri);
      await updateUser({ avatar: url } as any);
    } catch (e: any) {
      Alert.alert('Hata', e.message);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Çıkış Yap', 'Hesabından çıkmak istediğine emin misin?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Çıkış Yap',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/signin');
        },
      },
    ]);
  };

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="px-5 pt-14 pb-6">
        <Text className="text-white text-2xl font-bold">Profil</Text>
      </View>

      {/* Avatar */}
      <View className="items-center mb-6">
        <TouchableOpacity onPress={handlePickAvatar} disabled={isUploadingAvatar}>
          <View className="w-20 h-20 rounded-full bg-primary/20 items-center justify-center border-2 border-primary/40">
            {isUploadingAvatar ? (
              <ActivityIndicator color="#6366f1" />
            ) : (
              <Text className="text-primary text-2xl font-bold">
                {user?.name?.slice(0, 2).toUpperCase() ?? '??'}
              </Text>
            )}
          </View>
          <View className="absolute bottom-0 right-0 w-6 h-6 bg-primary rounded-full items-center justify-center">
            <Ionicons name="camera" size={12} color="#fff" />
          </View>
        </TouchableOpacity>
        <Text className="text-white font-semibold mt-3">{user?.name}</Text>
        <Text className="text-muted-foreground text-sm">{user?.email}</Text>
        {teacher?.subject && (
          <Text className="text-primary text-sm mt-0.5">{teacher.subject} Öğretmeni</Text>
        )}
      </View>

      {/* Profile settings */}
      <View className="mx-5 bg-card border border-border rounded-xl p-4 mb-4">
        <Text className="text-white font-semibold mb-4">Profil Bilgileri</Text>

        {[
          { label: 'Ad Soyad', value: name, setter: setName, placeholder: 'Adınız Soyadınız' },
          { label: 'Okul', value: school, setter: setSchool, placeholder: 'Okul adı' },
        ].map(({ label, value, setter, placeholder }) => (
          <View key={label} className="mb-4">
            <Text className="text-muted-foreground text-sm mb-2">{label}</Text>
            <View className="flex-row items-center bg-background border border-border rounded-xl px-4 h-12">
              <TextInput
                className="flex-1 text-white text-base"
                value={value}
                onChangeText={setter}
                placeholder={placeholder}
                placeholderTextColor="#a1a1aa"
              />
            </View>
          </View>
        ))}

        <View className="mb-4">
          <Text className="text-muted-foreground text-sm mb-2">Branş</Text>
          <TouchableOpacity
            className="flex-row items-center bg-background border border-border rounded-xl px-4 h-12"
            onPress={() => setShowSubjectPicker(!showSubjectPicker)}
          >
            <Text className="flex-1 text-white text-base">{subject}</Text>
            <Ionicons name="chevron-down" size={16} color="#a1a1aa" />
          </TouchableOpacity>
          {showSubjectPicker && (
            <View className="bg-background border border-border rounded-xl mt-1 overflow-hidden max-h-48">
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

        <View className="mb-4">
          <Text className="text-muted-foreground text-sm mb-2">Biyografi</Text>
          <View className="bg-background border border-border rounded-xl px-4 py-3">
            <TextInput
              className="text-white text-base"
              value={bio}
              onChangeText={setBio}
              placeholder="Kendinizi tanıtın..."
              placeholderTextColor="#a1a1aa"
              multiline
              numberOfLines={3}
              style={{ minHeight: 72, textAlignVertical: 'top' }}
            />
          </View>
        </View>

        <TouchableOpacity
          className={`h-12 rounded-xl items-center justify-center ${isSaving ? 'bg-primary/50' : 'bg-primary'}`}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-semibold">Kaydet</Text>}
        </TouchableOpacity>
      </View>

      {/* Reference video */}
      <View className="mx-5 mb-4">
        <ReferenceVideoUploader
          teacherId={user?.id ?? ''}
          currentStatus={teacher?.referenceVideoStatus ?? 'none'}
          onStatusChange={(status) => updateUser({ referenceVideoStatus: status } as any)}
        />
      </View>

      {/* Password */}
      <View className="mx-5 bg-card border border-border rounded-xl p-4 mb-4">
        <Text className="text-white font-semibold mb-4">Şifre Değiştir</Text>
        <View className="flex-row items-center bg-background border border-border rounded-xl px-4 h-12 mb-3">
          <Ionicons name="lock-closed-outline" size={16} color="#a1a1aa" />
          <TextInput
            className="flex-1 ml-3 text-white text-base"
            placeholder="Yeni şifre (en az 6 karakter)"
            placeholderTextColor="#a1a1aa"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
          />
        </View>
        <TouchableOpacity
          className="h-10 bg-card border border-border rounded-xl items-center justify-center"
          onPress={handleChangePassword}
          disabled={isSaving}
        >
          <Text className="text-white text-sm font-semibold">Şifreyi Güncelle</Text>
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <View className="mx-5 mb-10">
        <TouchableOpacity
          className="h-12 bg-destructive/10 border border-destructive/30 rounded-xl items-center justify-center flex-row gap-2"
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={18} color="#ef4444" />
          <Text className="text-destructive font-semibold">Çıkış Yap</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
