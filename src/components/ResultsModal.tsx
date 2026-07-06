import { Award, BookOpen, CheckCircle, RefreshCw, Target, XCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useApp } from '../context/AppContext';
import { useExam } from '../context/ExamContext';
import { saveTake, updateQuestionStats } from '../hooks/useProgress';
import { fireConfetti } from '@/lib/confetti';

export default function ResultsModal() {
  const { showExamSelect } = useApp();
  const {
    exam, questions, indicesMap, questionFilter,
    userAnswers, isGraded,
    practiceMode, practiceAnswers, practiceRevealedIds,
    practiceStreak, practiceBestStreak,
    timerEndTime, timerDuration,
    showResults, setShowResults,
    resetProgress,
    startExam, startPractice,
    keys,
  } = useExam();

  const savedRef = useRef(false);

  const answersToScore = practiceMode ? practiceAnswers : userAnswers;
  const scopedQuestions = indicesMap.map(realIdx => questions[realIdx]).filter(Boolean);
  const correctCount = scopedQuestions.filter(q => answersToScore[q.id] === q.correctAnswer).length;
  const wrongIds = scopedQuestions
    .filter(q => answersToScore[q.id] !== undefined && answersToScore[q.id] !== q.correctAnswer)
    .map(q => q.id);
  const totalQ = scopedQuestions.length;
  const pct = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;
  const passed = pct >= 70;
  const isPerfect = totalQ > 0 && pct === 100;

  const confettiFiredRef = useRef(false);
  useEffect(() => {
    if (!showResults) { confettiFiredRef.current = false; return; }
    if (!isPerfect || confettiFiredRef.current) return;
    confettiFiredRef.current = true;
    fireConfetti();
  }, [showResults, isPerfect]);

  useEffect(() => {
    if (!exam || !showResults || savedRef.current) return;
    savedRef.current = true;

    const now = Date.now();
    const startedAt = parseInt(localStorage.getItem(keys.timerStart) ?? '0', 10) || now;
    const timeUsedMs = timerDuration > 0 && timerEndTime > 0
      ? Math.max(0, timerDuration * 60 * 1000 - (timerEndTime - now))
      : undefined;

    if (!questionFilter) {
      saveTake({ examId: exam.id, examTitle: exam.title, mode: practiceMode ? 'practice' : 'exam', startedAt, finishedAt: now, score: correctCount, total: totalQ, timeUsedMs, answers: answersToScore });
    }
    updateQuestionStats(exam.id, answersToScore, questions);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showResults, exam?.id]);

  function handleRetake() {
    savedRef.current = false;
    if (practiceMode) startPractice();
    else startExam(timerDuration);
    setShowResults(false);
  }

  return (
    <Dialog open={showResults} onOpenChange={open => !open && setShowResults(false)}>
      <DialogContent className="max-w-md">
        <DialogHeader className="items-center text-center">
          <div className={`mb-2 inline-flex rounded-full p-3 ${passed ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-rose-50 dark:bg-rose-950/30'}`}>
            {passed
              ? <Award className="h-7 w-7 text-emerald-500" />
              : <BookOpen className="h-7 w-7 text-rose-400" />}
          </div>
          <DialogTitle className="text-xl">
            {isPerfect ? 'Perfect Score! 🎉' : passed ? 'You Passed!' : 'Keep Practicing'}
          </DialogTitle>
          <DialogDescription>
            {practiceMode ? 'Practice Session Complete' : 'Exam Submitted'}
          </DialogDescription>
        </DialogHeader>

        {/* Score */}
        <div className={`rounded-xl border p-5 text-center ${passed ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20' : 'border-rose-200/60 bg-rose-50/50 dark:border-rose-900/30 dark:bg-rose-950/10'}`}>
          <div className={`text-5xl font-black tabular-nums ${passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
            {pct}%
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{correctCount} / {totalQ} correct</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border bg-emerald-50/60 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/20 p-3 text-center">
            <CheckCircle className="mx-auto mb-1 h-4 w-4 text-emerald-500" />
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{correctCount}</div>
            <div className="text-[11px] text-muted-foreground font-medium">Correct</div>
          </div>
          <div className="rounded-lg border bg-rose-50/60 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/20 p-3 text-center">
            <XCircle className="mx-auto mb-1 h-4 w-4 text-rose-400" />
            <div className="text-lg font-bold text-rose-500 dark:text-rose-400">{totalQ - correctCount}</div>
            <div className="text-[11px] text-muted-foreground font-medium">Wrong</div>
          </div>
          {practiceMode && (
            <>
              <div className="rounded-lg border bg-card p-3 text-center">
                <div className="text-lg font-black text-violet-600 dark:text-violet-400">🔥 {practiceBestStreak}</div>
                <div className="text-[11px] text-muted-foreground font-medium">Best Streak</div>
              </div>
              <div className="rounded-lg border bg-card p-3 text-center">
                <div className="text-lg font-black text-primary">{practiceRevealedIds.size}</div>
                <div className="text-[11px] text-muted-foreground font-medium">Answered</div>
              </div>
            </>
          )}
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setShowResults(false)}>
            Review Answers
          </Button>
          <Button className="flex-1 gap-2" onClick={handleRetake}>
            <RefreshCw className="h-4 w-4" /> Retake
          </Button>
        </div>

        {wrongIds.length > 0 && (
          <Button
            variant="outline"
            className="w-full gap-2 border-amber-400 text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:border-amber-600 dark:text-amber-400 dark:hover:bg-amber-950/20"
            onClick={() => { savedRef.current = false; startPractice(wrongIds); setShowResults(false); }}
          >
            <Target className="h-4 w-4" />
            Retry Mistakes ({wrongIds.length} question{wrongIds.length !== 1 ? 's' : ''})
          </Button>
        )}

        <Button
          variant="ghost"
          className="w-full text-xs text-muted-foreground"
          onClick={() => { setShowResults(false); showExamSelect(); }}
        >
          Choose Different Exam
        </Button>
      </DialogContent>
    </Dialog>
  );
}
