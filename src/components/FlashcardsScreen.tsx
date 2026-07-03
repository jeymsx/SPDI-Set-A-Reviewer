import { useLiveQuery } from 'dexie-react-hooks';
import { BookOpen, CheckCircle2, Circle, Edit2, ImageIcon, Lock, MoreVertical, Plus, Tag, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { tagColorClass } from '@/lib/tags';
import { useReviewed, toggleReviewed } from '@/lib/reviewed';
import { db } from '../db';
import { useApp } from '../context/AppContext';
import { BUILT_IN_FLASHCARD_SETS } from '../flashcard-sets';
import ChipScroller from './ChipScroller';
import TagEditor from './TagEditor';
import type { Flashcard, FlashcardSet } from '../types';

const FC_TAG_SUGGESTIONS = [
  'Memorization', 'Technical Specs', 'NPC', 'WSFU & DFU', 'Definitions',
  'Sanitary', 'Plumbing Code', 'Practical', 'Refresher',
];

function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// ---- Inline tag input (used inside EditModal) ----
interface InlineTagsProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

function InlineTags({ tags, onChange }: InlineTagsProps) {
  const [input, setInput] = useState('');

  function addTag(tag: string) {
    const t = tag.trim();
    if (!t || tags.includes(t)) return;
    onChange([...tags, t]);
    setInput('');
  }

  function removeTag(tag: string) {
    onChange(tags.filter(x => x !== tag));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(input); }
    else if (e.key === 'Backspace' && !input && tags.length > 0) onChange(tags.slice(0, -1));
  }

  const unused = FC_TAG_SUGGESTIONS.filter(s => !tags.includes(s));

  return (
    <div className="space-y-2">
      <div
        className="rounded-md border border-input bg-background px-3 py-2 min-h-[38px] flex flex-wrap gap-1.5 cursor-text"
        onClick={e => { e.currentTarget.querySelector('input')?.focus(); }}
      >
        {tags.map(tag => (
          <span key={tag} className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', tagColorClass(tag))}>
            {tag}
            <button type="button" onClick={() => removeTag(tag)} className="hover:opacity-70">
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? 'Add tags…' : ''}
          className="flex-1 min-w-[100px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {unused.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {unused.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium border border-dashed opacity-60 hover:opacity-100 transition-opacity', tagColorClass(s))}
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Card editor row ----
interface CardRowProps {
  front: string;
  back: string;
  image?: Blob;
  imageOn: 'front' | 'back';
  onChange: (front: string, back: string, image?: Blob, imageOn?: 'front' | 'back') => void;
  onRemove: () => void;
  index: number;
}
function CardRow({ front, back, image, imageOn, onChange, onRemove, index }: CardRowProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const previewUrl = image ? URL.createObjectURL(image) : null;

  function pickImage() { fileRef.current?.click(); }
  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onChange(front, back, file, imageOn);
    e.target.value = '';
  }
  function removeImage() { onChange(front, back, undefined, 'front'); }
  function toggleSide() { onChange(front, back, image, imageOn === 'front' ? 'back' : 'front'); }

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2 items-start">
        <span className="text-xs text-muted-foreground w-5 pt-2.5 shrink-0 text-right">{index + 1}</span>
        <input
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Term"
          value={front}
          onChange={e => onChange(e.target.value, back, image, imageOn)}
        />
        <input
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Definition"
          value={back}
          onChange={e => onChange(front, e.target.value, image, imageOn)}
        />
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
        <Button
          variant="ghost" size="icon"
          className={cn('h-9 w-9 shrink-0', image ? 'text-primary' : 'text-muted-foreground hover:text-primary')}
          onClick={pickImage} title="Attach image"
        >
          <ImageIcon className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive" onClick={onRemove}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      {previewUrl && (
        <div className="ml-7 flex items-center gap-2">
          <img src={previewUrl} className="h-16 rounded border object-contain bg-muted" alt="preview" />
          <div className="flex flex-col gap-1">
            <button
              onClick={toggleSide}
              className="text-xs px-2 py-0.5 rounded border border-input hover:bg-accent text-muted-foreground"
            >
              Show under: <span className="font-medium text-foreground">{imageOn === 'front' ? 'Term' : 'Definition'}</span>
            </button>
            <button onClick={removeImage} className="text-xs text-destructive hover:underline text-left">Remove image</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Create / Edit modal ----
interface EditModalProps {
  editSet: FlashcardSet | null;
  onClose: () => void;
}

function EditModal({ editSet, onClose }: EditModalProps) {
  const [name, setName] = useState(editSet?.name ?? '');
  const [description, setDescription] = useState(editSet?.description ?? '');
  const [tags, setTags] = useState<string[]>([]);
  const [rows, setRows] = useState<{ front: string; back: string; image?: Blob; imageOn: 'front' | 'back' }[]>([{ front: '', back: '', imageOn: 'front' }]);
  const [bulkText, setBulkText] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
    if (editSet?.id) {
      db.flashcards.where('setId').equals(editSet.id).sortBy('order').then(cards => {
        if (cards.length) setRows(cards.map(c => ({ front: c.front, back: c.back, image: c.image, imageOn: c.imageOn ?? 'front' })));
      });
      db.tags.get('fc:' + editSet.id).then(rec => {
        setTags(rec?.tags ?? []);
      });
    }
  }, [editSet]);

  function updateRow(i: number, front: string, back: string, image?: Blob, imageOn?: 'front' | 'back') {
    setRows(r => r.map((row, idx) => idx === i ? { front, back, image, imageOn: imageOn ?? row.imageOn } : row));
  }
  function removeRow(i: number) {
    setRows(r => r.length === 1 ? [{ front: '', back: '', imageOn: 'front' }] : r.filter((_, idx) => idx !== i));
  }
  function addRow() { setRows(r => [...r, { front: '', back: '', imageOn: 'front' }]); }

  function applyBulk() {
    const parsed = bulkText.trim().split('\n').map(line => {
      const tab = line.indexOf('\t');
      if (tab !== -1) return { front: line.slice(0, tab).trim(), back: line.slice(tab + 1).trim(), imageOn: 'front' as const };
      const comma = line.indexOf(',');
      if (comma !== -1) return { front: line.slice(0, comma).trim(), back: line.slice(comma + 1).trim(), imageOn: 'front' as const };
      return { front: line.trim(), back: '', imageOn: 'front' as const };
    }).filter(r => r.front);
    if (parsed.length) setRows(prev => [...prev.filter(r => r.front || r.back), ...parsed]);
    setBulkText('');
    setShowBulk(false);
  }

  async function handleSave() {
    if (!name.trim()) return;
    const validRows = rows.filter(r => r.front.trim() || r.back.trim());
    if (!validRows.length) return;
    setSaving(true);
    const now = Date.now();
    let setId: number;
    if (editSet?.id) {
      await db.flashcardSets.update(editSet.id, { name: name.trim(), description: description.trim(), updatedAt: now });
      await db.flashcards.where('setId').equals(editSet.id).delete();
      await db.flashcards.bulkAdd(validRows.map((r, i) => ({ setId: editSet.id!, front: r.front.trim(), back: r.back.trim(), order: i, image: r.image, imageOn: r.imageOn })));
      setId = editSet.id;
    } else {
      setId = (await db.flashcardSets.add({ name: name.trim(), description: description.trim(), createdAt: now, updatedAt: now })) as number;
      await db.flashcards.bulkAdd(validRows.map((r, i) => ({ setId, front: r.front.trim(), back: r.back.trim(), order: i, image: r.image, imageOn: r.imageOn })));
    }
    await db.tags.put({ key: 'fc:' + setId, tags });
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-background rounded-xl border shadow-xl my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-lg">{editSet ? 'Edit Set' : 'New Flashcard Set'}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Set Name <span className="text-destructive">*</span></label>
            <input
              ref={nameRef}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g. NPC Basic Principles"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Description (optional)</label>
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="What is this set about?"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Tags (optional)</label>
            <InlineTags tags={tags} onChange={setTags} />
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Cards ({rows.filter(r => r.front || r.back).length})</label>
              <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground" onClick={() => setShowBulk(s => !s)}>
                {showBulk ? 'Cancel import' : 'Bulk import'}
              </Button>
            </div>

            {showBulk && (
              <div className="space-y-2 rounded-lg border border-dashed p-3">
                <p className="text-xs text-muted-foreground">Paste cards below — one per line, <strong>Tab</strong> or <strong>comma</strong> between term and definition.</p>
                <textarea
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono h-32 resize-none"
                  placeholder={"Term 1\tDefinition 1\nTerm 2\tDefinition 2"}
                  value={bulkText}
                  onChange={e => setBulkText(e.target.value)}
                />
                <Button size="sm" onClick={applyBulk} disabled={!bulkText.trim()}>Add {bulkText.trim().split('\n').filter(Boolean).length} cards</Button>
              </div>
            )}

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              <div className="flex gap-2 text-xs text-muted-foreground font-medium px-7">
                <span className="flex-1">Term (front)</span>
                <span className="flex-1">Definition (back)</span>
                <span className="w-9" />
                <span className="w-9" />
              </div>
              {rows.map((row, i) => (
                <CardRow key={i} index={i} front={row.front} back={row.back} image={row.image} imageOn={row.imageOn}
                  onChange={(f, b, img, on) => updateRow(i, f, b, img, on)}
                  onRemove={() => removeRow(i)}
                />
              ))}
            </div>

            <Button variant="outline" size="sm" className="w-full gap-2" onClick={addRow}>
              <Plus className="h-3.5 w-3.5" /> Add Card
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim() || saving}>
            {saving ? 'Saving…' : (editSet ? 'Save Changes' : 'Create Set')}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---- Set card ----
interface SetCardProps {
  reviewId: number;
  name: string;
  description?: string;
  cardCount: number;
  updatedAt?: number;
  builtIn?: boolean;
  tags: string[];
  onStudy: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onEditTags: () => void;
}

function SetCard({ reviewId, name, description, cardCount, updatedAt, builtIn, tags, onStudy, onEdit, onDelete, onEditTags }: SetCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const reviewed = useReviewed('fc', reviewId);

  useEffect(() => {
    if (!menuOpen) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  return (
    <Card className={cn(
      'group flex flex-col h-full overflow-hidden hover:-translate-y-0.5 hover:shadow-md transition-all duration-200',
      reviewed && 'ring-1 ring-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/10',
    )}>
      <CardContent className="p-5 flex flex-col flex-1 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-[15px] leading-snug truncate">{name}</h3>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
            )}
          </div>
          {builtIn ? (
            <Lock className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 mt-0.5" />
          ) : (
            <div className="relative shrink-0" ref={menuRef}>
              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setMenuOpen(s => !s)}>
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
              {menuOpen && (
                <div className="absolute right-0 top-8 z-20 w-36 rounded-lg border bg-popover shadow-md py-1">
                  <button className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent" onClick={() => { onEdit?.(); setMenuOpen(false); }}>
                    <Edit2 className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent" onClick={() => { onEditTags(); setMenuOpen(false); }}>
                    <Tag className="h-3.5 w-3.5" /> Edit tags
                  </button>
                  <button className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10" onClick={() => { onDelete?.(); setMenuOpen(false); }}>
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tags row */}
        <div className="flex flex-wrap items-center gap-1.5 min-h-[20px]">
          {tags.map(tag => (
            <span key={tag} className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', tagColorClass(tag))}>
              {tag}
            </span>
          ))}
          {builtIn && (
            <button
              onClick={onEditTags}
              className="rounded-full p-0.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 hover:text-foreground hover:bg-muted transition-all"
              title="Edit tags"
            >
              <Tag className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 mt-auto pt-1">
          <Badge variant="secondary" className="text-xs">{cardCount} cards</Badge>
          {builtIn && <Badge variant="outline" className="text-xs text-muted-foreground">Built-in</Badge>}
          {reviewed && (
            <Badge variant="outline" className="text-xs border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 gap-1">
              <CheckCircle2 className="h-3 w-3" /> Reviewed
            </Badge>
          )}
          {updatedAt && !builtIn && <span className="text-xs text-muted-foreground ml-auto">{formatDate(updatedAt)}</span>}
        </div>

        <div className="flex gap-2">
          <Button className="flex-1 gap-2" size="sm" onClick={onStudy}>
            <BookOpen className="h-3.5 w-3.5" /> Study
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'shrink-0 gap-1.5',
              reviewed && 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/20 hover:bg-emerald-100/60',
            )}
            onClick={() => toggleReviewed('fc', reviewId)}
            title={reviewed ? 'Reviewed — tap to unmark' : 'Mark as reviewed'}
          >
            {reviewed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
            <span className="sr-only sm:not-sr-only">{reviewed ? 'Reviewed' : 'Mark'}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Main screen ----
export default function FlashcardsScreen() {
  const { studyFlashcardSet } = useApp();
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<FlashcardSet | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FlashcardSet | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagEditorKey, setTagEditorKey] = useState<string | null>(null);
  const [tagEditorTitle, setTagEditorTitle] = useState('');

  const userSets = useLiveQuery(() => db.flashcardSets.orderBy('updatedAt').reverse().toArray(), []) ?? [];
  const allCards = useLiveQuery(() => db.flashcards.toArray(), []) ?? [];
  const tagRecords = useLiveQuery(() => db.tags.toArray(), []) ?? [];

  const fcTagsMap: Record<string, string[]> = Object.fromEntries(
    tagRecords
      .filter(r => r.key.startsWith('fc:'))
      .map(r => [r.key, r.tags]),
  );
  function tagsFor(setId: number) { return fcTagsMap['fc:' + setId] ?? []; }

  const allTags = [...new Set(Object.values(fcTagsMap).flat())].sort();

  function toggleTag(tag: string) {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  }

  function cardCountFor(setId: number) {
    return allCards.filter(c => c.setId === setId).length;
  }

  async function handleDelete(set: FlashcardSet) {
    if (!set.id) return;
    await db.flashcards.where('setId').equals(set.id).delete();
    await db.flashcardSets.delete(set.id);
    await db.tags.delete('fc:' + set.id);
    setDeleteTarget(null);
  }

  function openTagEditor(entityKey: string, title: string) {
    setTagEditorKey(entityKey);
    setTagEditorTitle(title);
  }

  const visibleBuiltIn = selectedTags.length === 0
    ? BUILT_IN_FLASHCARD_SETS
    : BUILT_IN_FLASHCARD_SETS.filter(s => selectedTags.every(t => tagsFor(s.id).includes(t)));

  const visibleUserSets = selectedTags.length === 0
    ? userSets
    : userSets.filter(s => selectedTags.every(t => tagsFor(s.id!).includes(t)));

  const totalVisible = visibleBuiltIn.length + visibleUserSets.length;
  const totalSets = BUILT_IN_FLASHCARD_SETS.length + userSets.length;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Flashcards</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{totalVisible} of {totalSets} sets</p>
        </div>
        <Button className="gap-2" onClick={() => { setEditTarget(null); setShowCreate(true); }}>
          <Plus className="h-4 w-4" /> New Set
        </Button>
      </div>

      {/* Tag filter chips */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-2">
          <ChipScroller>
            {allTags.map(tag => {
              const active = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium border transition-all whitespace-nowrap shrink-0',
                    active
                      ? cn(tagColorClass(tag), 'border-transparent shadow-sm')
                      : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground',
                  )}
                >
                  {tag}
                </button>
              );
            })}
          </ChipScroller>
          {selectedTags.length > 0 && (
            <button
              onClick={() => setSelectedTags([])}
              title="Clear filters"
              className="shrink-0 flex items-center justify-center h-6 w-6 rounded-full border border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground hover:bg-muted transition-all"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      {totalVisible === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          No sets match the selected tags.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleBuiltIn.map(set => (
            <SetCard
              key={set.id}
              reviewId={set.id}
              name={set.name}
              description={set.description}
              cardCount={set.cardCount}
              builtIn
              tags={tagsFor(set.id)}
              onStudy={() => studyFlashcardSet(set.id)}
              onEditTags={() => openTagEditor('fc:' + set.id, `Tags — ${set.name}`)}
            />
          ))}
          {visibleUserSets.map(set => (
            <SetCard
              key={set.id}
              reviewId={set.id!}
              name={set.name}
              description={set.description}
              cardCount={cardCountFor(set.id!)}
              updatedAt={set.updatedAt}
              tags={tagsFor(set.id!)}
              onStudy={() => studyFlashcardSet(set.id!)}
              onEdit={() => { setEditTarget(set); setShowCreate(true); }}
              onDelete={() => setDeleteTarget(set)}
              onEditTags={() => openTagEditor('fc:' + set.id, `Tags — ${set.name}`)}
            />
          ))}
        </div>
      )}

      {/* Create/Edit modal */}
      {showCreate && (
        <EditModal editSet={editTarget} onClose={() => { setShowCreate(false); setEditTarget(null); }} />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm bg-background rounded-xl border shadow-xl p-6 space-y-4">
            <h3 className="font-bold text-lg">Delete "{deleteTarget.name}"?</h3>
            <p className="text-sm text-muted-foreground">This will permanently delete the set and all {cardCountFor(deleteTarget.id!)} cards. This cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => handleDelete(deleteTarget)}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      {/* Tag editor */}
      {tagEditorKey && (
        <TagEditor
          open={!!tagEditorKey}
          onClose={() => setTagEditorKey(null)}
          entityKey={tagEditorKey}
          title={tagEditorTitle}
          currentTags={fcTagsMap[tagEditorKey] ?? []}
          suggestions={FC_TAG_SUGGESTIONS}
        />
      )}
    </div>
  );
}
