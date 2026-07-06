import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Question } from '../types';

interface Props {
  choice: string;
  index: number;
  question: Question;
  selectedAnswer: string | undefined;
  isGraded: boolean;
  practiceMode: boolean;
  isRevealed: boolean;
  // Practice mode retry-until-correct: this choice has already been tried and
  // was wrong, but the correct answer hasn't been found yet — so it's disabled
  // and marked, without revealing the correct one or any feedback.
  triedWrong?: boolean;
  onSelect: (choice: string) => void;
}

// Supports any choice count (A, B, C, … Z) rather than a fixed 8-entry array —
// diagram-labeling questions can have well more than 8 lettered choices.
function labelFor(index: number): string {
  return index < 26 ? String.fromCharCode(65 + index) : String(index + 1);
}

export default function ChoiceButton({ choice, index, question, selectedAnswer, isGraded, practiceMode, isRevealed, triedWrong = false, onSelect }: Props) {
  const isSelected = selectedAnswer === choice;
  const isCorrect = choice === question.correctAnswer;
  const showResult = isGraded || (practiceMode && isRevealed);
  const isDisabled = isGraded || (practiceMode && (isRevealed || triedWrong));
  const label = labelFor(index);
  // When the choice text IS itself a single letter (diagram-labeling questions,
  // e.g. choice "B" for point B), showing the index-derived badge letter next to
  // it would double up ("[A] A") — skip the redundant badge letter in that case.
  const isSelfLabeled = choice.length === 1 && choice.toUpperCase() === label;
  const isWrongMarked = showResult ? (isSelected || triedWrong) : triedWrong;

  let variant: 'default' | 'correct' | 'wrong' | 'selected' = 'default';
  if (showResult) {
    if (isCorrect) variant = 'correct';
    else if (isWrongMarked) variant = 'wrong';
  } else if (isWrongMarked) {
    variant = 'wrong';
  } else if (isSelected) {
    variant = 'selected';
  }

  return (
    <button
      onClick={() => !isDisabled && onSelect(choice)}
      disabled={isDisabled}
      className={cn(
        'w-full text-left flex items-start gap-3 p-3.5 rounded-lg border text-sm transition-all font-medium',
        variant === 'default' && 'border-border bg-card hover:bg-accent hover:border-primary/30 text-card-foreground',
        variant === 'selected' && 'border-primary bg-primary/5 text-primary',
        variant === 'correct' && 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300',
        variant === 'wrong' && 'border-destructive bg-destructive/5 text-destructive',
        isDisabled && !showResult && 'opacity-60 cursor-not-allowed',
      )}
    >
      <span className={cn(
        'shrink-0 flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold',
        variant === 'default' && 'bg-muted text-muted-foreground',
        variant === 'selected' && 'bg-primary text-primary-foreground',
        variant === 'correct' && 'bg-emerald-500 text-white',
        variant === 'wrong' && 'bg-destructive text-white',
      )}>
        {isCorrect && showResult ? <Check className="h-3.5 w-3.5" /> :
         isWrongMarked ? <X className="h-3.5 w-3.5" /> :
         isSelfLabeled ? <span className="h-1.5 w-1.5 rounded-full bg-current" /> :
         label}
      </span>
      {choice.startsWith('/assets/')
        ? <img src={choice} alt={`Choice ${label}`} className="max-h-40 rounded object-contain" />
        : <span className="flex-1 leading-relaxed">{choice}</span>
      }
    </button>
  );
}
