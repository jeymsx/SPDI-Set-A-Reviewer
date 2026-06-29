import { Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useExam } from '../context/ExamContext';

export default function WelcomeCard() {
  const { exam, questions } = useExam();
  if (!exam) return null;

  const total = questions.length || exam.questionCount;
  const passMin = Math.ceil(total * 0.7);

  return (
    <Card className="bg-accent/40 border-primary/20">
      <CardContent className="py-3 px-4 flex items-start gap-3">
        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div className="space-y-0.5 text-xs">
          <p className="font-semibold text-foreground">{exam.title}</p>
          <p className="text-muted-foreground">{exam.description}</p>
          <p className="text-muted-foreground">Passing score: <span className="font-semibold text-foreground">70% ({passMin}/{total})</span></p>
        </div>
      </CardContent>
    </Card>
  );
}
