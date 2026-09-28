import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MiniMarkdown, { stripMarkdown } from './MiniMarkdown';

describe('MiniMarkdown', () => {
  it('formata títulos, listas e ênfases', () => {
    const { container } = render(
      <MiniMarkdown source={'# Trocar toner\n\n1. Abra a **tampa**\n2. Puxe o _cartucho_\n\nUse `Ctrl+P` para testar.'} />,
    );
    expect(container.querySelector('h2')?.textContent).toBe('Trocar toner');
    expect(container.querySelectorAll('ol li')).toHaveLength(2);
    expect(container.querySelector('strong')?.textContent).toBe('tampa');
    expect(container.querySelector('em')?.textContent).toBe('cartucho');
    expect(container.querySelector('code')?.textContent).toBe('Ctrl+P');
  });

  it('nunca transforma o texto em HTML nem aceita links perigosos', () => {
    const { container } = render(
      <MiniMarkdown source={'<img src=x onerror=alert(1)> [clique](javascript:alert(1)) [site](https://exemplo.org)'} />,
    );
    expect(container.querySelector('img')).toBeNull();
    const links = container.querySelectorAll('a');
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe('https://exemplo.org');
    expect(container.textContent).toContain('clique');
  });

  it('gera resumo sem marcação', () => {
    expect(stripMarkdown('## Título\n- **um** item com [link](https://a.b)')).toBe('Título um item com link');
  });
});
