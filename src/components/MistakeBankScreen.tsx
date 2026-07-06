import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle, ChevronLeft, RotateCcw, Target, Trophy, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useApp } from '../context/AppContext';
import { loadMistakeBank, recordMistakeResult, shuffleDrill, type DrillQuestion } from '../lib/mistake-bank';
import { fireConfetti } from '@/lib/confetti';
import { playSound } from '@/lib/sounds';
import ChoiceButton from './ChoiceButton';

export default function MistakeBankScreen() {
  const { showExamSelect } = useApp();

  const [loading, setLoading] = useState(true);
  const [deck, setDeck] = useState<DrillQuestion[]>([]);
  const [idx, setIdx] = useState(0);

  // Per-question drill state, keyed by uid.
  const [firstAttempt, setFirstAttempt] = useState<Record<number, string>>({});
  const [wrongAttempts, setWrongAttempts] = useState<Record<number, string[]>>({});
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadMistakeBank().then(qs => {
      if (cancelled) return;
      setDeck(shuffleDrill(qs));
      setIdx(0);
      setFirstAttempt({});
      setWrongAttempts({});
      setRevealed(new Set());
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [reloadKey]);

  const total = deck.length;
  const current = deck[idx];
  const done = !loading && total > 0 && idx >= total;

  const solvedFirstTry = useMemo(
    () => deck.filter(d => revealed.has(d.uid) && firstAttempt[d.uid] === d.question.correctAnswer).length,
    [deck, revealed, firstAttempt],
  );
  const neededRetry = useMemo(
    () => deck.filter(d => revealed.has(d.uid) && firstAttempt[d.uid] !== d.question.correctAnswer).length,
    [deck, revealed, firstAttempt],
  );

  const isRevealed = current ? revealed.has(current.uid) : false;

  const handleSelect = useCallback((choice: string) => {
    if (!current || revealed.has(current.uid)) return;
    const uid = current.uid;
    const isCorrect = choice === current.question.correctAnswer;
    const isFirst = firstAttempt[uid] === undefined;

    playSound(isCorrect ? 'correct' : 'incorrect');

    if (isFirst) {
      setFirstAttempt(prev => ({ ...prev, [uid]: choice }));
      // First attempt updates the underlying exam stat, so the question can
      // graduate out of the bank once re-mastered.
      recordMistakeResult(current.examId, current.question.id, isCorrect);
    }

    if (isCorrect) {
      setRevealed(prev => new Set(prev).add(uid));
    } else {
      setWrongAttempts(prev => {
        const existing = prev[uid] ?? [];
        if (existing.includes(choice)) return prev;
        return { ...prev, [uid]: [...existing, choice] };
      });
    }
  }, [current, revealed, firstAttempt]);

  const next = useCallback(() => setIdx(i => i + 1), []);

  // Completion cue (sound + confetti on a clean sweep).
  const completionCuedRef = useRef(false);
  useEffect(() => {
    if (!done) { completionCuedRef.current = false; return; }
    if (completionCuedRef.current) return;
    completionCuedRef.current = true;
    playSound('roundComplete');
    if (neededRetry === 0) fireConfetti();
  }, [done, neededRetry]);

  // Keyboard: number/letter to answer, Enter/→ to advance once revealed.
  useEffect(() => {
    if (!current) return;
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const choices = current!.question.choices;
      if ((e.key === 'Enter' || e.key === 'ArrowRight') && revealed.has(current!.uid)) {
        if (tag !== 'BUTTON') next();
        return;
      }
      if (!revealed.has(current!.uid)) {
        if (/^[1-9]$/.test(e.key)) {
          const c = choices[parseInt(e.key) - 1];
          if (c) handleSelect(c);
        } else if (/^[a-z]$/i.test(e.key)) {
          const c = choices.find(ch => ch.length === 1 && ch.toUpperCase() === e.key.toUpperCase());
          if (c) handleSelect(c);
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, revealed, handleSelect, next]);

  // ---- render ----
  const backButton = (
    <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 -ml-2" onClick={showExamSelect} title="Back to exams">
      <ChevronLeft className="h-4 w-4" />
    </Button>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-16">
        <div className="flex items-center gap-3">
          {backButton}
          <h1 className="font-bold text-lg">Mistake Bank</h1>
        </div>
        <Card>
          <CardContent className="py-16 flex flex-col items-center text-center gap-3">
            <div className="rounded-full bg-emerald-100 dark:bg-emerald-950/40 p-4">
              <Trophy className="h-8 w-8 text-emerald-500" />
            </div>
            <p className="font-semibold text-lg">No mistakes to drill</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Questions you miss twice show up here so you can hammer them until they stick.
              Nothing's outstanding right now — take some exams and check back.
            </p>
            <Button className="mt-2" onClick={showExamSelect}>Back to exams</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (done) {
    const pct = Math.round((solvedFirstTry / total) * 100);
    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-16">
        <div className="flex items-center gap-3">
          {backButton}
          <h1 className="font-bold text-lg">Mistake Bank</h1>
        </div>
        <div className="flex flex-col items-center text-center gap-6 py-8 max-w-sm mx-auto">
          <div className={`rounded-full p-6 ${neededRetry === 0 ? 'bg-emerald-100 dark:bg-emerald-950/40' : 'bg-amber-100 dark:bg-amber-950/40'}`}>
            {neededRetry === 0
              ? <Trophy className="h-10 w-10 text-emerald-500" />
              : <Target className="h-10 w-10 text-amber-500" />}
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold">{neededRetry === 0 ? 'Cleared them all!' : 'Drill complete'}</h2>
            <p className="text-muted-foreground">
              <span className="font-semibold text-foreground">{solvedFirstTry}</span> of{' '}
              <span className="font-semibold text-foreground">{total}</span> right on the first try
            </p>
            {neededRetry > 0 && (
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-amber-600 dark:text-amber-400">{neededRetry}</span> needed another look — they'll stay in the bank
              </p>
            )}
          </div>
          <div className="w-full space-y-1">
            <Progress value={pct} className="h-3" />
            <p className="text-xs text-muted-foreground">{pct}% first-try</p>
          </div>
          <div className="flex flex-col gap-3 w-full">
            <Button className="w-full gap-2" onClick={() => setReloadKey(k => k + 1)}>
              <RotateCcw className="h-4 w-4" /> Drill remaining mistakes
            </Button>
            <Button variant="outline" className="w-full" onClick={showExamSelect}>Back to exams</Button>
          </div>
        </div>
      </div>
    );
  }

  const q = current.question;
  const missedFirstTry = isRevealed && firstAttempt[current.uid] !== q.correctAnswer;
  const showFeedback = isRevealed && (q.feedback || true);

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-16">
      {/* Header */}
      <div className="flex items-center gap-2 pb-4 border-b">
        {backButton}
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-amber-500" /> Mistake Bank
          </h1>
          <p className="text-xs text-muted-foreground">Questions you've missed, pulled from every exam</p>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Question {idx + 1} of {total}</span>
          <span>{solvedFirstTry} first-try · {neededRetry} shaky</span>
        </div>
        <Progress value={Math.round((idx / total) * 100)} className="h-1.5" />
      </div>

      {/* Question card */}
      <Card>
        <CardContent className="pt-5 pb-4 border-b space-y-3">
          <Badge variant="outline" className="text-[10px] border-amber-400/50 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20">
            from {current.examTitle}
          </Badge>
          {q.image && (
            <div className="overflow-hidden rounded-lg border">
              <img src={q.image} alt="Question illustration" className="max-w-full h-auto" />
            </div>
          )}
          <p className="text-xl font-semibold leading-relaxed whitespace-pre-wrap">{q.question}</p>
        </CardContent>

        <CardContent className="py-4 space-y-2">
          {q.choices.map((choice, i) => (
            <ChoiceButton
              key={choice}
              choice={choice}
              index={i}
              question={q}
              selectedAnswer={firstAttempt[current.uid]}
              isGraded={false}
              practiceMode
              isRevealed={isRevealed}
              triedWrong={!isRevealed && (wrongAttempts[current.uid]?.includes(choice) ?? false)}
              onSelect={handleSelect}
            />
          ))}
        </CardContent>

        {showFeedback && (
          <CardContent className="pt-0 pb-4">
            <div className="rounded-lg border p-3.5 text-sm border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <div className="flex items-center gap-2 font-semibold mb-1">
                {missedFirstTry
                  ? <><XCircle className="h-4 w-4 text-amber-500" /><span className="text-amber-700 dark:text-amber-400">Got there</span></>
                  : <><CheckCircle className="h-4 w-4 text-emerald-500" /><span className="text-emerald-700 dark:text-emerald-300">Correct!</span></>}
              </div>
              {q.feedback && <p className="text-xs text-muted-foreground whitespace-pre-wrap mt-1">{q.feedback}</p>}
            </div>
          </CardContent>
        )}

        <CardContent className="pt-0 pb-5 flex justify-end">
          <Button size="sm" onClick={next} disabled={!isRevealed} className="gap-1.5">
            {idx === total - 1 ? 'Finish' : 'Next'}
          </Button>
        </CardContent>
      </Card>

      {!isRevealed && (
        <p className="text-center text-xs text-muted-foreground">
          Pick the right answer to continue — wrong picks just get marked, keep trying.
        </p>
      )}
    </div>
  );
}
