import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ingestFromUrl, getHlsUrl } from '@/lib/api/bunny-stream';
import { isBunnyEnabled } from '@/lib/config/bunny-config';
import { Slide, Video, SlidesData } from '@/types';

// Create a direct Supabase client with service role key to bypass RLS
// This is an admin route, so we need full access.
export const maxDuration = 300; // 5 minutes max execution time (Vercel/Next.js limit)

export async function GET(request: NextRequest) {
    console.log('[Backfill] Request received');

    try {
        // 0. Initialize Supabase Client dynamically
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('[Backfill] Missing Supabase env vars');
            return NextResponse.json(
                { error: 'Server misconfiguration: Missing Supabase URL or Service Role Key' },
                { status: 500 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Security Check
        const authHeader = request.headers.get('authorization');
        const secret = process.env.ADMIN_API_SECRET || 'temp_admin_secret';

        // Simple Bearer token check or query param
        const { searchParams } = new URL(request.url);
        const key = searchParams.get('key');

        if (key !== secret && authHeader !== `Bearer ${secret}`) {
            console.warn(`[Backfill] Unauthorized access attempt. Key provided: ${key ? '***' : 'none'}`);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Feature Flag Check
        if (!isBunnyEnabled()) {
            return NextResponse.json(
                { error: 'Bunny Stream is not enabled. Set VIDEO_DELIVERY_PROVIDER=bunny.' },
                { status: 400 }
            );
        }

        // 3. Fetch Candidate Videos
        // We fetch videos that are EITHER partially migrated OR fully migrated (to repair URLs)
        // Actually, let's just fetch recent videos and check them.
        const limit = parseInt(searchParams.get('limit') || '5', 10);
        const dryRun = searchParams.get('dryRun') === 'true';

        console.log(`[Backfill] Starting batch (dryRun=${dryRun}, limit=${limit})`);

        const { data: videos, error } = await supabase
            .from('videos')
            .select('*')
            // remove .neq constraint to allow re-checking migrated videos for repair
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        if (!videos || videos.length === 0) {
            return NextResponse.json({ message: 'No videos found' });
        }

        const results = [];

        // 4. Process Each Video
        for (const video of videos) {
            const dbVideo = video as any; // Raw DB row
            const slidesData = dbVideo.slides_data as SlidesData;

            if (!slidesData || !slidesData.slides || slidesData.slides.length === 0) {
                results.push({ id: video.id, status: 'skipped', reason: 'no_slides' });
                continue;
            }

            let updated = false;
            let successCount = 0; // successfully ingested or repaired
            let failCount = 0;

            // Process Slides
            const updatedSlides: Slide[] = [];
            const slides = slidesData.slides || [];

            for (const slide of slides) {
                let slideChanged = false;

                // 1. Repair Mode: Fix existing Iframe URLs to HLS URLs
                // If we have a GUID but the URL is an iframe URL (contains 'iframe.mediadelivery.net')
                if (slide.bunnyVideoGuid && slide.bunnyEmbedUrl && slide.bunnyEmbedUrl.includes('iframe.mediadelivery.net')) {
                    const hlsUrl = getHlsUrl(slide.bunnyVideoGuid);
                    if (hlsUrl) {
                        console.log(`[Backfill] Fixing URL for slide ${slide.slideNumber}: ${slide.bunnyEmbedUrl} -> ${hlsUrl}`);
                        slide.bunnyEmbedUrl = hlsUrl;
                        slideChanged = true;
                        updated = true;
                        successCount++; // Count as success (repair)
                    }
                }

                // 2. Ingestion Mode: If slide has a video URL but no Bunny GUID, ingest it
                if (slide.videoUrl && !slide.bunnyVideoGuid) {
                    try {
                        const title = `${dbVideo.title || 'Lesson'} - Slide ${slide.slideNumber}`;

                        if (dryRun) {
                            console.log(`[Backfill] [DryRun] Would ingest: ${title}`);
                            updatedSlides.push({ ...slide }); // No change in dry run
                            updated = true; // Would update
                            successCount++;
                        } else {
                            console.log(`[Backfill] Ingesting slide: ${title}`);
                            const ingestion = await ingestFromUrl(slide.videoUrl, title);

                            if (ingestion.status === 'success') {
                                updatedSlides.push({
                                    ...slide,
                                    bunnyVideoGuid: ingestion.guid,
                                    bunnyEmbedUrl: ingestion.hlsUrl, // Use HLS URL!
                                });
                                updated = true;
                                successCount++;
                            } else {
                                updatedSlides.push(slide); // Keep original if failed
                                failCount++;
                                console.error(`[Backfill] Failed to ingest slide ${slide.slideNumber}:`, ingestion.error);
                            }
                        }
                    } catch (err) {
                        updatedSlides.push(slide);
                        failCount++;
                        console.error(`[Backfill] Error processing slide ${slide.slideNumber}:`, err);
                    }
                } else {
                    // If slide changed (repair), push the modified slide.
                    // If not changed, push original.
                    updatedSlides.push(slide);
                }
            }

            // 5. Update Database Record
            if (updated) {
                const isComplete = failCount === 0;

                if (dryRun) {
                    results.push({
                        id: video.id,
                        status: 'dry_run_success',
                        would_migrate_slides: successCount
                    });
                } else {
                    const { error: updateError } = await supabase
                        .from('videos')
                        .update({
                            slides_data: { ...slidesData, slides: updatedSlides },
                            video_provider: isComplete ? 'bunny' : 'fal', // Ensure fully migrated
                            bunny_ingestion_status: isComplete ? 'success' : 'partial',
                            bunny_ingested_at: new Date().toISOString(),
                        })
                        .eq('id', video.id);

                    if (updateError) {
                        results.push({ id: video.id, status: 'db_update_failed', error: updateError.message });
                    } else {
                        results.push({
                            id: video.id,
                            status: isComplete ? 'migrated_or_repaired' : 'partial_migration',
                            slides_migrated: successCount,
                            slides_failed: failCount
                        });
                    }
                }
            } else {
                results.push({ id: video.id, status: 'no_changes', reason: 'already_correct' });
            }
        }

        return NextResponse.json({
            dryRun,
            processed: videos.length,
            results,
        });

    } catch (error) {
        console.error('[Backfill] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
