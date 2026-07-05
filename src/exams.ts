import type { Exam, Question } from './types';

export const EXAMS: Exam[] = [
  // ── Comprehensive ────────────────────────────────────────────────────────
  {
    id: 'sip',
    title: 'SPDI - Preboards',
    subtitle: 'Sanitary, Plumbing, Drainage & Irrigation',
    dataVar: 'sipQuestionsData',
    scriptSrc: '/sip-questions.js',
    questionCount: 100,
    description: 'Practice exam covering sanitary systems, irrigation, plumbing codes, water supply, and drainage.',
    defaultTags: ['SPDI', 'Preboards'],
  },
  {
    id: 'spdi-a',
    title: "SPDI (Master's Mastery)",
    subtitle: 'Sanitary, Plumbing, Drainage & Irrigation',
    dataVar: 'questionsData',
    scriptSrc: '/questions.js',
    questionCount: 100,
    description: 'Comprehensive practice exam on sanitary systems, water supply piping, fire protection sprinklers, and plumbing regulations.',
    defaultTags: ['SPDI', "Master's"],
  },

  {
    id: 'eerc',
    title: 'Plumbing Code - Preboards (EERC)',
    subtitle: 'Plumbing Code Pre-Board Exam',
    dataVar: 'eercQuestionsData',
    scriptSrc: '/eerc-questions.js',
    questionCount: 100,
    description: 'Pre-board exam covering joints, venting, drainage, indirect waste, traps, pipe materials, cleanouts, and plumbing law provisions.',
    defaultTags: ['Plumbing Code', 'Preboards'],
  },
  {
    id: 'cdpb',
    title: 'Plumbing Code - Preboards',
    subtitle: 'Comprehensive Drainage & Plumbing Board Exam',
    dataVar: 'cdpbQuestionsData',
    scriptSrc: '/cdpb-questions.js',
    questionCount: 100,
    description: 'Comprehensive pre-board exam covering drainage fixture units, pipe sizing, code provisions, water supply, sewage disposal, and plumbing law.',
    defaultTags: ['Plumbing Code', 'Preboards'],
  },

  // ── Refreshers ───────────────────────────────────────────────────────────
  {
    id: 'pc-r',
    title: 'Plumbing Code - Refresher',
    subtitle: 'Plumbing Code Refresher',
    dataVar: 'pcQuestionsData',
    scriptSrc: '/pc-questions.js',
    questionCount: 100,
    description: 'Practice exam on plumbing code provisions, gas piping, fixture units, venting, and sanitation regulations.',
    defaultTags: ['Plumbing Code', 'Refresher'],
  },
  {
    id: 's-r',
    title: 'SPDI - Refresher',
    subtitle: 'Sanitary, Plumbing, Drainage & Irrigation',
    dataVar: 'sQuestionsData',
    scriptSrc: '/s-questions.js',
    questionCount: 100,
    description: 'Comprehensive reviewer on water supply, sanitation, fire protection, water treatment, drainage, and sanitary engineering principles.',
    defaultTags: ['SPDI', 'Refresher'],
  },
  {
    id: 'ep-r',
    title: 'Practical Problems - Refresher',
    subtitle: 'Engineering & Practical Applications',
    dataVar: 'epQuestionsData',
    scriptSrc: '/ep-questions.js',
    questionCount: 100,
    description: 'Practical problems covering tools, pipe installations, valve identification, fixture details, drainage calculations, and field scenarios.',
    defaultTags: ['Practical', 'Refresher'],
  },

  // ── Plumbing Code Series ─────────────────────────────────────────────────
  {
    id: 'npc-principles',
    title: '22 Basic Principles',
    subtitle: '1999 National Plumbing Code of the Philippines',
    dataVar: 'npcPrinciplesData',
    scriptSrc: '/npc-principles-questions.js',
    questionCount: 55,
    description: 'Quiz on the 22 Basic Principles of the 1999 National Plumbing Code — covering water supply, drainage, venting, fixtures, sewage disposal, and professional responsibility.',
    defaultTags: ['NPC', 'Principles'],
  },
  {
    id: 'pc-wt1',
    title: 'Plumbing Code — Weekly Test 1',
    subtitle: 'Plumbing Code Weekly Test Series',
    dataVar: 'pc1QuestionsData',
    scriptSrc: '/pc1-questions.js',
    questionCount: 50,
    description: 'Weekly test covering plumbing history, code provisions, definitions, pipe materials, trap sizes, and basic plumbing principles.',
    defaultTags: ['Plumbing Code', 'Weekly Test'],
  },
  {
    id: 'pc-wt2',
    title: 'Plumbing Code — Weekly Test 2',
    subtitle: 'Plumbing Code Weekly Test Series',
    dataVar: 'pc2QuestionsData',
    scriptSrc: '/pc2-questions.js',
    questionCount: 48,
    description: 'Weekly test on plumbing code provisions, fixture requirements, pipe sizing, drainage, venting, and water supply regulations.',
    defaultTags: ['Plumbing Code', 'Weekly Test'],
  },

  // ── SPDI Series ──────────────────────────────────────────────────────────
  {
    id: 'spdi-wt6',
    title: 'SPDI — Weekly Test 6',
    subtitle: 'Sanitary, Plumbing, Drainage & Irrigation',
    dataVar: 'spdi1QuestionsData',
    scriptSrc: '/spdi1-questions.js',
    questionCount: 50,
    description: 'Weekly test on sanitary engineering, plumbing design, drainage, and irrigation systems.',
    defaultTags: ['SPDI', 'Weekly Test'],
  },
  {
    id: 'spdi-wt7',
    title: 'SPDI — Weekly Test 7',
    subtitle: 'Sanitary, Plumbing, Drainage & Irrigation',
    dataVar: 'spdi2QuestionsData',
    scriptSrc: '/spdi2-questions.js',
    questionCount: 50,
    description: 'Weekly test on sanitary engineering, plumbing design, drainage, and irrigation systems.',
    defaultTags: ['SPDI', 'Weekly Test'],
  },

  // ── Practical Problems Series ────────────────────────────────────────────
  {
    id: 'pp-wt8',
    title: 'Practical Problems — Weekly Test 8',
    subtitle: 'Practical Problems Weekly Test Series',
    dataVar: 'rp1QuestionsData',
    scriptSrc: '/rp1-questions.js',
    questionCount: 50,
    description: 'Weekly test on tool identification, plumbing symbols, pipe hangers, drawings, and practical plumbing field scenarios.',
    defaultTags: ['Practical Problems', 'Weekly Test'],
  },
  {
    id: 'pp-wt9',
    title: 'Practical Problems — Weekly Test 9',
    subtitle: 'Practical Problems Weekly Test Series',
    dataVar: 'rp2QuestionsData',
    scriptSrc: '/rp2-questions.js',
    questionCount: 50,
    description: 'Weekly test on tool and symbol identification, pipe fittings, plumbing drawings, and practical field scenarios.',
    defaultTags: ['Practical Problems', 'Weekly Test'],
  },

  // ── Mastery Tests ────────────────────────────────────────────────────────
  {
    id: 'mt1-mastery',
    title: 'Definition of Terms - Mastery Test I',
    subtitle: 'Revised National Plumbing Code of the Philippines',
    dataVar: 'mt1QuestionsData',
    scriptSrc: '/mt1-questions.js',
    questionCount: 90,
    description: 'This is a test of the Definition of Terms contained in the Chapter 2 of the Revised National Plumbing Code of the Philippines.',
    defaultTags: ['Memorization', 'Definitions', 'Mastery Test'],
  },
  {
    id: 'mt2-mastery',
    title: 'Definition of Terms - Mastery Test II',
    subtitle: 'Revised National Plumbing Code of the Philippines',
    dataVar: 'mt2QuestionsData',
    scriptSrc: '/mt2-questions.js',
    questionCount: 90,
    description: 'This is a test of the Definition of Terms contained in the Chapter 2 of the Revised National Plumbing Code of the Philippines.',
    defaultTags: ['Memorization', 'Definitions', 'Mastery Test'],
  },
  {
    id: 'mt3',
    title: 'Definition of Terms - Mastery Test III',
    subtitle: 'Revised National Plumbing Code of the Philippines',
    dataVar: 'mt3QuestionsData',
    scriptSrc: '/mt3-questions.js',
    questionCount: 90,
    description: 'This is a test of the Definition of Terms contained in the Chapter 2 of the Revised National Plumbing Code of the Philippines.',
    defaultTags: ['Memorization', 'Definitions', 'Mastery Test'],
  },
  {
    id: 'mt4-mastery',
    title: 'WSFU & DFU - Mastery Test IV',
    subtitle: 'Water Supply & Drainage Fixture Units',
    dataVar: 'mt4bQuestionsData',
    scriptSrc: '/mt4b-questions.js',
    questionCount: 60,
    description: 'Mastery test on Water Supply Fixture Units (WSFU) and Drainage Fixture Units (DFU) values for all standard plumbing fixtures.',
    defaultTags: ['Memorization', 'WSFU & DFU', 'Mastery Test'],
  },
  {
    id: 'pp-mastery',
    title: "Practical Problems (Master's Mastery)",
    subtitle: 'Practical Problems & Experiences',
    dataVar: 'ppMasteryQuestionsData',
    scriptSrc: '/pp-mastery-questions.js',
    questionCount: 90,
    description: "Mastery test on tools, fixtures, field scenarios, and practical plumbing problems — with photos for tool/part identification questions.",
    defaultTags: ['Practical', "Master's", 'Mastery Test'],
  },
];

export function loadExamData(exam: Exam): Promise<Question[]> {
  return new Promise((resolve, reject) => {
    const existing = window[exam.dataVar];
    if (Array.isArray(existing)) {
      resolve(existing as Question[]);
      return;
    }
    const script = document.createElement('script');
    script.src = exam.scriptSrc;
    script.onload = () => {
      const data = window[exam.dataVar];
      if (Array.isArray(data)) resolve(data as Question[]);
      else reject(new Error(`${exam.dataVar} not found after loading ${exam.scriptSrc}`));
    };
    script.onerror = () => reject(new Error(`Failed to load ${exam.scriptSrc}`));
    document.head.appendChild(script);
  });
}
