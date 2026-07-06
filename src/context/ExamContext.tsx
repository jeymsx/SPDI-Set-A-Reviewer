import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Exam, Question } from '../types';
import { loadExamData } from '../exams';
import { playSound } from '../lib/sounds';
import { useApp } from './AppContext';

// ---- localStorage helpers ----
export function makeKeys(prefix: string) {
  return {
    answers:         `${prefix}_user_answers`,
    idx:             `${prefix}_current_idx`,
    graded:          `${prefix}_is_graded`,
    welcome:         `${prefix}_welcome_dismissed`,
    shuffleQ:        `${prefix}_shuffle_questions`,
    shuffleC:        `${prefix}_shuffle_choices`,
    started:         `${prefix}_exam_started`,
    timerStart:      `${prefix}_timer_start`,
    timerDuration:   `${prefix}_timer_duration`,
    timerEnd:        `${prefix}_timer_end_time`,
    timerPausedMs:   `${prefix}_timer_paused_ms`,
    bookmarks:       `${prefix}_bookmarks`,
    practiceMode:    `${prefix}_practice_mode`,
    practiceAnswers: `${prefix}_practice_answers`,
    practiceRevealed: `${prefix}_practice_revealed`,
    practiceWrongAttempts: `${prefix}_practice_wrong_attempts`,
    pool:            `${prefix}_shuffled_pool_indices`,
    choicePool:      `${prefix}_shuffled_choice_pool`,
  };
}

type LSKeys = ReturnType<typeof makeKeys>;

// Global (not per-exam) study preference — applies across every exam.
const LS_ACTIVE_RECALL = 'exam_active_recall';

