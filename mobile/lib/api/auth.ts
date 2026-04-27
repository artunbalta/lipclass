import { supabase } from '../supabase/client';
import { User, Teacher, Student } from '@/types';

export async function signIn(email: string, password: string): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('Giriş başarısız');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (profileError) throw new Error('Profil bilgileri alınamadı');

  return mapProfileToUser(profile);
}

export async function signUp(data: {
  email: string;
  password: string;
  name: string;
  role: 'teacher' | 'student';
  school?: string;
  subject?: string;
  grade?: string;
}): Promise<User> {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        name: data.name,
        role: data.role,
        school: data.school,
        subject: data.subject,
        grade: data.grade,
      },
    },
  });

  if (authError) throw new Error(authError.message);
  if (!authData.user) throw new Error('Kayıt başarısız');

  const identities = (authData.user as any).identities;
  if (identities && Array.isArray(identities) && identities.length === 0) {
    throw new Error('Bu e-posta adresi zaten kullanımda.');
  }

  await new Promise((r) => setTimeout(r, 1000));

  let retries = 3;
  while (retries > 0) {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        school: data.school || null,
        subject: data.subject || null,
        grade: data.grade || null,
      })
      .eq('id', authData.user.id);

    if (!updateError) break;
    retries--;
    if (retries > 0) await new Promise((r) => setTimeout(r, 500));
  }

  let profile = null;
  let profileRetries = 3;
  while (profileRetries > 0) {
    const { data: p, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (!profileError && p) {
      profile = p;
      break;
    }
    profileRetries--;
    if (profileRetries > 0) await new Promise((r) => setTimeout(r, 500));
  }

  if (!profile) throw new Error('Profil oluşturulamadı. Lütfen tekrar giriş yapın.');

  return mapProfileToUser(profile);
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !profile) return null;

  return mapProfileToUser(profile);
}

export async function updateProfile(userId: string, updates: Partial<Teacher | Student>): Promise<User> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  return mapProfileToUser(data);
}

export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}

export async function resetPassword(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'chalk://reset-password',
  });
  if (error) throw new Error(error.message);
}

export async function uploadAvatar(userId: string, uri: string): Promise<string> {
  const ext = uri.split('.').pop() ?? 'jpg';
  const filePath = `${userId}/avatar.${ext}`;

  const response = await fetch(uri);
  const blob = await response.blob();

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, blob, { contentType: `image/${ext}`, upsert: true });

  if (uploadError) throw new Error(uploadError.message);

  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
  const avatarUrl = urlData.publicUrl;

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', userId);

  if (updateError) throw new Error(updateError.message);

  return avatarUrl;
}

function mapProfileToUser(profile: any): User {
  const base = {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role as 'teacher' | 'student',
    avatar: profile.avatar_url ?? undefined,
    school: profile.school ?? undefined,
    createdAt: new Date(profile.created_at),
  };

  if (profile.role === 'teacher') {
    return {
      ...base,
      role: 'teacher',
      subject: profile.subject || 'Matematik',
      referenceVideoUrl: profile.reference_video_url ?? undefined,
      referenceVideoStatus: (profile.reference_video_status || 'none') as 'none' | 'processing' | 'ready',
      bio: profile.bio ?? undefined,
    } as Teacher;
  }

  return {
    ...base,
    role: 'student',
    grade: profile.grade || '8',
    savedVideos: profile.saved_videos || [],
    watchedVideos: profile.watched_videos || [],
  } as Student;
}
