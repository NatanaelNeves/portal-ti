import { describe, expect, it } from 'vitest';
import {
  buildNotebookTicket,
  createEmptyNotebookRequest,
  notebookRequestError,
  notebookRequestPriority,
  type NotebookRequestDetails,
} from './notebookRequest';

const request = (overrides: Partial<NotebookRequestDetails> = {}): NotebookRequestDetails => ({
  ...createEmptyNotebookRequest(),
  quantity: '15',
  location: 'Sala 3, turma de informática',
  sessions: [{ date: '2026-11-26', start: '14:00', end: '17:00' }],
  ...overrides,
});

describe('pedido de notebooks para aula', () => {
  it('monta resumo e descrição com quantos, onde e quando', () => {
    const { title, description } = buildNotebookTicket(request({ chargers: true, notes: 'Canva' }));

    expect(title).toBe('15 notebooks para aula em 26/11');
    expect(description).toContain('15 notebooks para aula.');
    expect(description).toContain('Sala ou turma: Sala 3, turma de informática');
    expect(description).toMatch(/Aula: \S+, 26\/11, das 14:00 às 17:00\./);
    expect(description).toContain('Levar os carregadores.');
    expect(description).toContain('A turma vai usar: Canva');
  });

  it('lista vários dias em ordem, sem horário de término quando não informado', () => {
    const { title, description } = buildNotebookTicket(request({
      sessions: [
        { date: '2026-11-28', start: '08:00', end: '' },
        { date: '2026-11-26', start: '14:00', end: '17:00' },
      ],
    }));

    expect(title).toBe('15 notebooks para aulas em 26/11 e 28/11');
    expect(description).toContain('Aulas:');
    expect(description.indexOf('26/11')).toBeLessThan(description.indexOf('28/11'));
    expect(description).toContain('28/11, a partir das 08:00');
  });

  it('diz o que falta, na ordem da tela', () => {
    const today = '2026-11-24';
    expect(notebookRequestError(request({ quantity: '' }), today)).toMatch(/quantos notebooks/);
    expect(notebookRequestError(request({ location: ' ' }), today)).toMatch(/sala ou a turma/);
    expect(notebookRequestError(request({ sessions: [{ date: '', start: '', end: '' }] }), today)).toMatch(/data e do horário/);
    expect(notebookRequestError(request({ sessions: [{ date: '2026-11-20', start: '14:00', end: '' }] }), today)).toMatch(/já passou/);
    expect(notebookRequestError(request({ sessions: [{ date: '2026-11-26', start: '14:00', end: '13:00' }] }), today)).toMatch(/término/);
    expect(notebookRequestError(request(), today)).toBeNull();
  });

  it('aula hoje ou amanhã vai com prioridade alta', () => {
    expect(notebookRequestPriority(request({ sessions: [{ date: '2026-11-25', start: '08:00', end: '' }] }), '2026-11-24')).toBe('high');
    expect(notebookRequestPriority(request({ sessions: [{ date: '2026-11-28', start: '08:00', end: '' }] }), '2026-11-24')).toBe('medium');
  });
});
