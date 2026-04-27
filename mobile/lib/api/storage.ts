import { supabase } from '../supabase/client';

export type Bucket = 'reference-videos' | 'generated-videos' | 'thumbnails' | 'avatars';

export async function uploadFile(
  bucket: Bucket,
  uri: string,
  path: string,
  contentType: string
): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, { contentType, upsert: true });

  if (error) throw new Error(error.message);

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return urlData.publicUrl;
}

export async function createSignedUrl(
  bucket: Bucket,
  path: string,
  expiresIn = 3600
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) return null;
  return data?.signedUrl ?? null;
}

export async function uploadReferenceVideo(userId: string, uri: string): Promise<string> {
  const ext = uri.split('.').pop() ?? 'mp4';
  const fileName = `${userId}/${Date.now()}.${ext}`;
  return uploadFile('reference-videos', uri, fileName, `video/${ext}`);
}

export async function getReferenceVideoUrl(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from('reference-videos')
      .list(userId, { limit: 50 });

    if (error || !data || data.length === 0) return null;

    const sorted = [...data].sort(
      (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
    const path = `${userId}/${sorted[0].name}`;
    return createSignedUrl('reference-videos', path);
  } catch {
    return null;
  }
}

export async function updateReferenceVideoStatus(
  userId: string,
  status: 'none' | 'processing' | 'ready'
): Promise<void> {
  await supabase
    .from('profiles')
    .update({ reference_video_status: status })
    .eq('id', userId);
}
