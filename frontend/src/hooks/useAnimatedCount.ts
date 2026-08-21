import { useEffect, useRef, useState } from 'react';

/**
 * Aproxima o número exibido do valor real ao longo de `duration`, em vez de
 * trocá-lo de uma vez.
 *
 * Numa central operacional os números mudam sozinhos — a fila recebe eventos
 * de websocket. Sem a transição, o usuário não percebe QUE mudou; com ela, o
 * movimento chama o olho para o indicador que se mexeu.
 *
 * Respeita `prefers-reduced-motion`: quem pediu menos movimento recebe o
 * valor final direto.
 */
export function useAnimatedCount(value: number, duration = 450): number {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      fromRef.current = to;
      setDisplay(to);
      return;
    }

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return display;
}

export default useAnimatedCount;
