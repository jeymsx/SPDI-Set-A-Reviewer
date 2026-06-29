import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Take, QuestionStat } from '../types';

export function useExamHistory(examId: string | null) {
  return useLiveQuery(
    () => examId
      ? db.takes.where('examId').equals(examId).reverse().sortBy('startedAt')
      : Promise.resolve([]),
    [examId],
    [] as Take[],
  );
}

export function useExamBestScore(examId: string | null) {
  const takes = useLiveQuery(
    () => examId
      ? db.takes.where('examId').equals(examId).toArray()
      : Promise.resolve([]),
    [examId],
    [] as Take[],
  );
  if (!takes?.length) return null;
  return Math.max(...takes.map(t => Math.round((t.score / t.total) * 100)));
}

export function useExamLastScore(examId: string | null) {
  const takes = useLiveQuery(
    () => examId
      ? db.takes.where('examId').equals(examId).reverse().sortBy('startedAt')
      : Promise.resolve([]),
    [examId],
    [] as Take[],
  );
  if (!takes?.length) return null;
  const last = takes[0];
  return { score: last.score, total: last.total, pct: Math.round((last.score / last.total) * 100) };
}

export function useWeakQuestions(examId: string | null) {
  return useLiveQuery(
    () => examId
      ? db.questionStats
          .where('examId').equals(examId)
          .filter(s => s.timesWrong >= 2)
          .toArray()
      : Promise.resolve([]),
    [examId],
    [] as QuestionStat[],
  );
}

export async function saveTake(take: Omit<Take, 'id'>) {
  return db.takes.add(take);
}

export async function updateQuestionStats(
  examId: string,
  answers: Record<number, string>,
  questions: Array<{ id: number; correctAnswer: string }>,
) {
  const now = Date.now();
  const ops = Object.entries(answers).map(async ([qIdStr, chosen]) => {
    const qId = Number(qIdStr);
    const q = questions.find(q => q.id === qId);
    if (!q) return;
    const isCorrect = chosen === q.correctAnswer;
    const key = `${examId}__${qId}`;
    const existing = await db.questionStats.get(key);
    if (existing) {
      await db.questionStats.update(key, {
        timesCorrect: existing.timesCorrect + (isCorrect ? 1 : 0),
        timesWrong: existing.timesWrong + (isCorrect ? 0 : 1),
        lastAttempted: now,
      });
    } else {
      await db.questionStats.put({
        key,
        examId,
        questionId: qId,
        timesCorrect: isCorrect ? 1 : 0,
        timesWrong: isCorrect ? 0 : 1,
        lastAttempted: now,
      });
    }
  });
  await Promise.all(ops);
}
