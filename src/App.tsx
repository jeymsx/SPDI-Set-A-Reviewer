import { useEffect } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppProvider, useApp } from './context/AppContext';
import { ExamProvider } from './context/ExamContext';
import ErrorBoundary from './components/ErrorBoundary';
import Header from './components/Header';
import ExamSelectScreen from './components/ExamSelectScreen';
import StartScreen from './components/StartScreen';
import ExamWorkspace from './components/ExamWorkspace';
import FlashcardsScreen from './components/FlashcardsScreen';
import FlashcardStudyScreen from './components/FlashcardStudyScreen';
import TakeReviewScreen from './components/TakeReviewScreen';
import BottomNav from './components/BottomNav';
import ResultsModal from './components/ResultsModal';
import NavGuardModal from './components/NavGuardModal';
import { seedDefaultTags } from './tag-seeds';

function AppShell() {
  const { screen } = useApp();

  useEffect(() => { seedDefaultTags(); }, []);

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 sm:pb-6">
        {screen === 'select'          && <ExamSelectScreen />}
        {screen === 'start'           && <StartScreen />}
        {screen === 'workspace'       && <ExamWorkspace />}
        {screen === 'flashcards'      && <FlashcardsScreen />}
        {screen === 'flashcard-study' && <FlashcardStudyScreen />}
        {screen === 'take-review'     && <TakeReviewScreen />}
      </main>
      <BottomNav />
      <ResultsModal />
      <NavGuardModal />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <ExamProvider>
          <TooltipProvider>
            <AppShell />
          </TooltipProvider>
        </ExamProvider>
      </AppProvider>
    </ErrorBoundary>
  );
}
