import { ChevronLeft, ClipboardList, Lightbulb, Play, RotateCcw, Settings, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useApp } from '../context/AppContext';
import { useExam } from '../context/ExamContext';
import type { TimerState } from '../hooks/useTimer';
import ExamTimer from './ExamTimer';
import Navigator from './Navigator';

type Confirm = 'retake' | 'reset' | null;

interface Props {
  timer: TimerState;
  timerActive: boolean;
}

export default function Sidebar({ timer, timerActive }: Props) {
  const { guardedNavigation, showExamSelect } = useApp();
  const {
    shuffleQuestionsEnabled, shuffleChoicesEnabled, setShuffleQ, setShuffleC,
    resetProgress, startExam, startPractice, practiceMode, timerDuration,
    activeRecallEnabled, setActiveRecall,
  } = useExam();

  const [confirm, setConfirm] = useState<Confirm>(null);

  function handleReset() {
    resetProgress();
    setConfirm(null);
  }

  return (
    <aside className="space-y-4">
      {/* Timer — desktop only; the mobile sticky bar is rendered in ExamWorkspace */}
      {timerActive && timer.formattedTime && (
        <ExamTimer
          layout="card"
          formattedTime={timer.formattedTime}
          isUrgent={timer.isUrgent}
          className="hidden lg:flex rounded-xl px-4 py-3"
        />
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
          <div className="flex items-center justify-between">
            <label className="text-sm text-muted-foreground cursor-pointer flex items-center gap-1.5" htmlFor="ws-active-recall">
              <Lightbulb className="h-3.5 w-3.5" /> Active Recall
            </label>
            <Switch id="ws-active-recall" checked={activeRecallEnabled} onCheckedChange={setActiveRecall} />
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

      {/* Restart / switch mode */}
      <AlertDialog open={confirm === 'retake'} onOpenChange={open => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restart from Question 1?</AlertDialogTitle>
            <AlertDialogDescription>
              Your current answers will be cleared. Choose a mode to restart in:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              className="w-full gap-2 bg-violet-600 hover:bg-violet-700 text-white"
              onClick={() => { startPractice(); setConfirm(null); }}
            >
              <Play className="h-4 w-4" /> Practice Mode
            </Button>
            <Button
              className="w-full gap-2"
              onClick={() => { startExam(timerDuration); setConfirm(null); }}
            >
              <ClipboardList className="h-4 w-4" /> Exam Mode
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset all progress */}
      <AlertDialog open={confirm === 'reset'} onOpenChange={open => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset all progress?</AlertDialogTitle>
            <AlertDialogDescription>
              This clears all saved answers, bookmarks, and shuffled order for this exam,
              then returns to the start screen. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={handleReset}>Reset</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}
