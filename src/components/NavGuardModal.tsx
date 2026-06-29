import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useApp } from '../context/AppContext';
import { useExam } from '../context/ExamContext';

export default function NavGuardModal() {
  const { navGuardPending, navGuardConfirm, navGuardCancel } = useApp();
  const { practiceMode, timerDuration } = useExam();

  const message = practiceMode
    ? 'Your practice session progress is saved. You can continue later.'
    : timerDuration > 0
    ? 'Your timer will pause. Progress is saved — you can resume later.'
    : 'Your progress is saved and you can resume this exam later.';

  return (
    <AlertDialog open={!!navGuardPending} onOpenChange={open => !open && navGuardCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave exam?</AlertDialogTitle>
          <AlertDialogDescription>{message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={navGuardCancel}>Stay</AlertDialogCancel>
          <AlertDialogAction onClick={navGuardConfirm}>Leave</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
