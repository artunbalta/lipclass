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

        // Max 20 MB
        if (file.size > 20 * 1024 * 1024) {
            return NextResponse.json(
                { error: 'Dosya boyutu 20MB\'dan büyük olamaz.' },
                { status: 400 }
            );
        }

        const supabase = getSupabaseAdmin();

        // Generate unique filename
        const ext = file.name.split('.').pop() || 'pdf';
        const storagePath = `${teacherId}/${Date.now()}.${ext}`;

        // Upload to Supabase Storage
        const buffer = Buffer.from(await file.arrayBuffer());
        const { error: uploadError } = await supabase.storage
            .from('teacher-documents')
            .upload(storagePath, buffer, {
                contentType: file.type,
                upsert: false,
            });

        if (uploadError) {
            throw new Error(`Storage upload failed: ${uploadError.message}`);
        }

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
            // Cleanup: remove uploaded file
            await supabase.storage.from('teacher-documents').remove([storagePath]);
            throw new Error(`Database insert failed: ${dbError.message}`);
        }

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
