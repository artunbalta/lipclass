// Bunny Stream API Service
// Documentation: https://docs.bunny.net/reference/video
//
// All secrets are read from environment variables via getBunnyConfig().
// This module is server-side only (uses Node fetch with streaming).

import { getBunnyConfig, type BunnyConfig } from '@/lib/config/bunny-config';

const BUNNY_API_BASE = 'https://video.bunnycdn.com';

// ── Types ──

export interface BunnyVideoCreateResponse {
    guid: string;
    title: string;
    libraryId: number;
}

export interface BunnyVideoStatus {
    guid: string;
    status: number; // 0=created, 1=uploaded, 2=processing, 3=transcoding, 4=finished, 5=error
    encodeProgress: number;
}

export interface BunnyIngestionResult {
    guid: string;
    embedUrl: string;
    hlsUrl: string;
    status: 'success' | 'failed';
    error?: string;
}

// ── Helpers ──

function getHeaders(config: BunnyConfig): Record<string, string> {
    return {
        'AccessKey': config.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };
}

/**
 * Make a request to the Bunny Stream API with error handling.
 */
async function bunnyRequest<T>(
    method: string,
    path: string,
    config: BunnyConfig,
    body?: Record<string, unknown>
): Promise<T> {
    const url = `${BUNNY_API_BASE}${path}`;

    console.log(`[BunnyStream] ${method} ${path}`);

    const response = await fetch(url, {
        method,
        headers: getHeaders(config),
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        const status = response.status;

        if (status === 401 || status === 403) {
            throw new Error(`[BunnyStream] Authentication failed (${status}). Check BUNNY_STREAM_API_KEY.`);
        }
        if (status === 404) {
            throw new Error(`[BunnyStream] Resource not found (${status}). Check BUNNY_STREAM_LIBRARY_ID. Path: ${path}`);
        }

        throw new Error(`[BunnyStream] API error (${status}): ${errorText}`);
    }

    return response.json();
}

// ── Public API ──

/**
 * Create a new video entry in Bunny Stream.
 * This reserves a GUID — the actual video bytes are uploaded separately.
 */
export async function createVideo(title: string): Promise<{ guid: string; libraryId: string }> {
    const config = getBunnyConfig();

    const result = await bunnyRequest<BunnyVideoCreateResponse>(
        'POST',
        `/library/${config.libraryId}/videos`,
        config,
        { title }
    );

    console.log(`[BunnyStream] Video created: guid=${result.guid}, title="${title}"`);

    return {
        guid: result.guid,
        libraryId: config.libraryId,
    };
}

/**
 * Upload a video binary buffer to a previously created Bunny video entry.
 * Uses PUT with the raw binary body.
 */
export async function uploadVideoBinary(guid: string, buffer: Buffer): Promise<void> {
    const config = getBunnyConfig();
    const url = `${BUNNY_API_BASE}/library/${config.libraryId}/videos/${guid}`;

    console.log(`[BunnyStream] Uploading binary to guid=${guid}, size=${buffer.length} bytes`);

    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'AccessKey': config.apiKey,
            'Content-Type': 'application/octet-stream',
        },
        body: new Uint8Array(buffer),
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new Error(`[BunnyStream] Upload failed (${response.status}): ${errorText}`);
    }

    console.log(`[BunnyStream] Upload complete for guid=${guid}`);
}

/**
 * Download a video from a source URL and upload it to Bunny Stream.
 *
 * Flow: Download from sourceUrl → buffer → PUT to Bunny.
 * TODO: If videos are very large (>500MB), switch to streaming pipeline
 * to avoid memory pressure. Current lipsync clips are small (~10-30s each).
 */
export async function ingestFromUrl(
    sourceUrl: string,
    title: string
): Promise<BunnyIngestionResult> {
    const config = getBunnyConfig();
    const startTime = Date.now();

    console.log(`[BunnyStream] Ingesting from URL: ${sourceUrl.substring(0, 80)}...`);

    try {
        // Step 1: Create video entry in Bunny
        const { guid } = await createVideo(title);

        // Step 2: Download from source URL
        console.log(`[BunnyStream] Downloading source video...`);
        const downloadResponse = await fetch(sourceUrl);

        if (!downloadResponse.ok) {
            throw new Error(
                `[BunnyStream] Failed to download source video (${downloadResponse.status}): ${downloadResponse.statusText}`
            );
        }

        const arrayBuffer = await downloadResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2);

        console.log(`[BunnyStream] Downloaded ${sizeMB}MB, uploading to Bunny...`);

        // Step 3: Upload to Bunny
        await uploadVideoBinary(guid, buffer);

        // Step 4: Build URLs
        const embedUrl = `${config.embedBase}/${config.libraryId}/${guid}`;
        const hlsUrl = config.cdnHostname
            ? `https://${config.cdnHostname}/${guid}/playlist.m3u8`
            : '';

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[BunnyStream] Ingestion complete in ${elapsed}s: guid=${guid}, size=${sizeMB}MB`);

        return {
            guid,
            embedUrl,
            hlsUrl,
            status: 'success',
        };
    } catch (error) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const errorMessage = error instanceof Error ? error.message : String(error);

        console.error(`[BunnyStream] Ingestion failed after ${elapsed}s: ${errorMessage}`);

        return {
            guid: '',
            embedUrl: '',
            hlsUrl: '',
            status: 'failed',
            error: errorMessage,
        };
    }
}

/**
 * Get the embed URL for a Bunny video.
 */
export function getEmbedUrl(guid: string): string {
    const config = getBunnyConfig();
    return `${config.embedBase}/${config.libraryId}/${guid}`;
}

/**
 * Get the HLS playlist URL for a Bunny video.
 * Returns empty string if CDN hostname is not configured.
 */
export function getHlsUrl(guid: string): string {
    const config = getBunnyConfig();
    if (!config.cdnHostname) return '';
    return `https://${config.cdnHostname}/${guid}/playlist.m3u8`;
}

/**
 * Get the status of a video in Bunny Stream.
 */
export async function getVideoStatus(guid: string): Promise<BunnyVideoStatus> {
    const config = getBunnyConfig();
    return bunnyRequest<BunnyVideoStatus>(
        'GET',
        `/library/${config.libraryId}/videos/${guid}`,
        config
    );
}
