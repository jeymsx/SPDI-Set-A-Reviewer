import { ClipboardList, Layers } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function BottomNav() {
  const { screen, guardedNavigation, showExamSelect, showFlashcards } = useApp();

  const onExams = ['select', 'start', 'workspace', 'take-review'].includes(screen);
  const onFlashcards = screen === 'flashcards' || screen === 'flashcard-study';

  return (
    <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16">
        <button
          onClick={() => guardedNavigation(showExamSelect)}
          className={`flex-1 flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
            onExams ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <ClipboardList className={`h-5 w-5 ${onExams ? 'stroke-[2.5]' : ''}`} />
          Exams
        </button>
        <button
          onClick={() => guardedNavigation(showFlashcards)}
          className={`flex-1 flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
            onFlashcards ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <Layers className={`h-5 w-5 ${onFlashcards ? 'stroke-[2.5]' : ''}`} />
          Flashcards
        </button>
      </div>
    </nav>
  );
}
