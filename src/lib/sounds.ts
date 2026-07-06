import { useCallback, useSyncExternalStore } from 'react';

// Lightweight sound-effect layer. Files live in /public/assets/sounds and are
// referenced by URL. Each effect is played through a small pool of preloaded
// <audio> elements so rapid repeats (e.g. fast practice answering) don't cut
// each other off. All playback is gated behind a persisted on/off preference.

export type SoundName = 'correct' | 'incorrect' | 'roundComplete' | 'woosh';

const SRC: Record<SoundName, string> = {
  correct: '/assets/sounds/correct.mp3',
  incorrect: '/assets/sounds/incorrect.mp3',
  roundComplete: '/assets/sounds/round-complete.mp3',
  woosh: '/assets/sounds/woosh.mp3',
};

const LS_KEY = 'sound_enabled';
const EVENT = 'sound-pref-change';
const POOL_SIZE = 3;

let enabled = (() => {
  try { return localStorage.getItem(LS_KEY) !== 'false'; } catch { return true; }
})();

// Round-robin pools so overlapping plays of the same effect don't clip.
const pools: Partial<Record<SoundName, HTMLAudioElement[]>> = {};
const cursors: Partial<Record<SoundName, number>> = {};

function getPool(name: SoundName): HTMLAudioElement[] {
  let pool = pools[name];
  if (!pool) {
    pool = Array.from({ length: POOL_SIZE }, () => {
      const a = new Audio(SRC[name]);
      a.preload = 'auto';
      return a;
    });
    pools[name] = pool;
    cursors[name] = 0;
  }
  return pool;
}

export function playSound(name: SoundName): void {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const pool = getPool(name);
    const i = cursors[name] ?? 0;
    cursors[name] = (i + 1) % pool.length;
    const audio = pool[i];
    audio.currentTime = 0;
    // Autoplay can reject until the first user gesture — safe to ignore.
    void audio.play().catch(() => {});
  } catch {
    /* ignore audio failures — never let a sound break a flow */
  }
}

export function isSoundEnabled(): boolean {
  return enabled;
}

export function setSoundEnabled(value: boolean): void {
  enabled = value;
  try { localStorage.setItem(LS_KEY, String(value)); } catch { /* ignore */ }
  window.dispatchEvent(new Event(EVENT));
}

export function toggleSound(): void {
  setSoundEnabled(!enabled);
}

// Reactive hook so a mute toggle stays in sync everywhere it's shown.
export function useSoundEnabled(): boolean {
  const subscribe = useCallback((cb: () => void) => {
    window.addEventListener(EVENT, cb);
    window.addEventListener('storage', cb);
    return () => {
      window.removeEventListener(EVENT, cb);
      window.removeEventListener('storage', cb);
    };
  }, []);
  return useSyncExternalStore(subscribe, () => enabled, () => true);
}
