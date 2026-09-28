import { useLayoutEffect, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';

/**
 * Posição da pílula que desliza até a aba ativa, na horizontal (abas lado a
 * lado) ou na vertical (abas uma embaixo da outra, como na barra lateral).
 * Mede de novo sempre que o grupo de abas muda de tamanho (fonte carregando,
 * janela mudando, aba que aparece), então a pílula nunca fica presa em zero.
 */
export function useSlidingPill(
  ref: RefObject<HTMLElement>,
  selector: string,
  activeIndex: number,
  axis: 'x' | 'y' = 'x',
) {
  const [box, setBox] = useState<{ pos: number; size: number } | null>(null);

  useLayoutEffect(() => {
    const container = ref.current;
    if (!container) return undefined;
    const measure = () => {
      const target = container.querySelectorAll<HTMLElement>(selector)[activeIndex];
      const size = target ? (axis === 'x' ? target.offsetWidth : target.offsetHeight) : 0;
      if (!target || size <= 0) { setBox(null); return; }
      setBox({ pos: axis === 'x' ? target.offsetLeft : target.offsetTop, size });
    };
    measure();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    observer?.observe(container);
    container.querySelectorAll(selector).forEach((el) => observer?.observe(el));
    return () => observer?.disconnect();
  }, [ref, selector, activeIndex, axis]);

  let style: CSSProperties | undefined;
  if (box) {
    const vars: Record<string, string> = axis === 'x'
      ? { '--x': `${box.pos}px`, '--w': `${box.size}px` }
      : { '--y': `${box.pos}px`, '--h': `${box.size}px` };
    style = vars as CSSProperties;
  }
  return { visible: box !== null, style };
}
