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
  unit: 'Senador Alencar - Fortaleza/CE',
  sessions: [{ date: '2026-11-26', start: '14:00' }],
  ...overrides,
});

describe('pedido de notebooks para aula', () => {
  it('monta resumo e descrição com quantos, onde e quando', () => {
    const { title, description } = buildNotebookTicket(request({ chargers: true }));

    expect(title).toBe('15 notebooks para aula em 26/11, Senador Alencar');
    expect(description).toContain('15 notebooks para a sala de aula.');
    expect(description).toContain('Unidade: Senador Alencar - Fortaleza/CE');
    expect(description).toMatch(/Aula: \S+, 26\/11, às 14:00\./);
    expect(description).toContain('Levar os carregadores.');
  });

  it('lista vários dias em ordem', () => {
    const { title, description } = buildNotebookTicket(request({
      unit: 'Vicente Pinzón - Fortaleza/CE',
      sessions: [
        { date: '2026-11-28', start: '08:00' },
        { date: '2026-11-26', start: '14:00' },
      ],
    }));

    expect(title).toBe('15 notebooks para aulas em 26/11 e 28/11, Vicente Pinzón');
    expect(description).toContain('Aulas:');
    expect(description.indexOf('26/11')).toBeLessThan(description.indexOf('28/11'));
    expect(description).toContain('28/11, às 08:00');
  });

  it('diz o que falta, na ordem da tela', () => {
    const today = '2026-11-24';
    expect(notebookRequestError(request({ quantity: '' }), today)).toMatch(/quantos notebooks/);
    expect(notebookRequestError(request({ unit: '' }), today)).toMatch(/unidade/);
    expect(notebookRequestError(request({ sessions: [{ date: '2026-11-26', start: '' }] }), today)).toMatch(/horário/);
    expect(notebookRequestError(request({ sessions: [{ date: '2026-11-20', start: '14:00' }] }), today)).toMatch(/já passou/);
    expect(notebookRequestError(request(), today)).toBeNull();
  });

  it('aula hoje ou amanhã vai com prioridade alta', () => {
    expect(notebookRequestPriority(request({ sessions: [{ date: '2026-11-25', start: '08:00' }] }), '2026-11-24')).toBe('high');
    expect(notebookRequestPriority(request({ sessions: [{ date: '2026-11-28', start: '08:00' }] }), '2026-11-24')).toBe('medium');
  });
});
