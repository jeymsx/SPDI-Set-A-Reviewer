import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { EXAMS, loadExamData } from '../exams';
import type { Question, QuestionStat } from '../types';

// A "current mistake" is a question missed at least twice that you still haven't
// re-mastered (wrong attempts still outnumber correct). Drilling it correctly in
// the Mistake Bank raises timesCorrect until it catches up and the question
// graduates out — so the bank shrinks as you actually learn, unlike a plain
// timesWrong >= 2 rule that would never let a question leave.
const MIN_WRONG = 2;

export function isCurrentMistake(s: QuestionStat): boolean {
  return s.timesWrong >= MIN_WRONG && s.timesWrong > s.timesCorrect;
}

export interface DrillQuestion {
  uid: number;        // unique within a drill (question ids can collide across exams)
  examId: string;
  examTitle: string;
  question: Question; // original question, id is original within its exam
}

// Reactive count for the exam-select banner.
export function useMistakeCount(): number {
  return useLiveQuery(
    async () => (await db.questionStats.toArray()).filter(isCurrentMistake).length,
    [],
    0,
  ) ?? 0;
}

// Load the full drill set: every current mistake, resolved to its real question
// data (loading each involved exam's question file once).
export async function loadMistakeBank(): Promise<DrillQuestion[]> {
  const stats = (await db.questionStats.toArray()).filter(isCurrentMistake);
  if (!stats.length) return [];

  const idsByExam = new Map<string, Set<number>>();
  for (const s of stats) {
    if (!idsByExam.has(s.examId)) idsByExam.set(s.examId, new Set());
    idsByExam.get(s.examId)!.add(s.questionId);
  }

  const drill: DrillQuestion[] = [];
  let uid = 0;
  for (const [examId, ids] of idsByExam) {
    const examDef = EXAMS.find(e => e.id === examId);
    if (!examDef) continue; // exam no longer registered — skip its stale stats
    let questions: Question[];
    try {
      questions = await loadExamData(examDef);
    } catch {
      continue; // couldn't load this exam's data — skip rather than fail the drill
    }
    for (const q of questions) {
      if (ids.has(q.id)) {
        drill.push({ uid: uid++, examId, examTitle: examDef.title, question: q });
      }
    }
  }
  return drill;
}

// Record a first-attempt drill result against the original exam's stats, so the
// question graduates out of the bank once you've re-mastered it.
export async function recordMistakeResult(examId: string, questionId: number, correct: boolean): Promise<void> {
  const key = `${examId}__${questionId}`;
  const now = Date.now();
  const existing = await db.questionStats.get(key);
  if (existing) {
    await db.questionStats.update(key, {
      timesCorrect: existing.timesCorrect + (correct ? 1 : 0),
      timesWrong: existing.timesWrong + (correct ? 0 : 1),
      lastAttempted: now,
    });
  } else {
    await db.questionStats.put({
      key, examId, questionId,
      timesCorrect: correct ? 1 : 0,
      timesWrong: correct ? 0 : 1,
      lastAttempted: now,
    });
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export { shuffle as shuffleDrill };
