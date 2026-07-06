import { useLiveQuery } from 'dexie-react-hooks';
import {
  Check, ChevronLeft, RotateCcw, Settings, Shuffle, Sparkles, X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BUILT_IN_FLASHCARD_SETS, loadBuiltInSetCards } from '../flashcard-sets';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { db } from '../db';
import { useApp } from '../context/AppContext';
import { masteryFor, orderSmart, recordCardResult, type MasteryStats } from '@/lib/flashcard-sr';
import { fireConfetti } from '@/lib/confetti';
import type { Flashcard, FlashcardProgress } from '../types';

const LS_FLIP = 'fc_flip_direction';
const LS_SHUFFLE = 'fc_shuffle';
const LS_STUDY_MODE = 'fc_study_mode';
const SWIPE_THRESHOLD = 80;

const sessionKey = (setId: number) => `fc_session_${setId}`;
interface SavedSession {
  deckIds: number[];
  knownIds: number[];
  stillLearningIds: number[];
  roundCardIds: number[];
  startedAt: number;
}

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
  imageUrl: string | null;
  imageOnFront: boolean; // true = image shows on the front face; false = back face
  flipped: boolean;
  snapFlip: boolean;
  dragX: number;
  isDragging: boolean;
  onFlip: () => void;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
}

const CARD_HEIGHT = 280;

