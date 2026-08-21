import { calculateQueuePosition, getQueuePriorityRank, getTicketServiceCycleStartedAt } from './ticketQueueVisibility';

describe('ticketQueueVisibility', () => {
  it('counts only open tickets from the same responsible team ahead of the requester', () => {
    const current = {
      id: 'current',
      department: 'ti',
      priority: 'medium',
      status: 'open',
      created_at: '2026-08-21T12:00:00.000Z',
    };
    const tickets = [
      current,
      { id: 'critical', department: 'ti', priority: 'critical', status: 'open', created_at: '2026-08-21T13:00:00.000Z' },
      { id: 'urgent', department: 'ti', priority: 'urgent', status: 'open', created_at: '2026-08-21T13:30:00.000Z' },
      { id: 'older', department: 'ti', priority: 'medium', status: 'open', created_at: '2026-08-21T11:00:00.000Z' },
      { id: 'newer', department: 'ti', priority: 'medium', status: 'open', created_at: '2026-08-21T13:00:00.000Z' },
      { id: 'other-team', department: 'rh', priority: 'critical', status: 'open', created_at: '2026-08-21T10:00:00.000Z' },
      { id: 'already-started', department: 'ti', priority: 'critical', status: 'in_progress', created_at: '2026-08-21T10:00:00.000Z' },
    ];

    expect(calculateQueuePosition(current, tickets)).toEqual({
      position: 4,
      ahead: 3,
      totalWaiting: 5,
    });
  });

  it('does not invent a queue position after service has started', () => {
    expect(calculateQueuePosition({
      id: 'current',
      department: 'rh',
      priority: 'high',
      status: 'in_progress',
      created_at: '2026-08-21T12:00:00.000Z',
    }, [])).toBeNull();
  });

  it('starts a new service cycle when a ticket is reopened', () => {
    expect(getTicketServiceCycleStartedAt({
      created_at: '2026-08-01T10:00:00.000Z',
      reopen_reason: 'O problema voltou a ocorrer',
      confirmation_response_at: '2026-08-21T10:00:00.000Z',
    })).toBe('2026-08-21T10:00:00.000Z');
    expect(getQueuePriorityRank('urgent')).toBe(getQueuePriorityRank('critical'));
  });

  it('places a reopened ticket by the start of its new service cycle', () => {
    const reopened = {
      id: 'reopened',
      department: 'ti',
      priority: 'medium',
      status: 'open',
      created_at: '2026-08-01T10:00:00.000Z',
      reopen_reason: 'O problema voltou a ocorrer',
      confirmation_response_at: '2026-08-21T12:00:00.000Z',
    };

    expect(calculateQueuePosition(reopened, [
      reopened,
      { id: 'waiting', department: 'ti', priority: 'medium', status: 'open', created_at: '2026-08-21T11:00:00.000Z' },
    ])).toEqual({ position: 2, ahead: 1, totalWaiting: 2 });
  });
});
