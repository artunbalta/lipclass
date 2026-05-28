import { describe, it, expect } from 'vitest';
import { computeSlidesHash, type SlidesCacheKey } from './content-hash';

const base: SlidesCacheKey = {
  topic: 'Birinci Dereceden Denklemler',
  description: 'Bu derste tek bilinmeyenli denklem çözüm adımları işlenir.',
  language: 'tr',
  tone: 'friendly',
  includesProblemSolving: true,
  problemCount: 3,
  difficulty: 'medium',
};

describe('computeSlidesHash', () => {
  it('is deterministic for the same input', () => {
    const a = computeSlidesHash(base);
    const b = computeSlidesHash(base);
    expect(a).toBe(b);
  });

  it('returns a 64-char hex digest (SHA-256)', () => {
    const h = computeSlidesHash(base);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it('changes when any user-visible field changes', () => {
    const baseHash = computeSlidesHash(base);
    expect(computeSlidesHash({ ...base, topic: 'X' })).not.toBe(baseHash);
    expect(computeSlidesHash({ ...base, description: 'X' })).not.toBe(baseHash);
    expect(computeSlidesHash({ ...base, language: 'en' })).not.toBe(baseHash);
    expect(computeSlidesHash({ ...base, tone: 'formal' })).not.toBe(baseHash);
    expect(computeSlidesHash({ ...base, includesProblemSolving: false })).not.toBe(baseHash);
    expect(computeSlidesHash({ ...base, problemCount: 5 })).not.toBe(baseHash);
    expect(computeSlidesHash({ ...base, difficulty: 'hard' })).not.toBe(baseHash);
    expect(computeSlidesHash({ ...base, sourceOnly: true })).not.toBe(baseHash);
    expect(computeSlidesHash({ ...base, extraPrompt: 'x' })).not.toBe(baseHash);
  });

  it('treats leading/trailing whitespace as equivalent', () => {
    const a = computeSlidesHash(base);
    const b = computeSlidesHash({ ...base, topic: `  ${base.topic}  ` });
    expect(a).toBe(b);
  });

  it('treats sourceDocumentIds order as irrelevant', () => {
    const a = computeSlidesHash({ ...base, sourceDocumentIds: ['doc-a', 'doc-b', 'doc-c'] });
    const b = computeSlidesHash({ ...base, sourceDocumentIds: ['doc-c', 'doc-a', 'doc-b'] });
    expect(a).toBe(b);
  });

  it('different sourceDocumentIds produce different hashes', () => {
    const a = computeSlidesHash({ ...base, sourceDocumentIds: ['doc-a'] });
    const b = computeSlidesHash({ ...base, sourceDocumentIds: ['doc-b'] });
    expect(a).not.toBe(b);
  });

  it('treats undefined optional fields as empty (no salt)', () => {
    // Two keys, one with undefined extraPrompt, one omitted → same hash
    const a = computeSlidesHash({ ...base, extraPrompt: undefined });
    const b = computeSlidesHash({ ...base });
    expect(a).toBe(b);
  });
});
