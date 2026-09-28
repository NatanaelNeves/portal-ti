/**
 * Vocabulário da área do RH, em linguagem simples.
 *
 * As telas do RH usam estes textos no lugar dos códigos do sistema
 * (`waiting_user`, `RH_PONTO`...). Mudar um rótulo aqui muda em todas.
 */

export const RH_CATEGORIES: Record<string, { label: string; icon: string }> = {
  RH_ATESTADO: { label: 'Atestado médico', icon: 'ti-stethoscope' },
  RH_PONTO: { label: 'Ajuste de ponto', icon: 'ti-clock-edit' },
  RH_FOLHA: { label: 'Folha de pagamento', icon: 'ti-cash' },
  RH_DECLARACAO: { label: 'Declaração', icon: 'ti-file-certificate' },
  RH_BENEFICIOS: { label: 'Benefícios', icon: 'ti-gift' },
  RH_OUTROS: { label: 'Outro assunto', icon: 'ti-message-dots' },
  RH_CONFIDENCIAL: { label: 'Confidencial', icon: 'ti-lock' },
};

export const rhCategory = (code?: string | null) =>
  (code && RH_CATEGORIES[code]) || { label: code ? code.replace(/^RH_/, '').replace(/_/g, ' ').toLowerCase() : 'Sem assunto', icon: 'ti-message-dots' };

export type RhTone = 'new' | 'progress' | 'waiting' | 'done' | 'closed';

/**
 * Situação do chamado do ponto de vista de quem atende no RH.
 * "Novo" depende também de não ter responsável.
 */
export const rhStatus = (status: string, assigned?: string | null): { label: string; tone: RhTone } => {
  if (status === 'open') return assigned ? { label: 'Aguardando atendimento', tone: 'progress' } : { label: 'Novo, ninguém assumiu', tone: 'new' };
  switch (status) {
    case 'in_progress': return { label: 'Em atendimento', tone: 'progress' };
    case 'waiting_user': return { label: 'Aguardando o solicitante', tone: 'waiting' };
    case 'aguardando_confirmacao': return { label: 'Aguardando confirmação', tone: 'waiting' };
    case 'aguardando_aquisicao': return { label: 'Aguardando compra', tone: 'waiting' };
    case 'aguardando_terceiros': return { label: 'Aguardando terceiros', tone: 'waiting' };
    case 'resolved': return { label: 'Resolvido', tone: 'done' };
    case 'closed': return { label: 'Encerrado', tone: 'closed' };
    case 'cancelled': return { label: 'Cancelado', tone: 'closed' };
    default: return { label: status, tone: 'closed' };
  }
};

export const isUrgent = (priority?: string | null) => priority === 'high' || priority === 'urgent' || priority === 'critical';

export const ACTIVE_STATUSES = ['open', 'in_progress', 'waiting_user', 'aguardando_confirmacao', 'aguardando_aquisicao', 'aguardando_terceiros'];

export const initialsOf = (name?: string | null) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/** "há 5 minutos", "há 3 horas", "há 2 dias" — como se fala. */
export const timeAgo = (date: string) => {
  const minutes = Math.max(1, Math.floor((Date.now() - new Date(date).getTime()) / 60000));
  if (minutes < 60) return `há ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  const days = Math.floor(hours / 24);
  return `há ${days} ${days === 1 ? 'dia' : 'dias'}`;
};

/** Mais de um dia sem ninguém assumir merece destaque. */
export const isWaitingLong = (date: string) => Date.now() - new Date(date).getTime() > 24 * 3600000;

export const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
};

export const currentInternalUser = (): { id: string; name: string; role: string } | null => {
  try {
    const raw = localStorage.getItem('internal_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