function lsGet<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    return JSON.parse(v) as T;
  } catch {
    return fallback;
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

// ---- context value type ----
export interface ExamContextValue {
  exam: Exam | null;
  questions: Question[];
  loading: boolean;
  error: string | null;

  // retry a failed load
  retryLoad: () => void;

  // navigation
  currentIdx: number;
  indicesMap: number[];        // virtual → real question indices
  currentQuestion: Question | null;
  navigateTo: (idx: number) => void;
  navigateNext: () => void;
  navigatePrev: () => void;

  // answers
  userAnswers: Record<number, string>;
  setAnswer: (qId: number, answer: string) => void;
  isGraded: boolean;

  // exam state
  examStarted: boolean;
  timerDuration: number;       // minutes; 0 = no timer
  timerEndTime: number;        // ms epoch
  startExam: (durationMinutes: number, questionIds?: number[]) => void;
  questionFilter: number[] | null;
  submitExam: () => void;
  resetProgress: () => void;
  setTimerEndTime: (t: number) => void;

  // settings
  shuffleQuestionsEnabled: boolean;
  shuffleChoicesEnabled: boolean;
  reviewIncorrectOnly: boolean;
  reviewBookmarkedOnly: boolean;
  reviewUnansweredOnly: boolean;
  setShuffleQ: (v: boolean) => void;
  setShuffleC: (v: boolean) => void;
  setReviewIncorrect: (v: boolean) => void;
  setReviewBookmarked: (v: boolean) => void;
  setReviewUnanswered: (v: boolean) => void;
  shuffledChoicesFor: (q: Question) => string[];

  // unanswered helpers (exam mode)
  unansweredCount: number;
  navigateToFirstUnanswered: () => void;

  // active recall — choices stay hidden behind a "Show options" button until
  // the student has thought of the answer themselves. Global preference.
  activeRecallEnabled: boolean;
  setActiveRecall: (v: boolean) => void;

  // welcome card
  welcomeDismissed: boolean;
  dismissWelcome: () => void;

  // bookmarks
  bookmarks: Record<number, boolean>;
  toggleBookmark: (qId: number) => void;

  // practice mode
  practiceMode: boolean;
  practiceAnswers: Record<number, string>;  // questionId → first attempt chosen
  practiceWrongAttempts: Record<number, string[]>; // questionId → wrong choices tried so far
  practiceRevealedIds: Set<number>;
  practiceStreak: number;
  practiceBestStreak: number;
  practiceCompleted: boolean;
  startPractice: (questionIds?: number[]) => void;
  setPracticeAnswer: (qId: number, answer: string) => void;
  finishPractice: () => void;

  // results (set when graded/practice done)
  showResults: boolean;
  setShowResults: (v: boolean) => void;

  // reset start (go back to start screen without full reset)
  returnToStart: () => void;

  // resume an in-progress session
  canResume: boolean;
  timerPausedMs: number;
  resumeExam: () => void;

  keys: LSKeys;
}

const ExamContext = createContext<ExamContextValue | null>(null);

export function ExamProvider({ children }: { children: React.ReactNode }) {
  const { currentExam, setScreen, setSessionActive, screen } = useApp();

  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const keys = useMemo(() => makeKeys(exam?.id ?? 'exam'), [exam?.id]);

  // ---- navigation ----
  const [currentIdx, setCurrentIdx] = useState(0);

  // ---- answers ----
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [isGraded, setIsGraded] = useState(false);

  // ---- exam state ----
  const [examStarted, setExamStarted] = useState(false);
  const [timerDuration, setTimerDuration] = useState(90);
  const [timerEndTime, setTimerEndTimeState] = useState(0);
  const [timerPausedMs, setTimerPausedMs] = useState(0);

  // ---- settings ----
  const [shuffleQuestionsEnabled, setShuffleQuestionsEnabled] = useState(false);
  const [shuffleChoicesEnabled, setShuffleChoicesEnabled] = useState(false);
  const [reviewIncorrectOnly, setReviewIncorrectOnly] = useState(false);
  const [reviewBookmarkedOnly, setReviewBookmarkedOnly] = useState(false);
  const [reviewUnansweredOnly, setReviewUnansweredOnly] = useState(false);
  const [activeRecallEnabled, setActiveRecallState] = useState(() => localStorage.getItem(LS_ACTIVE_RECALL) === 'true');
  const shuffledChoicesPoolRef = useRef<Record<number, string[]>>({});
  const pendingIdxRef = useRef<number | null>(null);

  // ---- welcome ----
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);

  // ---- bookmarks ----
  const [bookmarks, setBookmarks] = useState<Record<number, boolean>>({});

  // ---- practice mode ----
  // practiceAnswers holds each question's FIRST attempt (right or wrong) — the
  // basis for scoring/weak-question stats. It does NOT track retries.
  // practiceWrongAttempts holds every wrong choice tried per question, so the
  // student can keep guessing (Kahoot-style) without the answer being spoiled —
  // reveal (practiceRevealedIds) only happens once the correct choice is found.
  const [practiceMode, setPracticeMode] = useState(false);
  const [practiceAnswers, setPracticeAnswers] = useState<Record<number, string>>({});
  const [practiceWrongAttempts, setPracticeWrongAttempts] = useState<Record<number, string[]>>({});
  const [practiceRevealedIds, setPracticeRevealedIds] = useState<Set<number>>(new Set());
  const [practiceStreak, setPracticeStreak] = useState(0);
  const [practiceBestStreak, setPracticeBestStreak] = useState(0);
  const [practiceCompleted, setPracticeCompleted] = useState(false);

  // ---- results modal ----
  const [showResults, setShowResults] = useState(false);

  // ---- question filter (retry mistakes / weak questions mode) ----
  const [questionFilter, setQuestionFilter] = useState<number[] | null>(null);

  // ---- indices map ----
  const indicesMap = useMemo(() => {
    if (!questions.length) return [];
    let indices = Array.from({ length: questions.length }, (_, i) => i);

    if (shuffleQuestionsEnabled) {
      const saved = localStorage.getItem(keys.pool);
      if (saved) {
        try { indices = JSON.parse(saved); } catch { /* ignore */ }
      } else {
        indices = shuffle(indices);
        localStorage.setItem(keys.pool, JSON.stringify(indices));
      }
    } else {
      localStorage.removeItem(keys.pool);
    }

    if (questionFilter !== null) {
      const filterSet = new Set(questionFilter);
      indices = indices.filter(i => {
        const q = questions[i];
        return q && filterSet.has(q.id);
      });
    }

    if (reviewIncorrectOnly) {
      indices = indices.filter(i => {
        const q = questions[i];
        if (!q) return false;
        if (practiceMode) {
          return practiceRevealedIds.has(q.id) && practiceAnswers[q.id] !== q.correctAnswer;
        }
        return userAnswers[q.id] !== undefined && userAnswers[q.id] !== q.correctAnswer;
      });
    }

    if (reviewBookmarkedOnly) {
      indices = indices.filter(i => {
        const q = questions[i];
        return q && bookmarks[q.id];
      });
    }

    if (reviewUnansweredOnly && !practiceMode) {
      indices = indices.filter(i => {
        const q = questions[i];
        return q && userAnswers[q.id] === undefined;
      });
    }

    return indices;
  }, [questions, questionFilter, shuffleQuestionsEnabled, reviewIncorrectOnly, reviewBookmarkedOnly, reviewUnansweredOnly, userAnswers, practiceAnswers, practiceRevealedIds, practiceMode, bookmarks, keys.pool]);

  // Count of unanswered questions within the real exam scope (ignores the review
  // filters above so the number stays stable for the submit guard).
  const scopedRealIndices = useMemo(() => {
    let indices = Array.from({ length: questions.length }, (_, i) => i);
    if (questionFilter !== null) {
      const filterSet = new Set(questionFilter);
      indices = indices.filter(i => questions[i] && filterSet.has(questions[i].id));
    }
    return indices;
  }, [questions, questionFilter]);

  const unansweredCount = useMemo(() => {
    if (practiceMode || isGraded) return 0;
    return scopedRealIndices.filter(i => userAnswers[questions[i].id] === undefined).length;
  }, [scopedRealIndices, userAnswers, questions, practiceMode, isGraded]);

  const currentQuestion = useMemo(() => {
    const realIdx = indicesMap[currentIdx];
    return realIdx !== undefined ? (questions[realIdx] ?? null) : null;
  }, [questions, indicesMap, currentIdx]);

  // ---- pause timer when leaving workspace ----
  const prevScreenRef = useRef(screen);
  useEffect(() => {
    const prev = prevScreenRef.current;
    prevScreenRef.current = screen;
    if (prev === 'workspace' && screen !== 'workspace' && timerEndTime > 0 && !isGraded) {
      const remaining = Math.max(0, timerEndTime - Date.now());
      setTimerPausedMs(remaining);
      localStorage.setItem(keys.timerPausedMs, String(remaining));
      localStorage.removeItem(keys.timerEnd);
      setTimerEndTimeState(0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  // ---- load exam data when currentExam changes ----
  const [loadRetryKey, setLoadRetryKey] = useState(0);
  const loadedExamId = useRef<string | null>(null);
  const loadedRetryKey = useRef(-1);
  useEffect(() => {
    if (!currentExam) return;
    if (loadedExamId.current === currentExam.id && loadedRetryKey.current === loadRetryKey) return;
    loadedExamId.current = currentExam.id;
    loadedRetryKey.current = loadRetryKey;
    setExam(currentExam);
    setLoading(true);
    setError(null);

    loadExamData(currentExam)
      .then(qs => {
        setQuestions(qs);
        hydrate(currentExam, qs);
        setLoading(false);
      })
      .catch(e => {
        setError(String(e));
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentExam, loadRetryKey]);

  function hydrate(ex: Exam, qs: Question[]) {
    const k = makeKeys(ex.id);
    const savedAnswers = lsGet<Record<number, string>>(k.answers, {});
    setUserAnswers(savedAnswers);

    const savedBookmarks = lsGet<Record<number, boolean>>(k.bookmarks, {});
    setBookmarks(savedBookmarks);

    const graded = localStorage.getItem(k.graded) === 'true';
    setIsGraded(graded);

    const practice = localStorage.getItem(k.practiceMode) === 'true';
    setPracticeMode(practice);
    if (practice) {
      const pa = lsGet<Record<number, string>>(k.practiceAnswers, {});
      setPracticeAnswers(pa);
      const revealedIds = lsGet<number[]>(k.practiceRevealed, []);
      setPracticeRevealedIds(new Set(revealedIds));
      const wrongAttempts = lsGet<Record<number, string[]>>(k.practiceWrongAttempts, {});
      setPracticeWrongAttempts(wrongAttempts);
    }

    const shuffQ = localStorage.getItem(k.shuffleQ) === 'true';
    const shuffC = localStorage.getItem(k.shuffleC) === 'true';
    setShuffleQuestionsEnabled(shuffQ);
    setShuffleChoicesEnabled(shuffC);
    // Restore any persisted per-question choice order so a reload is stable.
    shuffledChoicesPoolRef.current = shuffC ? lsGet<Record<number, string[]>>(k.choicePool, {}) : {};

    const dur = parseInt(localStorage.getItem(k.timerDuration) ?? '90', 10);
    setTimerDuration(isNaN(dur) ? 90 : dur);

    const end = parseInt(localStorage.getItem(k.timerEnd) ?? '0', 10);
    setTimerEndTimeState(isNaN(end) ? 0 : end);

    const pausedMs = parseInt(localStorage.getItem(k.timerPausedMs) ?? '0', 10);
    setTimerPausedMs(isNaN(pausedMs) ? 0 : pausedMs);

    const savedIdx = parseInt(localStorage.getItem(k.idx) ?? '0', 10);

    const dismissed = localStorage.getItem(k.welcome) === 'true';
    setWelcomeDismissed(dismissed);

    const started = localStorage.getItem(k.started) === 'true';
    setExamStarted(started || graded);

    if (started || graded) {
      setSessionActive(true);
    }

    // apply saved idx after questions + indicesMap are ready
    pendingIdxRef.current = isNaN(savedIdx) ? 0 : savedIdx;

    // restore practice completion state
    if (practice && qs.length > 0) {
      const answered = Object.keys(lsGet<Record<number, string>>(k.practiceAnswers, {})).length;
      if (answered >= qs.length) setPracticeCompleted(true);
    }
  }

  // ---- apply hydrated idx once questions + indicesMap are ready ----
  useEffect(() => {
    if (questions.length > 0 && pendingIdxRef.current !== null) {
      setCurrentIdx(pendingIdxRef.current);
      pendingIdxRef.current = null;
    }
  }, [questions]);

  // ---- persist current idx ----
  useEffect(() => {
    if (exam) localStorage.setItem(keys.idx, String(currentIdx));
  }, [currentIdx, exam, keys.idx]);

  // ---- navigation ----
  const navigateTo = useCallback((idx: number) => {
    setCurrentIdx(Math.max(0, Math.min(idx, indicesMap.length - 1)));
  }, [indicesMap.length]);

  const navigateNext = useCallback(() => {
    setCurrentIdx(prev => Math.min(prev + 1, indicesMap.length - 1));
  }, [indicesMap.length]);

  const navigatePrev = useCallback(() => {
    setCurrentIdx(prev => Math.max(prev - 1, 0));
  }, []);

  // ---- answers ----
  const setAnswer = useCallback((qId: number, answer: string) => {
    setUserAnswers(prev => {
      const next = { ...prev, [qId]: answer };
      localStorage.setItem(keys.answers, JSON.stringify(next));
      return next;
    });
  }, [keys.answers]);

  // ---- shuffled choices ----
  // The shuffled order per question is persisted so a mid-exam reload keeps the
  // same A/B/C/D order instead of silently re-randomizing under the user.
  const shuffledChoicesFor = useCallback((q: Question): string[] => {
    if (!shuffleChoicesEnabled) return q.choices;
    if (!shuffledChoicesPoolRef.current[q.id]) {
      shuffledChoicesPoolRef.current[q.id] = shuffle([...q.choices]);
      localStorage.setItem(keys.choicePool, JSON.stringify(shuffledChoicesPoolRef.current));
    }
    return shuffledChoicesPoolRef.current[q.id];
  }, [shuffleChoicesEnabled, keys.choicePool]);

  // ---- settings ----
  const setShuffleQ = useCallback((v: boolean) => {
    setShuffleQuestionsEnabled(v);
    localStorage.setItem(keys.shuffleQ, String(v));
    localStorage.removeItem(keys.pool);
    setCurrentIdx(0);
  }, [keys.shuffleQ, keys.pool]);

  const setShuffleC = useCallback((v: boolean) => {
    setShuffleChoicesEnabled(v);
    localStorage.setItem(keys.shuffleC, String(v));
    shuffledChoicesPoolRef.current = {};
    localStorage.removeItem(keys.choicePool);
  }, [keys.shuffleC, keys.choicePool]);

  const setReviewIncorrect = useCallback((v: boolean) => {
    setReviewIncorrectOnly(v);
    setCurrentIdx(0);
  }, []);

  const setReviewBookmarked = useCallback((v: boolean) => {
    setReviewBookmarkedOnly(v);
    setCurrentIdx(0);
  }, []);

  const setReviewUnanswered = useCallback((v: boolean) => {
    setReviewUnansweredOnly(v);
    setCurrentIdx(0);
  }, []);

  // Jump to the first unanswered question in the current (unfiltered) order.
  // Clears any active review filter so the target is guaranteed to be reachable.
  const navigateToFirstUnanswered = useCallback(() => {
    setReviewIncorrectOnly(false);
    setReviewBookmarkedOnly(false);
    setReviewUnansweredOnly(false);
    let base = Array.from({ length: questions.length }, (_, i) => i);
    if (shuffleQuestionsEnabled) {
      const saved = localStorage.getItem(keys.pool);
      if (saved) { try { base = JSON.parse(saved); } catch { /* ignore */ } }
    }
    if (questionFilter !== null) {
      const filterSet = new Set(questionFilter);
      base = base.filter(i => questions[i] && filterSet.has(questions[i].id));
    }
    const target = base.findIndex(i => questions[i] && userAnswers[questions[i].id] === undefined);
    if (target >= 0) setCurrentIdx(target);
  }, [questions, userAnswers, questionFilter, shuffleQuestionsEnabled, keys.pool]);

  const setActiveRecall = useCallback((v: boolean) => {
    setActiveRecallState(v);
    localStorage.setItem(LS_ACTIVE_RECALL, String(v));
  }, []);

  // ---- welcome ----
  const dismissWelcome = useCallback(() => {
    setWelcomeDismissed(true);
    localStorage.setItem(keys.welcome, 'true');
  }, [keys.welcome]);

  // ---- bookmarks ----
  const toggleBookmark = useCallback((qId: number) => {
    setBookmarks(prev => {
      const next = { ...prev, [qId]: !prev[qId] };
      if (!next[qId]) delete next[qId];
      localStorage.setItem(keys.bookmarks, JSON.stringify(next));
      return next;
    });
  }, [keys.bookmarks]);

  // ---- exam start ----
  const startExam = useCallback((durationMinutes: number, questionIds?: number[]) => {
    setQuestionFilter(questionIds ?? null);
    // clear previous session state
    setUserAnswers({});
    localStorage.removeItem(keys.answers);
    setIsGraded(false);
    localStorage.removeItem(keys.graded);
    setShowResults(false);
    setTimerPausedMs(0);
    localStorage.removeItem(keys.timerPausedMs);

    setTimerDuration(durationMinutes);
    localStorage.setItem(keys.timerDuration, String(durationMinutes));

    const endTime = durationMinutes > 0 ? Date.now() + durationMinutes * 60 * 1000 : 0;
    setTimerEndTimeState(endTime);
    if (endTime) localStorage.setItem(keys.timerEnd, String(endTime));
    else localStorage.removeItem(keys.timerEnd);

    setPracticeMode(false);
    setExamStarted(true);
    localStorage.setItem(keys.started, 'true');
    localStorage.setItem(keys.timerStart, String(Date.now()));
    setCurrentIdx(0);
    setSessionActive(true);
    playSound('woosh');
    setScreen('workspace');
  }, [keys, setScreen, setSessionActive]);

  // ---- practice start ----
  const startPractice = useCallback((questionIds?: number[]) => {
    setQuestionFilter(questionIds ?? null);
    // clear previous session state
    setIsGraded(false);
    localStorage.removeItem(keys.graded);
    setUserAnswers({});
    localStorage.removeItem(keys.answers);
    setShowResults(false);

    setPracticeMode(true);
    setPracticeAnswers({});
    setPracticeWrongAttempts({});
    setPracticeRevealedIds(new Set());
    setPracticeStreak(0);
    setPracticeBestStreak(0);
    setPracticeCompleted(false);
    localStorage.setItem(keys.practiceMode, 'true');
    localStorage.setItem(keys.practiceAnswers, '{}');
    localStorage.removeItem(keys.practiceRevealed);
    localStorage.removeItem(keys.practiceWrongAttempts);
    setExamStarted(true);
    localStorage.setItem(keys.started, 'true');
    localStorage.setItem(keys.timerStart, String(Date.now()));
    setCurrentIdx(0);
    setSessionActive(true);
    playSound('woosh');
    setScreen('workspace');
  }, [keys, setScreen, setSessionActive]);

  // ---- practice answer ----
  // Retry-until-correct: a wrong pick doesn't spoil the answer — it's recorded
  // as a tried-and-wrong choice (disabling it) and the student keeps guessing.
  // Only a correct pick reveals the answer/feedback and unlocks moving on.
  // The FIRST attempt (right or wrong) is what's kept in practiceAnswers, since
  // that's what scoring, weak-question stats, and the results screen key off of.
  const setPracticeAnswer = useCallback((qId: number, answer: string) => {
    const q = questions.find(q => q.id === qId);
    const isCorrect = q ? answer === q.correctAnswer : false;
    const isFirstAttempt = practiceAnswers[qId] === undefined;

    playSound(isCorrect ? 'correct' : 'incorrect');

    if (isCorrect) {
      setPracticeRevealedIds(prev => {
        const next = new Set(prev).add(qId);
        localStorage.setItem(keys.practiceRevealed, JSON.stringify([...next]));
        return next;
      });
      if (isFirstAttempt) {
        setPracticeStreak(s => {
          const next = s + 1;
          setPracticeBestStreak(b => Math.max(b, next));
          return next;
        });
      }
    } else {
      setPracticeWrongAttempts(prev => {
        const existing = prev[qId] ?? [];
        if (existing.includes(answer)) return prev;
        const next = { ...prev, [qId]: [...existing, answer] };
        localStorage.setItem(keys.practiceWrongAttempts, JSON.stringify(next));
        return next;
      });
      if (isFirstAttempt) setPracticeStreak(0);
    }

    if (isFirstAttempt) {
      setPracticeAnswers(prev => {
        const next = { ...prev, [qId]: answer };
        localStorage.setItem(keys.practiceAnswers, JSON.stringify(next));
        return next;
      });
    }
  }, [questions, practiceAnswers, keys.practiceAnswers, keys.practiceRevealed, keys.practiceWrongAttempts]);

  // ---- submit exam ----
  const submitExam = useCallback(() => {
    setIsGraded(true);
    localStorage.setItem(keys.graded, 'true');
    setSessionActive(false);
    setShowResults(true);
  }, [keys.graded, setSessionActive]);

  // ---- finish practice ----
  const finishPractice = useCallback(() => {
    setPracticeCompleted(true);
    setSessionActive(false);
    setShowResults(true);
  }, [setSessionActive]);

  // ---- reset progress ----
  const resetProgress = useCallback(() => {
    if (!exam) return;
    const k = makeKeys(exam.id);
    Object.values(k).forEach(key => localStorage.removeItem(key));
    setUserAnswers({});
    setIsGraded(false);
    setCurrentIdx(0);
    setExamStarted(false);
    setPracticeMode(false);
    setPracticeAnswers({});
    setPracticeWrongAttempts({});
    setPracticeRevealedIds(new Set());
    setPracticeStreak(0);
    setPracticeBestStreak(0);
    setPracticeCompleted(false);
    setTimerEndTimeState(0);
    setTimerPausedMs(0);
    setWelcomeDismissed(false);
    shuffledChoicesPoolRef.current = {};
    setSessionActive(false);
    setShowResults(false);
    setQuestionFilter(null);
    setScreen('start');
  }, [exam, setScreen, setSessionActive]);

  // ---- resume in-progress session ----
  const canResume = examStarted && !isGraded;

  const resumeExam = useCallback(() => {
    if (timerPausedMs > 0) {
      const newEnd = Date.now() + timerPausedMs;
      setTimerEndTimeState(newEnd);
      localStorage.setItem(keys.timerEnd, String(newEnd));
      localStorage.removeItem(keys.timerPausedMs);
      setTimerPausedMs(0);
    }
    setSessionActive(true);
    setScreen('workspace');
  }, [timerPausedMs, keys, setScreen, setSessionActive]);

  // ---- return to start ----
  const returnToStart = useCallback(() => {
    setSessionActive(false);
    setScreen('start');
  }, [setScreen, setSessionActive]);

  const retryLoad = useCallback(() => {
    setLoadRetryKey(k => k + 1);
  }, []);

  const setTimerEndTime = useCallback((t: number) => {
    setTimerEndTimeState(t);
    localStorage.setItem(keys.timerEnd, String(t));
  }, [keys.timerEnd]);

  return (
    <ExamContext.Provider value={{
      exam, questions, loading, error,
      retryLoad,
      currentIdx, indicesMap, currentQuestion,
      navigateTo, navigateNext, navigatePrev,
      userAnswers, setAnswer, isGraded,
      examStarted, timerDuration, timerEndTime, questionFilter,
      startExam, submitExam, resetProgress, setTimerEndTime,
      shuffleQuestionsEnabled, shuffleChoicesEnabled,
      reviewIncorrectOnly, reviewBookmarkedOnly,
      setShuffleQ, setShuffleC, setReviewIncorrect, setReviewBookmarked, setReviewUnanswered,
      shuffledChoicesFor,
      reviewUnansweredOnly, unansweredCount, navigateToFirstUnanswered,
      activeRecallEnabled, setActiveRecall,
      welcomeDismissed, dismissWelcome,
      bookmarks, toggleBookmark,
      practiceMode, practiceAnswers, practiceWrongAttempts, practiceRevealedIds,
      practiceStreak, practiceBestStreak, practiceCompleted,
      startPractice, setPracticeAnswer, finishPractice,
      showResults, setShowResults,
      returnToStart,
      canResume, timerPausedMs, resumeExam,
      keys,
    }}>
      {children}
    </ExamContext.Provider>
  );
}

export function useExam() {
  const ctx = useContext(ExamContext);
  if (!ctx) throw new Error('useExam must be used within ExamProvider');
  return ctx;
}
