/**
 * RAG (Retrieval-Augmented Generation) Service
 *
 * - Parses uploaded documents (PDF / TXT) with page awareness
 * - Splits text into overlapping chunks, preserving page numbers
 * - Extracts images from PDFs and stores them in Supabase
 * - Creates embeddings via OpenAI text-embedding-3-small
 * - Stores / retrieves vectors via Pinecone
 */

import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { extractImagesFromPdf, ExtractedImage } from '@/lib/pdf-image-extractor';

// ── Clients (lazy-initialized) ──────────────────────────────────────────────

let _pinecone: Pinecone | null = null;
let _openai: OpenAI | null = null;
let _supabase: SupabaseClient | null = null;

function getPinecone(): Pinecone {
    if (!_pinecone) {
        const apiKey = process.env.PINECONE_API_KEY;
        if (!apiKey) throw new Error('PINECONE_API_KEY is not configured');
        _pinecone = new Pinecone({ apiKey });
    }
    return _pinecone;
}

function getOpenAI(): OpenAI {
    if (!_openai) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');
        _openai = new OpenAI({ apiKey });
    }
    return _openai;
}

function getSupabaseAdmin(): SupabaseClient {
    if (!_supabase) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !key) throw new Error('Supabase URL or Service Role Key missing');
        _supabase = createClient(url, key, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
    }
    return _supabase;
}

function getPineconeIndex() {
    const indexName = process.env.PINECONE_INDEX || 'lipclass-docs';
    return getPinecone().index(indexName);
}

// ── Types ───────────────────────────────────────────────────────────────────

export interface TextChunk {
    id: string;
    text: string;
    metadata: {
        teacherId: string;
        documentId: string;
        chunkIndex: number;
        totalChunks: number;
        originalName: string;
        pageNumbers: number[]; // Pages this chunk spans
    };
}

// ── Document Parsing ────────────────────────────────────────────────────────

/**
 * Parse a file buffer into text with page markers.
 * Returns text with [[PAGE_1]], [[PAGE_2]] markers.
 */
export async function parseDocument(
    buffer: Buffer,
    mimeType: string
): Promise<string> {
    if (mimeType === 'application/pdf') {
        // Dynamic import to keep pdf-parse server-only
        const pdfParseModule = await import('pdf-parse');
        const pdfParse = (pdfParseModule as any).default || pdfParseModule;

        // Custom render to insert page markers
        const options = {
            pagerender: async (pageData: any) => {
                // Extract text from the page
                // pdf-parse default render logic simplified:
                const textContent = await pageData.getTextContent();
                let lastY, text = '';
                for (const item of textContent.items) {
                    if (lastY == item.transform[5] || !lastY) {
                        text += item.str;
                    }
                    else {
                        text += '\n' + item.str;
                    }
                    lastY = item.transform[5];
                }
                // Add Marker
                return `\n[[PAGE_${pageData.pageIndex + 1}]]\n${text}\n`;
            }
        };

        const result = await pdfParse(buffer, options);
        return result.text;
    }

    // Assume plain text for everything else (Page 1 default)
    return `[[PAGE_1]]\n${buffer.toString('utf-8')}`;
}

// ── Chunking ────────────────────────────────────────────────────────────────

/**
 * Split text into overlapping chunks, tracking page numbers.
 */
export function chunkText(
    text: string,
    documentId: string, // Needed to generate IDs
    chunkSize = 800,
    overlap = 200
): { text: string; pageNumbers: number[] }[] {
    // 1. Split by page markers first to map content to pages?
    // No, chunks can span pages. We need to tokenize and track current page.

    // Regex to find markers
    const pageMarkerRegex = /\[\[PAGE_(\d+)\]\]/g;

    // We'll clean the text but keep a map of character index -> page number
    let cleanText = '';
    const pageMap: { start: number; page: number }[] = [];

    let lastIndex = 0;
    let match;
    let currentPage = 1;

    // Reset regex
    pageMarkerRegex.lastIndex = 0;

    while ((match = pageMarkerRegex.exec(text)) !== null) {
        // Text before marker
        const preText = text.slice(lastIndex, match.index);
        if (preText) {
            cleanText += preText;
        }

        // Record new page logic
        // The marker [[PAGE_X]] indicates the START of Page X
        currentPage = parseInt(match[1], 10);
        pageMap.push({ start: cleanText.length, page: currentPage });

        lastIndex = pageMarkerRegex.lastIndex;
    }
    // Remaining text
    cleanText += text.slice(lastIndex);

    // Now chunk the clean text
    const chunks: { text: string; pageNumbers: number[] }[] = [];
    cleanText = cleanText.replace(/\s+/g, ' ').trim();

    if (cleanText.length <= chunkSize) {
        return [{ text: cleanText, pageNumbers: getPagesForRange(0, cleanText.length, pageMap) }];
    }

    let start = 0;
    while (start < cleanText.length) {
        const end = Math.min(start + chunkSize, cleanText.length);
        const chunkContent = cleanText.slice(start, end);

        const pages = getPagesForRange(start, end, pageMap);
        chunks.push({ text: chunkContent, pageNumbers: pages });

        start += chunkSize - overlap;
    }

    return chunks;
}

