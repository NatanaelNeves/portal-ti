import type { PoolClient } from 'pg';
import { database } from '../database/connection';
import { TicketStatus, UserRole } from '../types/enums';

/**
 * Relógio de SLA do chamado.
 *
 * Um chamado pode ficar parado por dependência externa — esperando a compra de
 * uma peça, ou o retorno de uma assistência técnica. Durante esse período a
 * equipe não tem o que fazer, e contar esse tempo no SLA penalizaria o setor
 * por algo fora do seu alcance.
 *
 * Por isso o sistema separa duas grandezas que antes eram uma só:
 *
 *   • **tempo corrido** — da abertura até a conclusão, do jeito que sempre foi;
 *   • **tempo operacional** — o corrido menos todos os períodos pausados.
 *
 * O SLA passa a ser medido contra o tempo operacional. Um chamado que levou
 * 2h de atendimento, 5 dias na assistência e mais 1h de atendimento conta
 * 3h de SLA, não 5 dias e 3h.
 */

/** Estados em que o relógio de SLA fica parado. */
export const SLA_PAUSED_STATUSES: string[] = [
  TicketStatus.AWAITING_PROCUREMENT,
  TicketStatus.AWAITING_THIRD_PARTY,
];

export const isSlaPausedStatus = (status?: string | null): boolean =>
  Boolean(status) && SLA_PAUSED_STATUSES.includes(status as string);

/** Estados que ainda ocupam a fila — inclui os pausados. */
export const ACTIVE_STATUSES: string[] = [
  TicketStatus.OPEN,
  TicketStatus.IN_PROGRESS,
  'waiting_user',
  TicketStatus.AWAITING_CONFIRMATION,
  TicketStatus.AWAITING_PROCUREMENT,
  TicketStatus.AWAITING_THIRD_PARTY,
];

/** Lista pronta para interpolar em SQL: ('open', 'in_progress', …). */
export const sqlStatusList = (statuses: string[]): string =>
  `(${statuses.map((status) => `'${status}'`).join(', ')})`;

/**
 * Fragmento SQL que devolve os MINUTOS PAUSADOS de um chamado.
 *
 * Uma pausa ainda aberta (`ended_at IS NULL`) conta até agora — é o que
 * congela o cronômetro enquanto o chamado está esperando.
 *
 * @param ticketAlias alias da tabela `tickets` na consulta de fora.
 */
export const pausedMinutesSql = (ticketAlias = 't'): string => `
  COALESCE((
    SELECT SUM(
      EXTRACT(EPOCH FROM (COALESCE(p.ended_at, NOW()) - p.started_at)) / 60
    )
    FROM ticket_sla_pauses p
    WHERE p.ticket_id = ${ticketAlias}.id
  ), 0)
`;

/**
 * Minutos EFETIVAMENTE contabilizados no SLA: tempo corrido menos as pausas.
 *
 * Nunca devolve negativo — um relógio de sistema fora de sincronia não deve
 * produzir um SLA "adiantado".
 */
export const operationalMinutesSql = (ticketAlias = 't'): string => `
  GREATEST(0,
    EXTRACT(EPOCH FROM (
      COALESCE(${ticketAlias}.resolved_at, NOW()) - ${ticketAlias}.created_at
    )) / 60
    - ${pausedMinutesSql(ticketAlias)}
  )
`;

/** Prazo previsto, em minutos, conforme a prioridade. */
export const slaTargetMinutesSql = (ticketAlias = 't'): string => `
  CASE ${ticketAlias}.priority
    WHEN 'critical' THEN 240
    WHEN 'urgent'   THEN 240
    WHEN 'high'     THEN 1440
    WHEN 'medium'   THEN 4320
    ELSE 10080
  END
`;

/**
 * Condição de atraso, já descontando as pausas.
 *
 * Substitui o cálculo anterior, que comparava `created_at` cru com o prazo e
 * marcava como atrasado qualquer chamado que tivesse ficado dias na
 * assistência técnica.
 */
export const overdueConditionSql = (ticketAlias = 't'): string => `(
  ${ticketAlias}.status IN ${sqlStatusList(ACTIVE_STATUSES)}
  AND NOT (${ticketAlias}.status IN ${sqlStatusList(SLA_PAUSED_STATUSES)})
  AND ${operationalMinutesSql(ticketAlias)} > ${slaTargetMinutesSql(ticketAlias)}
)`;

/**
 * Abre um período de pausa quando o chamado entra em espera externa.
 *
 * O índice único parcial em `ticket_sla_pauses` garante uma pausa aberta por
 * chamado; se já houver uma (retentativa, corrida entre requisições), o
 * `ON CONFLICT` evita duplicar sem derrubar a atualização do chamado.
 */
export interface SqlExecutor {
  query: (text: string, params?: any[]) => Promise<any>;
}

