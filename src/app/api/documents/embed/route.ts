import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { embedDocument, isRagConfigured } from '@/lib/api/rag';

/**
 * Embedding API
 * POST – Parse a document, create embeddings, store in Pinecone
 */

function getSupabaseAdmin() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('Supabase is not configured');
    return createClient(url, key);
}

export async function POST(request: NextRequest) {
    try {
        if (!isRagConfigured()) {
            return NextResponse.json(
                { error: 'RAG services are not configured. Please add PINECONE_API_KEY, PINECONE_INDEX, and OPENAI_API_KEY to your environment.' },
                { status: 503 }
            );
        }

        const { documentId, teacherId } = await request.json();

        if (!documentId || !teacherId) {
            return NextResponse.json(
                { error: 'documentId and teacherId are required' },
                { status: 400 }
            );
        }

        const supabase = getSupabaseAdmin();

        // Fetch document record
        const { data: doc, error: fetchError } = await supabase
            .from('teacher_documents')
            .select('*')
            .eq('id', documentId)
            .eq('teacher_id', teacherId)
            .single();

        if (fetchError || !doc) {
            return NextResponse.json(
                { error: 'Döküman bulunamadı' },
                { status: 404 }
            );
        }

        // Update status to processing
        await supabase
            .from('teacher_documents')
            .update({ status: 'processing' })
            .eq('id', documentId);

        try {
            // Download file from storage
            const { data: fileData, error: downloadError } = await supabase.storage
                .from('teacher-documents')
                .download(doc.storage_path);

            if (downloadError || !fileData) {
                throw new Error(`File download failed: ${downloadError?.message || 'No data'}`);
            }

            // Convert to buffer
            const arrayBuffer = await fileData.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Run the full embedding pipeline
            const chunkCount = await embedDocument(
                buffer,
                doc.mime_type || 'application/pdf',
                teacherId,
                documentId,
                doc.original_name
            );

            // Update status to embedded
            await supabase
                .from('teacher_documents')
                .update({
                    status: 'embedded',
                    chunk_count: chunkCount,
                })
                .eq('id', documentId);

            console.log(`[Embed] Document ${documentId} embedded: ${chunkCount} chunks`);

            return NextResponse.json({
                success: true,
                chunkCount,
                documentId,
            });
        } catch (embedError) {
            // Mark as failed
            await supabase
                .from('teacher_documents')
                .update({ status: 'failed' })
                .eq('id', documentId);

            throw embedError;
        }
    } catch (error) {
        console.error('[Embed] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Embedding failed' },
            { status: 500 }
        );
    }
}
