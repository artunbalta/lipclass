// VEED Lipsync via fal.ai queue. Extracted from /api/generate-video/route.ts.
// Behavior identical: same model, same poll interval, same timeout, same error semantics.

import { FAL_QUEUE_BASE, getFalApiKey } from './fal-client';

/**
 * Create a lipsync video using VEED lipsync (veed/lipsync on fal.ai).
 * Submits a job to the fal queue, polls until COMPLETED/FAILED, returns the output URL.
 */
export async function createLipsyncVideo(
  videoUrl: string,
  audioUrl: string,
  maxWaitMs = 360000 // 6 minutes max
): Promise<{ video_url: string }> {
  const apiKey = getFalApiKey();
  const modelId = 'veed/lipsync';

  const submitRes = await fetch(`${FAL_QUEUE_BASE}/${modelId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Key ${apiKey}`,
    },
    body: JSON.stringify({
      video_url: videoUrl,
      audio_url: audioUrl,
    }),
  });

  if (!submitRes.ok) {
    const errText = await submitRes.text();
    throw new Error(`Lipsync submit failed (${submitRes.status}): ${errText}`);
  }

  const { request_id } = await submitRes.json();
  console.log(`[Lipsync] VEED job submitted: ${request_id}`);

  const startTime = Date.now();
  const pollInterval = 3000;

  while (Date.now() - startTime < maxWaitMs) {
    await new Promise((r) => setTimeout(r, pollInterval));

    try {
      const statusRes = await fetch(
        `${FAL_QUEUE_BASE}/${modelId}/requests/${request_id}/status`,
        { headers: { 'Authorization': `Key ${apiKey}` } }
      );

      if (!statusRes.ok) {
        console.warn(`[Lipsync] Status check returned ${statusRes.status}, retrying...`);
        continue;
      }

      const statusData = await statusRes.json();
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(`[Lipsync] Status: ${statusData.status} (${elapsed}s)`);

      if (statusData.status === 'COMPLETED') {
        await new Promise((r) => setTimeout(r, 500));

        const resultRes = await fetch(
          `${FAL_QUEUE_BASE}/${modelId}/requests/${request_id}`,
          { headers: { 'Authorization': `Key ${apiKey}` } }
        );

        if (!resultRes.ok) {
          const errText = await resultRes.text();
          throw new Error(`Lipsync result fetch failed (${resultRes.status}): ${errText}`);
        }

        const result = await resultRes.json();
        const outputUrl = result.video?.url;

        if (!outputUrl) {
          throw new Error('Lipsync completed but no video URL in response');
        }

        console.log(`[Lipsync] Completed in ${elapsed}s: ${outputUrl.substring(0, 60)}...`);
        return { video_url: outputUrl };
      }

      if (statusData.status === 'FAILED') {
        const reason = statusData.error || 'Unknown lipsync error';
        throw new Error(`Lipsync failed: ${reason}`);
      }

      // IN_QUEUE or IN_PROGRESS → keep polling
    } catch (err) {
      if (err instanceof Error && (err.message.includes('Lipsync') || err.message.includes('lipsync'))) {
        throw err;
      }
      console.warn(`[Lipsync] Poll error:`, err);
    }
  }

  throw new Error(`Lipsync timed out after ${maxWaitMs / 1000}s`);
}