/** Sem executor explícito, cai no pool — usado fora de transação. */
const exec = (client?: SqlExecutor | PoolClient | null): SqlExecutor =>
  (client as SqlExecutor) ?? database;

export const openSlaPause = async (
  ticketId: string,
  status: string,
  reason: string | null,
  userId: string | null,
  client?: SqlExecutor | PoolClient | null,
): Promise<void> => {
  await exec(client).query(
    `INSERT INTO ticket_sla_pauses (ticket_id, status, reason, started_by_id)
     SELECT $1, $2, $3, $4
     WHERE NOT EXISTS (
       SELECT 1 FROM ticket_sla_pauses WHERE ticket_id = $1 AND ended_at IS NULL
     )`,
    [ticketId, status, reason, userId],
  );
};

/** Fecha a pausa aberta, se houver. Idempotente. */
export const closeSlaPause = async (
  ticketId: string,
  userId: string | null,
  client?: SqlExecutor | PoolClient | null,
): Promise<void> => {
  await exec(client).query(
    `UPDATE ticket_sla_pauses
        SET ended_at = NOW(), ended_by_id = $2
      WHERE ticket_id = $1 AND ended_at IS NULL`,
    [ticketId, userId],
  );
};

/**
 * Aplica a transição de pausa para uma mudança de status.
 *
 * Entrando num estado pausado: abre o período. Saindo dele: fecha. Ficando no
 * mesmo estado pausado (por exemplo, só trocando o motivo): não faz nada, para
 * não fatiar o período em dois.
 */
export const applySlaPauseTransition = async (
  ticketId: string,
  previousStatus: string,
  nextStatus: string,
  reason: string | null,
  userId: string | null,
): Promise<void> => {
  const wasPaused = isSlaPausedStatus(previousStatus);
  const willPause = isSlaPausedStatus(nextStatus);

  if (!wasPaused && willPause) {
    await openSlaPause(ticketId, nextStatus, reason, userId);
    return;
  }

  if (wasPaused && !willPause) {
    await closeSlaPause(ticketId, userId);
    return;
  }

  // Troca entre os dois estados pausados: fecha um período e abre outro, para
  // que o relatório saiba quanto tempo foi aquisição e quanto foi terceiros.
  if (wasPaused && willPause && previousStatus !== nextStatus) {
    await closeSlaPause(ticketId, userId);
    await openSlaPause(ticketId, nextStatus, reason, userId);
  }
};

/**
 * Reconcilia a tabela de pausas com o status ATUAL do chamado.
 *
 * Desde que o PATCH virou transacional, esta função é chamada DENTRO da
 * transação, recebendo o mesmo client — ou seja, ela deixou de ser o mecanismo
 * de atomicidade e passou a ser o de convergência: aplica o estado correto de
 * forma idempotente, o que também a torna segura como reparo defensivo em
 * qualquer caminho que não passe pela transação. A lógica é:
 *
 *   • status pausado e nenhuma pausa aberta  → abre;
 *   • status não pausado e pausa aberta      → fecha;
 *   • já consistente                          → não faz nada.
 *
 * Cada ramo é um único statement, atômico por si. Se a escrita da pausa falhar
 * numa requisição, a próxima alteração daquele chamado corrige o estado em vez
 * de acumular divergência. O índice único parcial impede pausa duplicada
 * mesmo sob requisições concorrentes.
 */
export const reconcileSlaPause = async (
  ticketId: string,
  currentStatus: string,
  reason: string | null,
  userId: string | null,
  client?: SqlExecutor | PoolClient | null,
): Promise<void> => {
  if (isSlaPausedStatus(currentStatus)) {
    // Se houver pausa aberta de OUTRO tipo, ela é encerrada antes.
    await exec(client).query(
      `UPDATE ticket_sla_pauses
          SET ended_at = NOW(), ended_by_id = $3
        WHERE ticket_id = $1 AND ended_at IS NULL AND status <> $2`,
      [ticketId, currentStatus, userId],
    );
    await openSlaPause(ticketId, currentStatus, reason, userId, client);
    return;
  }

  await closeSlaPause(ticketId, userId, client);
};

export const STATUS_LABELS: Record<string, string> = {
  open: 'Aberto',
  in_progress: 'Em atendimento',
  waiting_user: 'Aguardando usuário',
  aguardando_confirmacao: 'Aguardando confirmação',
  aguardando_aquisicao: 'Aguardando aquisição',
  aguardando_terceiros: 'Aguardando terceiros',
  resolved: 'Resolvido',
  closed: 'Fechado',
};


