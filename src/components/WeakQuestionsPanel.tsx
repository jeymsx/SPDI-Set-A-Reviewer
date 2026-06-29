import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { useWeakQuestions } from '../hooks/useProgress';
import { useExam } from '../context/ExamContext';

export default function WeakQuestionsPanel() {
  const { exam, questions, navigateTo, indicesMap } = useExam();
  const weak = useWeakQuestions(exam?.id ?? null);

  if (!exam || !weak || weak.length === 0) return null;

  const weakWithText = weak
    .map(stat => {
      const q = questions.find(q => q.id === stat.questionId);
      return q ? { stat, q } : null;
    })
    .filter(Boolean) as Array<{ stat: typeof weak[0]; q: typeof questions[0] }>;

  if (weakWithText.length === 0) return null;

  function jumpToQuestion(qId: number) {
    const realIdx = questions.findIndex(q => q.id === qId);
    if (realIdx === -1) return;
    const virtualIdx = indicesMap.indexOf(realIdx);
    if (virtualIdx !== -1) navigateTo(virtualIdx);
  }

  return (
    <>
      <Separator />
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between gap-2 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 hover:text-amber-800">
            <span className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4" />
              Weak Questions
              <Badge variant="secondary" className="ml-1 bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                {weakWithText.length}
              </Badge>
            </span>
            <span className="text-xs text-muted-foreground">wrong ≥2×</span>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
            {weakWithText.map(({ stat, q }) => (
              <button
                key={stat.key}
                onClick={() => jumpToQuestion(q.id)}
                className="w-full text-left rounded-md px-3 py-2 hover:bg-muted transition-colors flex items-start justify-between gap-2"
              >
                <p className="text-xs text-foreground line-clamp-2 flex-1">
                  {q.question.substring(0, 90)}{q.question.length > 90 ? '…' : ''}
                </p>
                <Badge variant="destructive" className="shrink-0 text-[10px]">✗{stat.timesWrong}</Badge>
              </button>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </>
  );
}
