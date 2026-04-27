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
  StyleSheet,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { BlurView } from 'expo-blur';
import { useAuthStore } from '@/stores/auth-store';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading, clearError } = useAuthStore();
  const router = useRouter();

  // Background video player — muted, looping, same asset as web landing page
  const bgPlayer = useVideoPlayer(
    require('../../assets/landingvideo.mp4'),
    (p) => {
      p.loop = true;
      p.muted = true;
      p.play();
    }
  );

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Hata', 'E-posta ve şifre gereklidir.');
      return;
    }

    clearError();
    const success = await login(email.trim(), password);

    if (success) {
      const { user } = useAuthStore.getState();
      router.replace(user?.role === 'teacher' ? '/(teacher)' : '/(student)');
    } else {
      const { error } = useAuthStore.getState();
      Alert.alert('Giriş Başarısız', error || 'E-posta veya şifre hatalı.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Background video */}
      <VideoView
        player={bgPlayer}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
        allowsFullscreen={false}
      />

      {/* 
        Sinematik İllüzyon (Cinematic Smoothing):
        Videonun çözünürlük düşüklüğünü gizleyip onu pürüzsüz, premium bir 
        "ambient" arka plana dönüştüren hafif blur katmanı. Hem karartma yapar 
        hem de piksellenmeyi tamamen yok eder.
      */}
      <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Top Logo */}
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/chalk-logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            {/* Spacer pushes the form down, maximizing video visibility */}
            <View style={{ flex: 1 }} />

            {/* Minimal Form Area */}
            <View style={styles.formContainer}>

              {/* Glassmorphic Email Input */}
              <BlurView intensity={35} tint="dark" style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="rgba(255,255,255,0.7)" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="E-posta adresi"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                />
              </BlurView>

              {/* Glassmorphic Password Input */}
              <BlurView intensity={35} tint="dark" style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="rgba(255,255,255,0.7)" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Şifre"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.iconRight}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="rgba(255,255,255,0.7)"
                  />
                </TouchableOpacity>
              </BlurView>

              <TouchableOpacity style={styles.forgotContainer}>
                <Link href="/(auth)/forgot-password" asChild>
                  <Text style={styles.forgotText}>Şifremi Unuttum</Text>
                </Link>
              </TouchableOpacity>

              {/* Premium White Submit Button */}
              <TouchableOpacity
                style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
                onPress={handleSignIn}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.submitBtnText}>Giriş Yap</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Sign up link */}
            <View style={styles.signupRow}>
              <Text style={styles.signupText}>Hesabın yok mu? </Text>
              <Link href="/(auth)/signup" asChild>
                <TouchableOpacity>
                  <Text style={styles.signupLink}>Kayıt Ol</Text>
                </TouchableOpacity>
              </Link>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 80, // Safe area distance for logo
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  logo: {
    width: 180, // Balanced size for centered layout
    height: 72,
  },
  formContainer: {
    width: '100%',
    gap: 16, // Modern gap property for spacing
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56, // Tall, premium feel
    borderRadius: 18, // Smooth corners
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(20,20,30,0.15)', // Light glass tint
  },
  icon: {
    paddingLeft: 20,
    paddingRight: 12,
  },
  iconRight: {
    paddingHorizontal: 20,
    height: '100%',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    height: '100%',
  },
  forgotContainer: {
    alignSelf: 'flex-end',
    marginTop: -4,
    marginBottom: 8,
  },
  forgotText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '500',
  },
  submitBtn: {
    height: 56,
    backgroundColor: '#fff', // High contrast, premium white button
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#000', // Black text for the white button
    fontWeight: '700',
    fontSize: 16,
  },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  signupText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  signupLink: {
    color: '#fff', // Pure white to pop
    fontWeight: '700',
    fontSize: 14,
  },
});
