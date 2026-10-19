import request from 'supertest';
import express from 'express';
import ticketsRouter from './tickets';
import { database } from '../database/connection';

/**
 * Encerramento pelo próprio solicitante ("já resolvi" / "não preciso mais").
 *
 * Sem PostgreSQL neste ambiente: o banco é um dublê que responde por padrão de
 * SQL e registra o que recebeu. O que se verifica é o contrato da rota — quem
 * pode encerrar, em quais estados, e que o chamado vai para 'cancelled' (não
 * para 'resolved'/'closed', que contariam como atendimento da equipe).
 */

jest.mock('../database/connection');
jest.mock('../services/emailService', () => ({
  EmailService: { sendEmail: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('../services/websocketService', () => ({
  getWebSocketService: () => null,
}));

const app = express();
app.use(express.json());
app.use('/api/tickets', ticketsRouter);

const REQUESTER = 'requester-1';

type Row = Record<string, any>;

function fakeDb(ticket: Row | null) {
  const statements: Array<{ sql: string; params?: any[] }> = [];
  const query = jest.fn(async (sql: string, params?: any[]) => {
    const flat = sql.replace(/\s+/g, ' ').trim();
    statements.push({ sql: flat, params });
    if (flat.includes('FROM public_users')) {
      return { rows: params?.[0] === 'good-token' ? [{ id: REQUESTER }] : [] };
    }
    if (flat.startsWith('SELECT * FROM tickets WHERE id = $1')) {
      return { rows: ticket ? [ticket] : [] };
    }
    if (flat.startsWith('UPDATE tickets')) {
      const status = flat.includes("status = 'cancelled'") ? 'cancelled' : 'open';
      return { rows: [{ ...ticket, status, assigned_to: ticket?.assigned_to_id }] };
    }
    return { rows: [], rowCount: 0 };
  });
  const client = { query, release: jest.fn() };
  (database.getClient as jest.Mock).mockResolvedValue(client);
  (database.query as jest.Mock).mockImplementation(query);
  const sqls = () => statements.map((s) => s.sql);
  return { statements, sqls, client };
}

const activeTicket = (overrides: Row = {}): Row => ({
  id: 't-1',
  title: 'Impressora não imprime',
  status: 'in_progress',
  requester_id: REQUESTER,
  assigned_to_id: null,
  department: 'ti',
  ...overrides,
});

describe('POST /:id/close-by-requester', () => {
  beforeEach(() => jest.clearAllMocks());

  it('encerra como cancelled guardando o motivo e o comentário', async () => {
    const db = fakeDb(activeTicket());

    const res = await request(app)
      .post('/api/tickets/t-1/close-by-requester')
      .set('X-User-Token', 'good-token')
      .send({ reason: 'self_resolved', note: '  reiniciei o computador  ' });

    expect(res.status).toBe(200);
    const update = db.statements.find((s) => s.sql.startsWith('UPDATE tickets'));
    expect(update?.sql).toContain("status = 'cancelled'");
    expect(update?.params).toEqual(['t-1', 'self_resolved', 'reiniciei o computador']);
    expect(db.sqls().some((s) => s.includes("'closed_by_requester'"))).toBe(true);
    expect(db.sqls()).toContain('COMMIT');
    expect(db.client.release).toHaveBeenCalled();
  });

  it('fecha a pausa de SLA quando o chamado estava em espera externa', async () => {
    const db = fakeDb(activeTicket({ status: 'aguardando_aquisicao' }));

    const res = await request(app)
      .post('/api/tickets/t-1/close-by-requester')
      .set('X-User-Token', 'good-token')
      .send({ reason: 'not_needed' });

    expect(res.status).toBe(200);
    expect(db.sqls().some((s) => s.startsWith('UPDATE ticket_sla_pauses') && s.includes('ended_at = NOW()'))).toBe(true);
  });

  it('não deixa encerrar chamado de outra pessoa', async () => {
    const db = fakeDb(activeTicket({ requester_id: 'outra-pessoa' }));

    const res = await request(app)
      .post('/api/tickets/t-1/close-by-requester')
      .set('X-User-Token', 'good-token')
      .send({ reason: 'self_resolved' });

    expect(res.status).toBe(403);
    expect(db.sqls().some((s) => s.startsWith('UPDATE tickets'))).toBe(false);
    expect(db.sqls()).toContain('ROLLBACK');
  });

  it('manda usar a confirmação quando o chamado já aguarda confirmação', async () => {
    fakeDb(activeTicket({ status: 'aguardando_confirmacao' }));

    const res = await request(app)
      .post('/api/tickets/t-1/close-by-requester')
      .set('X-User-Token', 'good-token')
      .send({ reason: 'self_resolved' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/confirmação/);
  });

  it('recusa chamado já encerrado', async () => {
    fakeDb(activeTicket({ status: 'closed' }));

    const res = await request(app)
      .post('/api/tickets/t-1/close-by-requester')
      .set('X-User-Token', 'good-token')
      .send({ reason: 'self_resolved' });

    expect(res.status).toBe(400);
  });

  it('recusa motivo fora da lista', async () => {
    fakeDb(activeTicket());

    const res = await request(app)
      .post('/api/tickets/t-1/close-by-requester')
      .set('X-User-Token', 'good-token')
      .send({ reason: 'qualquer' });

    expect(res.status).toBe(400);
  });

  it('exige o token do solicitante', async () => {
    fakeDb(activeTicket());

    const res = await request(app)
      .post('/api/tickets/t-1/close-by-requester')
      .send({ reason: 'self_resolved' });

    expect(res.status).toBe(401);
  });
});

describe('POST /:id/reopen-by-requester', () => {
  beforeEach(() => jest.clearAllMocks());

  const closedByMe = (daysAgo: number): Row => activeTicket({
    status: 'cancelled',
    requester_closure: 'self_resolved',
    closed_at: new Date(Date.now() - daysAgo * 86400000).toISOString(),
  });

  it('reabre dentro de 7 dias e limpa o motivo', async () => {
    const db = fakeDb(closedByMe(2));

    const res = await request(app)
      .post('/api/tickets/t-1/reopen-by-requester')
      .set('X-User-Token', 'good-token');

    expect(res.status).toBe(200);
    const update = db.statements.find((s) => s.sql.startsWith('UPDATE tickets'));
    expect(update?.sql).toContain("status = 'open'");
    expect(update?.sql).toContain('requester_closure = NULL');
  });

  it('não reabre depois de 7 dias', async () => {
    const db = fakeDb(closedByMe(8));

    const res = await request(app)
      .post('/api/tickets/t-1/reopen-by-requester')
      .set('X-User-Token', 'good-token');

    expect(res.status).toBe(400);
    expect(db.sqls().some((s) => s.startsWith('UPDATE tickets'))).toBe(false);
  });

  it('só reabre o que a própria pessoa encerrou', async () => {
    fakeDb(activeTicket({ status: 'closed', closed_at: new Date().toISOString() }));

    const res = await request(app)
      .post('/api/tickets/t-1/reopen-by-requester')
      .set('X-User-Token', 'good-token');

    expect(res.status).toBe(400);
  });
});
