/**
 * Regras de permissão da fila, num lugar só.
 *
 * Elas espelham o que o backend já impõe em `PATCH /tickets/:id` — a fonte da
 * verdade continua sendo o servidor. O que este módulo evita é a interface
 * oferecer uma ação que vai voltar 403: um menu que mostra "atribuir para
 * outra pessoa" a quem não pode fazer isso não é permissivo, é mentiroso.
 */

export type Role = 'admin' | 'manager' | 'it_staff' | 'admin_staff' | 'rh_staff' | string;

export interface TicketLike {
  id: string;
  status: string;
  priority?: string;
  department?: string;
  assigned_to?: string;
  first_response_at?: string | null;
}

const CLOSED = ['closed', 'resolved'];

/** Auxiliar administrativo só alcança chamados do setor dele, seus ou livres. */
export const canEditTicket = (ticket: TicketLike, role: Role, userId: string): boolean => {
  if (role === 'admin_staff') {
    const department = ticket.department || 'ti';
    if (department !== 'administrativo') return false;
    return !ticket.assigned_to || ticket.assigned_to === userId;
  }
  return ['admin', 'manager', 'it_staff', 'rh_staff'].includes(role);
};

/** Só o auxiliar administrativo é limitado a atribuir para si mesmo. */
export const canAssignToOthers = (role: Role): boolean => role !== 'admin_staff';

export const canAssume = (ticket: TicketLike, role: Role, userId: string): boolean =>
  canEditTicket(ticket, role, userId) &&
  !CLOSED.includes(ticket.status) &&
  ticket.assigned_to !== userId;

export const canResolve = (ticket: TicketLike, role: Role, userId: string): boolean =>
  canEditTicket(ticket, role, userId) &&
  !CLOSED.includes(ticket.status) &&
  Boolean(ticket.assigned_to);

export const canChangeStatus = (ticket: TicketLike, role: Role, userId: string): boolean =>
  canEditTicket(ticket, role, userId) && !CLOSED.includes(ticket.status);

export const canClose = (ticket: TicketLike, role: Role, userId: string): boolean =>
  canEditTicket(ticket, role, userId) && ['resolved', 'aguardando_confirmacao'].includes(ticket.status);

export const canChangePriority = canChangeStatus;

/**
 * "Novo" é o chamado que ainda não recebeu a primeira resposta — não é uma
 * janela de tempo arbitrária, é o estado real de nunca ter sido tocado.
 */
export const isUntouched = (ticket: TicketLike): boolean =>
  ticket.status === 'open' && !ticket.first_response_at;

export const STATUS_OPTIONS: Array<{ value: string; label: string; icon: string }> = [
  { value: 'open', label: 'Aberto', icon: 'ti-circle-dot' },
  { value: 'in_progress', label: 'Em atendimento', icon: 'ti-progress' },
  { value: 'waiting_user', label: 'Aguardando usuário', icon: 'ti-hourglass' },
  { value: 'resolved', label: 'Resolvido', icon: 'ti-circle-check' },
];

export const PRIORITY_OPTIONS: Array<{ value: string; label: string; tone: string }> = [
  { value: 'urgent', label: 'Urgente', tone: 'danger' },
  { value: 'high', label: 'Alta', tone: 'danger' },
  { value: 'medium', label: 'Média', tone: 'warning' },
  { value: 'low', label: 'Baixa', tone: 'positive' },
];
