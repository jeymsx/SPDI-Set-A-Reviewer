import type { Exam, Question } from './types';

export const EXAMS: Exam[] = [
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
    id: 'sip',
    title: 'SPDI (Preboards)',
    subtitle: 'Sanitary, Plumbing, Drainage & Irrigation',
    dataVar: 'sipQuestionsData',
    scriptSrc: '/sip-questions.js',
    questionCount: 100,
    description: 'Practice exam covering sanitary systems, irrigation, plumbing codes, water supply, and drainage.',
    defaultTags: ['SPDI', 'Preboards'],
  },
  {
    id: 'pc-r',
    title: 'PC (Refresher)',
    subtitle: 'Plumbing Code Refresher',
    dataVar: 'pcQuestionsData',
    scriptSrc: '/pc-questions.js',
    questionCount: 100,
    description: 'Practice exam on plumbing code provisions, gas piping, fixture units, venting, and sanitation regulations.',
    defaultTags: ['Plumbing Code', 'Refresher'],
  },
  {
    id: 's-r',
    title: 'SPDI (Refresher)',
    subtitle: 'Sanitary, Plumbing, Drainage & Irrigation',
    dataVar: 'sQuestionsData',
    scriptSrc: '/s-questions.js',
    questionCount: 100,
    description: 'Comprehensive reviewer on water supply, sanitation, fire protection, water treatment, drainage, and sanitary engineering principles.',
    defaultTags: ['SPDI', 'Refresher'],
  },
  {
    id: 'mt4',
    title: 'WSFU & DFU Test',
    subtitle: 'Water Supply & Drainage Fixture Units',
    dataVar: 'mt4QuestionsData',
    scriptSrc: '/mt4-questions.js',
    questionCount: 60,
    description: 'Memorization test on Water Supply Fixture Units (WSFU) and Drainage Fixture Units (DFU) values for all standard plumbing fixtures.',
    defaultTags: ['Memorization', 'WSFU & DFU'],
  },
  {
    id: 'ep-r',
    title: 'Practical Problems (Refresher)',
    subtitle: 'Engineering & Practical Applications',
    dataVar: 'epQuestionsData',
    scriptSrc: '/ep-questions.js',
    questionCount: 100,
    description: 'Practical problems covering tools, pipe installations, valve identification, fixture details, drainage calculations, and field scenarios.',
    defaultTags: ['Practical', 'Refresher'],
  },
  {
    id: 'mt3',
    title: 'Definition of Terms',
    subtitle: 'RNPCP Chapter 2 — Revised National Plumbing Code',
    dataVar: 'mt3QuestionsData',
    scriptSrc: '/mt3-questions.js',
    questionCount: 90,
    description: 'Definitions quiz on plumbing terminology from Chapter 2 of the Revised National Plumbing Code of the Philippines.',
    defaultTags: ['Memorization', 'Definitions'],
  },
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
