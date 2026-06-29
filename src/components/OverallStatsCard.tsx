import { useLiveQuery } from 'dexie-react-hooks';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { db } from '../db';

export default function OverallStatsCard() {
  const stats = useLiveQuery(async () => {
    const takes = await db.takes.toArray();
    if (!takes.length) return null;

    const totalSessions = takes.length;
    const uniqueExams = new Set(takes.map(t => t.examId)).size;
    const totalCorrect = takes.reduce((sum, t) => sum + t.score, 0);
    const totalAnswered = takes.reduce((sum, t) => sum + t.total, 0);
    const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
    const passed = takes.filter(t => Math.round((t.score / t.total) * 100) >= 70).length;
    const passRate = Math.round((passed / totalSessions) * 100);
    const bestScore = Math.max(...takes.map(t => Math.round((t.score / t.total) * 100)));
    const lastTake = [...takes].sort((a, b) => b.startedAt - a.startedAt)[0];
    const lastDate = new Date(lastTake.startedAt).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });

    return { totalSessions, uniqueExams, accuracy, passRate, bestScore, lastDate };
  }, []);

  if (!stats) return null;

  const scoreColor = (pct: number) =>
    pct >= 70 ? 'text-emerald-600 dark:text-emerald-400' :
    pct >= 50 ? 'text-amber-600 dark:text-amber-400' :
    'text-destructive';

  const barColor =
    stats.accuracy >= 70 ? 'bg-emerald-500' :
    stats.accuracy >= 50 ? 'bg-amber-400' :
    'bg-destructive';

  const tiles = [
    { label: 'Accuracy',    value: `${stats.accuracy}%`,   color: scoreColor(stats.accuracy) },
    { label: 'Pass rate',   value: `${stats.passRate}%`,   color: scoreColor(stats.passRate) },
    { label: 'Best score',  value: `${stats.bestScore}%`,  color: scoreColor(stats.bestScore) },
    { label: 'Exams tried', value: `${stats.uniqueExams}`, color: 'text-foreground' },
  ];

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="shrink-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Your Progress
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {stats.totalSessions} session{stats.totalSessions !== 1 ? 's' : ''} · Last active {stats.lastDate}
            </p>
          </div>

          <Separator orientation="vertical" className="hidden sm:block h-10 self-center" />

          <div className="flex sm:ml-auto divide-x divide-border">
            {tiles.map(tile => (
              <div key={tile.label} className="flex flex-col items-center px-5 first:pl-0 sm:first:pl-5 last:pr-0">
                <span className={`text-2xl font-black tabular-nums leading-none ${tile.color}`}>
                  {tile.value}
                </span>
                <span className="mt-1 text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                  {tile.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>

      <div className="h-[3px] bg-border">
        <div
          className={`h-full transition-[width] duration-700 ${barColor}`}
          style={{ width: `${stats.accuracy}%` }}
        />
      </div>
    </Card>
  );
}