function getPagesForRange(start: number, end: number, pageMap: { start: number; page: number }[]): number[] {
    // Find all pages that overlap with [start, end]
    // pageMap tells us where each page STARTS in the clean text
    // E.g. [{start:0, page:1}, {start:500, page:2}, {start:1200, page:3}]

    const pages = new Set<number>();

    // Find the page active at 'start'
    let activePage = 1;
    for (const p of pageMap) {
        if (p.start <= start) activePage = p.page;
        else break;
    }
    pages.add(activePage);

    // Check if we cross into new pages
    for (const p of pageMap) {
        if (p.start > start && p.start < end) {
            pages.add(p.page);
        }
    }

    return Array.from(pages).sort((a, b) => a - b);
}

// ── Embedding ───────────────────────────────────────────────────────────────

export async function createEmbeddings(texts: string[]): Promise<number[][]> {
    const openai = getOpenAI();
    const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts,
    });
    return response.data.map((item) => item.embedding);
}

// ── Pinecone Operations ─────────────────────────────────────────────────────

export async function upsertToPinecone(
    chunks: TextChunk[],
    embeddings: number[][]
): Promise<void> {
    const index = getPineconeIndex();

    const vectors = chunks.map((chunk, i) => ({
        id: chunk.id,
        values: embeddings[i],
        metadata: {
            ...chunk.metadata,
            text: chunk.text,
            // Pinecone metadata only supports string, number, boolean, or array of strings. 
            // Array of numbers is NOT supported? 
            // Actually Pinecone supports list of strings. We should convert pageNumbers to strings.
            pageNumbers: chunk.metadata.pageNumbers.map(String),
        },
    }));

    const BATCH_SIZE = 100;
    for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
        const batch = vectors.slice(i, i + BATCH_SIZE);
        await index.upsert({ records: batch });
    }
}

export async function deleteDocumentVectors(documentId: string): Promise<void> {
    const index = getPineconeIndex();
    try {
        await index.deleteMany({ filter: { documentId } });
    } catch {
        console.warn('[RAG] deleteMany with filter not supported');
    }

    // Also delete images from Supabase Storage and DB
    const supabase = getSupabaseAdmin();

    // 1. Get images to delete from Storage
    const { data: images } = await supabase
        .from('document_images')
        .select('storage_path')
        .eq('document_id', documentId);

    if (images && images.length > 0) {
        const paths = images.map(img => img.storage_path);
        await supabase.storage.from('teacher-documents').remove(paths);
    }

    // 2. Delete DB records (cascade should handle this if document deleted, but good to be explicit)
    await supabase.from('document_images').delete().eq('document_id', documentId);
}

// ── Context Retrieval ───────────────────────────────────────────────────────

