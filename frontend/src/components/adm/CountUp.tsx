import { useEffect, useRef, useState } from 'react';

interface CountUpProps {
  value: number;
  /** Duração da contagem em ms. */
  duration?: number;
  format?: (value: number) => string;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Número que conta até o valor quando aparece ou muda. Leitores de tela
 * recebem só o valor final; quem pediu menos movimento vê o número direto.
 */
export default function CountUp({ value, duration = 900, format = (v) => String(v) }: CountUpProps) {
  const [shown, setShown] = useState(prefersReducedMotion() ? value : 0);
  const from = useRef(0);

  useEffect(() => {
    if (prefersReducedMotion()) { setShown(value); return; }
    const start = performance.now();
    const origin = from.current;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(origin + (value - origin) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
      else from.current = value;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return (
    <>
      <span aria-hidden="true">{format(shown)}</span>
      <span className="pub-sr-only">{format(value)}</span>
    </>
  );
}
