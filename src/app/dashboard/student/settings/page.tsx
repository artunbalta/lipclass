'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Mail, 
  Building, 
  GraduationCap, 
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
import { cn } from '@/lib/utils';

export default function StudentSettingsPage() {
  const { user } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  const tabs = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'notifications', label: 'Bildirimler', icon: Bell },
    { id: 'security', label: 'Güvenlik', icon: Shield },
    { id: 'appearance', label: 'Görünüm', icon: Palette },
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
                <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              <div>
                <Button variant="outline" size="sm">Fotoğraf Yükle</Button>
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
                <Input id="name" defaultValue={user?.name} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-posta</Label>
                <Input id="email" type="email" defaultValue={user?.email} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school">Okul</Label>
                <Input id="school" defaultValue={user?.school} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grade">Sınıf</Label>
                <select
                  id="grade"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  defaultValue={(user as { grade?: string })?.grade?.replace('. Sınıf', '')}
                >
                  {GRADES.map((grade) => (
                    <option key={grade.value} value={grade.value}>{grade.label}</option>
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
                        defaultChecked={['Matematik', 'Fizik'].includes(subject)}
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
                    defaultChecked={item.id !== 'updates'}
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
                <Input id="current" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new">Yeni Şifre</Label>
                <Input id="new" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Yeni Şifre (Tekrar)</Label>
                <Input id="confirm" type="password" />
              </div>
              <Button>Şifreyi Güncelle</Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Appearance Tab */}
      {activeTab === 'appearance' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="p-6 rounded-xl border border-border bg-card">
            <h3 className="font-semibold mb-4">Tema</h3>
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-xl border-2 border-primary bg-primary/5 text-center">
                <div className="w-full h-12 rounded-lg mb-2 bg-white border" />
                <span className="text-sm font-medium">Açık</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Uygulama yalnızca açık tema modunda çalışmaktadır.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
