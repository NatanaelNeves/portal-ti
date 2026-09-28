/**
 * Vocabulário da área do Administrativo. O setor lida com pedidos físicos,
 * então cada tipo de pedido tem nome, ícone e cor de etiqueta próprios, e
 * tudo que mostra "há quanto tempo" usa a mesma frase.
 */

export interface AdmKind {
  label: string;
  plural: string;
  icon: string;
  /** Sufixo das classes de cor: key, event, gift, doc, other. */
  tone: 'key' | 'event' | 'gift' | 'doc' | 'other';
}

export const ADM_KINDS: Record<string, AdmKind> = {
  copia_chave: { label: 'Cópia de chave', plural: 'Chaves', icon: 'ti-key', tone: 'key' },
  apoio_evento: { label: 'Apoio em evento', plural: 'Eventos', icon: 'ti-calendar-event', tone: 'event' },
  buscar_doacao: { label: 'Buscar doação', plural: 'Doações', icon: 'ti-package', tone: 'gift' },
  solicitar_documento: { label: 'Documento', plural: 'Documentos', icon: 'ti-file-text', tone: 'doc' },
};

export const ADM_OTHER: AdmKind = { label: 'Outro pedido', plural: 'Outros', icon: 'ti-dots', tone: 'other' };

export const admKind = (category?: string | null): AdmKind =>
  (category && ADM_KINDS[category]) || ADM_OTHER;

/** Chave de filtro do tipo: as quatro categorias conhecidas ou "outro". */
export const admKindKey = (category?: string | null) =>
  category && ADM_KINDS[category] ? category : 'outro';

export const ADM_KIND_KEYS = [...Object.keys(ADM_KINDS), 'outro'];

export const admKindByKey = (key: string): AdmKind => ADM_KINDS[key] ?? ADM_OTHER;

export const ADM_URGENT = new Set(['urgent', 'critical', 'high']);

export const ADM_STATUS_LABEL: Record<string, string> = {
  open: 'Para começar',
  in_progress: 'Em andamento',
  waiting_user: 'Esperando alguém',
  aguardando_confirmacao: 'Esperando confirmação',
  resolved: 'Resolvido',
  closed: 'Encerrado',
};

export function admAge(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return '';
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `há ${Math.max(1, mins)} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'há 1 dia' : `há ${days} dias`;
}

export const admDaysSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);

export function admReadUser(): { id: string; name: string } | null {
  try {
    const raw = localStorage.getItem('internal_user');
    if (!raw) return null;
    const user = JSON.parse(raw) as { id?: string; name?: string };
    return { id: user.id ?? '', name: user.name ?? '' };
  } catch {
    return null;
  }
}
