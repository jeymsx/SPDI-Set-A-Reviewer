import { Search } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useExam } from '../context/ExamContext';

export default function Navigator() {
  const {
    indicesMap, questions, currentIdx, navigateTo,
    userAnswers, isGraded,
    practiceMode, practiceAnswers, practiceRevealedIds,
    bookmarks,
    reviewBookmarkedOnly, reviewIncorrectOnly, setReviewBookmarked, setReviewIncorrect,
  } = useExam();

  const [search, setSearch] = useState('');

  function getButtonClass(virtualIdx: number) {
    const realIdx = indicesMap[virtualIdx];
    const q = questions[realIdx];
    if (!q) return 'bg-muted text-muted-foreground hover:bg-muted/80';

    const isCurrent = virtualIdx === currentIdx;
    const isBookmarked = bookmarks[q.id];

    if (practiceMode) {
      // Retry-until-correct: "revealed" only ever happens once the correct
      // choice has been found, so a revealed question is always a solve —
      // just distinguish a clean first-try solve from one that took retries.
      const revealed = practiceRevealedIds.has(q.id);
      const solvedFirstTry = revealed && practiceAnswers[q.id] === q.correctAnswer;
      if (isCurrent) return 'bg-primary text-primary-foreground outline outline-2 outline-primary/40 outline-offset-1';
      if (solvedFirstTry) return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400';
      if (revealed) return 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400';
      if (isBookmarked) return 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400';
      return 'bg-muted text-muted-foreground hover:bg-muted/80';
    }

    const answered = userAnswers[q.id] !== undefined;
    if (isCurrent) return 'bg-primary text-primary-foreground outline outline-2 outline-primary/40 outline-offset-1';
    if (isGraded) {
      if (answered && userAnswers[q.id] === q.correctAnswer) return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400';
      if (answered) return 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400';
      return 'bg-muted text-muted-foreground';
    }
    if (answered) return 'bg-primary/15 text-primary hover:bg-primary/25';
    if (isBookmarked) return 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400';
    return 'bg-muted text-muted-foreground hover:bg-muted/80';
  }

  const searchQuery = search.trim().toLowerCase();
  const filteredIndices = searchQuery
    ? indicesMap
        .map((realIdx, virtualIdx) => ({ realIdx, virtualIdx }))
        .filter(({ realIdx }) => questions[realIdx]?.question.toLowerCase().includes(searchQuery))
    : indicesMap.map((_, i) => ({ realIdx: indicesMap[i], virtualIdx: i }));

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground font-medium">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-primary/20 ring-1 ring-primary/40" />Answered</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-emerald-200 ring-1 ring-emerald-400 dark:bg-emerald-900/50" />Correct</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-red-200 ring-1 ring-red-400 dark:bg-red-900/50" />Wrong</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-amber-200 ring-1 ring-amber-400 dark:bg-amber-900/50" />Bookmarked</span>
      </div>

      {/* Filter toggles */}
      <div className="flex gap-2">
        <Button
          variant={reviewIncorrectOnly ? 'destructive' : 'outline'}
          size="sm"
          className="h-7 text-[11px] px-2.5"
          onClick={() => setReviewIncorrect(!reviewIncorrectOnly)}
        >
          Wrong only
        </Button>
        <Button
          variant={reviewBookmarkedOnly ? 'secondary' : 'outline'}
          size="sm"
          className={`h-7 text-[11px] px-2.5 ${reviewBookmarkedOnly ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300' : ''}`}
          onClick={() => setReviewBookmarked(!reviewBookmarkedOnly)}
        >
          Bookmarked
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search questions…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-8 h-8 text-xs"
        />
      </div>

      {/* Grid */}
      <div className="max-h-[280px] overflow-y-auto p-1 -m-1">
        {filteredIndices.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            {search.trim() ? 'No questions match your search.' : 'No questions match the active filter.'}
          </p>
        ) : (
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-6 gap-1.5">
            {filteredIndices.map(({ realIdx, virtualIdx }) => {
              const q = questions[realIdx];
              const isCurrent = virtualIdx === currentIdx;
              const isBookmarked = q ? !!bookmarks[q.id] : false;
              return (
                <button
                  key={virtualIdx}
                  onClick={() => navigateTo(virtualIdx)}
                  title={q ? q.question.substring(0, 60) : ''}
                  className={`aspect-square rounded-md text-[11px] font-bold transition-all relative ${getButtonClass(virtualIdx)}`}
                >
                  {virtualIdx + 1}
                  {isBookmarked && !isCurrent && (
                    <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-amber-400 ring-1 ring-white/60" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
