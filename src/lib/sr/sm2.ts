// SM-2 spaced-repetition scheduler.
//
// Pure function — no IO. The /api/sr route imports it and persists the
// returned values to sr_items. Extracted here so it is independently
// testable without spinning up a Supabase mock.
//
// Reference: SuperMemo SM-2 by Piotr Wozniak (https://super-memory.com/english/ol/sm2.htm).
// Quality scale we use is a reduced 3-tier:
//   1 → wrong  (resets repetitions, interval back to 1 day)
//   3 → hard   (correct but with effort — small interval grow)
//   5 → easy   (correct with confidence — full interval × ease)

export type SrQuality = 1 | 3 | 5;

export interface Sm2State {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
}

export interface Sm2Result extends Sm2State {
  /** Due date in ISO YYYY-MM-DD form. */
  dueDate: string;
}

/**
 * Apply one review with the given quality rating.
 *
 * Invariants:
 *   - easeFactor stays ≥ 1.3 (SM-2 floor — below this the algorithm produces
 *     unstable scheduling).
 *   - On quality < 3, repetitions reset to 0 but easeFactor is NOT degraded
 *     (matches the original paper — easeFactor only moves on success).
 *   - intervalDays for the first 3 successful reviews is 1, then 6, then
 *     prev × easeFactor (rounded).
 */
export function applySm2(
  prev: Sm2State,
  quality: SrQuality,
  now: Date = new Date(),
): Sm2Result {
  let newEF = prev.easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  newEF = Math.max(1.3, newEF);

  let newInterval: number;
  let newRep: number;

  if (quality >= 3) {
    if (prev.repetitions === 0) newInterval = 1;
    else if (prev.repetitions === 1) newInterval = 6;
    else newInterval = Math.round(prev.intervalDays * prev.easeFactor);
    newRep = prev.repetitions + 1;
  } else {
    newInterval = 1;
    newRep = 0;
    newEF = prev.easeFactor; // EF preserved on failure
  }

  const due = new Date(now);
  due.setDate(due.getDate() + newInterval);

  return {
    easeFactor: newEF,
    intervalDays: newInterval,
    repetitions: newRep,
    dueDate: due.toISOString().slice(0, 10),
  };
}
