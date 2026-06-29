import { Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useExam } from '../context/ExamContext';

export default function WelcomeCard() {
  const { exam, questions, welcomeDismissed, dismissWelcome } = useExam();
  if (welcomeDismissed || !exam) return null;

  const total = questions.length || exam.questionCount;
  const passMin = Math.ceil(total * 0.7);

  return (
    <Card className="bg-accent/40 border-primary/20">
      <CardContent className="py-3 px-4 flex items-start gap-3">
        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div className="flex-1 space-y-0.5 text-xs">
          <p className="font-semibold text-foreground">{exam.title}</p>
          <p className="text-muted-foreground">{exam.description}</p>
          <p className="text-muted-foreground">Passing score: <span className="font-semibold text-foreground">70% ({passMin}/{total})</span></p>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 self-start text-muted-foreground" onClick={dismissWelcome}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}
