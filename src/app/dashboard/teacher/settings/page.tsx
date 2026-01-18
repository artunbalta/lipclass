'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Mail, 
  Building, 
  BookOpen, 
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
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore } from '@/stores/auth-store';
import { SUBJECTS } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

export default function TeacherSettingsPage() {
  const { user } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate save
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
                <Label htmlFor="subject">Branş</Label>
                <select
                  id="subject"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  defaultValue={(user as { subject?: string })?.subject}
                >
                  {SUBJECTS.map((subject) => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Label htmlFor="bio">Hakkımda</Label>
              <Textarea
                id="bio"
                placeholder="Kendinizi kısaca tanıtın..."
                defaultValue={(user as { bio?: string })?.bio}
                rows={3}
              />
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
                { id: 'video_ready', label: 'Video hazır olduğunda', desc: 'Video oluşturma tamamlandığında bildirim al' },
                { id: 'video_views', label: 'Video izlendiğinde', desc: 'Videolarınız izlendiğinde haftalık özet al' },
                { id: 'comments', label: 'Yeni yorum', desc: 'Videolarınıza yorum yapıldığında bildirim al' },
                { id: 'updates', label: 'Ürün güncellemeleri', desc: 'Yeni özellikler ve güncellemeler hakkında bilgi al' },
                { id: 'tips', label: 'İpuçları ve öneriler', desc: 'Platformu daha verimli kullanmak için öneriler al' },
              ].map((item) => (
                <div key={item.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked={item.id !== 'tips'}
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

          <div className="p-6 rounded-xl border border-destructive/30 bg-destructive/5">
            <h3 className="font-semibold mb-2 text-destructive">Hesabı Sil</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Hesabınızı sildiğinizde tüm verileriniz kalıcı olarak silinir. Bu işlem geri alınamaz.
            </p>
            <Button variant="destructive">Hesabımı Sil</Button>
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
            <div className="grid grid-cols-3 gap-4">
              {[
                { id: 'light', label: 'Açık', preview: 'bg-white border' },
                { id: 'dark', label: 'Koyu', preview: 'bg-slate-900' },
                { id: 'system', label: 'Sistem', preview: 'bg-gradient-to-r from-white to-slate-900' },
              ].map((theme) => (
                <button
                  key={theme.id}
                  className="p-4 rounded-xl border-2 border-border hover:border-primary transition-colors text-center"
                >
                  <div className={cn('w-full h-12 rounded-lg mb-2', theme.preview)} />
                  <span className="text-sm font-medium">{theme.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-xl border border-border bg-card">
            <h3 className="font-semibold mb-4">Dil</h3>
            <select className="w-full max-w-xs h-10 px-3 rounded-md border border-input bg-background text-sm">
              <option value="tr">🇹🇷 Türkçe</option>
              <option value="en">🇬🇧 English</option>
            </select>
          </div>
        </motion.div>
      )}
    </div>
  );
}
