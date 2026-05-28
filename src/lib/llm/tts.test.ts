import { describe, it, expect } from 'vitest';
import { cleanTextForTts } from './tts';

describe('cleanTextForTts', () => {
  it('passes plain text through unchanged', () => {
    expect(cleanTextForTts('Merhaba çocuklar')).toBe('Merhaba çocuklar');
  });

  it('strips block math delimiters', () => {
    expect(cleanTextForTts('Formül: $$E=mc^2$$ — gördün mü?'))
      .toBe('Formül: E=mc2 — gördün mü?');
  });

  it('strips inline math delimiters', () => {
    expect(cleanTextForTts('$x + y = z$ ifadesi')).toBe('x + y = z ifadesi');
  });

  it('removes LaTeX commands and surrounding braces', () => {
    // Current implementation strips the command + braces with no inserted
    // whitespace. So '\frac{1}{2}' collapses to '12'. This is documented
    // behaviour — a known limitation; the TTS layer mispronounces fractions
    // like 1/2 as "twelve". A future fix would substitute "bölü" / "over"
    // for `\frac{a}{b}`. Test pinned to current behaviour so the regression
    // is loud if anyone changes the regex.
    expect(cleanTextForTts('\\frac{1}{2} ve \\sqrt{4} hesapla'))
      .toBe('12 ve 4 hesapla');
  });

  it('drops markdown emphasis markers', () => {
    expect(cleanTextForTts('**önemli** bir *not*')).toBe('önemli bir not');
  });

  it('strips backslashes that escape Turkish characters', () => {
    expect(cleanTextForTts('a \\b c')).toBe('a b c');
  });

  it('replaces underscores with spaces (subscripts read awkwardly)', () => {
    expect(cleanTextForTts('x_1 + x_2')).toBe('x 1 + x 2');
  });

  it('removes caret/exponent characters', () => {
    expect(cleanTextForTts('x^2 + y^2')).toBe('x2 + y2');
  });

  it('trims surrounding whitespace', () => {
    expect(cleanTextForTts('   hello   ')).toBe('hello');
  });

  it('handles empty string', () => {
    expect(cleanTextForTts('')).toBe('');
  });

  it('survives a realistic slide narration with math + markdown', () => {
    const input = `Şimdi $\\frac{a}{b}$ ifadesini düşünelim. **Eğer** $a=2$ ve $b=4$ ise sonuç $\\frac{1}{2}$ olur.`;
    const out = cleanTextForTts(input);
    // No $ or backslashes should remain. We only assert the dangerous markup
    // is gone; exact whitespace is implementation detail.
    expect(out).not.toContain('$');
    expect(out).not.toContain('\\');
    expect(out).toContain('Şimdi');
    expect(out).toContain('düşünelim');
  });
});
