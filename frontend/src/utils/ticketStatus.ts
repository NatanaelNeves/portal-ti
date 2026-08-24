/**
 * Catálogo único de status de chamado no frontend.
 *
 * Existia um mapa de rótulos e cores em cada página — dez cópias que
 * divergiam. Quando dois estados novos entraram no enum, cada cópia passou a
 * cair no `default` e mostrar `aguardando_aquisicao` cru para o usuário.
 *
 * Aqui a apresentação fica num lugar só. Note que este módulo diz apenas COMO
 * MOSTRAR um status: quem PODE aplicá-lo é decisão de `ticketPermissions.ts` e,
 * definitivamente, do backend.
 */

export interface StatusPresentation {
  label: string;
  /** Classe de badge usada nas listas e detalhes. */
  badgeClass: string;
  icon: string;
  /** Estado de espera externa: o relógio de SLA está parado. */
  slaPaused?: boolean;
}

export const TICKET_STATUS: Record<string, StatusPresentation> = {
  open: { label: 'Aberto', badgeClass: 'badge-status-open', icon: 'ti-circle-dot' },
  in_progress: { label: 'Em atendimento', badgeClass: 'badge-status-progress', icon: 'ti-progress' },
  waiting_user: { label: 'Aguardando usuário', badgeClass: 'badge-status-warning', icon: 'ti-hourglass' },
  aguardando_confirmacao: {
    label: 'Aguardando confirmação',
    badgeClass: 'badge-status-warning',
    icon: 'ti-help-circle',
  },
  // Esperas por dependência externa — fluxo operacional da TI.
  aguardando_aquisicao: {
    label: 'Aguardando aquisição',
    badgeClass: 'badge-status-procurement',
    icon: 'ti-shopping-cart',
    slaPaused: true,
  },
  aguardando_terceiros: {
    label: 'Aguardando terceiros',
    badgeClass: 'badge-status-external',
    icon: 'ti-building-store',
    slaPaused: true,
  },
  resolved: { label: 'Resolvido', badgeClass: 'badge-status-success', icon: 'ti-circle-check' },
  closed: { label: 'Fechado', badgeClass: 'badge-status-closed', icon: 'ti-lock' },
  cancelled: { label: 'Cancelado', badgeClass: 'badge-status-closed', icon: 'ti-ban' },
};

/**
 * Um status desconhecido devolve o próprio código em vez de "Status
 * desconhecido": se algum dia entrar um estado novo sem passar por aqui, o
 * usuário vê algo diagnosticável e a tela não quebra.
 */
export const statusPresentation = (status?: string | null): StatusPresentation =>
  TICKET_STATUS[status ?? ''] ?? {
    label: status ?? '—',
    badgeClass: 'badge-status-closed',
    icon: 'ti-point',
  };

export const statusLabel = (status?: string | null): string => statusPresentation(status).label;
export const statusBadgeClass = (status?: string | null): string =>
  statusPresentation(status).badgeClass;
export const isStatusSlaPaused = (status?: string | null): boolean =>
  Boolean(statusPresentation(status).slaPaused);

/** Estados de espera externa, na ordem em que aparecem nos menus. */
export const EXTERNAL_WAIT_STATUSES = ['aguardando_aquisicao', 'aguardando_terceiros'] as const;

/** Todos os estados que mantêm o chamado na fila. */
export const ACTIVE_TICKET_STATUSES = [
  'open',
  'in_progress',
  'waiting_user',
  'aguardando_confirmacao',
  'aguardando_aquisicao',
  'aguardando_terceiros',
] as const;
