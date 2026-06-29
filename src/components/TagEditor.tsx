import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { tagColorClass } from '@/lib/tags';
import { db } from '../db';

interface Props {
  open: boolean;
  onClose: () => void;
  entityKey: string;   // e.g. 'exam:spdi-a' or 'fc:-1'
  title: string;
  currentTags: string[];
  suggestions?: string[];
}

export default function TagEditor({ open, onClose, entityKey, title, currentTags, suggestions = [] }: Props) {
  const [draft, setDraft] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setDraft([...currentTags]);
      setInput('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, currentTags]);

  function addTag(tag: string) {
    const t = tag.trim();
    if (!t || draft.includes(t)) return;
    setDraft(prev => [...prev, t]);
    setInput('');
  }

  function removeTag(tag: string) {
    setDraft(prev => prev.filter(x => x !== tag));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && draft.length > 0) {
      setDraft(prev => prev.slice(0, -1));
    }
  }

  async function handleSave() {
    await db.tags.put({ key: entityKey, tags: draft });
    onClose();
  }

  const unusedSuggestions = suggestions.filter(s => !draft.includes(s));

  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm truncate pr-2">{title}</DialogTitle>
        </DialogHeader>

        {/* Tag input */}
        <div
          className="rounded-lg border border-input bg-background px-3 py-2 min-h-[44px] flex flex-wrap gap-1.5 cursor-text"
          onClick={() => inputRef.current?.focus()}
        >
          {draft.map(tag => (
            <span key={tag} className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', tagColorClass(tag))}>
              {tag}
              <button onClick={() => removeTag(tag)} className="hover:opacity-70 leading-none">
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={draft.length === 0 ? 'Type a tag and press Enter…' : ''}
            className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <p className="text-[11px] text-muted-foreground -mt-2">Press Enter or comma to add · Backspace to remove last</p>

        {/* Suggestions */}
        {unusedSuggestions.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Suggestions</p>
            <div className="flex flex-wrap gap-1.5">
              {unusedSuggestions.map(s => (
                <button
                  key={s}
                  onClick={() => addTag(s)}
                  className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium border border-dashed opacity-70 hover:opacity-100 transition-opacity', tagColorClass(s))}
                >
                  + {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="flex-1" onClick={handleSave}>Save tags</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
