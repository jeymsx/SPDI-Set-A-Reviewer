export interface Question {
  id: number;
  question: string;
  choices: string[];
  correctAnswer: string;
  feedback?: string;
  image?: string;
}

export interface Exam {
  id: string;
  title: string;
  subtitle: string;
  dataVar: string;
  scriptSrc: string;
  questionCount: number;
  description: string;
  defaultTags: string[];
}

export type Screen = 'select' | 'start' | 'workspace' | 'flashcards' | 'flashcard-study' | 'take-review';

export interface FlashcardSet {
  id?: number;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
}

export interface Flashcard {
  id?: number;
  setId: number;
  front: string;
  back: string;
  order: number;
}
export interface TagRecord {
  key: string;    // 'exam:{examId}' | 'fc:{setId}'
  tags: string[];
}

export type ExamMode = 'practice' | 'exam';

export interface Take {
  id?: number;
  examId: string;
  examTitle: string;
  mode: ExamMode;
  startedAt: number;
  finishedAt: number;
  score: number;
  total: number;
  timeUsedMs?: number;
  answers?: Record<number, string>; // questionId → chosen answer (stored for history review)
}

export interface QuestionStat {
  key: string; // `${examId}__${questionId}`
  examId: string;
  questionId: number;
  timesCorrect: number;
  timesWrong: number;
  lastAttempted: number;
}

declare global {
  interface Window {
    [key: string]: Question[] | unknown;
  }
}