/**
 * Quem pode colocar um chamado em espera externa.
 *
 * Aquisição e assistência técnica pertencem ao fluxo operacional da TI. Um
 * auxiliar administrativo ou o RH não compram peça nem acionam fornecedor, e
 * liberar esses estados para eles só porque existem no enum encheria a fila
 * desses setores com um vocabulário que não é deles — e, pior, permitiria
 * pausar o SLA de um chamado que ninguém está esperando.
 *
 * Esta é a MESMA regra que o frontend aplica em
 * `components/tickets/ticketPermissions.ts` (`canUseExternalWaitStatuses`).
 * O frontend evita oferecer a ação; aqui é onde ela é de fato barrada.
 */
export const canUseExternalWaitStatuses = (role: string): boolean =>
  [UserRole.ADMIN, UserRole.IT_STAFF, UserRole.MANAGER, 'gestor'].includes(role as UserRole);

/**
 * Um chamado só entra em espera externa se for do setor de TI. O estado
 * descreve uma dependência do fluxo técnico; aplicá-lo a um chamado de RH ou
 * Administrativo distorceria o SLA daquele setor sem significado operacional.
 */
export const canPauseTicketDepartment = (department?: string | null): boolean =>
  (department || 'ti') === 'ti';


/* ─────────────────────────────────────────────────────────────
   Núcleo calculável, sem banco.

   O SQL acima é a implementação de produção, mas a REGRA — o que conta
   como tempo operacional, o que é pausa, quando há atraso — é aritmética
   pura e precisa ser testável sem um Postgres por perto. As funções
   abaixo são essa regra, e o SQL segue a mesma definição.
───────────────────────────────────────────────────────────────── */

export interface PauseInterval {
  status: string;
  startedAt: Date | string;
  /** `null` = ainda em espera; conta até `now`. */
  endedAt?: Date | string | null;
}

const ms = (value: Date | string): number => new Date(value).getTime();

/** Minutos de um intervalo, nunca negativo. */
const minutesBetween = (from: number, to: number): number => Math.max(0, (to - from) / 60000);

/**
 * Soma os minutos pausados. Uma pausa ainda aberta conta até `now` — é o que
 * mantém o cronômetro congelado enquanto o chamado espera.
 */
export const pausedMinutes = (pauses: PauseInterval[], now: Date = new Date()): number =>
  pauses.reduce(
    (total, pause) =>
      total + minutesBetween(ms(pause.startedAt), pause.endedAt ? ms(pause.endedAt) : now.getTime()),
    0,
  );

/** Tempo corrido: abertura até a conclusão (ou até agora). */
export const elapsedMinutes = (
  createdAt: Date | string,
  resolvedAt?: Date | string | null,
  now: Date = new Date(),
): number => minutesBetween(ms(createdAt), resolvedAt ? ms(resolvedAt) : now.getTime());

/** Tempo operacional: o corrido menos todas as pausas. */
export const operationalMinutes = (
  createdAt: Date | string,
  resolvedAt: Date | string | null | undefined,
  pauses: PauseInterval[],
  now: Date = new Date(),
): number =>
  Math.max(0, elapsedMinutes(createdAt, resolvedAt, now) - pausedMinutes(pauses, now));

export const SLA_TARGET_MINUTES: Record<string, number> = {
  critical: 240,
  urgent: 240,
  high: 1440,
  medium: 4320,
  low: 10080,
};

export const slaTargetMinutes = (priority?: string | null): number =>
  SLA_TARGET_MINUTES[priority ?? 'low'] ?? SLA_TARGET_MINUTES.low;

/**
 * Há atraso quando o tempo OPERACIONAL passou do prazo. Um chamado em espera
 * externa nunca está atrasado: o relógio dele está parado.
 */
export const isOverdue = (
  ticket: {
    status: string;
    priority?: string | null;
    createdAt: Date | string;
    resolvedAt?: Date | string | null;
  },
  pauses: PauseInterval[],
  now: Date = new Date(),
): boolean => {
  if (!ACTIVE_STATUSES.includes(ticket.status)) return false;
  if (isSlaPausedStatus(ticket.status)) return false;
  return (
    operationalMinutes(ticket.createdAt, ticket.resolvedAt, pauses, now) >
    slaTargetMinutes(ticket.priority)
  );
};

/**
 * Decide o efeito de uma mudança de status sobre o relógio, sem tocar no
 * banco. `applySlaPauseTransition` executa exatamente este plano.
 */
export type PauseAction = 'none' | 'open' | 'close' | 'switch';

export const planPauseTransition = (previousStatus: string, nextStatus: string): PauseAction => {
  const wasPaused = isSlaPausedStatus(previousStatus);
  const willPause = isSlaPausedStatus(nextStatus);

  if (!wasPaused && willPause) return 'open';
  if (wasPaused && !willPause) return 'close';
  if (wasPaused && willPause && previousStatus !== nextStatus) return 'switch';
  return 'none';
};
