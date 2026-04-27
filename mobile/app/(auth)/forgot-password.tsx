import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { resetPassword } from '@/lib/api/auth';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const router = useRouter();

  const handleReset = async () => {
    if (!email.trim()) {
      Alert.alert('Hata', 'E-posta adresinizi girin.');
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Şifre sıfırlama e-postası gönderilemedi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 px-6 py-12">
        <TouchableOpacity
          className="w-10 h-10 rounded-xl bg-card border border-border items-center justify-center mb-6"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>

        <Image
          source={require('../../assets/chalk-logo.png')}
          style={{ width: 160, height: 64, alignSelf: 'center', marginBottom: 20 }}
          resizeMode="contain"
        />

        <Text className="text-white text-2xl font-bold mb-2">Şifremi Unuttum</Text>
        <Text className="text-muted-foreground text-base mb-8">
          E-posta adresinize şifre sıfırlama bağlantısı göndereceğiz.
        </Text>

        {sent ? (
          <View className="bg-success/10 border border-success/30 rounded-xl p-4 items-center">
            <Ionicons name="checkmark-circle" size={48} color="#10b981" />
            <Text className="text-success font-semibold text-lg mt-3">E-posta Gönderildi</Text>
            <Text className="text-muted-foreground text-center mt-2">
              {email} adresine şifre sıfırlama bağlantısı gönderildi.
            </Text>
            <TouchableOpacity
              className="mt-6 h-12 bg-primary rounded-xl px-8 items-center justify-center"
              onPress={() => router.replace('/(auth)/signin')}
            >
              <Text className="text-white font-semibold">Giriş Sayfasına Dön</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text className="text-white text-sm font-medium mb-2">E-posta</Text>
            <View className="flex-row items-center bg-card border border-border rounded-xl px-4 h-12 mb-6">
              <Ionicons name="mail-outline" size={18} color="#a1a1aa" />
              <TextInput
                className="flex-1 ml-3 text-white text-base"
                placeholder="ornek@okul.com"
                placeholderTextColor="#a1a1aa"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <TouchableOpacity
              className={`h-12 rounded-xl items-center justify-center ${isLoading ? 'bg-primary/50' : 'bg-primary'}`}
              onPress={handleReset}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold text-base">Sıfırlama E-postası Gönder</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
