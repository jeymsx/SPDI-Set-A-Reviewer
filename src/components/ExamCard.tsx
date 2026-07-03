import { useMemo } from 'react';
import { CheckCircle2, Circle, Tag } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { tagColorClass } from '@/lib/tags';
import { useReviewed, toggleReviewed } from '@/lib/reviewed';
import { db } from '../db';
import { makeKeys } from '../context/ExamContext';
import type { Exam } from '../types';

interface Props {
  exam: Exam;
  onClick: () => void;
  onEditTags: () => void;
}

export default function ExamCard({ exam, onClick, onEditTags }: Props) {
  const takes = useLiveQuery(
    () => db.takes.where('examId').equals(exam.id).toArray(),
    [exam.id],
    [],
  );

  const tagRecord = useLiveQuery(() => db.tags.get('exam:' + exam.id), [exam.id]);
  const tags = tagRecord?.tags ?? [];

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

  const isInProgress = useMemo(() => {
    const k = makeKeys(exam.id);
    const started = localStorage.getItem(k.started) === 'true';
    const graded = localStorage.getItem(k.graded) === 'true';
    return started && !graded;
  }, [exam.id]);

  const reviewed = useReviewed('exam', exam.id);

  return (
    <Card
      onClick={onClick}
      className={cn(
        'group cursor-pointer overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-lg flex flex-col h-full',
        reviewed && 'ring-1 ring-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/10',
      )}
    >
      <CardContent className="p-5 space-y-3 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-bold text-[15px] leading-snug text-card-foreground">
            {exam.title}
          </h3>
          <div className="flex items-center gap-1.5 shrink-0">
            {reviewed && (
              <Badge variant="outline" className="border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-[10px] px-1.5 gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Reviewed
              </Badge>
            )}
            {isInProgress && !reviewed && (
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

        {/* Tags row */}
        <div
          className="flex flex-wrap items-center gap-1.5 min-h-[22px]"
          onClick={e => e.stopPropagation()}
        >
          {tags.map(tag => (
            <span key={tag} className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', tagColorClass(tag))}>
              {tag}
            </span>
          ))}
          <button
            onClick={onEditTags}
            className="rounded-full p-0.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 hover:text-foreground hover:bg-muted transition-all"
            title="Edit tags"
          >
            <Tag className="h-3 w-3" />
          </button>
        </div>

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

        {/* Reviewed toggle */}
        <button
          onClick={e => { e.stopPropagation(); toggleReviewed('exam', exam.id); }}
          className={cn(
            'flex items-center justify-center gap-1.5 rounded-md border py-1.5 text-xs font-medium transition-colors',
            reviewed
              ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/20 hover:bg-emerald-100/60 dark:hover:bg-emerald-950/40'
              : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30',
          )}
        >
          {reviewed
            ? <><CheckCircle2 className="h-3.5 w-3.5" /> Reviewed — tap to unmark</>
            : <><Circle className="h-3.5 w-3.5" /> Mark as reviewed</>}
        </button>
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
