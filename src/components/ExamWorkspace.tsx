import { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useExam } from '../context/ExamContext';
import { useTimer } from '../hooks/useTimer';
import QuestionView from './QuestionView';
import Sidebar from './Sidebar';
import ExamTimer from './ExamTimer';

export default function ExamWorkspace() {
  const {
    loading, error, retryLoad, isGraded, practiceMode, submitExam, currentQuestion,
    examStarted, timerDuration, timerEndTime,
    unansweredCount, navigateToFirstUnanswered,
  } = useExam();

  const [confirmSubmit, setConfirmSubmit] = useState(false);

  // Single authoritative timer instance for the whole workspace — drives both the
  // mobile sticky bar and the desktop sidebar block, so onExpire fires only once.
  const timerActive = examStarted && !isGraded && !practiceMode && timerDuration > 0;
  const timer = useTimer(timerEndTime, submitExam, timerActive);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center space-y-3">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading questions…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <p className="font-semibold text-destructive">Failed to load questions</p>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={retryLoad}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mobile sticky timer — the sidebar (with the desktop timer) sits below the
          question on small screens, so surface a slim countdown at the top instead. */}
      {timerActive && timer.formattedTime && (
        <div className="lg:hidden sticky top-14 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 bg-background/95 backdrop-blur border-b">
          <ExamTimer layout="bar" formattedTime={timer.formattedTime} isUrgent={timer.isUrgent} className="rounded-lg px-3 py-2" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="space-y-4">
          <QuestionView />
          {!isGraded && !practiceMode && currentQuestion && (
            <div className="flex justify-end">
              <Button onClick={() => setConfirmSubmit(true)} className="gap-2">
                <Send className="h-4 w-4" /> Submit Exam
              </Button>
            </div>
          )}
        </div>
        <Sidebar timer={timer} timerActive={timerActive} />
      </div>

      {/* Submit confirmation with an unanswered-question guard */}
      <AlertDialog open={confirmSubmit} onOpenChange={setConfirmSubmit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit exam?</AlertDialogTitle>
            <AlertDialogDescription>
              {unansweredCount > 0
                ? `You still have ${unansweredCount} unanswered question${unansweredCount === 1 ? '' : 's'}. Unanswered questions are marked incorrect. You can't change answers after submitting.`
                : "You've answered every question. You can't change answers after submitting."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {/* Stacked, full-width actions — three buttons don't fit in a row on
              the narrow dialog. Primary on top, cancel at the bottom. */}
          <AlertDialogFooter className="flex-col sm:flex-col gap-2">
            <Button className="w-full" onClick={() => { setConfirmSubmit(false); submitExam(); }}>
              {unansweredCount > 0 ? 'Submit anyway' : 'Submit'}
            </Button>
            {unansweredCount > 0 && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => { setConfirmSubmit(false); navigateToFirstUnanswered(); }}
              >
                Review unanswered
              </Button>
            )}
            <AlertDialogCancel className="w-full mt-0">Keep working</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
