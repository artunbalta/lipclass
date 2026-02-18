'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  User, 
  Building, 
  GraduationCap,
  BookOpen,
  ArrowRight, 
  ArrowLeft,
  Loader2,
  Check
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/shared/Logo';
import { useAuthStore } from '@/stores/auth-store';
import { showToast } from '@/lib/utils/toast';
import { cn } from '@/lib/utils';
import { SUBJECTS, GRADES } from '@/lib/mock-data';

const signupSchema = z.object({
  name: z.string().min(2, 'İsim en az 2 karakter olmalı'),
  email: z.string().email('Geçerli bir e-posta adresi girin'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalı'),
  confirmPassword: z.string(),
  role: z.enum(['teacher', 'student']),
  school: z.string().optional(),
  subject: z.string().optional(),
  grade: z.string().optional(),
  terms: z.boolean().refine((val) => val === true, 'Kullanım koşullarını kabul etmelisiniz'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Şifreler eşleşmiyor',
  path: ['confirmPassword'],
});

type SignupForm = z.infer<typeof signupSchema>;

export default function SignUpPage() {
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'teacher' | 'student' | null>(null);
  const router = useRouter();
  const { signup, isLoading, error, clearError } = useAuthStore();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      role: undefined,
      terms: false,
    },
  });

  const watchRole = watch('role');

  const handleRoleSelect = (role: 'teacher' | 'student') => {
    setSelectedRole(role);
    setValue('role', role);
    setStep(2);
  };

  const onSubmit = async (data: SignupForm) => {
    clearError();
    const success = await signup({
      name: data.name,
      email: data.email,
      password: data.password,
      role: data.role,
      school: data.school,
      subject: data.subject,
      grade: data.grade,
    });
    if (success) {
      showToast.success('Hesap oluşturuldu!', `Hoş geldin, ${data.name.split(' ')[0]}!`);
      if (data.role === 'teacher') {
        router.push('/dashboard/teacher');
      } else {
        router.push('/dashboard/student');
      }
    } else {
      const errMsg = useAuthStore.getState().error || 'Kayıt başarısız. Lütfen tekrar deneyin.';
      showToast.error('Kayıt başarısız', errMsg);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <div className="mb-8">
            <Logo size="lg" />
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center gap-2 mb-8">
            {[1, 2].map((s) => (
              <div
                key={s}
                className={cn(
                  'flex-1 h-1 rounded-full transition-colors',
                  step >= s ? 'bg-primary' : 'bg-muted'
                )}
              />
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
            >
              {error}
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {/* Step 1: Role Selection */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <h1 className="text-2xl font-bold mb-2">Hesap Oluştur</h1>
                <p className="text-muted-foreground mb-8">
                  Rolünüzü seçerek başlayın
                </p>

                <div className="grid gap-4">
                  {/* Teacher Option */}
                  <button
                    onClick={() => handleRoleSelect('teacher')}
                    className={cn(
                      'p-6 rounded-xl border-2 text-left transition-all duration-200 hover:border-primary hover:shadow-md',
                      selectedRole === 'teacher'
                        ? 'border-primary bg-primary/5'
                        : 'border-border'
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <GraduationCap className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">Öğretmenim</h3>
                        <p className="text-sm text-muted-foreground">
                          Ders videoları oluşturmak ve öğrencilerimle paylaşmak istiyorum
                        </p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </button>

                  {/* Student Option */}
                  <button
                    onClick={() => handleRoleSelect('student')}
                    className={cn(
                      'p-6 rounded-xl border-2 text-left transition-all duration-200 hover:border-primary hover:shadow-md',
                      selectedRole === 'student'
                        ? 'border-primary bg-primary/5'
                        : 'border-border'
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                        <BookOpen className="w-6 h-6 text-accent" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">Öğrenciyim</h3>
                        <p className="text-sm text-muted-foreground">
                          Öğretmenlerimin hazırladığı videoları izlemek istiyorum
                        </p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </button>
                </div>

                <p className="mt-8 text-center text-sm text-muted-foreground">
                  Zaten hesabınız var mı?{' '}
                  <Link href="/signin" className="text-primary font-medium hover:underline">
                    Giriş yapın
                  </Link>
                </p>
              </motion.div>
            )}

            {/* Step 2: Form */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Geri dön
                </button>

                <h1 className="text-2xl font-bold mb-2">
                  {watchRole === 'teacher' ? 'Öğretmen Kaydı' : 'Öğrenci Kaydı'}
                </h1>
                <p className="text-muted-foreground mb-8">
                  Bilgilerinizi girerek devam edin
                </p>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name">Ad Soyad</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="name"
                        placeholder="Adınız Soyadınız"
                        className={cn('pl-10', errors.name && 'border-destructive')}
                        {...register('name')}
                      />
                    </div>
                    {errors.name && (
                      <p className="text-xs text-destructive">{errors.name.message}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email">E-posta</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="ornek@email.com"
                        className={cn('pl-10', errors.email && 'border-destructive')}
                        {...register('email')}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-xs text-destructive">{errors.email.message}</p>
                    )}
                  </div>

                  {/* School */}
                  <div className="space-y-2">
                    <Label htmlFor="school">Okul (Opsiyonel)</Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="school"
                        placeholder="Okul adı"
                        className="pl-10"
                        {...register('school')}
                      />
                    </div>
                  </div>

                  {/* Role-specific fields */}
                  {watchRole === 'teacher' && (
                    <div className="space-y-2">
                      <Label htmlFor="subject">Branş</Label>
                      <select
                        id="subject"
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                        {...register('subject')}
                      >
                        <option value="">Branş seçin</option>
                        {SUBJECTS.map((subject) => (
                          <option key={subject} value={subject}>
                            {subject}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {watchRole === 'student' && (
                    <div className="space-y-2">
                      <Label htmlFor="grade">Sınıf</Label>
                      <select
                        id="grade"
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                        {...register('grade')}
                      >
                        <option value="">Sınıf seçin</option>
                        {GRADES.map((grade) => (
                          <option key={grade.value} value={grade.label}>
                            {grade.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Password */}
                  <div className="space-y-2">
                    <Label htmlFor="password">Şifre</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className={cn('pl-10 pr-10', errors.password && 'border-destructive')}
                        {...register('password')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-xs text-destructive">{errors.password.message}</p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Şifre Tekrar</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className={cn('pl-10', errors.confirmPassword && 'border-destructive')}
                        {...register('confirmPassword')}
                      />
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
                    )}
                  </div>

                  {/* Terms */}
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      id="terms"
                      className="mt-1 w-4 h-4 rounded border-border text-primary focus:ring-primary"
                      {...register('terms')}
                    />
                    <label htmlFor="terms" className="text-sm text-muted-foreground">
                      <Link href="/terms" className="text-primary hover:underline">
                        Kullanım koşullarını
                      </Link>{' '}
                      ve{' '}
                      <Link href="/privacy" className="text-primary hover:underline">
                        gizlilik politikasını
                      </Link>{' '}
                      okudum, kabul ediyorum.
                    </label>
                  </div>
                  {errors.terms && (
                    <p className="text-xs text-destructive">{errors.terms.message}</p>
                  )}

                  {/* Submit */}
                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Hesap oluşturuluyor...
                      </>
                    ) : (
                      <>
                        Hesap Oluştur
                        <Check className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Right Side - Visual */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-accent/10 via-accent/5 to-primary/10 items-center justify-center p-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-lg text-center"
        >
          {/* Feature List */}
          <div className="space-y-4 text-left mb-8">
            {[
              { icon: '🎬', text: 'Sınırsız AI video oluşturma' },
              { icon: '📚', text: 'MEB müfredatına uygun içerik' },
              { icon: '⚡', text: 'Dakikalar içinde hazır videolar' },
              { icon: '🔒', text: 'Güvenli ve KVKK uyumlu' },
            ].map((feature, index) => (
              <motion.div
                key={feature.text}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border"
              >
                <span className="text-2xl">{feature.icon}</span>
                <span className="font-medium">{feature.text}</span>
              </motion.div>
            ))}
          </div>

          <h2 className="text-2xl font-bold mb-4">
            Hemen Ücretsiz Başlayın
          </h2>
          <p className="text-muted-foreground">
            Kredi kartı gerekmez. İlk 3 video ücretsiz.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
