'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Bell,
  Shield,
  Palette,
  Save,
  Camera,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore } from '@/stores/auth-store';
import { GRADES } from '@/lib/mock-data';
import * as authAPI from '@/lib/api/auth';
import { showToast } from '@/lib/utils/toast';
import { cn } from '@/lib/utils';

export default function StudentSettingsPage() {
  const { user, updateUser } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Controlled form state
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [school, setSchool] = useState(user?.school || '');
  const [grade, setGrade] = useState(
    (user as { grade?: string })?.grade?.replace('. Sınıf', '') || '8'
  );

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Notification preferences state
  const [notifications, setNotifications] = useState({
    new_videos: true,
    reminders: true,
    progress: true,
    updates: false,
  });

  // Interest areas state
  const [interests, setInterests] = useState<string[]>(['Matematik', 'Fizik']);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const success = await updateUser({
        name,
        school,
        grade: `${grade}. Sınıf`,
      });
      if (success) {
        showToast.success('Profil güncellendi', 'Değişiklikleriniz başarıyla kaydedildi.');
      } else {
        showToast.error('Güncelleme başarısız', 'Lütfen tekrar deneyin.');
      }
    } catch {
      showToast.error('Bir hata oluştu', 'Profil güncellenirken bir sorun oluştu.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      showToast.error('Şifreler eşleşmiyor', 'Yeni şifre ve tekrar alanları aynı olmalıdır.');
      return;
    }
    if (newPassword.length < 6) {
      showToast.error('Şifre çok kısa', 'Şifreniz en az 6 karakter olmalıdır.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await authAPI.updatePassword(newPassword);
      showToast.success('Şifre güncellendi', 'Yeni şifreniz başarıyla kaydedildi.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      showToast.error('Şifre güncellenemedi', error.message || 'Lütfen tekrar deneyin.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast.error('Dosya çok büyük', 'Maksimum dosya boyutu 2MB olmalıdır.');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const avatarUrl = await authAPI.uploadAvatar(user.id, file);
      await updateUser({ avatar: avatarUrl } as any);
      showToast.success('Fotoğraf güncellendi', 'Profil fotoğrafınız başarıyla değiştirildi.');
    } catch (error: any) {
      showToast.error('Yükleme başarısız', error.message || 'Fotoğraf yüklenirken bir hata oluştu.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const toggleInterest = (subject: string) => {
    setInterests(prev =>
      prev.includes(subject) ? prev.filter(s => s !== subject) : [...prev, subject]
    );
  };

  const toggleNotification = (id: string) => {
    setNotifications(prev => ({ ...prev, [id]: !prev[id as keyof typeof prev] }));
  };

  const tabs = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'notifications', label: 'Bildirimler', icon: Bell },
    { id: 'security', label: 'Güvenlik', icon: Shield },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">Ayarlar</h1>
        <p className="text-muted-foreground mt-1">
          Hesap ve uygulama ayarlarınızı yönetin
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'ghost'}
            className={cn(
              'gap-2 shrink-0',
              activeTab === tab.id && 'bg-primary'
            )}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Avatar Section */}
          <div className="p-6 rounded-xl border border-border bg-card">
            <h3 className="font-semibold mb-4">Profil Fotoğrafı</h3>
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="w-24 h-24 border-4 border-primary/20">
                  <AvatarImage src={user?.avatar} />
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {user?.name?.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <button
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </button>
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                >
                  {isUploadingAvatar ? 'Yükleniyor...' : 'Fotoğraf Yükle'}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  JPG, PNG veya GIF. Maks. 2MB.
                </p>
              </div>
            </div>
          </div>

          {/* Personal Info */}
          <div className="p-6 rounded-xl border border-border bg-card">
            <h3 className="font-semibold mb-4">Kişisel Bilgiler</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Ad Soyad</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-posta</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="opacity-60"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school">Okul</Label>
                <Input
                  id="school"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grade">Sınıf</Label>
                <select
                  id="grade"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                >
                  {GRADES.map((g) => (
                    <option key={g.value} value={g.value}>{g.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Learning Preferences */}
          <div className="p-6 rounded-xl border border-border bg-card">
            <h3 className="font-semibold mb-4">Öğrenme Tercihleri</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>İlgi Alanları</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Hangi derslerde video önerileri almak istiyorsunuz?
                </p>
                <div className="flex flex-wrap gap-2">
                  {['Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Türkçe', 'Tarih'].map((subject) => (
                    <label key={subject} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={interests.includes(subject)}
                        onChange={() => toggleInterest(subject)}
                        className="w-4 h-4 rounded border-input text-primary focus:ring-primary"
                      />
                      <span className="text-sm">{subject}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Değişiklikleri Kaydet
                </>
              )}
            </Button>
          </div>
        </motion.div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="p-6 rounded-xl border border-border bg-card">
            <h3 className="font-semibold mb-4">Bildirim Tercihleri</h3>
            <div className="space-y-4">
              {[
                { id: 'new_videos', label: 'Yeni videolar', desc: 'İlgilendiğiniz derslerde yeni video yüklendiğinde bildirim alın' },
                { id: 'reminders', label: 'Öğrenme hatırlatıcıları', desc: 'Düzenli çalışma için günlük hatırlatma alın' },
                { id: 'progress', label: 'İlerleme özeti', desc: 'Haftalık öğrenme ilerleme raporu alın' },
                { id: 'updates', label: 'Ürün güncellemeleri', desc: 'Yeni özellikler hakkında bilgi alın' },
              ].map((item) => (
                <div key={item.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications[item.id as keyof typeof notifications]}
                    onChange={() => toggleNotification(item.id)}
                    className="w-5 h-5 rounded border-input text-primary focus:ring-primary"
                  />
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="p-6 rounded-xl border border-border bg-card">
            <h3 className="font-semibold mb-4">Şifre Değiştir</h3>
            <div className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="current">Mevcut Şifre</Label>
                <Input
                  id="current"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new">Yeni Şifre</Label>
                <Input
                  id="new"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Yeni Şifre (Tekrar)</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <Button
                onClick={handlePasswordChange}
                disabled={isChangingPassword || !newPassword || !confirmPassword}
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Güncelleniyor...
                  </>
                ) : (
                  'Şifreyi Güncelle'
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      )}


    </div>
  );
}
