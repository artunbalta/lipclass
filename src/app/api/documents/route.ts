import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Document management API
 * POST   – Upload a document to Supabase Storage + create DB record
 * GET    – List teacher's documents
 * DELETE – Remove document (Storage + DB)
 */

function getSupabaseAdmin() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('Supabase is not configured');
    return createClient(url, key);
}

// ── POST: Upload document ──────────────────────────────────────────────────

export async function POST(request: NextRequest) {
    try {
        console.log('[Documents] Upload request started');
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const teacherId = formData.get('teacherId') as string | null;

        if (!file || !teacherId) {
            console.error('[Documents] Missing file or teacherId');
            return NextResponse.json(
                { error: 'file and teacherId are required' },
                { status: 400 }
            );
        }

        console.log('[Documents] File received:', {
            name: file.name,
            type: file.type,
            size: file.size,
            teacherId
        });

        // Validate file type
        const allowedTypes = [
            'application/pdf',
            'text/plain',
            'text/markdown',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        if (!allowedTypes.includes(file.type)) {
            console.error('[Documents] Invalid file type:', file.type);
            return NextResponse.json(
                { error: 'Desteklenmeyen dosya formatı. PDF, TXT veya DOCX yükleyin.' },
                { status: 400 }
            );
        }

        // Max 200 MB
        if (file.size > 200 * 1024 * 1024) {
            console.error('[Documents] File too large:', file.size);
            return NextResponse.json(
                { error: 'Dosya boyutu 200MB\'dan büyük olamaz.' },
                { status: 400 }
            );
        }

        const supabase = getSupabaseAdmin();

        // Generate unique filename with sanitized extension
        const originalName = file.name;
        // Get extension, default to bin if missing. Lowercase it.
        const ext = (originalName.split('.').pop() || 'bin').toLowerCase();
        // Sanitize extension to be safe (alphanumeric only)
        const safeExt = ext.replace(/[^a-z0-9]/g, '');

        // Create storage path
        const storagePath = `${teacherId}/${Date.now()}.${safeExt}`;

        console.log('[Documents] Uploading to storage:', storagePath);

        // Upload to Supabase Storage
        let buffer: Buffer;
        try {
            const arrayBuffer = await file.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
        } catch (err) {
            console.error('[Documents] Failed to convert file to buffer:', err);
            throw new Error('Dosya okunamadı');
        }

        const { error: uploadError } = await supabase.storage
            .from('teacher-documents')
            .upload(storagePath, buffer, {
                contentType: file.type,
                upsert: false,
            });

        if (uploadError) {
            console.error('[Documents] Storage upload failed:', uploadError);
            throw new Error(`Storage upload failed: ${uploadError.message}`);
        }

        console.log('[Documents] Storage upload successful');

        // Create DB record
        const { data: doc, error: dbError } = await supabase
            .from('teacher_documents')
            .insert({
                teacher_id: teacherId,
                filename: storagePath,
                original_name: file.name,
                file_size: file.size,
                mime_type: file.type,
                storage_path: storagePath,
                status: 'uploaded',
            })
            .select()
            .single();

        if (dbError) {
            console.error('[Documents] Database insert failed:', dbError);
            // Cleanup: remove uploaded file
            await supabase.storage.from('teacher-documents').remove([storagePath]);
            throw new Error(`Database insert failed: ${dbError.message}`);
        }

        console.log('[Documents] Success:', doc.id);
        return NextResponse.json({ document: doc });
    } catch (error) {
        console.error('[Documents] Upload error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Upload failed' },
            { status: 500 }
        );
    }
}

// ── GET: List teacher's documents ──────────────────────────────────────────

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const teacherId = searchParams.get('teacherId');

        if (!teacherId) {
            return NextResponse.json(
                { error: 'teacherId query parameter is required' },
                { status: 400 }
            );
        }

        const supabase = getSupabaseAdmin();

        const { data, error } = await supabase
            .from('teacher_documents')
            .select('*')
            .eq('teacher_id', teacherId)
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(error.message);
        }

        return NextResponse.json({ documents: data || [] });
    } catch (error) {
        console.error('[Documents] List error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'List failed' },
            { status: 500 }
        );
    }
}

// ── DELETE: Remove a document ──────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const documentId = searchParams.get('documentId');

        if (!documentId) {
            return NextResponse.json(
                { error: 'documentId query parameter is required' },
                { status: 400 }
            );
        }

        const supabase = getSupabaseAdmin();

        // Fetch the document to get storage path
        const { data: doc, error: fetchError } = await supabase
            .from('teacher_documents')
            .select('*')
            .eq('id', documentId)
            .single();

        if (fetchError || !doc) {
            return NextResponse.json(
                { error: 'Döküman bulunamadı' },
                { status: 404 }
            );
        }

        // Delete from Pinecone vectors
        try {
            const { deleteDocumentVectors } = await import('@/lib/api/rag');
            await deleteDocumentVectors(documentId);
        } catch (err) {
            console.warn('[Documents] Pinecone cleanup failed:', err);
        }

        // Delete from storage
        await supabase.storage
            .from('teacher-documents')
            .remove([doc.storage_path]);

        // Delete from DB
        const { error: deleteError } = await supabase
            .from('teacher_documents')
            .delete()
            .eq('id', documentId);

        if (deleteError) {
            throw new Error(deleteError.message);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Documents] Delete error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Delete failed' },
            { status: 500 }
        );
    }
}
