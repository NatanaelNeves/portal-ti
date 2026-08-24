import { operationalMinutes, elapsedMinutes, type PauseInterval } from './ticketSlaClock';

/**
 * Comportamento das métricas de relatório da TI diante de pausas.
 *
 * Reproduzem o cenário do enunciado: um chamado que ficou dias na assistência
 * não pode elevar a média de atendimento da equipe. A aritmética testada aqui
 * é a mesma que `operationalHoursExpr` aplica em SQL nos relatórios.
 */

const t = (iso: string) => new Date(iso);
const NOW = t('2026-08-24T18:00:00Z');
const avg = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;

describe('relatórios da TI — média de resolução', () => {
  it('chamado sem pausa mantém o resultado anterior', () => {
    const created = t('2026-08-24T09:00:00Z');
    const resolved = t('2026-08-24T12:00:00Z');

    expect(operationalMinutes(created, resolved, [], NOW)).toBe(180);
    expect(elapsedMinutes(created, resolved, NOW)).toBe(180);
  });

  it('o cenário do enunciado: 2h + 5 dias na assistência + 1h = 3h operacionais', () => {
    const created = t('2026-08-18T08:00:00Z');
    // 2h de atendimento, pausa das 10:00 do dia 18 às 10:00 do dia 23,
    // mais 1h de atendimento, resolvido 11:00 do dia 23.
    const resolved = t('2026-08-23T11:00:00Z');
    const pauses: PauseInterval[] = [
      { status: 'aguardando_terceiros', startedAt: t('2026-08-18T10:00:00Z'), endedAt: t('2026-08-23T10:00:00Z') },
    ];

    // Duração total vivida pelo solicitante: 5 dias e 3h.
    expect(elapsedMinutes(created, resolved, NOW)).toBe(5 * 1440 + 180);
    // Tempo atribuível à equipe: 3h.
    expect(operationalMinutes(created, resolved, pauses, NOW)).toBe(180);
  });

  it('uma pausa não distorce a média da equipe', () => {
    // Três chamados de 3h de trabalho; um deles ficou 5 dias na assistência.
    const rapido = { created: t('2026-08-24T08:00:00Z'), resolved: t('2026-08-24T11:00:00Z'), pauses: [] as PauseInterval[] };
    const outro = { created: t('2026-08-24T09:00:00Z'), resolved: t('2026-08-24T12:00:00Z'), pauses: [] as PauseInterval[] };
    const travado = {
      created: t('2026-08-18T08:00:00Z'),
      resolved: t('2026-08-23T11:00:00Z'),
      pauses: [{ status: 'aguardando_terceiros', startedAt: t('2026-08-18T10:00:00Z'), endedAt: t('2026-08-23T10:00:00Z') }],
    };

    const operacional = avg([rapido, outro, travado].map((x) =>
      operationalMinutes(x.created, x.resolved, x.pauses, NOW)));
    const corrido = avg([rapido, outro, travado].map((x) =>
      elapsedMinutes(x.created, x.resolved, NOW)));

    // A média operacional continua em 3h — a equipe levou 3h em cada um.
    expect(operacional).toBe(180);
    // A média corrida é arrastada para mais de um dia pelo chamado travado.
    expect(corrido).toBeGreaterThan(1440);
  });

  it('várias pausas no mesmo chamado são todas descontadas', () => {
    const created = t('2026-08-18T08:00:00Z');
    const resolved = t('2026-08-24T08:00:00Z');
    const pauses: PauseInterval[] = [
      { status: 'aguardando_aquisicao', startedAt: t('2026-08-18T10:00:00Z'), endedAt: t('2026-08-20T10:00:00Z') },
      { status: 'aguardando_terceiros', startedAt: t('2026-08-21T08:00:00Z'), endedAt: t('2026-08-23T08:00:00Z') },
    ];

    // Corrido: 6 dias = 8640 min. Pausas: 2880 + 2880 = 5760. Sobram 2880.
    expect(elapsedMinutes(created, resolved, NOW)).toBe(8640);
    expect(operationalMinutes(created, resolved, pauses, NOW)).toBe(2880);
  });

  it('pausa ainda aberta é descontada no relatório de um chamado em curso', () => {
    const created = t('2026-08-24T08:00:00Z');
    const pauses: PauseInterval[] = [
      { status: 'aguardando_aquisicao', startedAt: t('2026-08-24T10:00:00Z'), endedAt: null },
    ];

    expect(elapsedMinutes(created, null, NOW)).toBe(600);
    expect(operationalMinutes(created, null, pauses, NOW)).toBe(120);
  });
});
