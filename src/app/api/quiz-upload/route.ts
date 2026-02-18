import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseDocument } from '@/lib/api/rag';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase is not configured');
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const teacherId = formData.get('teacherId') as string | null;

    if (!file || !teacherId) {
      return NextResponse.json(
        { error: 'file and teacherId are required' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'text/markdown',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Desteklenmeyen dosya formatı. PDF, TXT veya DOCX yükleyin.' },
        { status: 400 }
      );
    }

    // Max 200 MB
    if (file.size > 200 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Dosya boyutu 200MB\'dan büyük olamaz.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Generate storage path
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
    const storagePath = `${teacherId}/${Date.now()}.${ext}`;

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('quiz-documents')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Attempt text extraction
    let extractedText = '';
    let needsOcr = false;

    try {
      const text = await parseDocument(buffer, file.type);
      // Strip page markers and check if there's actual content
      const cleanText = text.replace(/\[\[PAGE_\d+\]\]/g, '').trim();
      if (cleanText.length > 50) {
        extractedText = text;
      } else {
        needsOcr = file.type === 'application/pdf';
      }
    } catch {
      needsOcr = file.type === 'application/pdf';
    }

    return NextResponse.json({
      storagePath,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      extractedText,
      needsOcr,
    });
  } catch (error) {
    console.error('[Quiz Upload] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
