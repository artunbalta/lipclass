// Vitest config. Scope is intentionally narrow: pure functions only — no
// jsdom, no React render tests. The goal is a fast safety net for the math
// helpers (SM-2 SR scheduler, content-hash, half-period trend, KaTeX text
// cleaner, voice-clone cache resolver). See SECURITY.md for why we don't
// run integration tests against the live Supabase project.

import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    globals: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'src/lib/llm/content-hash.ts',
        'src/lib/llm/tts.ts',
        'src/lib/llm/json-sanitizer.ts',
        'src/lib/curriculum/meb-catalog.ts',
        // Pure function lifted from sr/route.ts — see test for details.
        'src/app/api/sr/route.ts',
      ],
      // Pure functions only — coverage target is high.
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
