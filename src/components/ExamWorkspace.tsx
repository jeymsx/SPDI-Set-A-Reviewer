import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useExam } from '../context/ExamContext';
import QuestionView from './QuestionView';
import Sidebar from './Sidebar';

export default function ExamWorkspace() {
  const { loading, error, retryLoad, isGraded, practiceMode, submitExam, currentQuestion } = useExam();

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
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="space-y-4">
          <QuestionView />
          {!isGraded && !practiceMode && currentQuestion && (
            <div className="flex justify-end">
              <Button onClick={submitExam} className="gap-2">
                <Send className="h-4 w-4" /> Submit Exam
              </Button>
            </div>
          )}
        </div>
        <Sidebar />
      </div>
    </div>
  );
}
