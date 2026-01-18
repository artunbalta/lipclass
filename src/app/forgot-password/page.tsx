'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, Loader2, Check } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/shared/Logo';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const forgotPasswordSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi girin'),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    setIsLoading(false);
    setIsSuccess(true);
    toast.success('Şifre sıfırlama e-postası gönderildi!', {
      description: 'E-posta kutunuzu kontrol edin.',
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
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

        {!isSuccess ? (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold mb-2">Şifremi Unuttum</h1>
              <p className="text-muted-foreground">
                E-posta adresinizi girin, size şifre sıfırlama bağlantısı gönderelim.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">E-posta</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="ornek@email.com"
                    className={cn(
                      'pl-10',
                      errors.email && 'border-destructive focus-visible:ring-destructive'
                    )}
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Gönderiliyor...
                  </>
                ) : (
                  <>
                    Şifre Sıfırlama Bağlantısı Gönder
                  </>
                )}
              </Button>
            </form>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">E-posta Gönderildi!</h2>
            <p className="text-muted-foreground mb-6">
              E-posta kutunuzu kontrol edin. Şifre sıfırlama bağlantısı 24 saat geçerlidir.
            </p>
            <div className="space-y-3">
              <Link href="/signin">
                <Button className="w-full">Giriş Sayfasına Dön</Button>
              </Link>
              <p className="text-sm text-muted-foreground">
                E-posta almadınız mı?{' '}
                <button
                  onClick={() => setIsSuccess(false)}
                  className="text-primary hover:underline"
                >
                  Tekrar dene
                </button>
              </p>
            </div>
          </motion.div>
        )}

        {/* Back Link */}
        <div className="mt-8 text-center">
          <Link
            href="/signin"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Giriş sayfasına dön
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
