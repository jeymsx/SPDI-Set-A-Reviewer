import { useLiveQuery } from 'dexie-react-hooks';
import {
  ArrowLeft, Check, ChevronLeft, RotateCcw, Settings, Shuffle, X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { db } from '../db';
import { useApp } from '../context/AppContext';
import type { Flashcard } from '../types';

const LS_FLIP = 'fc_flip_direction';
const LS_SHUFFLE = 'fc_shuffle';
const SWIPE_THRESHOLD = 80;

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---- Flip card ----
interface FlipCardProps {
  front: string;
  back: string;
  flipped: boolean;
  dragX: number;
  isDragging: boolean;
  onFlip: () => void;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
}

const CARD_HEIGHT = 280;

function FlipCard({ front, back, flipped, dragX, isDragging, onFlip, onPointerDown, onPointerMove, onPointerUp }: FlipCardProps) {
  const swipePct = Math.min(Math.abs(dragX) / SWIPE_THRESHOLD, 1);

  return (
    /* Outer: handles drag translation. Must be relative so overlays stay inside. */
    <div
      className="relative select-none touch-none cursor-pointer"
      style={{
        height: CARD_HEIGHT,
        transform: `translateX(${dragX}px) rotate(${dragX * 0.04}deg)`,
        transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={!isDragging ? onFlip : undefined}
    >
      {/* Swipe overlay: green (right = got it) */}
      {dragX > 0 && (
        <div
          className="absolute inset-0 z-10 rounded-2xl flex items-center justify-start pl-6 pointer-events-none overflow-hidden"
          style={{ opacity: swipePct }}
        >
          <div className="rounded-full bg-emerald-500 p-3">
            <Check className="h-6 w-6 text-white" strokeWidth={3} />
          </div>
          <div className="absolute inset-0 bg-emerald-500/20 rounded-2xl" />
        </div>
      )}

      {/* Swipe overlay: red (left = still learning) */}
      {dragX < 0 && (
        <div
          className="absolute inset-0 z-10 rounded-2xl flex items-center justify-end pr-6 pointer-events-none overflow-hidden"
          style={{ opacity: swipePct }}
        >
          <div className="rounded-full bg-destructive p-3">
            <X className="h-6 w-6 text-white" strokeWidth={3} />
          </div>
          <div className="absolute inset-0 bg-destructive/20 rounded-2xl" />
        </div>
      )}

      {/* Perspective wrapper — must be sized to fill the outer div */}
      <div className="absolute inset-0" style={{ perspective: '1200px' }}>
        {/* 3-D flip container — must be relative so absolute children are contained */}
        <div
          className="absolute inset-0"
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateY(${flipped ? 180 : 0}deg)`,
            transition: 'transform 0.45s cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          {/* Front face */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border-2 bg-card p-8 text-center overflow-auto"
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' } as React.CSSProperties}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Term</p>
            <p className="text-xl sm:text-2xl font-bold leading-snug">{front}</p>
            <p className="text-xs text-muted-foreground mt-6">tap to reveal</p>
          </div>

          {/* Back face */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border-2 border-primary/30 bg-primary/5 p-8 text-center overflow-auto"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            } as React.CSSProperties}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-primary/70 mb-4">Definition</p>
            <p className="text-lg sm:text-xl leading-relaxed">{back}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Settings panel ----
interface SettingsPanelProps {
  flipDirection: 'front-first' | 'back-first';
  shuffle: boolean;
  onFlipChange: (v: 'front-first' | 'back-first') => void;
  onShuffleChange: (v: boolean) => void;
  onClose: () => void;
}

function SettingsPanel({ flipDirection, shuffle, onFlipChange, onShuffleChange, onClose }: SettingsPanelProps) {
  return (
    <div className="absolute right-0 top-10 z-30 w-72 rounded-xl border bg-popover shadow-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Study Settings</p>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}><X className="h-3.5 w-3.5" /></Button>
      </div>
      <Separator />

      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Card Order</p>
        <div className="flex items-center justify-between">
          <label className="text-sm cursor-pointer" htmlFor="fc-shuffle">Shuffle cards</label>
          <Switch id="fc-shuffle" checked={shuffle} onCheckedChange={onShuffleChange} />
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Show First</p>
        <div className="flex flex-col gap-2">
          {(['front-first', 'back-first'] as const).map(opt => (
            <button
              key={opt}
              onClick={() => onFlipChange(opt)}
              className={cn(
                'flex items-center gap-2 rounded-lg border p-2.5 text-sm text-left transition-colors',
                flipDirection === opt
                  ? 'border-primary bg-primary/5 text-primary font-medium'
                  : 'border-border hover:bg-accent',
              )}
            >
              <span className={cn('h-3.5 w-3.5 rounded-full border-2 flex-shrink-0', flipDirection === opt ? 'border-primary bg-primary' : 'border-muted-foreground')} />
              {opt === 'front-first' ? 'Term → Definition' : 'Definition → Term'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- Completion screen ----
interface CompletionProps {
  total: number;
  knownCount: number;
  onRestartAll: () => void;
  onRestartMissed: () => void;
}

function CompletionScreen({ total, knownCount, onRestartAll, onRestartMissed }: CompletionProps) {
  const pct = Math.round((knownCount / total) * 100);
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-6 text-center max-w-sm mx-auto">
      <div className={cn(
        'rounded-full p-6',
        pct === 100 ? 'bg-emerald-100 dark:bg-emerald-950/40' : 'bg-amber-100 dark:bg-amber-950/40',
      )}>
        <Check className={cn('h-10 w-10', pct === 100 ? 'text-emerald-500' : 'text-amber-500')} strokeWidth={2.5} />
      </div>
      <div className="space-y-1">
        <h2 className="text-2xl font-bold">{pct === 100 ? 'Perfect!' : 'Round complete'}</h2>
        <p className="text-muted-foreground">
          You knew <span className="font-semibold text-foreground">{knownCount}</span> of <span className="font-semibold text-foreground">{total}</span> cards
        </p>
      </div>
      <div className="w-full space-y-1">
        <Progress value={pct} className="h-3" />
        <p className="text-xs text-muted-foreground">{pct}% known</p>
      </div>
      <div className="flex flex-col gap-3 w-full">
        {knownCount < total && (
          <Button className="w-full gap-2" onClick={onRestartMissed}>
            <RotateCcw className="h-4 w-4" /> Review {total - knownCount} missed cards
          </Button>
        )}
        <Button variant={knownCount < total ? 'outline' : 'default'} className="w-full gap-2" onClick={onRestartAll}>
          <Shuffle className="h-4 w-4" /> Restart all cards
        </Button>
      </div>
    </div>
  );
}

// ---- Main study screen ----
export default function FlashcardStudyScreen() {
  const { currentFlashcardSetId, showFlashcards } = useApp();

  const setData = useLiveQuery(
    () => currentFlashcardSetId ? db.flashcardSets.get(currentFlashcardSetId) : undefined,
    [currentFlashcardSetId],
  );
  const rawCards = useLiveQuery(
    () => currentFlashcardSetId
      ? db.flashcards.where('setId').equals(currentFlashcardSetId).sortBy('order')
      : Promise.resolve([]),
    [currentFlashcardSetId],
    [],
  ) as Flashcard[];

  // Settings (persisted)
  const [flipDirection, setFlipDirectionState] = useState<'front-first' | 'back-first'>(
    () => (localStorage.getItem(LS_FLIP) as 'front-first' | 'back-first') ?? 'front-first',
  );
  const [shuffle, setShuffleState] = useState(() => localStorage.getItem(LS_SHUFFLE) === 'true');
  const [showSettings, setShowSettings] = useState(false);

  function setFlipDirection(v: 'front-first' | 'back-first') {
    setFlipDirectionState(v);
    localStorage.setItem(LS_FLIP, v);
  }
  function setShuffle(v: boolean) {
    setShuffleState(v);
    localStorage.setItem(LS_SHUFFLE, String(v));
  }

  // Study state
  const [deck, setDeck] = useState<Flashcard[]>([]);
  const [knownIds, setKnownIds] = useState<Set<number>>(new Set());
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);

  // Swipe/drag state
  const [dragX, setDragX] = useState(0);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const didDragRef = useRef(false);

  // Build deck from raw cards
  const buildDeck = useCallback((cards: Flashcard[], doShuffle: boolean) => {
    const ordered = doShuffle ? shuffleArray(cards) : [...cards];
    setDeck(ordered);
    setKnownIds(new Set());
    setFlipped(false);
    setDone(false);
  }, []);

  useEffect(() => {
    if (rawCards.length) buildDeck(rawCards, shuffle);
  }, [rawCards, buildDeck]); // don't include shuffle here — only rebuild on data change

  const current = deck[0];
  const front = flipDirection === 'front-first' ? (current?.front ?? '') : (current?.back ?? '');
  const back  = flipDirection === 'front-first' ? (current?.back ?? '')  : (current?.front ?? '');

  function markGotIt() {
    if (!current?.id) return;
    const newKnown = new Set([...knownIds, current.id]);
    setKnownIds(newKnown);
    const next = deck.slice(1);
    if (!next.length) { setDone(true); return; }
    setDeck(next);
    setFlipped(false);
  }

  function markStillLearning() {
    if (!current) return;
    const rest = deck.slice(1);
    // insert current card at a random position in the remaining deck (at least 1 ahead)
    const insertAt = rest.length > 1 ? 1 + Math.floor(Math.random() * (rest.length - 1)) : rest.length;
    const next = [...rest.slice(0, insertAt), current, ...rest.slice(insertAt)];
    setDeck(next);
    setFlipped(false);
  }

  // Pointer handlers (works for mouse + touch)
  function handlePointerDown(e: React.PointerEvent) {
    isDraggingRef.current = true;
    didDragRef.current = false;
    startXRef.current = e.clientX;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isDraggingRef.current || !flipped) return;
    const delta = e.clientX - startXRef.current;
    if (Math.abs(delta) > 5) didDragRef.current = true;
    setDragX(delta);
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    const delta = e.clientX - startXRef.current;
    if (Math.abs(delta) > SWIPE_THRESHOLD && flipped) {
      if (delta > 0) markGotIt();
      else markStillLearning();
    }
    setDragX(0);
  }

  function handleFlip() {
    if (didDragRef.current) { didDragRef.current = false; return; }
    setFlipped(f => !f);
  }

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!done && current) setFlipped(f => !f); }
      if (e.key === 'ArrowRight' && flipped && !done) markGotIt();
      if (e.key === 'ArrowLeft' && flipped && !done) markStillLearning();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped, done, current]);

  if (!setData || !rawCards) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const total = rawCards.length;
  const knownCount = knownIds.size;
  const remaining = deck.length;
  const progressPct = total > 0 ? Math.round((knownCount / total) * 100) : 0;
  const position = total - remaining + 1;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-16">
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={showFlashcards}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-base truncate">{setData.name}</h1>
        </div>
        <div className="relative shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowSettings(s => !s)}>
            <Settings className="h-4 w-4" />
          </Button>
          {showSettings && (
            <SettingsPanel
              flipDirection={flipDirection}
              shuffle={shuffle}
              onFlipChange={v => { setFlipDirection(v); buildDeck(rawCards, shuffle); }}
              onShuffleChange={v => { setShuffle(v); buildDeck(rawCards, v); }}
              onClose={() => setShowSettings(false)}
            />
          )}
        </div>
      </div>

      {/* Progress */}
      {!done && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{knownCount} known · {remaining} remaining</span>
            <span>{progressPct}%</span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: total }).map((_, i) => {
              const cardId = rawCards[i]?.id;
              const isKnown = cardId !== undefined && knownIds.has(cardId);
              const isCurrent = !done && i === total - remaining;
              return (
                <div
                  key={i}
                  className={cn(
                    'h-1.5 flex-1 rounded-full transition-colors duration-300',
                    isKnown ? 'bg-emerald-500' : isCurrent ? 'bg-primary' : 'bg-border',
                  )}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Completion */}
      {done ? (
        <CompletionScreen
          total={total}
          knownCount={knownCount}
          onRestartAll={() => buildDeck(rawCards, shuffle)}
          onRestartMissed={() => {
            const missed = rawCards.filter(c => c.id && !knownIds.has(c.id));
            if (missed.length) {
              const ordered = shuffle ? shuffleArray(missed) : missed;
              setDeck(ordered);
              setKnownIds(new Set());
              setFlipped(false);
              setDone(false);
            }
          }}
        />
      ) : current ? (
        <>
          {/* Card position */}
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-xs">
              {position} / {total}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {flipDirection === 'front-first' ? 'Term → Definition' : 'Definition → Term'}
            </span>
          </div>

          {/* The flashcard */}
          <FlipCard
            front={front}
            back={back}
            flipped={flipped}
            dragX={dragX}
            isDragging={isDraggingRef.current && Math.abs(dragX) > 5}
            onFlip={handleFlip}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />

          {/* Action area */}
          {!flipped ? (
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono">Space</kbd> or tap card to flip
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 gap-2 h-12 border-destructive/40 text-destructive hover:bg-destructive/5 hover:border-destructive hover:text-destructive"
                  onClick={markStillLearning}
                >
                  <X className="h-4 w-4" strokeWidth={2.5} /> Still Learning
                </Button>
                <Button
                  className="flex-1 gap-2 h-12 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={markGotIt}
                >
                  <Check className="h-4 w-4" strokeWidth={2.5} /> Got It
                </Button>
              </div>
              <p className="text-center text-xs text-muted-foreground">
                <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono">←</kbd> Still learning
                {' '}·{' '}
                <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono">→</kbd> Got it
                {' '}· swipe on mobile
              </p>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
