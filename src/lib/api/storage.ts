import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export type Bucket = 'reference-videos' | 'generated-videos' | 'thumbnails';

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(
  bucket: Bucket,
  file: File,
  path: string,
  options?: {
    onProgress?: (progress: number) => void;
  }
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

/**
 * Get public URL for a file in storage
 */
export function getPublicUrl(bucket: Bucket, path: string): string {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return data.publicUrl;
}

/**
 * Delete a file from storage
 */
export async function deleteFile(bucket: Bucket, path: string): Promise<void> {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Create a signed URL for a storage path (works with private buckets)
 */
export async function createSignedUrl(
  bucket: Bucket,
  path: string,
  expiresIn = 3600
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    console.error('createSignedUrl error:', error);
    return null;
  }
  return data?.signedUrl ?? null;
}

/**
 * Upload reference video for a teacher
 */
export async function uploadReferenceVideo(userId: string, file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}.${fileExt}`;
  
  return uploadFile('reference-videos', file, fileName);
}

/**
 * Upload generated video
 */
export async function uploadGeneratedVideo(userId: string, videoId: string, file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${videoId}.${fileExt}`;
  
  return uploadFile('generated-videos', file, fileName);
}

/**
 * Upload thumbnail
 */
export async function uploadThumbnail(userId: string, videoId: string, file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${videoId}.${fileExt}`;
  
  return uploadFile('thumbnails', file, fileName);
}

/**
 * Get reference video URL for a teacher (signed, works with private buckets)
 * Returns the most recent reference video URL
 */
export async function getReferenceVideoUrl(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from('reference-videos')
      .list(userId, { limit: 50 });

    if (error || !data || data.length === 0) {
      console.warn('[Storage] No reference videos found for user:', userId);
      return null;
    }

    // Sort by created_at descending and pick the latest
    const sorted = [...data].sort(
      (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
    const path = `${userId}/${sorted[0].name}`;
    const signed = await createSignedUrl('reference-videos', path);
    console.log('[Storage] Reference video signed URL:', signed ? 'OK' : 'FAILED');
    return signed;
  } catch (error) {
    console.error('Error getting reference video URL:', error);
    return null;
  }
}
