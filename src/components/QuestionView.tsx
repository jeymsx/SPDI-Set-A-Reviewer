import { Bookmark, BookmarkCheck, CheckCircle, ChevronLeft, ChevronRight, XCircle } from 'lucide-react';
import { useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useApp } from '../context/AppContext';
import { useExam } from '../context/ExamContext';
import ChoiceButton from './ChoiceButton';

export default function QuestionView() {
  const { guardedNavigation } = useApp();
  const {
    exam, returnToStart,
    currentQuestion, currentIdx, indicesMap,
    userAnswers, setAnswer, isGraded,
    practiceMode, practiceAnswers, practiceRevealedIds, setPracticeAnswer, finishPractice,
    navigateNext, navigatePrev,
    shuffledChoicesFor,
    bookmarks, toggleBookmark,
    reviewIncorrectOnly, reviewBookmarkedOnly, setReviewIncorrect, setReviewBookmarked,
  } = useExam();

  const q = currentQuestion;

  // No question to show. If a Navigator filter emptied the list, explain it here
  // in the main panel instead of leaving a blank column next to the sidebar.
  if (!q) {
    const filterActive = reviewIncorrectOnly || reviewBookmarkedOnly;
    if (!filterActive) return null;
    return (
      <Card>
        <CardContent className="py-14 flex flex-col items-center text-center gap-3">
          <div className="rounded-full bg-muted p-3">
            <Bookmark className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold">No questions match this filter</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              {reviewIncorrectOnly && reviewBookmarkedOnly
                ? "You have no wrong or bookmarked questions in this set yet."
                : reviewIncorrectOnly
                  ? "Nothing's marked wrong yet — answer some questions or grade the exam first."
                  : "You haven't bookmarked any questions in this set yet."}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setReviewIncorrect(false); setReviewBookmarked(false); }}
          >
            Show all questions
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isFirst = currentIdx === 0;
  const isLast = currentIdx === indicesMap.length - 1;
  const isRevealed = practiceRevealedIds.has(q.id);
  const selectedAnswer = practiceMode ? practiceAnswers[q.id] : userAnswers[q.id];
  const isBookmarked = !!bookmarks[q.id];
  const choices = shuffledChoicesFor(q);

  const answeredCount = practiceMode ? Object.keys(practiceAnswers).length : Object.keys(userAnswers).length;
  const totalQ = indicesMap.length;
  const progressPct = totalQ > 0 ? Math.round((answeredCount / totalQ) * 100) : 0;

  function handleSelect(choice: string) {
    if (practiceMode && !isRevealed) setPracticeAnswer(q!.id, choice);
    else if (!practiceMode && !isGraded) setAnswer(q!.id, choice);
  }

  function handleNext() {
    if (isLast && practiceMode && isRevealed) finishPractice();
    else navigateNext();
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowLeft') navigatePrev();
      if (e.key === 'ArrowRight') { if (!practiceMode || isRevealed || !q) navigateNext(); }
      if (e.key === 'Enter') {
        // Let a focused button handle its own Enter (avoids double-advancing).
        if (tag === 'BUTTON') return;
        if (practiceMode) {
          // Can't skip ahead until the answer is revealed.
          if (isRevealed) { if (isLast) finishPractice(); else navigateNext(); }
        } else {
          navigateNext();
        }
      }
      if (['1','2','3','4','5','6','7','8','9'].includes(e.key)) {
        const idx = parseInt(e.key) - 1;
        if (choices[idx]) handleSelect(choices[idx]);
      }
      // Diagram-labeling questions can have more choices (letters) than the 1–9
      // shortcut reaches — let the matching letter key select that choice directly.
      if (/^[a-z]$/i.test(e.key)) {
        const match = choices.find(c => c.length === 1 && c.toUpperCase() === e.key.toUpperCase());
        if (match) handleSelect(match);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigatePrev, navigateNext, choices, practiceMode, isRevealed, isLast, finishPractice, q]);

  const showFeedback = (isGraded || (practiceMode && isRevealed)) && (q.feedback || selectedAnswer);
  const wasCorrect = selectedAnswer === q.correctAnswer;

  return (
    <div className="space-y-4">
      {/* Exam header */}
      <div className="flex items-start gap-2 pb-5 border-b border-border">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 -ml-2 mt-0.5"
          onClick={() => guardedNavigation(returnToStart)}
          title="Back to start screen"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1 min-w-0 space-y-2">
          {/* Title + mode badge */}
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-bold text-base leading-snug">{exam?.title}</h1>
            {practiceMode ? (
              <Badge variant="outline" className="shrink-0 gap-1.5 border-violet-400 text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/20">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
                Practice
              </Badge>
            ) : (
              <Badge variant="outline" className="shrink-0 gap-1.5 border-primary/40 text-primary bg-primary/5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Exam
              </Badge>
            )}
          </div>

          {/* Description */}
          {exam && (
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {exam.description}
            </p>
          )}

          {/* Passing threshold */}
          <p className="text-xs text-muted-foreground">
            Pass at{' '}
            <span className="font-semibold text-foreground">
              70% — {Math.ceil(totalQ * 0.7)} of {totalQ} correct
            </span>
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Question {currentIdx + 1} of {totalQ}</span>
          <span>{answeredCount}/{totalQ} answered ({progressPct}%)</span>
        </div>
        <Progress value={progressPct} className="h-1.5" />
      </div>

      {/* Question card */}
      <Card>
        {/* Question header */}
        <CardContent className="pt-5 pb-4 border-b">
          <div className="flex items-start justify-between gap-3 mb-4">
            <Badge variant="secondary" className="text-xs font-bold">
              Question {currentIdx + 1}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className={`h-7 w-7 shrink-0 ${isBookmarked ? 'text-amber-500' : 'text-muted-foreground hover:text-amber-500'}`}
              onClick={() => toggleBookmark(q.id)}
              title="Bookmark"
            >
              {isBookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            </Button>
          </div>

          {q.image && (
            <div className="mb-4 overflow-hidden rounded-lg border">
              <img src={q.image} alt="Question illustration" className="max-w-full h-auto" />
            </div>
          )}

          <p className="text-xl font-semibold leading-relaxed whitespace-pre-wrap">{q.question}</p>
        </CardContent>

        {/* Choices */}
        <CardContent className="py-4 space-y-2">
          {choices.map((choice, i) => (
            <ChoiceButton
              key={choice}
              choice={choice}
              index={i}
              question={q}
              selectedAnswer={selectedAnswer}
              isGraded={isGraded}
              practiceMode={practiceMode}
              isRevealed={isRevealed}
              onSelect={handleSelect}
            />
          ))}
        </CardContent>

        {/* Feedback */}
        {showFeedback && (
          <CardContent className="pt-0 pb-4">
            <div className={`rounded-lg border p-3.5 text-sm ${
              wasCorrect
                ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20'
                : 'border-destructive/30 bg-destructive/5'
            }`}>
              <div className="flex items-center gap-2 font-semibold mb-1">
                {wasCorrect
                  ? <><CheckCircle className="h-4 w-4 text-emerald-500" /><span className="text-emerald-700 dark:text-emerald-300">Correct!</span></>
                  : <><XCircle className="h-4 w-4 text-destructive" /><span className="text-destructive">Incorrect</span></>}
              </div>
              {!wasCorrect && (
                <p className="text-xs text-muted-foreground mb-1">
                  Correct answer: <span className="font-semibold text-emerald-700 dark:text-emerald-300">{q.correctAnswer}</span>
                </p>
              )}
              {q.feedback && <p className="text-xs text-muted-foreground whitespace-pre-wrap mt-1">{q.feedback}</p>}
            </div>
          </CardContent>
        )}

        {/* Navigation */}
        <CardContent className="pt-0 pb-5 flex items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={navigatePrev} disabled={isFirst} className="gap-1.5">
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
          <Button size="sm" onClick={handleNext} disabled={practiceMode && !isRevealed && !isLast} className="gap-1.5">
            {isLast && practiceMode && isRevealed ? 'Finish' : 'Next'} <ChevronRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      {/* Keyboard shortcut hint — desktop only */}
      <p className="hidden sm:flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
        <span>Tip:</span>
        {choices.length > 0 && choices.every(c => c.length === 1) ? (
          <>
            <span>press the letter</span>
            <span>to answer</span>
          </>
        ) : (
          <>
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">1</kbd>–
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">{Math.min(choices.length, 9)}</kbd>
            <span>to answer</span>
          </>
        )}
        <span className="text-muted-foreground/50">·</span>
        <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">←</kbd>
        <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">→</kbd>
        <span>to move</span>
        <span className="text-muted-foreground/50">·</span>
        <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">Enter</kbd>
        <span>next</span>
      </p>
    </div>
  );
}
