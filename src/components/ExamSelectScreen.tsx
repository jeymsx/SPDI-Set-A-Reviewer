import { useState } from 'react';
import { ChevronRight, Target, X } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { cn } from '@/lib/utils';
import { tagColorClass } from '@/lib/tags';
import { db } from '../db';
import { EXAMS } from '../exams';
import { useApp } from '../context/AppContext';
import { useMistakeCount } from '../lib/mistake-bank';
import ChipScroller from './ChipScroller';
import ExamCard from './ExamCard';
import OverallStatsCard from './OverallStatsCard';
import TagEditor from './TagEditor';

const EXAM_TAG_SUGGESTIONS = [
  'SPDI', 'Plumbing Code', 'NPC', 'Preboards', "Master's",
  'Refresher', 'Memorization', 'Practical', 'Definitions', 'Principles', 'WSFU & DFU',
];

export default function ExamSelectScreen() {
  const { selectExam, showMistakeBank } = useApp();
  const mistakeCount = useMistakeCount();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);

  const tagRecords = useLiveQuery(() => db.tags.toArray(), []) ?? [];
  const examTagsMap: Record<string, string[]> = Object.fromEntries(
    tagRecords
      .filter(r => r.key.startsWith('exam:'))
      .map(r => [r.key.slice(5), r.tags]),
  );
  const allTags = [...new Set(Object.values(examTagsMap).flat())].sort();

  function toggleTag(tag: string) {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag],
    );
  }

  const visibleExams = selectedTags.length === 0
    ? EXAMS
    : EXAMS.filter(e => selectedTags.every(t => (examTagsMap[e.id] ?? []).includes(t)));

  const editingExam = editingExamId ? EXAMS.find(e => e.id === editingExamId) : null;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      <div className="flex items-baseline justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Exams</h2>
        <span className="text-sm text-muted-foreground">{visibleExams.length} of {EXAMS.length}</span>
      </div>

      <OverallStatsCard />

      {/* Mistake Bank — distinct amber banner, cross-exam weak drill */}
      {mistakeCount > 0 && (
        <button
          onClick={showMistakeBank}
          className="group relative w-full overflow-hidden rounded-xl border border-amber-400/50 bg-gradient-to-r from-amber-50 to-orange-50 dark:border-amber-500/30 dark:from-amber-950/30 dark:to-orange-950/20 p-4 text-left transition-all hover:shadow-md hover:border-amber-400"
        >
          <div className="flex items-center gap-4">
            <div className="shrink-0 rounded-xl bg-amber-500/15 p-3 text-amber-600 dark:text-amber-400">
              <Target className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[15px] text-amber-900 dark:text-amber-200">Mistake Bank</h3>
                <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white tabular-nums">
                  {mistakeCount}
                </span>
              </div>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/70 mt-0.5">
                Drill the {mistakeCount} question{mistakeCount === 1 ? '' : 's'} you keep missing, from across every exam.
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-1 text-sm font-semibold text-amber-700 dark:text-amber-300">
              <span className="hidden sm:inline">Drill</span>
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
        </button>
      )}

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

      {/* Exam grid */}
      {visibleExams.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          No exams match the selected tags.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleExams.map(exam => (
            <ExamCard
              key={exam.id}
              exam={exam}
              onClick={() => selectExam(exam)}
              onEditTags={() => setEditingExamId(exam.id)}
            />
          ))}
        </div>
      )}

      {/* Tag editor */}
      {editingExam && (
        <TagEditor
          open={!!editingExamId}
          onClose={() => setEditingExamId(null)}
          entityKey={'exam:' + editingExam.id}
          title={`Tags — ${editingExam.title}`}
          currentTags={examTagsMap[editingExam.id] ?? []}
          suggestions={EXAM_TAG_SUGGESTIONS}
        />
      )}
    </div>
  );
}
