import { AlertTriangle, ChevronLeft, ClipboardList, Play, RotateCcw, Settings, Timer, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useApp } from '../context/AppContext';
import { useExam } from '../context/ExamContext';
import { useTimer } from '../hooks/useTimer';
import Navigator from './Navigator';

type Confirm = 'retake' | 'reset' | null;

export default function Sidebar() {
  const { guardedNavigation, showExamSelect } = useApp();
  const {
    shuffleQuestionsEnabled, shuffleChoicesEnabled, setShuffleQ, setShuffleC,
    resetProgress, startExam, startPractice, practiceMode, timerDuration,
    timerEndTime, isGraded, examStarted, submitExam,
  } = useExam();

  const timerActive = examStarted && !isGraded && !practiceMode && timerDuration > 0;
  const timer = useTimer(timerEndTime, submitExam, timerActive);

  const [confirm, setConfirm] = useState<Confirm>(null);

  function handleReset() {
    resetProgress();
    setConfirm(null);
  }

  return (
    <aside className="space-y-4">
      {/* Timer — shown when exam mode has an active countdown */}
      {timerActive && timer.formattedTime && (
        <div className={cn(
          'rounded-xl border px-4 py-3 flex items-center gap-3 transition-colors',
          timer.isUrgent
            ? 'border-destructive/60 bg-destructive/10 dark:bg-destructive/20'
            : 'border-primary/30 bg-primary/5 dark:bg-primary/10',
        )}>
          <Timer className={cn(
            'h-5 w-5 shrink-0',
            timer.isUrgent ? 'text-destructive animate-pulse' : 'text-primary',
          )} />
          <div className="flex-1 min-w-0">
            <p className={cn(
              'text-[11px] font-semibold uppercase tracking-widest',
              timer.isUrgent ? 'text-destructive' : 'text-primary/70',
            )}>
              {timer.isUrgent ? 'Time running out' : 'Time remaining'}
            </p>
            <p className={cn(
              'font-mono font-black tabular-nums leading-none mt-0.5',
              timer.isUrgent ? 'text-destructive text-2xl' : 'text-foreground text-2xl',
            )}>
              {timer.formattedTime}
            </p>
          </div>
          {timer.isUrgent && (
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          )}
        </div>
      )}

      {/* Settings */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings className="h-4 w-4 text-primary" /> Settings
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs text-muted-foreground"
              onClick={() => guardedNavigation(showExamSelect)}
            >
              <ChevronLeft className="h-3 w-3" /> Change Exam
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {/* Mode indicator */}
          <div className="flex items-center justify-between rounded-md border px-3 py-2 bg-muted/40">
            <span className="text-xs font-medium text-muted-foreground">
              {practiceMode ? 'Practice Mode' : 'Exam Mode'}
            </span>
            <span className={`h-2 w-2 rounded-full ${practiceMode ? 'bg-violet-500' : 'bg-primary'}`} />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm text-muted-foreground cursor-pointer" htmlFor="ws-shuffle-q">
              Shuffle Questions
            </label>
            <Switch id="ws-shuffle-q" checked={shuffleQuestionsEnabled} onCheckedChange={setShuffleQ} />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm text-muted-foreground cursor-pointer" htmlFor="ws-shuffle-c">
              Shuffle Choices
            </label>
            <Switch id="ws-shuffle-c" checked={shuffleChoicesEnabled} onCheckedChange={setShuffleC} />
          </div>
        </CardContent>
      </Card>

      {/* Navigator */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Question Navigator</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Navigator />
        </CardContent>
      </Card>

      {/* Actions */}
      {confirm === null ? (
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => setConfirm('retake')}
          >
            <RotateCcw className="h-4 w-4" /> Restart / Switch Mode
          </Button>
          <Button
            variant="ghost"
            className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => setConfirm('reset')}
          >
            <Trash2 className="h-4 w-4" /> Reset All Progress
          </Button>
        </div>
      ) : confirm === 'retake' ? (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <p className="text-sm font-medium">Restart from Question 1?</p>
            <p className="text-xs text-muted-foreground">
              Current answers will be cleared. Choose a mode to restart in:
            </p>
            <Separator />
            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                className="w-full gap-2 bg-violet-600 hover:bg-violet-700 text-white"
                onClick={() => { startPractice(); setConfirm(null); }}
              >
                <Play className="h-3.5 w-3.5" /> Practice Mode
              </Button>
              <Button
                size="sm"
                className="w-full gap-2"
                onClick={() => { startExam(timerDuration); setConfirm(null); }}
              >
                <ClipboardList className="h-3.5 w-3.5" /> Exam Mode
              </Button>
              <Button size="sm" variant="ghost" className="w-full" onClick={() => setConfirm(null)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-destructive/30">
          <CardContent className="pt-4 space-y-3">
            <p className="text-sm font-medium text-destructive">Reset all progress?</p>
            <p className="text-xs text-muted-foreground">Clears all saved answers, shuffled order, and returns to the start screen. This cannot be undone.</p>
            <Separator />
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" className="flex-1" onClick={handleReset}>Reset</Button>
              <Button size="sm" variant="outline" className="flex-1" onClick={() => setConfirm(null)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </aside>
  );
}
