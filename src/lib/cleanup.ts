import { db } from '../db';

// One-time cleanup for a bug (fixed) where an unstable effect dependency
// caused the flashcard completion screen to save several identical history
// rows for a single real session. Collapses near-duplicate rows — same set,
// same score, saved within a few seconds of each other — down to one.
export async function dedupeFlashcardSessions(): Promise<void> {
  const CLEAN_KEY = 'fc_sessions_deduped_v1';
  if (localStorage.getItem(CLEAN_KEY)) return;
  localStorage.setItem(CLEAN_KEY, '1');
  try {
    const all = await db.flashcardSessions.orderBy('finishedAt').toArray();
    const toDelete: number[] = [];
    for (let i = 1; i < all.length; i++) {
      const prev = all[i - 1];
      const cur = all[i];
      const isDuplicate =
        cur.setId === prev.setId &&
        cur.knownCount === prev.knownCount &&
        cur.stillLearningCount === prev.stillLearningCount &&
        cur.total === prev.total &&
        Math.abs(cur.finishedAt - prev.finishedAt) < 10_000;
      if (isDuplicate && cur.id !== undefined) toDelete.push(cur.id);
    }
    if (toDelete.length) await db.flashcardSessions.bulkDelete(toDelete);
  } catch (err) {
    localStorage.removeItem(CLEAN_KEY);
    console.error('Flashcard session cleanup failed:', err);
  }
}
