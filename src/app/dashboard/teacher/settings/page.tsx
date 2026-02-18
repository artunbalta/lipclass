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
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore } from '@/stores/auth-store';
import { SUBJECTS } from '@/lib/mock-data';
import * as authAPI from '@/lib/api/auth';
import { showToast } from '@/lib/utils/toast';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/components/providers/language-provider';

export default function TeacherSettingsPage() {
  const { user, updateUser } = useAuthStore();
  const { t, language, setLanguage } = useLanguage();
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Controlled form state
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [school, setSchool] = useState(user?.school || '');
  const [subject, setSubject] = useState(
    (user as { subject?: string })?.subject || 'Matematik'
  );
  const [bio, setBio] = useState(
    (user as { bio?: string })?.bio || ''
  );

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Notification preferences state
  const [notifications, setNotifications] = useState({
    video_ready: true,
    video_views: true,
    comments: true,
    updates: true,
    tips: false,
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const success = await updateUser({
        name,
        school,
        subject,
        bio,
      });
      if (success) {
        showToast.success(t('settings.messages.profileUpdated'), t('settings.messages.profileUpdateSuccess'));
      } else {
        showToast.error(t('settings.messages.profileUpdateError'), 'Please try again.');
      }
    } catch {
      showToast.error(t('common.error'), t('settings.messages.profileUpdateError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      showToast.error(t('settings.messages.passwordMismatch'), t('settings.messages.passwordMismatch'));
      return;
    }
    if (newPassword.length < 6) {
      showToast.error(t('settings.messages.passwordLength'), t('settings.messages.passwordLength'));
      return;
    }

    setIsChangingPassword(true);
    try {
      await authAPI.updatePassword(newPassword);
      showToast.success(t('settings.messages.passwordUpdated'), t('settings.messages.passwordUpdated'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      showToast.error(t('settings.messages.passwordUpdateError'), error.message || 'Please try again.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast.error(t('settings.messages.fileTooLarge'), 'Max 2MB.');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const avatarUrl = await authAPI.uploadAvatar(user.id, file);
      await updateUser({ avatar: avatarUrl } as any);
      showToast.success(t('settings.messages.avatarUpdated'), t('settings.messages.avatarUpdated'));
    } catch (error: any) {
      showToast.error(t('settings.messages.avatarUploadError'), error.message || 'Error uploading file.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang as any);
    showToast.success(t('settings.messages.languageUpdated'), newLang === 'tr' ? 'Dil Türkçe olarak ayarlandı.' : 'Language set to English.');
  };

  const toggleNotification = (id: string) => {
    setNotifications(prev => ({ ...prev, [id]: !prev[id as keyof typeof prev] }));
  };

  const tabs = [
    { id: 'profile', label: t('settings.tabs.profile'), icon: User },
    { id: 'notifications', label: t('settings.tabs.notifications'), icon: Bell },
    { id: 'security', label: t('settings.tabs.security'), icon: Shield },
    { id: 'appearance', label: t('settings.tabs.appearance'), icon: Palette },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">{t('settings.title')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('settings.subtitle')}
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
            <h3 className="font-semibold mb-4">{t('settings.profile.photo')}</h3>
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
                  {isUploadingAvatar ? t('settings.profile.uploading') : t('settings.profile.upload')}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  {t('settings.profile.uploadHelp')}
                </p>
              </div>
            </div>
          </div>

          {/* Personal Info */}
          <div className="p-6 rounded-xl border border-border bg-card">
            <h3 className="font-semibold mb-4">{t('settings.profile.personalInfo')}</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('settings.profile.name')}</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('settings.profile.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="opacity-60"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school">{t('settings.profile.school')}</Label>
                <Input
                  id="school"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">{t('settings.profile.subject')}</Label>
                <select
                  id="subject"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                >
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Label htmlFor="bio">{t('settings.profile.bio')}</Label>
              <Textarea
                id="bio"
                placeholder={t('settings.profile.bioPlaceholder')}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
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
                  {t('common.saving')}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {t('settings.profile.saveButton')}
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
            <h3 className="font-semibold mb-4">{t('settings.notifications.title')}</h3>
            <div className="space-y-4">
              {[
                { id: 'video_ready', label: t('settings.notifications.videoReady'), desc: t('settings.notifications.videoReadyDesc') },
                { id: 'video_views', label: t('settings.notifications.videoViews'), desc: t('settings.notifications.videoViewsDesc') },
                { id: 'comments', label: t('settings.notifications.comments'), desc: t('settings.notifications.commentsDesc') },
                { id: 'updates', label: t('settings.notifications.updates'), desc: t('settings.notifications.updatesDesc') },
                { id: 'tips', label: t('settings.notifications.tips'), desc: t('settings.notifications.tipsDesc') },
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
            <h3 className="font-semibold mb-4">{t('settings.security.changePassword')}</h3>
            <div className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="current">{t('settings.security.currentPassword')}</Label>
                <Input
                  id="current"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new">{t('settings.security.newPassword')}</Label>
                <Input
                  id="new"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">{t('settings.security.confirmPassword')}</Label>
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
                    {t('common.saving')}
                  </>
                ) : (
                  t('settings.security.updateButton')
                )}
              </Button>
            </div>
          </div>

          <div className="p-6 rounded-xl border border-destructive/30 bg-destructive/5">
            <h3 className="font-semibold mb-2 text-destructive">{t('settings.security.deleteAccount')}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('settings.security.deleteWarning')}
            </p>
            <Button variant="destructive">{t('settings.security.deleteButton')}</Button>
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
            <h3 className="font-semibold mb-4">{t('settings.appearance.language')}</h3>
            <select
              className="w-full max-w-xs h-10 px-3 rounded-md border border-input bg-background text-sm"
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
            >
              <option value="tr">🇹🇷 Türkçe</option>
              <option value="en">🇬🇧 English</option>
            </select>
          </div>
        </motion.div>
      )}
    </div>
  );
}
