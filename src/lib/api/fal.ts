// Fal AI API Client
// Documentation: https://fal.ai/docs

const FAL_API_BASE = 'https://fal.run';

export interface FalApiOptions {
  apiKey?: string;
}

export interface LLMResponse {
  text: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface TTSResponse {
  audio_url: string;
  duration?: number;
}

export interface LipsyncResponse {
  video_url: string;
  duration?: number;
}

/**
 * Get Fal AI API key from environment
 */
function getApiKey(): string {
  const key = process.env.NEXT_PUBLIC_FAL_KEY || process.env.FAL_KEY;
  if (!key) {
    throw new Error('FAL_KEY is not configured. Please add it to your environment variables.');
  }
  return key;
}

/**
 * Make a request to Fal AI API
 */
async function falRequest<T>(
  modelPath: string,
  body: Record<string, any>,
  options?: FalApiOptions
): Promise<T> {
  const apiKey = options?.apiKey || getApiKey();
  
  const response = await fetch(`${FAL_API_BASE}/${modelPath}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Key ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(`Fal AI API error: ${error.message || response.statusText}`);
  }

  return response.json();
}

/**
 * Poll for async job completion
 */
async function pollJobStatus<T>(
  jobUrl: string,
  options?: FalApiOptions,
  maxAttempts = 60,
  intervalMs = 2000
): Promise<T> {
  const apiKey = options?.apiKey || getApiKey();
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(jobUrl, {
      headers: {
        'Authorization': `Key ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to check job status: ${response.statusText}`);
    }

    const data = await response.json();
    
    // If job is complete, return the result
    if (data.status === 'COMPLETED' && data.output) {
      return data.output;
    }
    
    // If job failed, throw error
    if (data.status === 'FAILED') {
      throw new Error(`Job failed: ${data.error || 'Unknown error'}`);
    }
    
    // Job is still processing, wait and retry
    if (data.status === 'IN_PROGRESS' || data.status === 'PENDING') {
      await new Promise(resolve => setTimeout(resolve, intervalMs));
      continue;
    }
    
    // Unknown status
    throw new Error(`Unknown job status: ${data.status}`);
  }
  
  throw new Error('Job timeout: Maximum attempts reached');
}

/**
 * Generate content using LLM
 * Model: fal-ai/chatterbox or similar
 */
export async function generateContentWithLLM(
  prompt: string,
  options?: FalApiOptions & {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  }
): Promise<string> {
  const modelPath = options?.model || 'fal-ai/chatterbox/text-generation';
  
  const response = await falRequest<{ text: string }>(modelPath, {
    prompt,
    max_tokens: options?.maxTokens || 2000,
    temperature: options?.temperature || 0.7,
  }, options);

  return response.text;
}

/**
 * Convert text to speech using TTS
 * Model: fal-ai/chatterbox/text-to-speech/turbo (default)
 */
export async function textToSpeech(
  text: string,
  options?: FalApiOptions & {
    model?: string;
    voice?: string;
    language?: 'tr' | 'en';
    speed?: number;
  }
): Promise<TTSResponse> {
  const modelPath = options?.model || 'fal-ai/chatterbox/text-to-speech/turbo';
  
  // For async TTS, we might need to poll
  const response = await falRequest<{ audio_url: string } | { request_id: string }>(
    modelPath,
    {
      text,
      voice: options?.voice || 'default',
      language: options?.language || 'tr',
      speed: options?.speed || 1.0,
    },
    options
  );

  // If response contains request_id, it's async - poll for result
  if ('request_id' in response) {
    const jobUrl = `${FAL_API_BASE}/fal-ai/chatterbox/text-to-speech/turbo/requests/${response.request_id}`;
    return pollJobStatus<TTSResponse>(jobUrl, options);
  }

  // If response contains audio_url, it's synchronous
  return response as TTSResponse;
}

/**
 * Create lipsync video from reference video and audio
 * Model: fal-ai/sync-lipsync/v2/pro (default)
 */
export async function createLipsyncVideo(
  videoUrl: string,
  audioUrl: string,
  options?: FalApiOptions & {
    model?: string;
    syncMode?: 'cut_off' | 'loop' | 'bounce';
  }
): Promise<LipsyncResponse> {
  const modelPath = options?.model || 'fal-ai/sync-lipsync/v2/pro';
  
  // Lipsync is typically async
  const response = await falRequest<{ request_id: string } | { video_url: string }>(
    modelPath,
    {
      video_url: videoUrl,
      audio_url: audioUrl,
      sync_mode: options?.syncMode || 'cut_off',
    },
    options
  );

  // If response contains request_id, it's async - poll for result
  if ('request_id' in response) {
    const jobUrl = `${FAL_API_BASE}/${modelPath}/requests/${response.request_id}`;
    return pollJobStatus<LipsyncResponse>(jobUrl, options);
  }

  // If response contains video_url, it's synchronous (rare)
  return response as LipsyncResponse;
}

/**
 * Check if Fal AI is configured
 */
export function isFalConfigured(): boolean {
  try {
    const key = process.env.NEXT_PUBLIC_FAL_KEY || process.env.FAL_KEY;
    return !!key && key !== 'your_fal_ai_api_key' && key.length > 0;
  } catch {
    return false;
  }
}
