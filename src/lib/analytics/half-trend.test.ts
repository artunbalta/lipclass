import { describe, it, expect } from 'vitest';
import { halfTrend } from './half-trend';

describe('halfTrend', () => {
  it('returns null for fewer than 4 buckets', () => {
    expect(halfTrend([])).toBeNull();
    expect(halfTrend([1])).toBeNull();
    expect(halfTrend([1, 2])).toBeNull();
    expect(halfTrend([1, 2, 3])).toBeNull();
  });

  it('returns null when both halves are zero (no engagement at all)', () => {
    expect(halfTrend([0, 0, 0, 0])).toBeNull();
    expect(halfTrend([0, 0, 0, 0, 0, 0])).toBeNull();
  });

  it('returns +100% when first half is zero and second is positive', () => {
    expect(halfTrend([0, 0, 5, 5])).toEqual({ value: 100, isPositive: true });
  });

  it('computes positive trend correctly', () => {
    // first half = 10, second half = 20, +100%
    expect(halfTrend([5, 5, 10, 10])).toEqual({ value: 100, isPositive: true });
  });

  it('computes negative trend correctly', () => {
    // first half = 20, second half = 10, -50%
    expect(halfTrend([10, 10, 5, 5])).toEqual({ value: 50, isPositive: false });
  });

  it('rounds to nearest integer', () => {
    // first = 3, second = 7 → +133.33% → 133
    expect(halfTrend([1, 2, 3, 4])).toEqual({ value: 133, isPositive: true });
  });

  it('treats flat trend as positive (isPositive=true at delta 0)', () => {
    expect(halfTrend([5, 5, 5, 5])).toEqual({ value: 0, isPositive: true });
  });

  it('handles odd-length series by giving the bigger half to "current"', () => {
    // length 5 → half = 2, prev = values[0..2] (2 items), curr = values[2..5] (3 items)
    // prev = 2, curr = 30 → +1400% → 1400
    expect(halfTrend([1, 1, 10, 10, 10])).toEqual({ value: 1400, isPositive: true });
  });
});