function FlipCard({ front, back, imageUrl, imageOnFront, flipped, snapFlip, dragX, isDragging, onFlip, onPointerDown, onPointerMove, onPointerUp }: FlipCardProps) {
  const swipePct = Math.min(Math.abs(dragX) / SWIPE_THRESHOLD, 1);

  return (
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

      {/* Perspective wrapper */}
      <div className="absolute inset-0" style={{ perspective: '1200px' }}>
        {/* 3-D flip container */}
        <div
          className="absolute inset-0"
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateY(${flipped ? 180 : 0}deg)`,
            transition: snapFlip ? 'none' : 'transform 0.45s cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          {/* Front face */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border-2 bg-card p-8 text-center overflow-auto"
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' } as React.CSSProperties}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Term</p>
            {imageUrl && imageOnFront ? (
              <>
                <img src={imageUrl} alt="" className="max-h-20 rounded-lg object-contain shrink-0" />
                {front && <p className="mt-2 text-sm sm:text-base leading-snug whitespace-pre-wrap">{front}</p>}
              </>
            ) : (
              <p className="text-xl sm:text-2xl font-bold leading-snug">{front}</p>
            )}
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
            {imageUrl && !imageOnFront && (
              <img src={imageUrl} alt="" className="max-h-20 mb-2 rounded-lg object-contain shrink-0" />
            )}
            {back && (
              <p className="text-lg sm:text-xl leading-relaxed whitespace-pre-wrap">{back}</p>
            )}
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
  studyMode: 'classic' | 'smart';
  onFlipChange: (v: 'front-first' | 'back-first') => void;
  onShuffleChange: (v: boolean) => void;
  onStudyModeChange: (v: 'classic' | 'smart') => void;
  onClose: () => void;
}

function SettingsPanel({ flipDirection, shuffle, studyMode, onFlipChange, onShuffleChange, onStudyModeChange, onClose }: SettingsPanelProps) {
  const smart = studyMode === 'smart';
  return (
    <div className="absolute right-0 top-10 z-30 w-72 rounded-xl border bg-popover shadow-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Study Settings</p>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}><X className="h-3.5 w-3.5" /></Button>
      </div>
      <Separator />

      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Study Mode</p>
        <div className="flex flex-col gap-2">
          {(['classic', 'smart'] as const).map(opt => (
            <button
              key={opt}
              onClick={() => onStudyModeChange(opt)}
              className={cn(
                'flex items-start gap-2 rounded-lg border p-2.5 text-sm text-left transition-colors',
                studyMode === opt
                  ? 'border-primary bg-primary/5 text-primary font-medium'
                  : 'border-border hover:bg-accent',
              )}
            >
              <span className={cn('mt-0.5 h-3.5 w-3.5 rounded-full border-2 flex-shrink-0', studyMode === opt ? 'border-primary bg-primary' : 'border-muted-foreground')} />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5">
                  {opt === 'smart' && <Sparkles className="h-3.5 w-3.5" />}
                  {opt === 'classic' ? 'Classic' : 'Smart review'}
                </span>
                <span className="block text-[11px] font-normal text-muted-foreground leading-snug mt-0.5">
                  {opt === 'classic'
                    ? 'Go through the deck in order.'
                    : 'Surfaces due & weakest cards first (spaced repetition).'}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Card Order</p>
        <div className="flex items-center justify-between">
          <label className={cn('text-sm', smart ? 'text-muted-foreground/50' : 'cursor-pointer')} htmlFor="fc-shuffle">Shuffle cards</label>
          <Switch id="fc-shuffle" checked={shuffle && !smart} disabled={smart} onCheckedChange={onShuffleChange} />
        </div>
        {smart && <p className="text-[11px] text-muted-foreground">Order is handled by Smart review.</p>}
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
  stillLearningCount: number;
  mastery: MasteryStats;
  pastSessions: import('../types').FlashcardSession[];
  onRestartAll: () => void;
  onRestartMissed: () => void;
}

function CompletionScreen({ total, knownCount, stillLearningCount, mastery, pastSessions, onRestartAll, onRestartMissed }: CompletionProps) {
  const pct = Math.round((knownCount / total) * 100);
  // pastSessions includes the session just completed (saved before this renders)
  const history = pastSessions.slice(0, 5);
  const masteryPct = mastery.total > 0 ? Math.round((mastery.mastered / mastery.total) * 100) : 0;

  const confettiFiredRef = useRef(false);
  useEffect(() => {
    if (pct === 100 && !confettiFiredRef.current) {
      confettiFiredRef.current = true;
      fireConfetti();
    }
  }, [pct]);
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-6 text-center max-w-sm mx-auto">
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
        {stillLearningCount > 0 && (
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-destructive">{stillLearningCount}</span> still learning
          </p>
        )}
      </div>
      <div className="w-full space-y-1">
        <Progress value={pct} className="h-3" />
        <p className="text-xs text-muted-foreground">{pct}% known this round</p>
      </div>

      {/* Overall mastery across the whole set (spaced repetition) */}
      <div className="w-full rounded-xl border bg-card p-4 space-y-2 text-left">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Set mastery
          </span>
          <span className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{masteryPct}%</span>
        </div>
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(mastery.mastered / Math.max(1, mastery.total)) * 100}%` }} />
          <div className="h-full bg-amber-400 transition-all" style={{ width: `${(mastery.learning / Math.max(1, mastery.total)) * 100}%` }} />
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />{mastery.mastered} mastered</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />{mastery.learning} learning</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-border" />{mastery.fresh} new</span>
        </div>
        <p className="text-[11px] text-muted-foreground/70 leading-snug">
          This is separate from "known this round" — a card is mastered after several
          correct reviews spread across sessions, not in a single pass.
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full">
        {stillLearningCount > 0 && (
          <Button className="w-full gap-2" onClick={onRestartMissed}>
            <RotateCcw className="h-4 w-4" /> Review {stillLearningCount} still learning
          </Button>
        )}
        <Button variant={stillLearningCount > 0 ? 'outline' : 'default'} className="w-full gap-2" onClick={onRestartAll}>
          <Shuffle className="h-4 w-4" /> Restart all cards
        </Button>
      </div>

      {history.length > 0 && (
        <div className="w-full text-left space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Past sessions</p>
          <div className="space-y-1.5">
            {history.map((s, i) => {
              const sessionPct = Math.round((s.knownCount / s.total) * 100);
              const date = new Date(s.finishedAt);
              const label = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              const mins = Math.round(s.durationMs / 60000);
              return (
                <div key={s.id ?? i} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">{label} · {mins > 0 ? `${mins}m` : '<1m'}</p>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${sessionPct}%` }} />
                    </div>
                  </div>
                  <span className={cn('text-sm font-semibold tabular-nums', sessionPct === 100 ? 'text-emerald-500' : 'text-foreground')}>
                    {sessionPct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Main study screen ----
export default function FlashcardStudyScreen() {
  const { currentFlashcardSetId, showFlashcards } = useApp();

  const isBuiltIn = currentFlashcardSetId !== null && currentFlashcardSetId < 0;

  // Built-in set data (loaded from JS file)
  const [builtInName, setBuiltInName] = useState<string>('');
  const [builtInCards, setBuiltInCards] = useState<Flashcard[]>([]);
  const [builtInError, setBuiltInError] = useState<string | null>(null);

  useEffect(() => {
    if (!isBuiltIn || currentFlashcardSetId === null) return;
    const def = BUILT_IN_FLASHCARD_SETS.find(s => s.id === currentFlashcardSetId);
    if (def) setBuiltInName(def.name);
    loadBuiltInSetCards(currentFlashcardSetId)
      .then(cards => {
        setBuiltInCards(cards.map((c, i) => ({ id: i + 1, setId: currentFlashcardSetId, front: c.front, back: c.back, order: i, imagePath: c.imagePath, imageOn: c.imageOn })));
      })
      .catch(err => {
        setBuiltInError(String(err));
        setBuiltInCards([]);
      });
  }, [currentFlashcardSetId, isBuiltIn]);

  // DB set data (only used when not built-in)
  const dbSetData = useLiveQuery(
    () => (!isBuiltIn && currentFlashcardSetId) ? db.flashcardSets.get(currentFlashcardSetId) : undefined,
    [currentFlashcardSetId, isBuiltIn],
  );
  const dbCards = useLiveQuery(
    () => (!isBuiltIn && currentFlashcardSetId)
      ? db.flashcards.where('setId').equals(currentFlashcardSetId).sortBy('order')
      : Promise.resolve([]),
    [currentFlashcardSetId, isBuiltIn],
    [],
  ) as Flashcard[];

  // Memoized so built-in sets get a stable object reference across renders —
  // `{ name: builtInName }` as an inline literal would be a new object every
  // render, which re-triggers any effect that depends on setData.
  const setData = useMemo(
    () => (isBuiltIn ? { name: builtInName } : dbSetData),
    [isBuiltIn, builtInName, dbSetData],
  );
  const rawCards: Flashcard[] = isBuiltIn ? builtInCards : dbCards;

  // Settings (persisted)
  const [flipDirection, setFlipDirectionState] = useState<'front-first' | 'back-first'>(
    () => (localStorage.getItem(LS_FLIP) as 'front-first' | 'back-first') ?? 'front-first',
  );
  const [shuffle, setShuffleState] = useState(() => localStorage.getItem(LS_SHUFFLE) === 'true');
  const [studyMode, setStudyModeState] = useState<'classic' | 'smart'>(
    () => (localStorage.getItem(LS_STUDY_MODE) as 'classic' | 'smart') ?? 'classic',
  );
  const [showSettings, setShowSettings] = useState(false);

  function setFlipDirection(v: 'front-first' | 'back-first') {
    setFlipDirectionState(v);
    localStorage.setItem(LS_FLIP, v);
  }
  function setShuffle(v: boolean) {
    setShuffleState(v);
    localStorage.setItem(LS_SHUFFLE, String(v));
  }
  // studyModeRef is set eagerly (not via effect) so buildDeck reads the new value
  // immediately when the user switches modes and we rebuild the deck.
  const studyModeRef = useRef(studyMode);
  function setStudyMode(v: 'classic' | 'smart') {
    setStudyModeState(v);
    studyModeRef.current = v;
    localStorage.setItem(LS_STUDY_MODE, v);
  }

  // Study state
  const [deck, setDeck] = useState<Flashcard[]>([]);
  // roundCards = the cards for THIS round (may be a subset when reviewing still-learning)
  const [roundCards, setRoundCards] = useState<Flashcard[]>([]);
  const [knownIds, setKnownIds] = useState<Set<number>>(new Set());
  const [stillLearningIds, setStillLearningIds] = useState<Set<number>>(new Set());
  const [flipped, setFlipped] = useState(false);
  // When advancing cards, snap the flip back instantly (no animation) so the next
  // card's content doesn't bleed through during the flip-back transition.
  const [snapFlip, setSnapFlip] = useState(false);
  const [sessionStartedAt, setSessionStartedAt] = useState<number>(Date.now());
  const [isSubRound, setIsSubRound] = useState(false);

  // Past sessions for this set (for history on completion screen)
  const pastSessions = useLiveQuery(
    () => currentFlashcardSetId
      ? db.flashcardSessions
          .where('setId').equals(currentFlashcardSetId)
          .toArray()
          .then(rows => rows.sort((a, b) => b.finishedAt - a.finishedAt).slice(0, 5))
      : Promise.resolve([]),
    [currentFlashcardSetId],
    [],
  );

  // Per-card spaced-repetition progress for this set. Kept in a ref so buildDeck
  // can read the latest values without re-running (and re-ordering) on every write.
  const progressRows = useLiveQuery(
    () => currentFlashcardSetId != null
      ? db.flashcardProgress.where('setId').equals(currentFlashcardSetId).toArray()
      : Promise.resolve([]),
    [currentFlashcardSetId],
    [],
  ) as FlashcardProgress[];
  const progressRef = useRef<Map<number, FlashcardProgress>>(new Map());
  useEffect(() => {
    progressRef.current = new Map((progressRows ?? []).map(p => [p.cardId, p]));
  }, [progressRows]);

  // Derived
  const done = roundCards.length > 0 && deck.length === 0;
  const current = deck[0];
  const front = flipDirection === 'front-first' ? (current?.front ?? '') : (current?.back ?? '');
  const back  = flipDirection === 'front-first' ? (current?.back ?? '')  : (current?.front ?? '');
  // Image appears on the FlipCard front face when card's imageOn side matches
  // the currently displayed side. In back-first mode the sides are swapped, so
  // imageOn:'front' (card data) means image shows on the FlipCard back face.
  const cardImageOn = current?.imageOn ?? 'front';
  const imageOnFront =
    (flipDirection === 'front-first' && cardImageOn === 'front') ||
    (flipDirection === 'back-first'  && cardImageOn === 'back');

  // Blob URL for user-created cards (needs lifecycle management for revocation).
  // Built-in cards use imagePath directly in render — no state lag.
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  useEffect(() => {
    if (current?.image) {
      const url = URL.createObjectURL(current.image);
      setBlobUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setBlobUrl(null);
  }, [current?.id]);

  // Derived synchronously so it always matches current in the same render frame.
  const imageUrl = current?.imagePath ?? blobUrl;

  // Keep a ref to shuffle so the rawCards effect always reads the current value
  // without needing shuffle as a dep (which would re-run it on every toggle).
  const shuffleRef = useRef(shuffle);
  useEffect(() => { shuffleRef.current = shuffle; }, [shuffle]);

  // Swipe/drag state
  const [dragX, setDragX] = useState(0);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const didDragRef = useRef(false);

  // Build deck — also sets roundCards so progress/stats are scoped to this round.
  // Pass clearSaved=true when the user explicitly restarts (clears the resume state).
  const buildDeck = useCallback((cards: Flashcard[], doShuffle: boolean, clearSaved = false, subRound = false) => {
    const ordered = studyModeRef.current === 'smart'
      ? orderSmart(cards, progressRef.current, Date.now())
      : (doShuffle ? shuffleArray(cards) : [...cards]);
    setRoundCards(cards);
    setDeck(ordered);
    setKnownIds(new Set());
    setStillLearningIds(new Set());
    setFlipped(false);
    setSnapFlip(false);
    setSessionStartedAt(Date.now());
    setIsSubRound(subRound);
    if (clearSaved && currentFlashcardSetId != null) {
      localStorage.removeItem(sessionKey(currentFlashcardSetId));
    }
  }, [currentFlashcardSetId]);

  useEffect(() => {
    if (!rawCards.length || currentFlashcardSetId == null) return;
    const saved = localStorage.getItem(sessionKey(currentFlashcardSetId));
    if (saved) {
      try {
        const s: SavedSession = JSON.parse(saved);
        const cardMap = new Map(rawCards.map(c => [c.id!, c]));
        const deckCards = s.deckIds.map(id => cardMap.get(id)).filter((c): c is Flashcard => !!c);
        const roundCardList = s.roundCardIds.map(id => cardMap.get(id)).filter((c): c is Flashcard => !!c);
        if (deckCards.length > 0) {
          setDeck(deckCards);
          setRoundCards(roundCardList.length ? roundCardList : rawCards);
          setKnownIds(new Set(s.knownIds));
          setStillLearningIds(new Set(s.stillLearningIds));
          setSessionStartedAt(s.startedAt);
          setFlipped(false);
          setSnapFlip(false);
          return;
        }
      } catch {
        localStorage.removeItem(sessionKey(currentFlashcardSetId));
      }
    }
    buildDeck(rawCards, shuffleRef.current);
  }, [rawCards, currentFlashcardSetId]); // shuffleRef always current; not a dep to avoid re-running on toggle

  // Advance to next card: snap the flip back instantly (no animation), then on the
  // next two frames (after the snap has painted) swap the card. This prevents the
  // next card's back-face content from showing during the flip-back animation.
  const advance = useCallback((id: number, known: boolean) => {
    setSnapFlip(true);   // disable flip transition
    setFlipped(false);   // instant snap to front face
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (known) setKnownIds(prev => new Set([...prev, id]));
        else       setStillLearningIds(prev => new Set([...prev, id]));
        setDeck(prev => prev.slice(1));
        setSnapFlip(false); // restore transition for the new card
      });
    });
  }, []);

  // Persist session state to localStorage after every advance so the user can resume.
  useEffect(() => {
    if (currentFlashcardSetId == null || !roundCards.length || done) return;
    if (!deck.length) return;
    const session: SavedSession = {
      deckIds: deck.map(c => c.id!),
      knownIds: [...knownIds],
      stillLearningIds: [...stillLearningIds],
      roundCardIds: roundCards.map(c => c.id!),
      startedAt: sessionStartedAt,
    };
    localStorage.setItem(sessionKey(currentFlashcardSetId), JSON.stringify(session));
  }, [deck, knownIds, stillLearningIds, done, currentFlashcardSetId, roundCards, sessionStartedAt]);

  // When a full round completes, save a history record and clear the resume state.
  // Sub-rounds (reviewing still-learning cards) are not counted as new sessions.
  // savedForRoundRef guards against re-saving: `done` can stay true across several
  // re-renders (e.g. live queries like pastSessions/progressRows updating), and
  // without this guard the effect would insert a duplicate row on each of them.
  const savedForRoundRef = useRef(false);
  useEffect(() => {
    if (!done) { savedForRoundRef.current = false; return; }
    if (currentFlashcardSetId == null || !roundCards.length || isSubRound || savedForRoundRef.current) return;
    savedForRoundRef.current = true;
    db.flashcardSessions.add({
      setId: currentFlashcardSetId,
      setName: setData?.name ?? '',
      finishedAt: Date.now(),
      durationMs: Date.now() - sessionStartedAt,
      knownCount: knownIds.size,
      stillLearningCount: stillLearningIds.size,
      total: roundCards.length,
    });
    localStorage.removeItem(sessionKey(currentFlashcardSetId));
  }, [done, currentFlashcardSetId, roundCards, sessionStartedAt, knownIds, stillLearningIds, setData, isSubRound]);

  // Mark got it: advance to next card, record as known + promote its SR box
  const markGotIt = useCallback(() => {
    if (!current?.id) return;
    if (currentFlashcardSetId != null) recordCardResult(currentFlashcardSetId, current.id, true);
    advance(current.id, true);
  }, [current, advance, currentFlashcardSetId]);

  // Mark still learning: advance to next card, record as still-learning + reset SR box.
  // At completion, user can review all still-learning cards
  const markStillLearning = useCallback(() => {
    if (!current?.id) return;
    if (currentFlashcardSetId != null) recordCardResult(currentFlashcardSetId, current.id, false);
    advance(current.id, false);
  }, [current, advance, currentFlashcardSetId]);

  // Skip: move current card to end of deck without marking it either way
  const skip = useCallback(() => {
    setDeck(prev => prev.length > 1 ? [...prev.slice(1), prev[0]] : prev);
  }, []);

  // Pointer handlers
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
  }, [flipped, done, current, markGotIt, markStillLearning]);

  if (builtInError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="font-semibold text-destructive">Failed to load flashcard set</p>
        <p className="text-sm text-muted-foreground">{builtInError}</p>
        <Button variant="outline" onClick={showFlashcards}>Go Back</Button>
      </div>
    );
  }

  if (!setData || !rawCards) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const total = roundCards.length;
  const knownCount = knownIds.size;
  const stillLearningCount = stillLearningIds.size;
  const seenCount = knownCount + stillLearningCount;
  const position = seenCount + 1; // 1-based position
  const mastery = masteryFor(rawCards.length, progressRows ?? []);

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
              studyMode={studyMode}
              onFlipChange={v => { setFlipDirection(v); buildDeck(roundCards.length ? roundCards : rawCards, shuffle, true); }}
              onShuffleChange={v => { setShuffle(v); buildDeck(roundCards.length ? roundCards : rawCards, v, true); }}
              onStudyModeChange={v => { setStudyMode(v); buildDeck(rawCards, shuffle, true); }}
              onClose={() => setShowSettings(false)}
            />
          )}
        </div>
      </div>

      {/* Progress */}
      {!done && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {knownCount > 0 && <span className="text-emerald-600 dark:text-emerald-400 font-medium">{knownCount} known</span>}
              {knownCount > 0 && stillLearningCount > 0 && ' · '}
              {stillLearningCount > 0 && <span className="text-destructive font-medium">{stillLearningCount} still learning</span>}
              {seenCount === 0 && `${total} cards`}
            </span>
            <span>{deck.length} remaining</span>
          </div>
          {/* Per-card strip — keyed to this round's cards, colored by ID */}
          <div className="flex gap-1">
            {roundCards.map((card) => {
              const id = card.id;
              const isKnown = id !== undefined && knownIds.has(id);
              const isStillLearning = id !== undefined && stillLearningIds.has(id);
              const isCurrent = id !== undefined && id === current?.id;
              return (
                <div
                  key={card.id ?? card.order}
                  className={cn(
                    'h-1.5 flex-1 rounded-full transition-colors duration-300',
                    isKnown ? 'bg-emerald-500' :
                    isStillLearning ? 'bg-destructive/60' :
                    isCurrent ? 'bg-primary' :
                    'bg-border',
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
          stillLearningCount={stillLearningCount}
          mastery={mastery}
          pastSessions={pastSessions ?? []}
          onRestartAll={() => buildDeck(rawCards, shuffle, true)}
          onRestartMissed={() => {
            const missed = rawCards.filter(c => c.id !== undefined && stillLearningIds.has(c.id!));
            if (missed.length) buildDeck(missed, shuffle, true, true);
          }}
        />
      ) : current ? (
        <>
          {/* Card position */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {position} / {total}
              </Badge>
              {studyMode === 'smart' && (
                <Badge variant="outline" className="text-xs gap-1 border-primary/40 text-primary bg-primary/5">
                  <Sparkles className="h-3 w-3" /> Smart
                </Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {flipDirection === 'front-first' ? 'Term → Definition' : 'Definition → Term'}
            </span>
          </div>

          {/* The flashcard */}
          <FlipCard
            front={front}
            back={back}
            imageUrl={imageUrl}
            imageOnFront={imageOnFront}
            flipped={flipped}
            snapFlip={snapFlip}
            dragX={dragX}
            isDragging={isDraggingRef.current && Math.abs(dragX) > 5}
            onFlip={handleFlip}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />

          {/* Action area */}
          {!flipped ? (
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs text-muted-foreground">
                <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono">Space</kbd> or tap card to flip
              </p>
              {deck.length > 1 && (
                <button
                  onClick={skip}
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                >
                  Skip →
                </button>
              )}
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
