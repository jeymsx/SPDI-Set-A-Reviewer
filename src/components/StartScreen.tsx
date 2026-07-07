import { AlertTriangle, BookOpen, ChevronLeft, Clock, Lightbulb, Play, RotateCcw, Shuffle, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useApp } from '../context/AppContext';
import { useExam } from '../context/ExamContext';
import { useWeakQuestions } from '../hooks/useProgress';
import HistoryTab from './HistoryTab';
import WeakQuestionsPanel from './WeakQuestionsPanel';
import WeakQuestionsTab from './WeakQuestionsTab';

const TIMER_OPTIONS = [
  { label: 'No Timer', value: 0 },
  { label: '30 minutes', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '1.5 hours', value: 90 },
  { label: '2 hours', value: 120 },
  { label: '3 hours', value: 180 },
];

export default function StartScreen() {
  const { currentExam, showExamSelect } = useApp();
  const {
    questions, startExam, startPractice, resetProgress,
    shuffleQuestionsEnabled, shuffleChoicesEnabled,
    setShuffleQ, setShuffleC, timerDuration,
    canResume, timerPausedMs, resumeExam,
    activeRecallEnabled, setActiveRecall,
  } = useExam();

  function formatPausedTime(ms: number) {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  // Timer selection: a preset (minutes) or a custom value the user types in.
  const startedAsPreset = TIMER_OPTIONS.some(o => o.value === timerDuration);
  const [timerChoice, setTimerChoice] = useState<number | 'custom'>(startedAsPreset ? timerDuration : 'custom');
  const [customMinutes, setCustomMinutes] = useState<string>(startedAsPreset ? '' : String(timerDuration));
  const CUSTOM_MIN = 1, CUSTOM_MAX = 600;
  const parsedCustom = Math.min(CUSTOM_MAX, Math.max(CUSTOM_MIN, Math.floor(Number(customMinutes)) || 0));
  const customValid = customMinutes.trim() !== '' && Number(customMinutes) >= CUSTOM_MIN;
  const effectiveDuration = timerChoice === 'custom' ? parsedCustom : timerChoice;

  const [tab, setTab] = useState<'settings' | 'history' | 'weak'>('settings');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const exam = currentExam;
  const weakQuestions = useWeakQuestions(exam?.id ?? null);
  if (!exam) return null;

  const total = questions.length || exam.questionCount;
  const passMin = Math.ceil(total * 0.7);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground -ml-2" onClick={showExamSelect}>
        <ChevronLeft className="h-4 w-4" /> Back to Exam Selection
      </Button>

      {/* Exam header card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary shrink-0">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h2 className="font-bold text-lg leading-tight">{exam.title}</h2>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{exam.subtitle}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <p className="text-sm text-muted-foreground">{exam.description}</p>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{total} Questions</Badge>
            <Badge variant="secondary">Passing: 70% ({passMin}/{total})</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Tab buttons */}
      <div className="flex rounded-lg border bg-muted p-1 gap-1">
        {(['settings', 'history', 'weak'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 text-xs sm:text-sm font-medium transition-all relative',
              tab === t
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t === 'settings' && <><Shuffle className="h-3.5 w-3.5" /> Settings</>}
            {t === 'history'  && <><Clock className="h-3.5 w-3.5" /> History</>}
            {t === 'weak'     && (
              <>
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Weak</span>
                {(weakQuestions?.length ?? 0) > 0 && (
                  <span className={cn(
                    'ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none',
                    tab === 'weak'
                      ? 'bg-amber-500 text-white'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400',
                  )}>
                    {weakQuestions!.length}
                  </span>
                )}
              </>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'settings' ? (
        <Card>
          <CardContent className="pt-6 space-y-6">
            {/* Timer */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4 text-primary" /> Timer (Exam Mode only)
              </label>
              <select
                value={timerChoice}
                onChange={e => setTimerChoice(e.target.value === 'custom' ? 'custom' : Number(e.target.value))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {TIMER_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
                <option value="custom">Custom…</option>
              </select>

              {timerChoice === 'custom' && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={CUSTOM_MIN}
                      max={CUSTOM_MAX}
                      value={customMinutes}
                      onChange={e => setCustomMinutes(e.target.value)}
                      placeholder="e.g. 45"
                      className="w-28 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <span className="text-sm text-muted-foreground">minutes</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {customValid
                      ? `Timer set to ${parsedCustom} minute${parsedCustom === 1 ? '' : 's'}.`
                      : `Enter a whole number from ${CUSTOM_MIN} to ${CUSTOM_MAX}.`}
                  </p>
                </div>
              )}
            </div>

            <Separator />

            {/* Shuffle */}
            <div className="space-y-4">
              <p className="text-sm font-medium flex items-center gap-2">
                <Shuffle className="h-4 w-4 text-primary" /> Shuffle
              </p>
              <div className="flex items-center justify-between">
                <label className="text-sm text-muted-foreground cursor-pointer" htmlFor="shuffle-q">
                  Shuffle Questions
                </label>
                <Switch id="shuffle-q" checked={shuffleQuestionsEnabled} onCheckedChange={setShuffleQ} />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm text-muted-foreground cursor-pointer" htmlFor="shuffle-c">
                  Shuffle Answer Choices
                </label>
                <Switch id="shuffle-c" checked={shuffleChoicesEnabled} onCheckedChange={setShuffleC} />
              </div>
            </div>

            <Separator />

            {/* Active recall */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-2 cursor-pointer" htmlFor="active-recall">
                  <Lightbulb className="h-4 w-4 text-primary" /> Active Recall
                </label>
                <Switch id="active-recall" checked={activeRecallEnabled} onCheckedChange={setActiveRecall} />
              </div>
              <p className="text-xs text-muted-foreground">
                Hides answer choices until you tap "Show options" — think of the answer first to strengthen recall.
              </p>
            </div>

            <Separator />

            {/* Resume banner */}
            {canResume && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-primary">Session in progress</p>
                  <p className="text-xs text-muted-foreground">
                    {timerPausedMs > 0
                      ? `Timer paused — ${formatPausedTime(timerPausedMs)} remaining`
                      : 'Pick up where you left off'}
                  </p>
                </div>
                <Button size="sm" className="gap-1.5 shrink-0" onClick={resumeExam}>
                  <RotateCcw className="h-3.5 w-3.5" /> Resume
                </Button>
              </div>
            )}

            {/* Start buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" size="lg" className="flex-1 gap-2 py-3 sm:py-2.5 text-base sm:text-sm h-auto" onClick={() => startPractice()}>
                <Play className="h-4 w-4" /> {canResume ? 'Restart Practice' : 'Practice Mode'}
              </Button>
              <Button
                size="lg"
                variant={canResume ? 'outline' : 'default'}
                disabled={timerChoice === 'custom' && !customValid}
                className="flex-1 gap-2 py-3 sm:py-2.5 text-base sm:text-sm h-auto"
                onClick={() => startExam(effectiveDuration)}
              >
                <Play className="h-4 w-4" /> {canResume ? 'Restart Exam' : 'Start Exam'}
              </Button>
            </div>

            {/* Reset */}
            <div>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setShowResetConfirm(true)}
              >
                <Trash2 className="h-3.5 w-3.5" /> Reset Saved Progress
              </Button>
            </div>

            <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset saved progress?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This deletes your in-progress answers, bookmarks, and shuffled order for
                    this exam. Your completed-attempt history is kept. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <Button variant="destructive" onClick={() => { resetProgress(); setShowResetConfirm(false); }}>
                    Reset
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      ) : tab === 'history' ? (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <HistoryTab />
            <WeakQuestionsPanel />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <WeakQuestionsTab />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
