import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import ticketsRouter from './tickets';
import { database } from '../database/connection';
import { config } from '../config/environment';

/**
 * Encaminhar chamado para outra equipe (ex.: senha do iPonto aberta na TI).
 *
 * Sem PostgreSQL neste ambiente: o banco é um dublê que responde por padrão de
 * SQL e registra o que recebeu. O que se verifica é o contrato da rota — quem
 * pode encaminhar, para onde, e que o chamado chega à nova fila como novo.
 */

jest.mock('../database/connection');
jest.mock('../services/emailService', () => ({
  EmailService: { notifyNewTicket: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('../services/websocketService', () => ({
  getWebSocketService: () => null,
}));

const app = express();
app.use(express.json());
app.use('/api/tickets', ticketsRouter);

type Row = Record<string, any>;

const tokenFor = (role: string, id = `${role}-1`) =>
  `Bearer ${jwt.sign({ id, role, name: 'Atendente', email: 'a@example.com' }, config.jwt.secret as string)}`;

function fakeDb(ticket: Row | null) {
  const statements: Array<{ sql: string; params?: any[] }> = [];
  const query = jest.fn(async (sql: string, params?: any[]) => {
    const flat = sql.replace(/\s+/g, ' ').trim();
    statements.push({ sql: flat, params });
    if (flat.includes('FROM tickets WHERE id = $1 FOR UPDATE')) {
      return { rows: ticket ? [ticket] : [] };
    }
    if (flat.startsWith('UPDATE tickets')) {
      return { rows: [{ ...ticket, department: params?.[0], category: params?.[1], status: 'open', assigned_to_id: null }] };
    }
    if (flat.includes('FROM internal_users')) {
      return { rows: [{ email: 'rh@example.com' }] };
    }
    if (flat.includes('FROM public_users')) {
      return { rows: [{ name: 'Maria' }] };
    }
    return { rows: [], rowCount: 0 };
  });
  const client = { query, release: jest.fn() };
  (database.getClient as jest.Mock).mockResolvedValue(client);
  (database.query as jest.Mock).mockImplementation(query);
  const sqls = () => statements.map((s) => s.sql);
  return { statements, sqls, client };
}

const tiTicket = (overrides: Row = {}): Row => ({
  id: 't-1',
  title: 'Senha do iPonto bloqueada',
  status: 'in_progress',
  priority: 'medium',
  department: 'ti',
  category: 'outro',
  assigned_to_id: 'it_staff-1',
  requester_type: 'public',
  requester_id: 'requester-1',
  ...overrides,
});

const forward = (body: Row, role = 'it_staff') => request(app)
  .post('/api/tickets/t-1/encaminhar')
  .set('Authorization', tokenFor(role))
  .send(body);

describe('POST /:id/encaminhar', () => {
  beforeEach(() => jest.clearAllMocks());

  it('passa o chamado da TI para o RH como novo, sem responsável', async () => {
    const db = fakeDb(tiTicket());

    const res = await forward({ department: 'rh', category: 'RH_ACESSO_PONTO', note: 'É senha do iPonto' });

    expect(res.status).toBe(200);
    const update = db.statements.find((s) => s.sql.startsWith('UPDATE tickets'));
    expect(update?.sql).toContain("status = 'open'");
    expect(update?.sql).toContain('assigned_to_id = NULL');
    expect(update?.params).toEqual(['rh', 'RH_ACESSO_PONTO', 'request', 't-1']);

    const history = db.statements.find((s) => s.sql.includes("'department_changed'"));
    expect(history?.params?.slice(3, 5)).toEqual(['ti', 'rh']);
    expect(JSON.parse(history?.params?.[5])).toMatchObject({ note: 'É senha do iPonto', old_category: 'outro' });

    const note = db.statements.find((s) => s.sql.startsWith('INSERT INTO ticket_messages'));
    expect(note?.sql).toContain('true');
    expect(note?.params?.[2]).toBe('Encaminhado de TI para RH: É senha do iPonto');

    expect(db.sqls()).toContain('COMMIT');
    expect(db.client.release).toHaveBeenCalled();
  });

  it('usa o assunto padrão da equipe quando nenhum é escolhido', async () => {
    const db = fakeDb(tiTicket());

    const res = await forward({ department: 'rh' });

    expect(res.status).toBe(200);
    const update = db.statements.find((s) => s.sql.startsWith('UPDATE tickets'));
    expect(update?.params?.[1]).toBe('RH_OUTROS');
    expect(db.sqls().some((s) => s.startsWith('INSERT INTO ticket_messages'))).toBe(false);
  });

  it('volta a contar o prazo se o chamado estava em espera', async () => {
    const db = fakeDb(tiTicket({ status: 'aguardando_terceiros' }));

    const res = await forward({ department: 'administrativo' });

    expect(res.status).toBe(200);
    expect(db.sqls().some((s) => s.startsWith('UPDATE ticket_sla_pauses') && s.includes('ended_at = NOW()'))).toBe(true);
  });

  it('recusa assunto que não é da equipe de destino', async () => {
    const db = fakeDb(tiTicket());

    const res = await forward({ department: 'rh', category: 'impressora' });

    expect(res.status).toBe(400);
    expect(db.sqls().some((s) => s.startsWith('UPDATE tickets'))).toBe(false);
  });

  it('não deixa a TI encaminhar chamado de outra equipe', async () => {
    const db = fakeDb(tiTicket({ department: 'rh', category: 'RH_OUTROS' }));

    const res = await forward({ department: 'administrativo' });

    expect(res.status).toBe(403);
    expect(db.sqls().some((s) => s.startsWith('UPDATE tickets'))).toBe(false);
    expect(db.sqls()).toContain('ROLLBACK');
  });

  it('deixa o RH devolver para a TI', async () => {
    fakeDb(tiTicket({ department: 'rh', category: 'RH_OUTROS' }));

    const res = await forward({ department: 'ti', category: 'sistema' }, 'rh_staff');

    expect(res.status).toBe(200);
  });

  it('não tira chamado confidencial do RH', async () => {
    const db = fakeDb(tiTicket({ department: 'rh', category: 'RH_CONFIDENCIAL' }));

    const res = await forward({ department: 'ti' }, 'admin');

    expect(res.status).toBe(403);
    expect(db.sqls().some((s) => s.startsWith('UPDATE tickets'))).toBe(false);
  });

  it('recusa encaminhar para a mesma equipe', async () => {
    fakeDb(tiTicket());

    const res = await forward({ department: 'ti' });

    expect(res.status).toBe(400);
  });

  it('recusa chamado já resolvido', async () => {
    fakeDb(tiTicket({ status: 'aguardando_confirmacao' }));

    const res = await forward({ department: 'rh' });

    expect(res.status).toBe(400);
  });

  it('exige login da equipe', async () => {
    fakeDb(tiTicket());

    const res = await request(app).post('/api/tickets/t-1/encaminhar').send({ department: 'rh' });

    expect(res.status).toBe(401);
  });
});

describe('GET /:id/history depois de encaminhar', () => {
  beforeEach(() => jest.clearAllMocks());

  it('não mostra ao solicitante a observação interna', async () => {
    const query = jest.fn(async (sql: string) => {
      const flat = sql.replace(/\s+/g, ' ').trim();
      if (flat.startsWith('SELECT * FROM tickets')) return { rows: [{ id: 't-1', requester_id: 'requester-1' }] };
      if (flat.includes('FROM public_users')) return { rows: [{ id: 'requester-1' }] };
      if (flat.includes('FROM ticket_history')) {
        return { rows: [{ action: 'department_changed', old_value: 'ti', new_value: 'rh', metadata: { note: 'só da equipe', new_category: 'RH_ACESSO_PONTO' } }] };
      }
      return { rows: [] };
    });
    (database.query as jest.Mock).mockImplementation(query);

    const res = await request(app).get('/api/tickets/t-1/history').set('X-User-Token', 'good-token');

    expect(res.status).toBe(200);
    expect(res.body.history[0].metadata).toEqual({ new_category: 'RH_ACESSO_PONTO' });
  });
});
