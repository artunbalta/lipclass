// LLM JSON sanitizers. Extracted from /api/generate-video/route.ts.
// Behavior is byte-identical.

/**
 * Robust JSON sanitizer for LLM output containing LaTeX.
 *
 * LLMs write LaTeX like \frac, \sqrt, \text inside JSON strings.
 * JSON treats \b \f \n \r \t as control chars, so \frac becomes form-feed + "rac"
 * when naively parsed. Walk the string and double-escape any backslash that
 * is NOT a valid JSON escape but IS a probable LaTeX command.
 */
export function sanitizeLatexInJson(raw: string): string {
  const result: string[] = [];
  let inString = false;
  let i = 0;

  while (i < raw.length) {
    const ch = raw[i];

    if (!inString) {
      if (ch === '"') inString = true;
      result.push(ch);
      i++;
    } else {
      if (ch === '"') {
        inString = false;
        result.push(ch);
        i++;
      } else if (ch === '\\') {
        const next = i + 1 < raw.length ? raw[i + 1] : '';

        if (next === '"' || next === '\\' || next === '/') {
          result.push(ch, next);
          i += 2;
        } else if (next === 'b' || next === 'f' || next === 'n' || next === 'r' || next === 't') {
          const afterNext = i + 2 < raw.length ? raw[i + 2] : '';
          if (/[a-zA-Z]/.test(afterNext)) {
            // LaTeX command: \frac, \begin, \text, \nabla, \right, etc.
            result.push('\\\\');
            i += 1;
          } else {
            result.push(ch, next);
            i += 2;
          }
        } else if (next === 'u') {
          const hex = raw.substring(i + 2, i + 6);
          if (/^[0-9a-fA-F]{4}$/.test(hex)) {
            result.push(ch, next);
            i += 2;
          } else {
            // LaTeX: \underline, \underbrace, etc.
            result.push('\\\\');
            i += 1;
          }
        } else {
          // \sqrt, \sum, \int, \alpha, \cdot, \leq, \pi, \infty, etc.
          result.push('\\\\');
          i += 1;
        }
      } else if (ch === '\n') {
        result.push('\\n');
        i++;
      } else if (ch === '\r') {
        result.push('\\r');
        i++;
      } else if (ch === '\t') {
        result.push('\\t');
        i++;
      } else {
        result.push(ch);
        i++;
      }
    }
  }

  return result.join('');
}

/**
 * Extract the JSON body from raw LLM output that may be wrapped in
 * ```json ... ``` fences or have leading prose.
 */
export function extractJsonBody(rawOutput: string): string {
  let jsonStr = rawOutput.trim();
  if (jsonStr.includes('```')) {
    const match = jsonStr.match(/```(?:json|JSON)?\s*\n?([\s\S]*?)\n?```/);
    if (match?.[1]) {
      jsonStr = match[1].trim();
    } else {
      jsonStr = jsonStr.replace(/^```(?:json|JSON)?\s*\n?/i, '').replace(/\n?```\s*$/, '').trim();
    }
  }
  if (jsonStr.startsWith('`') || !jsonStr.startsWith('{')) {
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
    }
  }
  return jsonStr;
}

/**
 * Last-resort recovery for truncated JSON output (LLM ran out of tokens
 * mid-string). Finds the last complete OBJECT inside the top-level array
 * named by `arrayKey`, truncates everything after it, and re-closes
 * the array + root object so JSON.parse succeeds with partial data.
 *
 * Used by the slides endpoint with arrayKey='slides'.
 */
export function recoverTruncatedJson(raw: string, arrayKey = 'slides'): string | null {
  const keyToken = `"${arrayKey}"`;
  const slidesIdx = raw.indexOf(keyToken);
  if (slidesIdx < 0) return null;
  const arrStart = raw.indexOf('[', slidesIdx);
  if (arrStart < 0) return null;

  let depth = 0;
  let inStr = false;
  let escape = false;
  let lastGoodEnd = -1;
  for (let i = arrStart; i < raw.length; i++) {
    const c = raw[i];
    if (escape) { escape = false; continue; }
    if (inStr) {
      if (c === '\\') escape = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === '[' || c === '{') depth++;
    else if (c === ']' || c === '}') {
      depth--;
      if (c === '}' && depth === 1) lastGoodEnd = i;
    }
  }

  if (lastGoodEnd < 0) return null;
  return raw.slice(0, lastGoodEnd + 1) + ']}';
}

/**
 * Convenience: full parse pipeline — extract → sanitize → JSON.parse with
 * aggressive cleanup fallback and (optionally) array recovery.
 */
export function parseLlmJson<T = unknown>(rawOutput: string, options?: {
  recoverArrayKey?: string;
}): T {
  const jsonStr = extractJsonBody(rawOutput);
  const sanitized = sanitizeLatexInJson(jsonStr);
  try {
    return JSON.parse(sanitized) as T;
  } catch {
    const aggressive = sanitized
      .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, ' ')
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']');
    try {
      return JSON.parse(aggressive) as T;
    } catch (secondError) {
      if (options?.recoverArrayKey) {
        const recovered = recoverTruncatedJson(sanitized, options.recoverArrayKey);
        if (recovered) return JSON.parse(recovered) as T;
      }
      throw secondError;
    }
  }
}
