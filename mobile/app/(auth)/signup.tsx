import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/auth-store';
import { SUBJECTS, GRADES } from '@/lib/constants';

type Role = 'teacher' | 'student';

export default function SignUpScreen() {
  const [role, setRole] = useState<Role>('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [school, setSchool] = useState('');
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [grade, setGrade] = useState(GRADES[0].value);
  const [showPassword, setShowPassword] = useState(false);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [showGradePicker, setShowGradePicker] = useState(false);

  const { signup, isLoading } = useAuthStore();
  const router = useRouter();

  const handleSignUp = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Hata', 'Ad, e-posta ve şifre gereklidir.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Hata', 'Şifre en az 6 karakter olmalıdır.');
      return;
    }

    const success = await signup({
      name: name.trim(),
      email: email.trim(),
      password,
      role,
      school: school.trim() || undefined,
      subject: role === 'teacher' ? subject : undefined,
      grade: role === 'student' ? grade : undefined,
    });

    if (success) {
      const { user } = useAuthStore.getState();
      router.replace(user?.role === 'teacher' ? '/(teacher)' : '/(student)');
    } else {
      const { error } = useAuthStore.getState();
      Alert.alert('Kayıt Başarısız', error || 'Bir hata oluştu.');
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 px-6 py-12">
          {/* Header */}
          <View className="items-center mb-8">
            <Image
              source={require('../../assets/chalk-logo.png')}
              style={{ width: 180, height: 72 }}
              resizeMode="contain"
            />
            <Text className="text-white text-2xl font-bold mt-3">Hesap Oluştur</Text>
          </View>

          {/* Role selector */}
          <View className="flex-row bg-card border border-border rounded-xl p-1 mb-6">
            {(['student', 'teacher'] as Role[]).map((r) => (
              <TouchableOpacity
                key={r}
                className={`flex-1 h-10 rounded-lg items-center justify-center ${
                  role === r ? 'bg-primary' : ''
                }`}
                onPress={() => setRole(r)}
              >
                <Text className={`font-semibold text-sm ${role === r ? 'text-white' : 'text-muted-foreground'}`}>
                  {r === 'student' ? '🎓 Öğrenci' : '👨‍🏫 Öğretmen'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View className="space-y-4">
            {/* Name */}
            <View>
              <Text className="text-white text-sm font-medium mb-2">Ad Soyad</Text>
              <View className="flex-row items-center bg-card border border-border rounded-xl px-4 h-12">
                <Ionicons name="person-outline" size={18} color="#a1a1aa" />
                <TextInput
                  className="flex-1 ml-3 text-white text-base"
                  placeholder="Adınız Soyadınız"
                  placeholderTextColor="#a1a1aa"
                  value={name}
                  onChangeText={setName}
                  autoComplete="name"
                />
              </View>
            </View>

            {/* Email */}
            <View className="mt-4">
              <Text className="text-white text-sm font-medium mb-2">E-posta</Text>
              <View className="flex-row items-center bg-card border border-border rounded-xl px-4 h-12">
                <Ionicons name="mail-outline" size={18} color="#a1a1aa" />
                <TextInput
                  className="flex-1 ml-3 text-white text-base"
                  placeholder="ornek@okul.com"
                  placeholderTextColor="#a1a1aa"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                />
              </View>
            </View>

            {/* Password */}
            <View className="mt-4">
              <Text className="text-white text-sm font-medium mb-2">Şifre</Text>
              <View className="flex-row items-center bg-card border border-border rounded-xl px-4 h-12">
                <Ionicons name="lock-closed-outline" size={18} color="#a1a1aa" />
                <TextInput
                  className="flex-1 ml-3 text-white text-base"
                  placeholder="En az 6 karakter"
                  placeholderTextColor="#a1a1aa"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color="#a1a1aa"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* School */}
            <View className="mt-4">
              <Text className="text-white text-sm font-medium mb-2">Okul (Opsiyonel)</Text>
              <View className="flex-row items-center bg-card border border-border rounded-xl px-4 h-12">
                <Ionicons name="business-outline" size={18} color="#a1a1aa" />
                <TextInput
                  className="flex-1 ml-3 text-white text-base"
                  placeholder="Okul adı"
                  placeholderTextColor="#a1a1aa"
                  value={school}
                  onChangeText={setSchool}
                />
              </View>
            </View>

            {/* Teacher-specific: subject */}
            {role === 'teacher' && (
              <View className="mt-4">
                <Text className="text-white text-sm font-medium mb-2">Branş</Text>
                <TouchableOpacity
                  className="flex-row items-center bg-card border border-border rounded-xl px-4 h-12"
                  onPress={() => setShowSubjectPicker(!showSubjectPicker)}
                >
                  <Ionicons name="book-outline" size={18} color="#a1a1aa" />
                  <Text className="flex-1 ml-3 text-white text-base">{subject}</Text>
                  <Ionicons name="chevron-down" size={16} color="#a1a1aa" />
                </TouchableOpacity>
                {showSubjectPicker && (
                  <View className="bg-card border border-border rounded-xl mt-1 overflow-hidden">
                    {SUBJECTS.map((s) => (
                      <TouchableOpacity
                        key={s}
                        className={`px-4 py-3 ${subject === s ? 'bg-primary/20' : ''}`}
                        onPress={() => { setSubject(s); setShowSubjectPicker(false); }}
                      >
                        <Text className={`text-base ${subject === s ? 'text-primary font-semibold' : 'text-white'}`}>
                          {s}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Student-specific: grade */}
            {role === 'student' && (
              <View className="mt-4">
                <Text className="text-white text-sm font-medium mb-2">Sınıf</Text>
                <TouchableOpacity
                  className="flex-row items-center bg-card border border-border rounded-xl px-4 h-12"
                  onPress={() => setShowGradePicker(!showGradePicker)}
                >
                  <Ionicons name="layers-outline" size={18} color="#a1a1aa" />
                  <Text className="flex-1 ml-3 text-white text-base">
                    {GRADES.find((g) => g.value === grade)?.label || grade}
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
                        <Text className={`text-base ${grade === g.value ? 'text-primary font-semibold' : 'text-white'}`}>
                          {g.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity
              className={`h-12 rounded-xl items-center justify-center mt-6 ${
                isLoading ? 'bg-primary/50' : 'bg-primary'
              }`}
              onPress={handleSignUp}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold text-base">Kayıt Ol</Text>
              )}
            </TouchableOpacity>
          </View>

          <View className="flex-row justify-center mt-6">
            <Text className="text-muted-foreground">Zaten hesabın var mı? </Text>
            <Link href="/(auth)/signin" asChild>
              <TouchableOpacity>
                <Text className="text-primary font-semibold">Giriş Yap</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
