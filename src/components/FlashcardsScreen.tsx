import { useLiveQuery } from 'dexie-react-hooks';
import { BookOpen, Edit2, MoreVertical, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { db } from '../db';
import { useApp } from '../context/AppContext';
import type { Flashcard, FlashcardSet } from '../types';

// ---- helpers ----
function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// ---- Card editor row ----
interface CardRowProps {
  front: string; back: string;
  onChange: (front: string, back: string) => void;
  onRemove: () => void;
  index: number;
}
function CardRow({ front, back, onChange, onRemove, index }: CardRowProps) {
  return (
    <div className="flex gap-2 items-start">
      <span className="text-xs text-muted-foreground w-5 pt-2.5 shrink-0 text-right">{index + 1}</span>
      <input
        className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        placeholder="Term"
        value={front}
        onChange={e => onChange(e.target.value, back)}
      />
      <input
        className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        placeholder="Definition"
        value={back}
        onChange={e => onChange(front, e.target.value)}
      />
      <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive" onClick={onRemove}>
        <X className="h-3.5 w-3.5" />
      </Button>
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
  const [rows, setRows] = useState<{ front: string; back: string }[]>([{ front: '', back: '' }]);
  const [bulkText, setBulkText] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
    if (editSet?.id) {
      db.flashcards.where('setId').equals(editSet.id).sortBy('order').then(cards => {
        if (cards.length) setRows(cards.map(c => ({ front: c.front, back: c.back })));
      });
    }
  }, [editSet]);

  function updateRow(i: number, front: string, back: string) {
    setRows(r => r.map((row, idx) => idx === i ? { front, back } : row));
  }
  function removeRow(i: number) {
    setRows(r => r.length === 1 ? [{ front: '', back: '' }] : r.filter((_, idx) => idx !== i));
  }
  function addRow() {
    setRows(r => [...r, { front: '', back: '' }]);
  }

  function applyBulk() {
    const parsed = bulkText.trim().split('\n').map(line => {
      const tab = line.indexOf('\t');
      if (tab !== -1) return { front: line.slice(0, tab).trim(), back: line.slice(tab + 1).trim() };
      const comma = line.indexOf(',');
      if (comma !== -1) return { front: line.slice(0, comma).trim(), back: line.slice(comma + 1).trim() };
      return { front: line.trim(), back: '' };
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
    if (editSet?.id) {
      await db.flashcardSets.update(editSet.id, { name: name.trim(), description: description.trim(), updatedAt: now });
      await db.flashcards.where('setId').equals(editSet.id).delete();
      await db.flashcards.bulkAdd(validRows.map((r, i) => ({ setId: editSet.id!, front: r.front.trim(), back: r.back.trim(), order: i })));
    } else {
      const setId = await db.flashcardSets.add({ name: name.trim(), description: description.trim(), createdAt: now, updatedAt: now });
      await db.flashcards.bulkAdd(validRows.map((r, i) => ({ setId: setId as number, front: r.front.trim(), back: r.back.trim(), order: i })));
    }
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-background rounded-xl border shadow-xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-lg">{editSet ? 'Edit Set' : 'New Flashcard Set'}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <div className="p-6 space-y-5">
          {/* Name */}
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

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Description (optional)</label>
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="What is this set about?"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <Separator />

          {/* Cards */}
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
              </div>
              {rows.map((row, i) => (
                <CardRow key={i} index={i} front={row.front} back={row.back}
                  onChange={(f, b) => updateRow(i, f, b)}
                  onRemove={() => removeRow(i)}
                />
              ))}
            </div>

            <Button variant="outline" size="sm" className="w-full gap-2" onClick={addRow}>
              <Plus className="h-3.5 w-3.5" /> Add Card
            </Button>
          </div>
        </div>

        {/* Footer */}
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
  set: FlashcardSet;
  cardCount: number;
  onStudy: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function SetCard({ set, cardCount, onStudy, onEdit, onDelete }: SetCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  return (
    <Card className="group flex flex-col h-full overflow-hidden hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
      <CardContent className="p-5 flex flex-col flex-1 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-[15px] leading-snug truncate">{set.name}</h3>
            {set.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{set.description}</p>
            )}
          </div>
          <div className="relative shrink-0" ref={menuRef}>
            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setMenuOpen(s => !s)}>
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
            {menuOpen && (
              <div className="absolute right-0 top-8 z-20 w-32 rounded-lg border bg-popover shadow-md py-1">
                <button className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent" onClick={() => { onEdit(); setMenuOpen(false); }}>
                  <Edit2 className="h-3.5 w-3.5" /> Edit
                </button>
                <button className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10" onClick={() => { onDelete(); setMenuOpen(false); }}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-auto pt-2">
          <Badge variant="secondary" className="text-xs">{cardCount} cards</Badge>
          <span className="text-xs text-muted-foreground ml-auto">{formatDate(set.updatedAt)}</span>
        </div>

        <Button className="w-full gap-2" size="sm" onClick={onStudy}>
          <BookOpen className="h-3.5 w-3.5" /> Study
        </Button>
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

  const sets = useLiveQuery(() => db.flashcardSets.orderBy('updatedAt').reverse().toArray(), []) ?? [];
  const allCards = useLiveQuery(() => db.flashcards.toArray(), []) ?? [];

  function cardCountFor(setId: number) {
    return allCards.filter(c => c.setId === setId).length;
  }

  async function handleDelete(set: FlashcardSet) {
    if (!set.id) return;
    await db.flashcards.where('setId').equals(set.id).delete();
    await db.flashcardSets.delete(set.id);
    setDeleteTarget(null);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Flashcards</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{sets.length} {sets.length === 1 ? 'set' : 'sets'}</p>
        </div>
        <Button className="gap-2" onClick={() => { setEditTarget(null); setShowCreate(true); }}>
          <Plus className="h-4 w-4" /> New Set
        </Button>
      </div>

      {/* Grid */}
      {sets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="rounded-full bg-muted p-5">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold">No flashcard sets yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create your first set to start studying</p>
          </div>
          <Button className="gap-2 mt-2" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" /> Create Set
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sets.map(set => (
            <SetCard
              key={set.id}
              set={set}
              cardCount={cardCountFor(set.id!)}
              onStudy={() => studyFlashcardSet(set.id!)}
              onEdit={() => { setEditTarget(set); setShowCreate(true); }}
              onDelete={() => setDeleteTarget(set)}
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
    </div>
  );
}
