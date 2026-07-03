import Dexie, { type Table } from 'dexie';
import type { Take, QuestionStat, FlashcardSet, Flashcard, TagRecord, FlashcardSession, FlashcardProgress } from './types';

class AppDB extends Dexie {
  takes!: Table<Take>;
  questionStats!: Table<QuestionStat>;
  flashcardSets!: Table<FlashcardSet>;
  flashcards!: Table<Flashcard>;
  tags!: Table<TagRecord>;
  flashcardSessions!: Table<FlashcardSession>;
  flashcardProgress!: Table<FlashcardProgress>;

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
    this.version(4).stores({
      takes: '++id, examId, startedAt',
      questionStats: 'key, examId',
      flashcardSets: '++id, createdAt, updatedAt',
      flashcards: '++id, setId',
      tags: 'key',
    });
    // v5: Flashcard.image (Blob) — no index change, Dexie stores Blobs natively
    this.version(5).stores({
      takes: '++id, examId, startedAt',
      questionStats: 'key, examId',
      flashcardSets: '++id, createdAt, updatedAt',
      flashcards: '++id, setId',
      tags: 'key',
    });
    // v6: flashcardSessions — records completed flashcard rounds for history
    this.version(6).stores({
      takes: '++id, examId, startedAt',
      questionStats: 'key, examId',
      flashcardSets: '++id, createdAt, updatedAt',
      flashcards: '++id, setId',
      tags: 'key',
      flashcardSessions: '++id, setId, finishedAt',
    });
    // v7: flashcardProgress — per-card spaced-repetition (Leitner) state
    this.version(7).stores({
      takes: '++id, examId, startedAt',
      questionStats: 'key, examId',
      flashcardSets: '++id, createdAt, updatedAt',
      flashcards: '++id, setId',
      tags: 'key',
      flashcardSessions: '++id, setId, finishedAt',
      flashcardProgress: 'key, setId',
    });
  }
}

export const db = new AppDB();
