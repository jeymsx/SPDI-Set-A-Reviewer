import confetti from 'canvas-confetti';

// Full-screen celebratory burst for a perfect score — two side cannons plus a
// center pop, staggered slightly so it reads as one continuous celebration.
export function fireConfetti(): void {
  // Respect the OS "reduce motion" preference — skip the animation entirely.
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];

  confetti({
    particleCount: 120,
    spread: 90,
    origin: { x: 0.5, y: 0.3 },
    colors,
    startVelocity: 45,
    scalar: 1.1,
  });

  const side = (originX: number, angle: number) => confetti({
    particleCount: 60,
    angle,
    spread: 60,
    origin: { x: originX, y: 0.6 },
    colors,
    startVelocity: 55,
  });

  window.setTimeout(() => { side(0, 60); side(1, 120); }, 150);
  window.setTimeout(() => { side(0.15, 70); side(0.85, 110); }, 300);
}
