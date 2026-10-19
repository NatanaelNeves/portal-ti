import request from 'supertest';
import express from 'express';
import ticketsRouter from './tickets';
import { database } from '../database/connection';

/**
 * O que o solicitante (acesso por X-User-Token) NÃO pode receber: notas
 * internas da equipe, nem o rastro delas no histórico. E o histórico não pode
 * ser lido com um cabeçalho Authorization qualquer.
 *
 * O banco é um dublê: verificamos o parâmetro que liga o filtro na consulta,
 * não o resultado do Postgres.
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

const ticket = { id: 't-1', requester_id: 'requester-1', department: 'ti', assigned_to_id: null };

function fakeDb() {
  const statements: Array<{ sql: string; params?: any[] }> = [];
  (database.query as jest.Mock).mockImplementation(async (sql: string, params?: any[]) => {
    const flat = sql.replace(/\s+/g, ' ').trim();
    statements.push({ sql: flat, params });
    if (flat.includes('FROM public_users')) return { rows: [{ id: 'requester-1' }] };
    if (flat.startsWith('SELECT * FROM tickets WHERE id = $1')) return { rows: [ticket] };
    return { rows: [] };
  });
  return statements;
}

describe('privacidade do solicitante', () => {
  beforeEach(() => jest.clearAllMocks());

  it('mensagens: liga o filtro de notas internas para o solicitante', async () => {
    const statements = fakeDb();

    const res = await request(app).get('/api/tickets/t-1/messages').set('X-User-Token', 'tok');

    expect(res.status).toBe(200);
    const select = statements.find((s) => s.sql.includes('FROM ticket_messages'));
    expect(select?.sql).toContain('is_internal');
    expect(select?.params).toEqual(['t-1', true]);
  });

  it('histórico: esconde do solicitante o rastro das notas internas', async () => {
    const statements = fakeDb();

    const res = await request(app).get('/api/tickets/t-1/history').set('X-User-Token', 'tok');

    expect(res.status).toBe(200);
    const select = statements.find((s) => s.sql.includes('FROM ticket_history'));
    expect(select?.sql).toContain("h.metadata->>'is_internal'");
    expect(select?.params).toEqual(['t-1', true]);
  });

  it('histórico: recusa Authorization que não é um token válido', async () => {
    const statements = fakeDb();

    const res = await request(app).get('/api/tickets/t-1/history').set('Authorization', 'Bearer qualquer-coisa');

    expect(res.status).toBe(401);
    expect(statements.some((s) => s.sql.includes('FROM ticket_history'))).toBe(false);
  });
});
