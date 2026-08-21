export interface QueueTicket {
  id: string;
  department?: string | null;
  priority?: string | null;
  status?: string | null;
  created_at: string | Date;
  reopen_reason?: string | null;
  confirmation_response_at?: string | Date | null;
}

export const getTicketServiceCycleStartedAt = (
  ticket: Pick<QueueTicket, 'created_at' | 'reopen_reason' | 'confirmation_response_at'>,
): string | Date =>
  ticket.reopen_reason && ticket.confirmation_response_at
    ? ticket.confirmation_response_at
    : ticket.created_at;

export interface QueuePosition {
  position: number;
  ahead: number;
  totalWaiting: number;
}

const PRIORITY_ORDER: Record<string, number> = {
  critical: 0,
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export const getQueuePriorityRank = (priority?: string | null): number =>
  PRIORITY_ORDER[priority || 'medium'] ?? PRIORITY_ORDER.medium;

const compareQueueTickets = (left: QueueTicket, right: QueueTicket): number => {
  const leftPriority = getQueuePriorityRank(left.priority);
  const rightPriority = getQueuePriorityRank(right.priority);
  if (leftPriority !== rightPriority) return leftPriority - rightPriority;

  const createdDifference = new Date(getTicketServiceCycleStartedAt(left)).getTime()
    - new Date(getTicketServiceCycleStartedAt(right)).getTime();
  if (createdDifference !== 0) return createdDifference;
  return left.id.localeCompare(right.id);
};

export const calculateQueuePosition = (
  currentTicket: QueueTicket,
  tickets: QueueTicket[],
): QueuePosition | null => {
  if (currentTicket.status !== 'open') return null;

  const currentDepartment = currentTicket.department || 'ti';
  const waitingTickets = tickets
    .filter((ticket) => ticket.status === 'open' && (ticket.department || 'ti') === currentDepartment)
    .sort(compareQueueTickets);

  const positionIndex = waitingTickets.findIndex((ticket) => ticket.id === currentTicket.id);
  if (positionIndex < 0) return null;

  return {
    position: positionIndex + 1,
    ahead: positionIndex,
    totalWaiting: waitingTickets.length,
  };
};
