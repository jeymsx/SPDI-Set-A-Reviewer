import { AlertTriangle, CheckCircle, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useWeakQuestions } from '../hooks/useProgress';
import { useExam } from '../context/ExamContext';

export default function WeakQuestionsTab() {
  const { exam, questions, startPractice } = useExam();
  const weak = useWeakQuestions(exam?.id ?? null);

  if (!exam) return null;

  if (!weak) {
    return (
      <div className="py-10 text-center">
        <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent mb-3" />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const weakWithText = weak
    .map(stat => {
      const q = questions.find(q => q.id === stat.questionId);
      return q ? { stat, q } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.stat.timesWrong - a.stat.timesWrong);

  if (weakWithText.length === 0) {
    return (
      <div className="py-10 text-center space-y-2">
        <CheckCircle className="mx-auto h-8 w-8 text-emerald-500/60" />
        <p className="text-sm font-medium text-muted-foreground">No weak questions yet</p>
        <p className="text-xs text-muted-foreground">
          Questions you answer wrong ≥2 times across any session will appear here.
        </p>
      </div>
    );
  }

  const weakIds = weakWithText.map(({ q }) => q.id);

  return (
    <div className="space-y-4">
      {/* Summary + CTA */}
      <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4" />
            {weakWithText.length} weak question{weakWithText.length !== 1 ? 's' : ''}
          </p>
          <p className="text-[11px] text-amber-700/80 dark:text-amber-400/70 mt-0.5">
            Wrong ≥2 times across all your sessions
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5 shrink-0 bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-700 dark:hover:bg-amber-600"
          onClick={() => startPractice(weakIds)}
        >
          <Target className="h-3.5 w-3.5" />
          Practice All
        </Button>
      </div>

      {/* Question list */}
      <div className="space-y-1.5 max-h-72 overflow-y-auto pr-0.5">
        {weakWithText.map(({ stat, q }) => {
          const total = stat.timesCorrect + stat.timesWrong;
          const wrongPct = Math.round((stat.timesWrong / total) * 100);
          return (
            <div
              key={stat.key}
              className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground leading-snug line-clamp-2">
                  {q.question}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-destructive"
                      style={{ width: `${wrongPct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground tabular-nums">{wrongPct}% wrong</span>
                </div>
              </div>
              <div className="shrink-0 text-right space-y-0.5">
                <Badge variant="destructive" className="text-[10px] px-1.5">
                  ✗ {stat.timesWrong}
                </Badge>
                {stat.timesCorrect > 0 && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ {stat.timesCorrect}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
