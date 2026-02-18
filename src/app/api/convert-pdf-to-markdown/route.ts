import { NextRequest, NextResponse } from 'next/server';
import { convertPdfToMarkdown, isOCRConfigured } from '@/lib/api/ocr';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase is not configured');
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  try {
    if (!isOCRConfigured()) {
      return NextResponse.json(
        { error: 'OCR is not configured. MISTRAL_API_KEY is missing.' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { storagePath, fileName } = body;

    if (!storagePath || !fileName) {
      return NextResponse.json(
        { error: 'storagePath and fileName are required' },
        { status: 400 }
      );
    }

    // Create a signed URL for the file in Storage
    const supabase = getSupabaseAdmin();
    const { data: signedData, error: signError } = await supabase.storage
      .from('quiz-documents')
      .createSignedUrl(storagePath, 600); // 10 minutes

    if (signError || !signedData?.signedUrl) {
      return NextResponse.json(
        { error: `Failed to create signed URL: ${signError?.message || 'Unknown error'}` },
        { status: 500 }
      );
    }

    // Run Mistral OCR
    const result = await convertPdfToMarkdown(signedData.signedUrl, fileName);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[OCR] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'OCR processing failed' },
      { status: 500 }
    );
  }
}
