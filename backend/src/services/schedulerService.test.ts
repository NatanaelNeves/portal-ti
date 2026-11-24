import cron from 'node-cron';
import { database } from '../database/connection';
import { initializeScheduler, sweepAwaitingConfirmationTickets } from './schedulerService';

/**
 * Fechamento automático dos chamados "aguardando confirmação".
 *
 * O servidor dorme quando ninguém usa o portal. Com a varredura presa às
 * 03:00 UTC ela quase nunca rodava; agora roda ao subir e a cada 30 minutos.
 */

jest.mock('../database/connection');
jest.mock('./emailService', () => ({
  EmailService: {
    notifyAutoCloseWarning: jest.fn().mockResolvedValue(undefined),
    sendWarrantyAlert: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('node-cron', () => ({
  __esModule: true,
  default: { schedule: jest.fn() },
}));

const query = database.query as jest.Mock;
const schedule = cron.schedule as unknown as jest.Mock;

const flat = (sql: string) => sql.replace(/\s+/g, ' ').trim();

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  query.mockImplementation(async (sql: string) => {
    if (flat(sql).startsWith('UPDATE tickets SET status = \'closed\'')) {
      return { rows: [{ id: 'ticket-1', title: 'Impressora', updated_at: new Date() }] };
    }
    return { rows: [] };
  });
});

afterEach(() => {
  (console.log as jest.Mock).mockRestore();
});

describe('sweepAwaitingConfirmationTickets', () => {
  it('avisa antes e depois fecha os chamados vencidos, registrando no histórico', async () => {
    await sweepAwaitingConfirmationTickets();

    const sqls = query.mock.calls.map(([sql]) => flat(sql));
    const warnIndex = sqls.findIndex((sql) => sql.includes('auto_close_warning_sent_at IS NULL'));
    const closeIndex = sqls.findIndex((sql) => sql.startsWith('UPDATE tickets SET status = \'closed\''));

    expect(warnIndex).toBeGreaterThanOrEqual(0);
    expect(closeIndex).toBeGreaterThan(warnIndex);
    expect(sqls[closeIndex]).toContain("WHERE status = 'aguardando_confirmacao'");
    expect(sqls.some((sql) => sql.includes("'auto_closed_after_confirmation_timeout'"))).toBe(true);
  });

  it('não roda duas varreduras ao mesmo tempo', async () => {
    const first = sweepAwaitingConfirmationTickets();
    const second = sweepAwaitingConfirmationTickets();

    expect(second).toBe(first);
    await first;

    const closes = query.mock.calls.filter(([sql]) => flat(sql).startsWith('UPDATE tickets SET status = \'closed\''));
    expect(closes).toHaveLength(1);
  });
});

describe('initializeScheduler', () => {
  it('varre ao subir e agenda a cada 30 minutos, não só de madrugada', async () => {
    initializeScheduler();

    const expressions = schedule.mock.calls.map(([expression]) => expression);
    expect(expressions).toContain('*/30 * * * *');
    expect(expressions).not.toContain('0 3 * * *');

    // A varredura do boot já começou sem esperar o primeiro tique do cron.
    await sweepAwaitingConfirmationTickets();
    expect(query.mock.calls.some(([sql]) => flat(sql).startsWith('UPDATE tickets SET status = \'closed\''))).toBe(true);
  });
});
