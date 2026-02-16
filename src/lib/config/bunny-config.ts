// Bunny Stream configuration
// All secrets read from environment variables — never hardcoded.

export interface BunnyConfig {
    libraryId: string;
    apiKey: string;
    embedBase: string;
    cdnHostname: string;
}

/**
 * Check if Bunny Stream is the active video delivery provider.
 */
export function isBunnyEnabled(): boolean {
    return process.env.VIDEO_DELIVERY_PROVIDER === 'bunny';
}

/**
 * Get the current video delivery provider.
 */
export function getVideoProvider(): 'fal' | 'bunny' {
    return isBunnyEnabled() ? 'bunny' : 'fal';
}

/**
 * Get Bunny Stream configuration from environment variables.
 * Throws if required vars are missing when Bunny is enabled.
 */
export function getBunnyConfig(): BunnyConfig {
    const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
    const apiKey = process.env.BUNNY_STREAM_API_KEY;
    const embedBase = process.env.BUNNY_STREAM_EMBED_BASE || 'https://iframe.mediadelivery.net/embed';
    const cdnHostname = process.env.BUNNY_STREAM_CDN_HOSTNAME || '';

    if (!libraryId || !apiKey) {
        throw new Error(
            'Bunny Stream is enabled but BUNNY_STREAM_LIBRARY_ID and/or BUNNY_STREAM_API_KEY are not set.'
        );
    }

    return { libraryId, apiKey, embedBase, cdnHostname };
}
