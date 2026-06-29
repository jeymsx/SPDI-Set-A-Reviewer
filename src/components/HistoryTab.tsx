import { CheckCircle, Clock, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useExamHistory } from '../hooks/useProgress';
import { useExam } from '../context/ExamContext';

export default function HistoryTab() {
  const { exam } = useExam();
  const history = useExamHistory(exam?.id ?? null);

  if (!exam) return null;

  if (!history || history.length === 0) {
    return (
      <div className="py-10 text-center space-y-2">
        <Clock className="mx-auto h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm font-medium text-muted-foreground">No attempts yet</p>
        <p className="text-xs text-muted-foreground">Complete a session to see your history here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
      {history.map(take => {
        const pct = Math.round((take.score / take.total) * 100);
        const passed = pct >= 70;
        const date = new Date(take.startedAt);
        const dateStr = date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
        const timeStr = date.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
        const duration = take.timeUsedMs ? `${Math.round(take.timeUsedMs / 60000)}m` : null;

        return (
          <div key={take.id} className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-3">
              {passed
                ? <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                : <XCircle className="h-4 w-4 text-destructive shrink-0" />}
              <div>
                <p className="text-xs font-semibold">{dateStr} · {timeStr}</p>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <span className="capitalize">{take.mode} mode</span>
                  {duration && <span>· {duration}</span>}
                </p>
              </div>
            </div>
            <div className="text-right">
              <Badge variant={passed ? 'default' : 'destructive'} className="tabular-nums text-xs">
                {take.score}/{take.total}
              </Badge>
              <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">{pct}%</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
