import { useEffect, useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, CheckCircle, XCircle, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { db } from '../db';
import { useApp } from '../context/AppContext';
import { EXAMS, loadExamData } from '../exams';
import ChoiceButton from './ChoiceButton';
import type { Question, Take } from '../types';

type Filter = 'all' | 'wrong' | 'correct' | 'unanswered';

export default function TakeReviewScreen() {
  const { currentTakeId, setScreen } = useApp();

  const [take, setTake] = useState<Take | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!currentTakeId) return;
    setLoading(true);
    setError(null);
    setCurrentIdx(0);

    db.takes.get(currentTakeId).then(async t => {
      if (!t) { setError('Take record not found.'); setLoading(false); return; }
      setTake(t);
      const exam = EXAMS.find(e => e.id === t.examId);
      if (!exam) { setError('Exam definition not found.'); setLoading(false); return; }
      try {
        const qs = await loadExamData(exam);
        setQuestions(qs);
      } catch (e) {
        setError(String(e));
      }
      setLoading(false);
    });
  }, [currentTakeId, retryKey]);

  // Keyboard navigation (clamp happens via safeIdx in render)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') setCurrentIdx(i => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setCurrentIdx(i => i + 1);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center space-y-3">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading review…</p>
        </div>
      </div>
    );
  }

  if (error || !take) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">{error ?? 'Something went wrong.'}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setRetryKey(k => k + 1)}>Try Again</Button>
          <Button variant="ghost" onClick={() => setScreen('start')}>Go Back</Button>
        </div>
      </div>
    );
  }

  const answers = take.answers ?? {};
  const hasAnswerData = Object.keys(answers).length > 0;

  // Build filtered + searched indices
  const filteredIndices = questions
    .map((q, i) => ({ q, i }))
    .filter(({ q }) => {
      const chosen = answers[q.id];
      if (filter === 'wrong') return chosen !== undefined && chosen !== q.correctAnswer;
      if (filter === 'correct') return chosen === q.correctAnswer;
      if (filter === 'unanswered') return chosen === undefined;
      return true;
    })
    .filter(({ q }) => {
      const sq = search.trim().toLowerCase();
      return !sq || q.question.toLowerCase().includes(sq);
    })
    .map(({ i }) => i);

  const safeIdx = Math.min(currentIdx, Math.max(0, filteredIndices.length - 1));
  const realIdx = filteredIndices[safeIdx] ?? 0;
  const q = questions[realIdx];

  const totalQ = questions.length;
  const correctCount = take.score;
  const wrongCount = totalQ - correctCount;
  const pct = Math.round((correctCount / totalQ) * 100);
  const passed = pct >= 70;

  const date = new Date(take.startedAt);
  const dateStr = date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });

  function goTo(virtualIdx: number) {
    setCurrentIdx(Math.max(0, Math.min(virtualIdx, filteredIndices.length - 1)));
  }

  const FILTER_OPTS: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: questions.length },
    { key: 'wrong', label: 'Wrong', count: questions.filter(q => answers[q.id] !== undefined && answers[q.id] !== q.correctAnswer).length },
    { key: 'correct', label: 'Correct', count: questions.filter(q => answers[q.id] === q.correctAnswer).length },
    { key: 'unanswered', label: 'Skipped', count: questions.filter(q => answers[q.id] === undefined).length },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-16">
      {/* Top bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground -ml-2 shrink-0"
          onClick={() => setScreen('start')}
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-base leading-tight truncate">{take.examTitle}</h2>
          <p className="text-[11px] text-muted-foreground capitalize">
            {take.mode} mode · {dateStr} {timeStr}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge
            variant="outline"
            className={cn(
              'tabular-nums font-bold text-sm px-3 py-1',
              passed
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
                : 'border-destructive text-destructive bg-destructive/5',
            )}
          >
            {pct}% · {correctCount}/{totalQ}
          </Badge>
          <Badge variant={passed ? 'default' : 'destructive'} className="shrink-0">
            {passed ? 'Passed' : 'Failed'}
          </Badge>
        </div>
      </div>

      {/* Score bar */}
      <Progress value={pct} className="h-1.5" />

      {!hasAnswerData && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3 flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>This take was recorded before answer data was saved. Question-level review is unavailable — only the score summary is shown.</span>
        </div>
      )}

      {hasAnswerData && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
          {/* Left: question view */}
          <div className="space-y-4">
            {/* Filter + search */}
            <div className="flex flex-wrap gap-2 items-center">
              {FILTER_OPTS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => { setFilter(opt.key); setCurrentIdx(0); }}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium border transition-all',
                    filter === opt.key
                      ? opt.key === 'wrong'
                        ? 'bg-destructive text-white border-destructive'
                        : opt.key === 'correct'
                          ? 'bg-emerald-500 text-white border-emerald-500'
                          : 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground',
                  )}
                >
                  {opt.label} ({opt.count})
                </button>
              ))}
            </div>

            {filteredIndices.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  No questions match this filter.
                </CardContent>
              </Card>
            ) : q ? (
              <Card>
                <CardContent className="pt-5 space-y-4">
                  {/* Question header */}
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide shrink-0">
                      Question {safeIdx + 1} of {filteredIndices.length}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {answers[q.id] === q.correctAnswer
                        ? <CheckCircle className="h-4 w-4 text-emerald-500" />
                        : answers[q.id] !== undefined
                          ? <XCircle className="h-4 w-4 text-destructive" />
                          : <span className="text-xs text-muted-foreground">Skipped</span>}
                    </div>
                  </div>

                  {/* Question text */}
                  <p className="text-sm font-medium leading-relaxed">{q.question}</p>

                  {/* Image */}
                  {q.image && (
                    <img
                      src={q.image}
                      alt="Question"
                      className="rounded-lg border max-w-sm mx-auto"
                    />
                  )}

                  {/* Choices */}
                  <div className="space-y-2">
                    {q.choices.map((choice, i) => (
                      <ChoiceButton
                        key={i}
                        choice={choice}
                        index={i}
                        question={q}
                        selectedAnswer={answers[q.id]}
                        isGraded={true}
                        practiceMode={false}
                        isRevealed={true}
                        onSelect={() => {}}
                      />
                    ))}
                  </div>

                  {/* Feedback */}
                  {q.feedback && (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-foreground/80 leading-relaxed">
                      <span className="font-semibold text-primary text-xs uppercase tracking-wide block mb-1">Explanation</span>
                      {q.feedback}
                    </div>
                  )}

                  {/* Prev / Next */}
                  <div className="flex justify-between pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goTo(safeIdx - 1)}
                      disabled={safeIdx === 0}
                      className="gap-1.5"
                    >
                      <ChevronLeft className="h-4 w-4" /> Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goTo(safeIdx + 1)}
                      disabled={safeIdx >= filteredIndices.length - 1}
                      className="gap-1.5"
                    >
                      Next <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>

          {/* Right: navigator */}
          <div className="lg:sticky lg:top-6 space-y-3">
            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border bg-card p-2.5 text-center">
                <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">{correctCount}</div>
                <div className="text-[10px] text-muted-foreground font-medium">Correct</div>
              </div>
              <div className="rounded-lg border bg-card p-2.5 text-center">
                <div className="text-lg font-black text-destructive">{wrongCount}</div>
                <div className="text-[10px] text-muted-foreground font-medium">Wrong</div>
              </div>
              <div className="rounded-lg border bg-card p-2.5 text-center">
                <div className="text-lg font-black text-muted-foreground">
                  {questions.filter(q => answers[q.id] === undefined).length}
                </div>
                <div className="text-[10px] text-muted-foreground font-medium">Skipped</div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground font-medium">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-emerald-500" />Correct</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-destructive" />Wrong</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-muted-foreground/30" />Skipped</span>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search questions…"
                value={search}
                onChange={e => { setSearch(e.target.value); setCurrentIdx(0); }}
                className="pl-8 h-8 text-xs"
              />
            </div>

            {/* Grid */}
            <div className="max-h-[360px] overflow-y-auto">
              <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-6 gap-1.5">
                {filteredIndices.map((realI, virtualI) => {
                  const thisQ = questions[realI];
                  const chosen = thisQ ? answers[thisQ.id] : undefined;
                  const isCorrectQ = thisQ && chosen === thisQ.correctAnswer;
                  const isWrongQ = thisQ && chosen !== undefined && chosen !== thisQ.correctAnswer;
                  const isCurrent = virtualI === safeIdx;

                  return (
                    <button
                      key={realI}
                      onClick={() => goTo(virtualI)}
                      title={thisQ?.question.substring(0, 60)}
                      className={cn(
                        'aspect-square rounded-md text-[11px] font-bold transition-all',
                        isCurrent && 'ring-2 ring-primary ring-inset bg-primary text-primary-foreground',
                        !isCurrent && isCorrectQ && 'bg-emerald-500 text-white hover:bg-emerald-600',
                        !isCurrent && isWrongQ && 'bg-destructive text-white hover:bg-destructive/90',
                        !isCurrent && !isCorrectQ && !isWrongQ && 'bg-muted text-muted-foreground hover:bg-muted/80',
                      )}
                    >
                      {virtualI + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
