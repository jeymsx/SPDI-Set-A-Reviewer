import { AlertTriangle, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  formattedTime: string;
  isUrgent: boolean;
  layout?: 'card' | 'bar';
  className?: string;
}

// Presentational exam countdown. `card` = the sidebar block (stacked),
// `bar` = the slim mobile sticky row. Timer logic lives in the parent so a
// single useTimer instance drives both and only fires onExpire once.
export default function ExamTimer({ formattedTime, isUrgent, layout = 'card', className }: Props) {
  const tone = isUrgent
    ? 'border-destructive/60 bg-destructive/10 dark:bg-destructive/20'
    : 'border-primary/30 bg-primary/5 dark:bg-primary/10';

  if (layout === 'bar') {
    return (
      <div className={cn('flex items-center gap-2.5 border', tone, className)}>
        <Timer className={cn('h-4 w-4 shrink-0', isUrgent ? 'text-destructive animate-pulse' : 'text-primary')} />
        <span className={cn(
          'text-[11px] font-semibold uppercase tracking-wider flex-1 min-w-0 truncate',
          isUrgent ? 'text-destructive' : 'text-primary/70',
        )}>
          {isUrgent ? 'Time running out' : 'Time remaining'}
        </span>
        <span className={cn(
          'font-mono font-black tabular-nums text-lg leading-none',
          isUrgent ? 'text-destructive' : 'text-foreground',
        )}>
          {formattedTime}
        </span>
        {isUrgent && <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-3 border', tone, className)}>
      <Timer className={cn('h-5 w-5 shrink-0', isUrgent ? 'text-destructive animate-pulse' : 'text-primary')} />
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-[11px] font-semibold uppercase tracking-widest',
          isUrgent ? 'text-destructive' : 'text-primary/70',
        )}>
          {isUrgent ? 'Time running out' : 'Time remaining'}
        </p>
        <p className={cn(
          'font-mono font-black tabular-nums leading-none mt-0.5 text-2xl',
          isUrgent ? 'text-destructive' : 'text-foreground',
        )}>
          {formattedTime}
        </p>
      </div>
      {isUrgent && <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />}
    </div>
  );
}
