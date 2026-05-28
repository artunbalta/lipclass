import { describe, it, expect } from 'vitest';
import { applySm2, type Sm2State } from './sm2';

// A frozen "now" lets us assert exact ISO dueDates without flaky CI.
const NOW = new Date('2026-01-01T00:00:00.000Z');

const fresh: Sm2State = { easeFactor: 2.5, intervalDays: 1, repetitions: 0 };

describe('applySm2', () => {
  describe('successful reviews (quality ≥ 3)', () => {
    it('first successful review → interval 1 day, repetitions 1', () => {
      const r = applySm2(fresh, 5, NOW);
      expect(r.intervalDays).toBe(1);
      expect(r.repetitions).toBe(1);
      expect(r.dueDate).toBe('2026-01-02');
    });

    it('second successful review → interval 6 days', () => {
      const after1 = applySm2(fresh, 5, NOW);
      const r = applySm2(
        {
          easeFactor: after1.easeFactor,
          intervalDays: after1.intervalDays,
          repetitions: after1.repetitions,
        },
        5,
        NOW,
      );
      expect(r.intervalDays).toBe(6);
      expect(r.repetitions).toBe(2);
      expect(r.dueDate).toBe('2026-01-07');
    });

    it('third successful review → interval = prev × easeFactor (rounded)', () => {
      const state: Sm2State = { easeFactor: 2.6, intervalDays: 6, repetitions: 2 };
      const r = applySm2(state, 5, NOW);
      // 6 × 2.6 = 15.6 → 16
      expect(r.intervalDays).toBe(16);
      expect(r.repetitions).toBe(3);
    });

    it('quality=5 raises easeFactor', () => {
      const r = applySm2(fresh, 5, NOW);
      // q=5 → +0.1 - 0 = +0.1
      expect(r.easeFactor).toBeCloseTo(2.6, 5);
    });

    it('quality=3 leaves easeFactor roughly stable', () => {
      const r = applySm2(fresh, 3, NOW);
      // q=3 → +0.1 - 2 × (0.08 + 2 × 0.02) = +0.1 - 0.24 = -0.14
      expect(r.easeFactor).toBeCloseTo(2.36, 5);
    });
  });

  describe('failed review (quality < 3)', () => {
    it('quality=1 resets interval to 1 and repetitions to 0', () => {
      const state: Sm2State = { easeFactor: 2.8, intervalDays: 30, repetitions: 5 };
      const r = applySm2(state, 1, NOW);
      expect(r.intervalDays).toBe(1);
      expect(r.repetitions).toBe(0);
      expect(r.dueDate).toBe('2026-01-02');
    });

    it('quality=1 PRESERVES easeFactor (does not punish ease)', () => {
      const state: Sm2State = { easeFactor: 2.8, intervalDays: 30, repetitions: 5 };
      const r = applySm2(state, 1, NOW);
      expect(r.easeFactor).toBe(2.8);
    });
  });

  describe('easeFactor floor', () => {
    it('never goes below 1.3 even with many quality=3 reviews', () => {
      // Repeated q=3 should push EF down. Floor is 1.3.
      let state: Sm2State = { easeFactor: 1.3, intervalDays: 1, repetitions: 0 };
      for (let i = 0; i < 5; i++) {
        const r = applySm2(state, 3, NOW);
        expect(r.easeFactor).toBeGreaterThanOrEqual(1.3);
        state = { easeFactor: r.easeFactor, intervalDays: r.intervalDays, repetitions: r.repetitions };
      }
    });
  });

  describe('dueDate formatting', () => {
    it('returns YYYY-MM-DD format', () => {
      const r = applySm2(fresh, 5, NOW);
      expect(r.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('uses the passed-in "now" not real time', () => {
      const yearAgo = new Date('2025-01-01T00:00:00.000Z');
      const r = applySm2(fresh, 5, yearAgo);
      expect(r.dueDate).toBe('2025-01-02');
    });
  });
});
