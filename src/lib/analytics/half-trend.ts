// Compute a "first half vs. second half" percentage delta for a time series.
//
// Used by:
//   - teacher dashboard "Toplam İzlenme" stats card
//   - teacher analytics page (insights subtitle)
//
// We split the buckets in half, sum each side, and report the percentage
// move. Returns null when the data is too sparse to be meaningful
// (< 4 buckets or both halves are zero).
//
// Intentionally pure & side-effect-free for testability.

export interface HalfTrend {
  /** Absolute percentage change. Always positive. */
  value: number;
  /** True when the second half is ≥ first half. */
  isPositive: boolean;
}

export function halfTrend(values: number[]): HalfTrend | null {
  if (!Array.isArray(values) || values.length < 4) return null;
  const half = Math.floor(values.length / 2);
  const prev = values.slice(0, half).reduce((s, x) => s + x, 0);
  const curr = values.slice(half).reduce((s, x) => s + x, 0);
  if (prev === 0 && curr === 0) return null;
  if (prev === 0) return { value: 100, isPositive: curr > 0 };
  const pct = Math.round(((curr - prev) / prev) * 100);
  return { value: Math.abs(pct), isPositive: pct >= 0 };
}
