import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useExam } from '../context/ExamContext';
import QuestionView from './QuestionView';
import Sidebar from './Sidebar';
import WelcomeCard from './WelcomeCard';

export default function ExamWorkspace() {
  const { loading, error, isGraded, practiceMode, submitExam } = useExam();

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
      <div className="flex items-center justify-center py-24 text-center space-y-2">
        <div>
          <p className="font-semibold text-destructive">Failed to load questions</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <WelcomeCard />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="space-y-4">
          <QuestionView />
          {!isGraded && !practiceMode && (
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
