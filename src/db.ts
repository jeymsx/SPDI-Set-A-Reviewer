import Dexie, { type Table } from 'dexie';
import type { Take, QuestionStat, FlashcardSet, Flashcard } from './types';

class AppDB extends Dexie {
  takes!: Table<Take>;
  questionStats!: Table<QuestionStat>;
  flashcardSets!: Table<FlashcardSet>;
  flashcards!: Table<Flashcard>;

  constructor() {
    super('spdi-reviewer');
    this.version(1).stores({
      takes: '++id, examId, startedAt',
      questionStats: 'key, examId',
    });
    this.version(2).stores({
      takes: '++id, examId, startedAt',
      questionStats: 'key, examId',
      flashcardSets: '++id, createdAt',
      flashcards: '++id, setId',
    });
    this.version(3).stores({
      takes: '++id, examId, startedAt',
      questionStats: 'key, examId',
      flashcardSets: '++id, createdAt, updatedAt',
      flashcards: '++id, setId',
    });
  }
}

export const db = new AppDB();
