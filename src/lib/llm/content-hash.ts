// Stable content hash for slide-generation cache lookup.
//
// Two inputs that produce the same slides (same topic, description, language,
// tone, RAG sources, problem-solving config) should produce the same hash, so
// we can dedup expensive LLM calls.

import { createHash } from 'node:crypto';

export interface SlidesCacheKey {
  topic: string;
  description: string;
  language: 'tr' | 'en';
  tone: 'formal' | 'friendly' | 'energetic';
  includesProblemSolving: boolean;
  problemCount?: number;
  difficulty?: string;
  sourceOnly?: boolean;
  sourceDocumentIds?: string[];
  /** Extra free-form teacher notes that change the output. */
  extraPrompt?: string;
}

/**
 * Compute a stable SHA-256 of the normalized inputs.
 *
 * Normalization rules:
 *   - All strings trimmed, lowercased only where punctuation-insensitive (topic/desc keep case)
 *   - Source document ids sorted
 *   - Undefined optional fields → empty string
 *
 * Returns the hex digest.
 */
export function computeSlidesHash(key: SlidesCacheKey): string {
  const normalized = {
    topic: (key.topic || '').trim(),
    description: (key.description || '').trim(),
    language: key.language,
    tone: key.tone,
    includesProblemSolving: !!key.includesProblemSolving,
    problemCount: key.problemCount ?? null,
    difficulty: key.difficulty || null,
    sourceOnly: !!key.sourceOnly,
    sourceDocumentIds: (key.sourceDocumentIds || []).slice().sort(),
    extraPrompt: (key.extraPrompt || '').trim(),
  };

  const json = JSON.stringify(normalized);
  return createHash('sha256').update(json).digest('hex');
}
