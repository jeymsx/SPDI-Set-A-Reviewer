import { useCallback, useSyncExternalStore } from 'react';

// Per-topic "I'm satisfied / done reviewing this" flag, stored in localStorage.
// Works for both exams ('exam') and flashcard sets ('fc'). Purely a study
// progress marker — it does not touch answers, scores, or card data.

type Kind = 'exam' | 'fc';

const EVENT = 'reviewed-change';
const keyFor = (kind: Kind, id: string | number) => `reviewed:${kind}:${id}`;

function emit() {
  window.dispatchEvent(new Event(EVENT));
}

export function isReviewed(kind: Kind, id: string | number): boolean {
  try {
    return localStorage.getItem(keyFor(kind, id)) === 'true';
  } catch {
    return false;
  }
}

export function setReviewed(kind: Kind, id: string | number, value: boolean) {
  try {
    if (value) localStorage.setItem(keyFor(kind, id), 'true');
    else localStorage.removeItem(keyFor(kind, id));
  } catch {
    /* ignore quota/availability errors */
  }
  emit();
}

export function toggleReviewed(kind: Kind, id: string | number) {
  setReviewed(kind, id, !isReviewed(kind, id));
}

// Reactive hook — re-renders any card when its reviewed state changes,
// including from another component or another browser tab.
export function useReviewed(kind: Kind, id: string | number): boolean {
  const subscribe = useCallback((cb: () => void) => {
    window.addEventListener(EVENT, cb);
    window.addEventListener('storage', cb);
    return () => {
      window.removeEventListener(EVENT, cb);
      window.removeEventListener('storage', cb);
    };
  }, []);
  const getSnapshot = useCallback(() => isReviewed(kind, id), [kind, id]);
  return useSyncExternalStore(subscribe, getSnapshot);
}
