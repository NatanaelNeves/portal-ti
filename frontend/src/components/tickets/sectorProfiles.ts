import type { TicketsOverview } from '../../hooks/useTicketsOverview';

export type SectorKey = 'ti' | 'rh' | 'administrativo' | 'todos';

export interface MetricSpec {
  key: string;
  icon: string;
  label: string;
  value: number | null;
  /** Texto curto abaixo do número. Só aparece quando há base para ele. */
  detail?: string | null;
  /** Variação percentual, quando o backend conseguiu comparar dois períodos. */
  deltaPct?: number | null;
  /** Um delta menor é melhor (tempo de resolução, por exemplo). */
  lowerIsBetter?: boolean;
  tone?: 'neutral' | 'info' | 'warning' | 'danger' | 'positive';
  /** Formata o número; ausente = inteiro simples. */
  format?: (value: number) => string;
  hint: string;
}

export interface SectorProfile {
  key: SectorKey;
  label: string;
  icon: string;
  /** Frase do cabeçalho — o que este setor acompanha nesta tela. */
  tagline: string;
  metrics: (o: TicketsOverview) => MetricSpec[];
}

const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 24) return rest ? `${hours}h ${rest}min` : `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
};

/** Métricas comuns a todos os setores, para não repetir a definição. */
const openTickets = (o: TicketsOverview): MetricSpec => ({
  key: 'open',
  icon: 'ti-inbox',
  label: 'Em aberto',
  value: o.status.open + o.status.inProgress + o.status.waitingUser + o.status.awaitingConfirmation,
  detail: `${o.today.created} ${o.today.created === 1 ? 'novo hoje' : 'novos hoje'}`,
  tone: 'neutral',
  hint: 'Chamados que ainda não foram resolvidos nem fechados.',
});

const inProgress = (o: TicketsOverview): MetricSpec => ({
  key: 'in_progress',
  icon: 'ti-progress',
  label: 'Em atendimento',
  value: o.status.inProgress,
  detail: o.status.waitingUser > 0 ? `${o.status.waitingUser} aguardando usuário` : null,
  tone: 'info',
  hint: 'Chamados com atendimento já iniciado.',
});

const resolvedToday = (o: TicketsOverview): MetricSpec => ({
  key: 'resolved_today',
  icon: 'ti-circle-check',
  label: 'Resolvidos hoje',
  value: o.today.resolved,
  detail: o.today.created > 0 ? `de ${o.today.created} abertos hoje` : null,
  tone: 'positive',
  hint: 'Chamados marcados como resolvidos ou fechados hoje.',
});

const avgResolution = (o: TicketsOverview): MetricSpec => ({
  key: 'avg_resolution',
  icon: 'ti-clock-hour-4',
  label: 'Tempo médio',
  value: o.timing.resolutionMinutes,
  deltaPct: o.timing.resolutionDeltaPct,
  lowerIsBetter: true,
  format: formatDuration,
  tone: 'neutral',
  hint: 'Média entre abertura e resolução nos últimos 30 dias, comparada aos 30 anteriores.',
});

const unassigned = (o: TicketsOverview): MetricSpec => ({
  key: 'unassigned',
  icon: 'ti-user-question',
  label: 'Sem responsável',
  value: o.attention.unassigned,
  detail: o.attention.unassignedOver24h > 0 ? `${o.attention.unassignedOver24h} há mais de 24h` : null,
  tone: o.attention.unassignedOver24h > 0 ? 'warning' : 'neutral',
  hint: 'Chamados em aberto que ainda não têm um responsável atribuído.',
});

export const SECTOR_PROFILES: Record<SectorKey, SectorProfile> = {
  ti: {
    key: 'ti',
    label: 'TI',
    icon: 'ti-device-desktop',
    tagline: 'Acompanhe a fila técnica, o SLA e o desempenho do atendimento.',
    metrics: (o) => [
      openTickets(o),
      {
        key: 'critical',
        icon: 'ti-alert-triangle',
        label: 'Críticos',
        value: o.priority.urgent + o.priority.high,
        detail: o.attention.overdue > 0 ? `${o.attention.overdue} com prazo estourado` : null,
        tone: o.priority.urgent > 0 ? 'danger' : 'neutral',
        hint: 'Chamados em aberto com prioridade urgente ou alta.',
      },
      {
        key: 'in_progress_ti',
        icon: 'ti-progress',
        label: 'Em atendimento',
        value: o.status.inProgress,
        detail: o.status.waitingUser > 0 ? `${o.status.waitingUser} aguardando usuário` : null,
        tone: 'info',
        hint: 'Chamados com atendimento em curso. Não inclui os que estão parados aguardando aquisição ou terceiros.',
      },
      {
        key: 'paused',
        icon: 'ti-player-pause',
        label: 'Em espera externa',
        value: o.paused?.total ?? 0,
        detail: o.paused
          ? `${o.paused.procurement} aquisição · ${o.paused.thirdParty} terceiros`
          : null,
        tone: 'neutral',
        hint: 'Chamados parados por dependência externa. O SLA deles está pausado — não estão atrasados por falta de atuação da equipe.',
      },
      resolvedToday(o),
      avgResolution(o),
    ],
  },

  rh: {
    key: 'rh',
    label: 'RH',
    icon: 'ti-users',
    tagline: 'Acompanhe solicitações de pessoal, prazos e conclusões.',
    metrics: (o) => [
      { ...openTickets(o), icon: 'ti-file-description', label: 'Solicitações abertas' },
      {
        key: 'pending',
        icon: 'ti-hourglass',
        label: 'Pendentes',
        value: o.status.waitingUser + o.status.awaitingConfirmation,
        detail: o.status.awaitingConfirmation > 0 ? `${o.status.awaitingConfirmation} aguardando confirmação` : null,
        tone: 'warning',
        hint: 'Solicitações paradas aguardando resposta do solicitante ou confirmação.',
      },
      inProgress(o),
      { ...resolvedToday(o), label: 'Concluídas hoje' },
      avgResolution(o),
    ],
  },

  administrativo: {
    key: 'administrativo',
    label: 'Administrativo',
    icon: 'ti-building',
    tagline: 'Acompanhe solicitações, pendências e prazos do setor.',
    metrics: (o) => [
      { ...openTickets(o), icon: 'ti-clipboard-list', label: 'Solicitações abertas' },
      unassigned(o),
      inProgress(o),
      {
        key: 'overdue',
        icon: 'ti-alarm',
        label: 'Pendências',
        value: o.attention.overdue,
        detail: o.attention.overdue > 0 ? 'prazo de atendimento vencido' : 'nenhum prazo vencido',
        tone: o.attention.overdue > 0 ? 'danger' : 'positive',
        hint: 'Chamados em aberto que já passaram do prazo previsto para a prioridade.',
      },
      { ...resolvedToday(o), label: 'Concluídas hoje' },
    ],
  },

  todos: {
    key: 'todos',
    label: 'Todos os setores',
    icon: 'ti-layout-grid',
    tagline: 'Acompanhe solicitações, prioridades e desempenho das equipes em tempo real.',
    metrics: (o) => [
      openTickets(o),
      {
        key: 'critical',
        icon: 'ti-alert-triangle',
        label: 'Críticos',
        value: o.priority.urgent + o.priority.high,
        detail: o.attention.overdue > 0 ? `${o.attention.overdue} com prazo estourado` : null,
        tone: o.priority.urgent > 0 ? 'danger' : 'neutral',
        hint: 'Chamados em aberto com prioridade urgente ou alta, somando todos os setores.',
      },
      unassigned(o),
      resolvedToday(o),
      avgResolution(o),
    ],
  },
};

/** O papel operacional decide o perfil; admin e gestor podem alternar. */
export const profileForDepartment = (department: string | null): SectorProfile =>
  SECTOR_PROFILES[(department as SectorKey) || 'todos'] ?? SECTOR_PROFILES.todos;

export { formatDuration };
