import { TeacherDocument } from '@/types';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? '';

export async function getDocuments(teacherId: string): Promise<TeacherDocument[]> {
  const res = await fetch(`${API_BASE}/api/documents?teacherId=${teacherId}`);
  if (!res.ok) throw new Error('Dökümanlar alınamadı');
  const data = await res.json();
  return data.documents || [];
}

export async function uploadDocument(
  teacherId: string,
  uri: string,
  name: string,
  mimeType: string
): Promise<TeacherDocument> {
  const formData = new FormData();

  formData.append('file', {
    uri,
    name,
    type: mimeType,
  } as any);
  formData.append('teacherId', teacherId);

  const res = await fetch(`${API_BASE}/api/documents`, {
    method: 'POST',
    body: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Döküman yüklenemedi');
  }

  const data = await res.json();
  return data.document;
}

export async function deleteDocument(documentId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/documents?id=${documentId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Döküman silinemedi');
}
