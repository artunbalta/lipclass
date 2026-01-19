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
 * Get reference video URL for a teacher
 * Returns the most recent reference video URL
 */
export async function getReferenceVideoUrl(userId: string): Promise<string | null> {
  try {
    // List files in reference-videos bucket for this user
    const { data, error } = await supabase.storage
      .from('reference-videos')
      .list(userId, {
        limit: 1,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error || !data || data.length === 0) {
      return null;
    }

    // Get the most recent file
    const latestFile = data[0];
    const publicUrl = getPublicUrl('reference-videos', `${userId}/${latestFile.name}`);
    
    return publicUrl;
  } catch (error) {
    console.error('Error getting reference video URL:', error);
    return null;
  }
}
