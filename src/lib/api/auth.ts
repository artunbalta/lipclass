import { createClient } from '@/lib/supabase/client';
import { User, Teacher, Student } from '@/types';

const supabase = createClient();

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error('Giriş başarısız');
  }

  // Fetch user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (profileError) {
    throw new Error('Profil bilgileri alınamadı');
  }

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
}) {
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

  if (authError) {
    throw new Error(authError.message);
  }

  if (!authData.user) {
    throw new Error('Kayıt başarısız');
  }

  // Supabase returns a user with empty identities when email already exists
  // (instead of an error) when email confirmation is enabled
  const identities = (authData.user as any).identities;
  if (identities && Array.isArray(identities) && identities.length === 0) {
    throw new Error('Bu e-posta adresi zaten kullanımda.');
  }

  // Wait briefly for the database trigger to create the profile
  await new Promise((r) => setTimeout(r, 1000));

  // Update profile with additional data (retry up to 3 times for trigger timing)
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
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 500));
    } else {
      console.error('Profile update error after retries:', updateError);
    }
  }

  // Fetch updated profile (retry for trigger timing)
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
    if (profileRetries > 0) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  if (!profile) {
    throw new Error('Profil oluşturulamadı. Lütfen tekrar giriş yapın.');
  }

  return mapProfileToUser(profile);
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    return null;
  }

  return mapProfileToUser(profile);
}

export async function updateProfile(userId: string, updates: Partial<Teacher | Student>) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapProfileToUser(data);
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function uploadAvatar(userId: string, file: File) {
  const fileExt = file.name.split('.').pop();
  const filePath = `${userId}/avatar.${fileExt}`;

  // Upload to Supabase storage
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  const avatarUrl = urlData.publicUrl;

  // Update profile with new avatar URL
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', userId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return avatarUrl;
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });

  if (error) {
    throw new Error(error.message);
  }
}

// Helper function to map database profile to User type
function mapProfileToUser(profile: any): User {
  const baseUser = {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role as 'teacher' | 'student',
    avatar: profile.avatar_url || undefined,
    school: profile.school || undefined,
    createdAt: new Date(profile.created_at),
  };

  if (profile.role === 'teacher') {
    return {
      ...baseUser,
      role: 'teacher',
      subject: profile.subject || 'Matematik',
      referenceVideoUrl: profile.reference_video_url || undefined,
      referenceVideoStatus: (profile.reference_video_status || 'none') as 'none' | 'processing' | 'ready',
      bio: profile.bio || undefined,
    } as Teacher;
  } else {
    return {
      ...baseUser,
      role: 'student',
      grade: profile.grade || '8. Sınıf',
      savedVideos: profile.saved_videos || [],
      watchedVideos: profile.watched_videos || [],
    } as Student;
  }
}
