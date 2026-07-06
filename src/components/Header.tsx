import { Award, ClipboardList, Keyboard, Layers, Timer, Volume2, VolumeX, X } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler';
import { useApp } from '../context/AppContext';
import { useExam } from '../context/ExamContext';
import { useSoundEnabled, toggleSound } from '@/lib/sounds';

export default function Header() {
  const { toggleTheme, theme, guardedNavigation, showExamSelect, showFlashcards, screen } = useApp();
  const { isGraded, practiceMode } = useExam();
  const soundEnabled = useSoundEnabled();
  const [showShortcuts, setShowShortcuts] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-14 items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => guardedNavigation(showExamSelect)}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity cursor-pointer bg-transparent border-0 p-0"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Award className="h-4 w-4" />
            </div>
            <span className="font-bold text-sm tracking-tight">Prepwise</span>
          </button>

          {/* Nav links */}
          <nav className="hidden sm:flex items-center gap-0.5 ml-4">
            <button
              onClick={() => guardedNavigation(showExamSelect)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                ['select','start','workspace','mistake-bank'].includes(screen)
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
              }`}
            >
              <ClipboardList className="h-3.5 w-3.5" /> Exams
            </button>
            <button
              onClick={() => guardedNavigation(showFlashcards)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                screen === 'flashcards' || screen === 'flashcard-study'
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
              }`}
            >
              <Layers className="h-3.5 w-3.5" /> Flashcards
            </button>
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {isGraded && !practiceMode && screen === 'workspace' && (
              <Badge variant="outline" className="gap-1.5 border-emerald-500 text-emerald-600 dark:text-emerald-400">
                <Timer className="h-3 w-3" /> Submitted
              </Badge>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSound}
              title={soundEnabled ? 'Mute sound effects' : 'Unmute sound effects'}
              aria-label={soundEnabled ? 'Mute sound effects' : 'Unmute sound effects'}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
            </Button>

            <AnimatedThemeToggler
              theme={theme}
              onThemeChange={toggleTheme}
              variant="circle"
              duration={450}
              title="Toggle theme"
              aria-label="Toggle theme"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-4"
            />

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowShortcuts(s => !s)}
              title="Keyboard shortcuts"
            >
              <Keyboard className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {showShortcuts && (
          <>
            <Separator />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex flex-wrap items-center gap-4">
                <span className="font-semibold text-foreground">Shortcuts</span>
                {screen === 'flashcard-study' ? (
                  <>
                    <span><kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono">Space</kbd> / <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono">Enter</kbd> Flip card</span>
                    <span><kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono">←</kbd> Still Learning</span>
                    <span><kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono">→</kbd> Got It</span>
                  </>
                ) : screen === 'workspace' ? (
                  <>
                    <span><kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono">←</kbd> Prev</span>
                    <span><kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono">→</kbd> Next</span>
                    <span>
                      <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono">1</kbd>
                      {' – '}
                      <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono">5</kbd>
                      {' '}Select answer
                    </span>
                  </>
                ) : (
                  <span className="italic">No shortcuts on this screen</span>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowShortcuts(false)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </>
        )}
      </header>
    </>
  );
}
