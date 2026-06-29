export interface BuiltInFlashcardSet {
  id: number; // always negative (-1, -2, …)
  name: string;
  description: string;
  cardCount: number;
  dataVar: string;
  scriptSrc: string;
  defaultTags: string[];
}

export const BUILT_IN_FLASHCARD_SETS: BuiltInFlashcardSet[] = [
  {
    id: -1,
    name: 'DFU & WSFU',
    description: 'Drainage Fixture Units & Water Supply Fixture Units with pipe/trap sizes. WSFU format: (Private-Public)',
    cardCount: 59,
    dataVar: 'fcDfuWsfu',
    scriptSrc: '/flashcard-dfu-wsfu.js',
    defaultTags: ['Memorization', 'WSFU & DFU'],
  },
  {
    id: -2,
    name: 'Technical Specifications',
    description: 'Refrigeration wastes, indirect waste piping, manholes, sewers, venting systems, traps & interceptors',
    cardCount: 57,
    dataVar: 'fcTechSpecs',
    scriptSrc: '/flashcard-tech-specs.js',
    defaultTags: ['Technical Specs', 'NPC'],
  },
];

export function loadBuiltInSetCards(id: number): Promise<{ front: string; back: string }[]> {
  const def = BUILT_IN_FLASHCARD_SETS.find(s => s.id === id);
  if (!def) return Promise.reject(new Error(`Unknown built-in flashcard set ${id}`));
  return new Promise((resolve, reject) => {
    const existing = (window as Record<string, unknown>)[def.dataVar];
    if (Array.isArray(existing)) { resolve(existing as { front: string; back: string }[]); return; }
    const script = document.createElement('script');
    script.src = def.scriptSrc;
    script.onload = () => {
      const data = (window as Record<string, unknown>)[def.dataVar];
      if (Array.isArray(data)) resolve(data as { front: string; back: string }[]);
      else reject(new Error(`${def.dataVar} not found after loading ${def.scriptSrc}`));
    };
    script.onerror = () => reject(new Error(`Failed to load ${def.scriptSrc}`));
    document.head.appendChild(script);
  });
}
