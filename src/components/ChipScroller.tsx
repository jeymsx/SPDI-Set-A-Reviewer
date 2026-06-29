import { useEffect, useRef, useState, type ReactNode } from 'react';

export default function ChipScroller({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [fadeLeft, setFadeLeft] = useState(false);
  const [fadeRight, setFadeRight] = useState(false);

  function update() {
    const el = ref.current;
    if (!el) return;
    setFadeLeft(el.scrollLeft > 1);
    setFadeRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', update); ro.disconnect(); };
  }, []);

  const mask =
    fadeLeft && fadeRight
      ? 'linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)'
      : fadeLeft
      ? 'linear-gradient(to right, transparent 0%, black 12%)'
      : fadeRight
      ? 'linear-gradient(to right, black 88%, transparent 100%)'
      : 'none';

  return (
    <div
      ref={ref}
      className={`flex gap-2 overflow-x-auto flex-1 min-w-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
      style={{ WebkitMaskImage: mask, maskImage: mask }}
    >
      {children}
    </div>
  );
}
