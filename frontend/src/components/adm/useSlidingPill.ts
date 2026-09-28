import { useLayoutEffect, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';

/**
 * Posição da pílula que desliza até a aba ativa. Mede de novo sempre que o
 * grupo de abas muda de tamanho (fonte carregando, janela mudando, aba que
 * aparece), então a pílula nunca fica presa em largura zero.
 */
export function useSlidingPill(ref: RefObject<HTMLElement>, selector: string, activeIndex: number) {
  const [box, setBox] = useState<{ x: number; w: number } | null>(null);

  useLayoutEffect(() => {
    const container = ref.current;
    if (!container) return undefined;
    const measure = () => {
      const target = container.querySelectorAll<HTMLElement>(selector)[activeIndex];
      setBox(target && target.offsetWidth > 0 ? { x: target.offsetLeft, w: target.offsetWidth } : null);
    };
    measure();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    observer?.observe(container);
    container.querySelectorAll(selector).forEach((el) => observer?.observe(el));
    return () => observer?.disconnect();
  }, [ref, selector, activeIndex]);

  const style = box ? ({ '--x': `${box.x}px`, '--w': `${box.w}px` } as CSSProperties) : undefined;
  return { visible: box !== null, style };
}