export async function retrieveContext(
    query: string,
    teacherId: string,
    documentIds?: string[],
    topK = 8
): Promise<string> {
    const [queryEmbedding] = await createEmbeddings([query]);
    const index = getPineconeIndex();

    const filter: Record<string, unknown> = { teacherId };
    if (documentIds && documentIds.length > 0) {
        filter.documentId = { $in: documentIds };
    }

    const results = await index.query({
        vector: queryEmbedding,
        topK,
        includeMetadata: true,
        filter,
    });

    // 1. Collect text chunks
    const chunks = results.matches || [];

    // 2. Identify relevant pages for images
    const relevantDocPages: { docId: string; page: number }[] = [];

    chunks.forEach(m => {
        if (m.metadata?.documentId && m.metadata?.pageNumbers) {
            const docId = m.metadata.documentId as string;
            // pageNumbers comes back as list of strings from Pinecone
            const pages = Array.isArray(m.metadata.pageNumbers)
                ? m.metadata.pageNumbers.map(Number)
                : [Number(m.metadata.pageNumbers)];

            pages.forEach(p => {
                if (!isNaN(p)) relevantDocPages.push({ docId, page: p });
            });
        }
    });

    // 3. Fetch images for these pages from Supabase
    let imageContext = '';
    if (relevantDocPages.length > 0) {
        const supabase = getSupabaseAdmin();

        // Build OR query: (document_id.eq.X and page_index.eq.Y) ...
        // Simplification: Fetch all images for involved documents and filter in memory 
        // (assuming not too many images per doc)
        const uniqueDocIds = Array.from(new Set(relevantDocPages.map(dp => dp.docId)));

        const { data: images } = await supabase
            .from('document_images')
            .select('*')
            .in('document_id', uniqueDocIds);

        if (images) {
            // Filter strict matches (DocID + Page)
            const validImages = images.filter(img =>
                relevantDocPages.some(rp => rp.docId === img.document_id && rp.page === (img.page_index + 1))
            );

            // Deduplicate
            const uniqueImages = Array.from(new Set(validImages.map(i => i.id)))
                .map(id => validImages.find(i => i.id === id)!);

            if (uniqueImages.length > 0) {
                // Get public URLs
                imageContext = `\n\n[İLGİLİ GÖRSELLER]:\n`;
                for (const img of uniqueImages) {
                    const { data: { publicUrl } } = supabase
                        .storage
                        .from('teacher-documents')
                        .getPublicUrl(img.storage_path);

                    imageContext += `![Görsel (Sayfa ${img.page_index + 1})](${publicUrl})\n`;
                }
                imageContext += `(Yukarıdaki görselleri uygun olan slaytlara <img> etiketiyle ekle)\n`;
            }
        }
    }

    // 4. Format Output
    const textContext = chunks
        .filter((m) => m.metadata?.text)
        .map((m, i) => {
            const pages = m.metadata!.pageNumbers ? ` (Sayfa ${m.metadata!.pageNumbers})` : '';
            return `[Kaynak ${i + 1}${pages}] ${m.metadata!.text as string}`;
        })
        .join('\n\n');

    return textContext + imageContext;
}

// ── Embed Document Workflow ─────────────────────────────────────────────────

export async function embedDocument(
    buffer: Buffer,
    mimeType: string,
    teacherId: string,
    documentId: string,
    originalName: string
): Promise<number> {
    // 1. Parse text with page awareness
    const text = await parseDocument(buffer, mimeType);
    if (!text || text.trim().length === 0) {
        throw new Error('Döküman boş veya okunamıyor');
    }

    // 2. Extract and Upload Images (if PDF)
    if (mimeType === 'application/pdf') {
        try {
            const extractedImages = await extractImagesFromPdf(buffer);
            if (extractedImages.length > 0) {
                const supabase = getSupabaseAdmin();

                for (const img of extractedImages) {
                    const storagePath = `${teacherId}/images/${documentId}/p${img.pageIndex}_i${img.imageIndex}.png`;

                    // Upload to Storage
                    await supabase.storage
                        .from('teacher-documents')
                        .upload(storagePath, img.data, {
                            contentType: img.mimeType,
                            upsert: true
                        });

                    // Save metadata to DB
                    await supabase.from('document_images').insert({
                        document_id: documentId,
                        teacher_id: teacherId,
                        page_index: img.pageIndex,
                        image_index: img.imageIndex,
                        storage_path: storagePath,
                        width: img.width,
                        height: img.height,
                    });
                }
                console.log(`[RAG] Extracted and stored ${extractedImages.length} images for ${documentId}`);
            }
        } catch (err) {
            console.error('[RAG] Image extraction failed (continuing with text only):', err);
        }
    }

    // 3. Chunk
    const chunkData = chunkText(text, documentId);

    // 4. Build TextChunk objects
    const chunks: TextChunk[] = chunkData.map((c, i) => ({
        id: `${documentId}_chunk_${i}`,
        text: c.text,
        metadata: {
            teacherId,
            documentId,
            chunkIndex: i,
            totalChunks: chunkData.length,
            originalName,
            pageNumbers: c.pageNumbers,
        },
    }));

    // 5. Embed
    const embeddings = await createEmbeddings(chunkData.map(c => c.text));

    // 6. Upsert
    await upsertToPinecone(chunks, embeddings);

    return chunks.length;
}

export function isRagConfigured(): boolean {
    return !!(
        process.env.PINECONE_API_KEY &&
        process.env.OPENAI_API_KEY &&
        process.env.PINECONE_INDEX
    );
}
