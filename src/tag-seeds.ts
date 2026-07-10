import { db } from './db';
import { EXAMS } from './exams';
import { BUILT_IN_FLASHCARD_SETS } from './flashcard-sets';

export async function seedDefaultTags(): Promise<void> {
  const SEED_KEY = 'tags_seeded_v17';
  if (localStorage.getItem(SEED_KEY)) return;
  localStorage.setItem(SEED_KEY, '1');
  try {
    for (const exam of EXAMS) {
      const key = 'exam:' + exam.id;
      const existing = await db.tags.get(key);
      if (!existing) await db.tags.put({ key, tags: exam.defaultTags });
    }
    for (const set of BUILT_IN_FLASHCARD_SETS) {
      const key = 'fc:' + set.id;
      const existing = await db.tags.get(key);
      if (!existing) await db.tags.put({ key, tags: set.defaultTags });
    }
  } catch (err) {
    localStorage.removeItem(SEED_KEY);
    console.error('Tag seeding failed:', err);
  }
}
