import { Fragment, type ReactNode } from 'react';

/**
 * Renderiza o Markdown simples do editor da Central de dúvidas: títulos (#, ##,
 * ###), listas (-, *, 1.), **negrito**, _itálico_, `código` e [links](url).
 *
 * Gera elementos React diretamente, sem dangerouslySetInnerHTML: o texto do
 * artigo nunca vira HTML, então não há como um artigo injetar marcação na
 * página. Links só são aceitos com http(s), mailto ou caminho interno.
 */

const INLINE = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\[[^\]]+\]\([^)\s]+\)|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g;

const safeHref = (url: string) =>
  /^(https?:\/\/|mailto:|\/(?!\/))/i.test(url) ? url : null;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(INLINE).filter((p) => p !== '');
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
      return <strong key={key}>{renderInline(part.slice(2, -2), key)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={key}>{part.slice(1, -1)}</code>;
    }
    const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (link) {
      const href = safeHref(link[2]);
      if (!href) return <Fragment key={key}>{link[1]}</Fragment>;
      const external = /^https?:/i.test(href);
      return (
        <a key={key} href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
          {link[1]}
        </a>
      );
    }
    if ((part.startsWith('*') && part.endsWith('*') && part.length > 2) || (part.startsWith('_') && part.endsWith('_') && part.length > 2)) {
      return <em key={key}>{renderInline(part.slice(1, -1), key)}</em>;
    }
    return <Fragment key={key}>{part}</Fragment>;
  });
}

type Block =
  | { kind: 'h'; level: 2 | 3 | 4; text: string }
  | { kind: 'ul' | 'ol'; items: string[] }
  | { kind: 'p'; lines: string[] };

function parse(source: string): Block[] {
  const blocks: Block[] = [];
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  let current: Block | null = null;

  const flush = () => { if (current) blocks.push(current); current = null; };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) { flush(); continue; }

    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      flush();
      blocks.push({ kind: 'h', level: (heading[1].length + 1) as 2 | 3 | 4, text: heading[2] });
      continue;
    }

    const ul = line.match(/^\s*[-*]\s+(.*)$/);
    const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (ul || ol) {
      const kind = ul ? 'ul' : 'ol';
      const text = (ul || ol)![1];
      if (!current || current.kind !== kind) { flush(); current = { kind, items: [] }; }
      (current as { items: string[] }).items.push(text);
      continue;
    }

    if (!current || current.kind !== 'p') { flush(); current = { kind: 'p', lines: [] }; }
    (current as { lines: string[] }).lines.push(line);
  }
  flush();
  return blocks;
}

export default function MiniMarkdown({ source, className }: { source: string; className?: string }) {
  const blocks = parse(source || '');
  return (
    <div className={className}>
      {blocks.map((block, i) => {
        const key = `b${i}`;
        if (block.kind === 'h') {
          const Tag = `h${block.level}` as 'h2' | 'h3' | 'h4';
          return <Tag key={key}>{renderInline(block.text, key)}</Tag>;
        }
        if (block.kind !== 'p') {
          const Tag = block.kind;
          return <Tag key={key}>{block.items.map((item, j) => <li key={j}>{renderInline(item, `${key}-${j}`)}</li>)}</Tag>;
        }
        return (
          <p key={key}>
            {block.lines.map((line, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {renderInline(line, `${key}-${j}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

/** Texto sem marcação, para resumos em cartões. */
export const stripMarkdown = (source: string) =>
  (source || '')
    .replace(/^#{1,3}\s+/gm, '')
    .replace(/^\s*([-*]|\d+[.)])\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/(^|\s)[*_]([^*_]+)[*_]/g, '$1$2')
    .replace(/\s+/g, ' ')
    .trim();
