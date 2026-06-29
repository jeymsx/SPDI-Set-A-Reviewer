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
  onSelect: (choice: string) => void;
}

const LABELS = ['A', 'B', 'C', 'D', 'E'];

export default function ChoiceButton({ choice, index, question, selectedAnswer, isGraded, practiceMode, isRevealed, onSelect }: Props) {
  const isSelected = selectedAnswer === choice;
  const isCorrect = choice === question.correctAnswer;
  const showResult = isGraded || (practiceMode && isRevealed);
  const isDisabled = isGraded || (practiceMode && isRevealed);

  let variant: 'default' | 'correct' | 'wrong' | 'selected' = 'default';
  if (showResult) {
    if (isCorrect) variant = 'correct';
    else if (isSelected) variant = 'wrong';
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
        variant === 'wrong' && 'bg-destructive text-destructive-foreground',
      )}>
        {showResult && isCorrect ? <Check className="h-3.5 w-3.5" /> :
         showResult && isSelected ? <X className="h-3.5 w-3.5" /> :
         LABELS[index]}
      </span>
      <span className="flex-1 leading-relaxed">{choice}</span>
    </button>
  );
}
