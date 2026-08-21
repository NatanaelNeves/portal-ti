import { useEffect, useState } from 'react';

interface Props {
  id: string;
  /** Quantos caracteres do identificador mostrar. */
  length?: number;
}

/**
 * Referência curta do chamado, copiável.
 *
 * Os identificadores são UUID, longos demais para a linha da fila. Mostramos
 * um prefixo — o bastante para conferir de relance e citar num chat — mas o
 * clique copia o identificador INTEIRO, que é o que serve para buscar ou
 * colar num link. O feedback dura o suficiente para ser lido e some sozinho.
 */
export default function TicketRef({ id, length = 6 }: Props) {
  const [copied, setCopied] = useState(false);
  const short = id.substring(0, length).toUpperCase();

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = async (event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
    } catch {
      // Sem permissão de área de transferência: não há o que fazer aqui, e um
      // erro barulhento sobre copiar um id atrapalharia mais do que ajuda.
    }
  };

  return (
    <button
      type="button"
      className={`tk-ref ${copied ? 'is-copied' : ''}`}
      onClick={copy}
      title={copied ? 'Identificador copiado' : `Copiar identificador completo (${id})`}
      aria-label={`Chamado ${short}. Clique para copiar o identificador completo.`}
    >
      <span className="tk-ref-hash" aria-hidden="true">#</span>
      {short}
      <i className={`ti ${copied ? 'ti-check' : 'ti-copy'} tk-ref-icon`} aria-hidden="true" />
      {copied && <span className="tk-ref-flash" role="status">Copiado</span>}
    </button>
  );
}
