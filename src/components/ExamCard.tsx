import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { db } from '../db';
import type { Exam } from '../types';

interface Props {
  exam: Exam;
  onClick: () => void;
}

export default function ExamCard({ exam, onClick }: Props) {
  const takes = useLiveQuery(
    () => db.takes.where('examId').equals(exam.id).toArray(),
    [exam.id],
    [],
  );

  const bestPct = takes && takes.length > 0
    ? Math.max(...takes.map(t => Math.round((t.score / t.total) * 100)))
    : null;

  const lastPct = takes && takes.length > 0
    ? (() => {
        const t = [...takes].sort((a, b) => b.startedAt - a.startedAt)[0];
        return Math.round((t.score / t.total) * 100);
      })()
    : null;

  const scoreBadgeClass =
    bestPct === null ? '' :
    bestPct >= 70 ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30' :
    bestPct >= 50 ? 'border-amber-400 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30' :
    'border-destructive text-destructive bg-destructive/5';

  const barColor =
    bestPct === null ? 'bg-transparent' :
    bestPct >= 70 ? 'bg-emerald-500' :
    bestPct >= 50 ? 'bg-amber-400' :
    'bg-destructive';

  const lastDotColor =
    lastPct === null ? null :
    lastPct >= 70 ? 'bg-emerald-500' :
    lastPct >= 50 ? 'bg-amber-400' :
    'bg-destructive';

  // Check if this exam has an in-progress session (started but not graded)
  const isInProgress = useMemo(() => {
    const started = localStorage.getItem(`${exam.id}_exam_started`) === 'true';
    const graded = localStorage.getItem(`${exam.id}_is_graded`) === 'true';
    return started && !graded;
  }, [exam.id]);

  return (
    <Card
      onClick={onClick}
      className="group cursor-pointer overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-lg flex flex-col h-full"
    >
      <CardContent className="p-5 space-y-3 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-bold text-[15px] leading-snug text-card-foreground">
            {exam.title}
          </h3>
          <div className="flex items-center gap-1.5 shrink-0">
            {isInProgress && (
              <Badge variant="outline" className="border-primary/40 text-primary bg-primary/5 text-[10px] px-1.5 gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                In Progress
              </Badge>
            )}
            {bestPct !== null && (
              <Badge variant="outline" className={`tabular-nums font-bold ${scoreBadgeClass}`}>
                {bestPct}%
              </Badge>
            )}
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
          {exam.description}
        </p>

        <div className="flex items-center justify-between pt-0.5 mt-auto">
          <span className="text-xs text-muted-foreground tabular-nums">
            {exam.questionCount} questions · 1 pt each
          </span>
          {lastDotColor && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={`h-1.5 w-1.5 rounded-full ${lastDotColor}`} />
              last run
            </span>
          )}
        </div>
      </CardContent>

      {/* Score bar */}
      <div className="h-[3px] bg-border">
        {bestPct !== null && (
          <div
            className={`h-full transition-[width] duration-700 ${barColor}`}
            style={{ width: `${bestPct}%` }}
          />
        )}
      </div>
    </Card>
  );
}
