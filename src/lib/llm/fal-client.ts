// Fal AI API client — thin wrapper around fetch.
// Extracted from /api/generate-video/route.ts for reuse and testability.
// Behavior is byte-identical to the original inline functions.

export const FAL_API_BASE = 'https://fal.run';
export const FAL_QUEUE_BASE = 'https://queue.fal.run';

/**
 * Get the Fal API key from env (server-side only).
 * NOTE: still accepts NEXT_PUBLIC_FAL_KEY as fallback for backward compat.
 * Security backlog: drop the NEXT_PUBLIC_* fallback so keys never reach the client.
 */
export function getFalApiKey(): string {
  const key = process.env.FAL_KEY || process.env.NEXT_PUBLIC_FAL_KEY;
  if (!key) {
    throw new Error('FAL_KEY is not configured');
  }
  return key;
}

/**
 * Synchronous-style POST to a Fal model.
 */
export async function falRequest<T>(
  modelPath: string,
  body: Record<string, unknown>
): Promise<T> {
  const apiKey = getFalApiKey();

  const response = await fetch(`${FAL_API_BASE}/${modelPath}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Key ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage: string = response.statusText;
    try {
      const errorJson = JSON.parse(errorText);
      const raw = errorJson.detail ?? errorJson.message ?? errorJson.error ?? errorText;
      errorMessage = typeof raw === 'string' ? raw : JSON.stringify(raw);
    } catch {
      errorMessage = errorText || response.statusText;
    }
    throw new Error(`Fal API error (${response.status}): ${errorMessage}`);
  }

  return response.json();
}
