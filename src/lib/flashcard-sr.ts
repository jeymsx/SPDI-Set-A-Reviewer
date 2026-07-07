import { db } from '../db';
import type { Flashcard, FlashcardProgress } from '../types';

// ---- Leitner spaced repetition ----
// Each card lives in a "box" 0..5. A correct answer promotes it one box (longer
// interval before it's due again); a miss drops it back to box 0. "Smart" study
// order surfaces due + weakest cards first so limited study time hits what matters.

export const MAX_BOX = 5;
export const MASTERED_BOX = 4; // box >= this counts as "mastered" for display

const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;

// Interval before a card in each box becomes due again.
export const BOX_INTERVALS = [
  0,          // box 0: due immediately (new / just missed)
  20 * MIN,   // box 1
  DAY,        // box 2
  3 * DAY,    // box 3
  7 * DAY,    // box 4
  14 * DAY,   // box 5 (mastered)
];

export function nextDue(box: number, now: number): number {
  const b = Math.max(0, Math.min(box, MAX_BOX));
  return now + BOX_INTERVALS[b];
}

// Record a grade for one card, upserting its progress row.
//
// A correct answer only promotes the box when the card was actually DUE
// (now >= due), or is brand new. Reviewing a card early — e.g. by restarting a
// deck several times in one sitting — holds the box and its schedule, so
// "mastery" can't be farmed in a single session and genuinely reflects correct
// reviews spread across the spacing intervals. A miss always resets to box 0.
export async function recordCardResult(setId: number, cardId: number, known: boolean): Promise<void> {
  const now = Date.now();
  const key = `${setId}:${cardId}`;
  const existing = await db.flashcardProgress.get(key);
  const prevBox = existing?.box ?? 0;
  const wasDue = !existing || now >= existing.due;

  let box: number;
  let due: number;
  if (!known) {
    box = 0;
    due = nextDue(0, now);           // missed — due again immediately
  } else if (wasDue) {
    box = Math.min(prevBox + 1, MAX_BOX);
    due = nextDue(box, now);         // promoted — reschedule from now
  } else {
    box = prevBox;
    due = existing.due;              // reviewed early — hold box and schedule
  }

  await db.flashcardProgress.put({
    key,
    setId,
    cardId,
    box,
    due,
    lastSeen: now,
    timesKnown: (existing?.timesKnown ?? 0) + (known ? 1 : 0),
    timesStillLearning: (existing?.timesStillLearning ?? 0) + (known ? 0 : 1),
  });
}

// Order a deck for "smart" study: due cards first, then weakest box, then oldest
// seen. Cards with no progress are treated as brand-new (due, box 0) → front.
export function orderSmart(
  cards: Flashcard[],
  progress: Map<number, FlashcardProgress>,
  now: number,
): Flashcard[] {
  const rank = (c: Flashcard) => {
    const p = c.id !== undefined ? progress.get(c.id) : undefined;
    return {
      due: !p || p.due <= now ? 0 : 1,
      box: p?.box ?? 0,
      lastSeen: p?.lastSeen ?? 0,
    };
  };
  return [...cards].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    if (ra.due !== rb.due) return ra.due - rb.due;
    if (ra.box !== rb.box) return ra.box - rb.box;
    return ra.lastSeen - rb.lastSeen;
  });
}

export interface MasteryStats {
  mastered: number;
  learning: number;
  fresh: number;
  total: number;
}

// Bucket a set's cards by mastery, given its progress rows. Values are clamped so
// stale/orphaned progress rows (e.g. after a user set is edited) can never report
// more studied cards than the set actually has.
export function masteryFor(total: number, rows: FlashcardProgress[]): MasteryStats {
  const withRecord = Math.min(rows.length, total);
  const mastered = Math.min(rows.filter(r => r.box >= MASTERED_BOX).length, total);
  const learning = Math.max(0, withRecord - mastered);
  const fresh = Math.max(0, total - withRecord);
  return { mastered, learning, fresh, total };
}
