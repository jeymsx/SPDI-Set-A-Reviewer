import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { Exam, Screen } from '../types';

const LS_KEY_THEME = 'spdi_theme_dark';
const LS_KEY_LAST_EXAM = 'last_exam_id';

interface AppContextValue {
  currentExam: Exam | null;
  screen: Screen;
  theme: 'dark' | 'light';
  navGuardPending: (() => void) | null;

  selectExam: (exam: Exam) => void;
  showExamSelect: () => void;
  setScreen: (s: Screen) => void;
  toggleTheme: () => void;
  guardedNavigation: (callback: () => void) => void;
  navGuardConfirm: () => void;
  navGuardCancel: () => void;

  // whether the exam session is "active" (used by nav guard caller)
  setSessionActive: (active: boolean) => void;
  sessionActive: boolean;

  // flashcards navigation
  currentFlashcardSetId: number | null;
  showFlashcards: () => void;
  studyFlashcardSet: (setId: number) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentExam, setCurrentExam] = useState<Exam | null>(null);
  const [screen, setScreen] = useState<Screen>('select');
  const [currentFlashcardSetId, setCurrentFlashcardSetId] = useState<number | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    localStorage.getItem(LS_KEY_THEME) === 'true' ? 'dark' : 'light'
  );
  const [navGuardPending, setNavGuardPending] = useState<(() => void) | null>(null);
  const [sessionActive, setSessionActive] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme !== 'dark');
    localStorage.setItem(LS_KEY_THEME, String(theme === 'dark'));
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(t => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  const selectExam = useCallback((exam: Exam) => {
    setCurrentExam(exam);
    localStorage.setItem(LS_KEY_LAST_EXAM, exam.id);
    setScreen('start');
  }, []);

  const showExamSelect = useCallback(() => {
    setSessionActive(false);
    setScreen('select');
  }, []);

  const showFlashcards = useCallback(() => {
    setScreen('flashcards');
  }, []);

  const studyFlashcardSet = useCallback((setId: number) => {
    setCurrentFlashcardSetId(setId);
    setScreen('flashcard-study');
  }, []);

  const guardedNavigation = useCallback((callback: () => void) => {
    if (sessionActive) {
      setNavGuardPending(() => callback);
    } else {
      callback();
    }
  }, [sessionActive]);

  const navGuardConfirm = useCallback(() => {
    const cb = navGuardPending;
    setNavGuardPending(null);
    cb?.();
  }, [navGuardPending]);

  const navGuardCancel = useCallback(() => {
    setNavGuardPending(null);
  }, []);

  // On mount: restore last exam selection if present
  const didRestore = useRef(false);
  useEffect(() => {
    if (didRestore.current) return;
    didRestore.current = true;
    const lastId = localStorage.getItem(LS_KEY_LAST_EXAM);
    if (lastId) {
      // Will be hydrated by ExamContext if exam was in progress; just remember the id for now
      // ExamSelectScreen will handle auto-restore logic
    }
  }, []);

  return (
    <AppContext.Provider value={{
      currentExam, screen, theme, navGuardPending,
      selectExam, showExamSelect, setScreen, toggleTheme,
      guardedNavigation, navGuardConfirm, navGuardCancel,
      sessionActive, setSessionActive,
      currentFlashcardSetId, showFlashcards, studyFlashcardSet,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export { LS_KEY_LAST_EXAM };
