import {
  elapsedMinutes,
  isOverdue,
  operationalMinutes,
  pausedMinutes,
  planPauseTransition,
  slaTargetMinutes,
  type PauseInterval,
} from './ticketSlaClock';

/**
 * Testes do relógio de SLA.
 *
 * Exercitam COMPORTAMENTO — quantos minutos contam, quando há atraso, que
 * efeito uma transição tem — e não a forma da implementação. Nenhum deles
 * precisa de Postgres: a aritmética vive nas funções puras, e o SQL de
 * produção segue a mesma definição.
 */

const t = (iso: string) => new Date(iso);
const NOW = t('2026-08-24T16:00:00Z');

describe('relógio de SLA — tempo corrido e operacional', () => {
  it('Caso 1: sem pausa, tempo operacional é igual ao corrido', () => {
    const created = t('2026-08-24T08:00:00Z');
    const resolved = t('2026-08-24T11:00:00Z');

    expect(elapsedMinutes(created, resolved, NOW)).toBe(180);
    expect(operationalMinutes(created, resolved, [], NOW)).toBe(180);
    expect(pausedMinutes([], NOW)).toBe(0);
  });

  it('Caso 2: uma pausa de aquisição é descontada do operacional', () => {
    // Aberto 08:00, pausa das 11:00 do dia 20 às 14:00 do dia 23, resolvido 16:00.
    const created = t('2026-08-20T08:00:00Z');
    const resolved = t('2026-08-23T16:00:00Z');
    const pauses: PauseInterval[] = [
      { status: 'aguardando_aquisicao', startedAt: t('2026-08-20T11:00:00Z'), endedAt: t('2026-08-23T14:00:00Z') },
    ];

    // 3d8h corridos = 4800 min; pausa = 3d3h = 4500 min; sobram 300 min (5h).
    expect(elapsedMinutes(created, resolved, NOW)).toBe(4800);
    expect(pausedMinutes(pauses, NOW)).toBe(4500);
    expect(operationalMinutes(created, resolved, pauses, NOW)).toBe(300);
  });

  it('Caso 3: pausa de terceiros também é descontada', () => {
    const created = t('2026-08-24T08:00:00Z');
    const resolved = t('2026-08-24T14:00:00Z');
    const pauses: PauseInterval[] = [
      { status: 'aguardando_terceiros', startedAt: t('2026-08-24T09:00:00Z'), endedAt: t('2026-08-24T13:00:00Z') },
    ];

    expect(elapsedMinutes(created, resolved, NOW)).toBe(360);
    expect(operationalMinutes(created, resolved, pauses, NOW)).toBe(120);
  });

  it('Caso 4: múltiplas pausas de tipos diferentes somam todas', () => {
    const created = t('2026-08-20T08:00:00Z');
    const resolved = t('2026-08-24T12:00:00Z');
    const pauses: PauseInterval[] = [
      { status: 'aguardando_aquisicao', startedAt: t('2026-08-20T10:00:00Z'), endedAt: t('2026-08-21T10:00:00Z') },
      { status: 'aguardando_terceiros', startedAt: t('2026-08-22T08:00:00Z'), endedAt: t('2026-08-23T08:00:00Z') },
    ];

    // Corrido: 4d4h = 6000 min. Pausas: 1440 + 1440 = 2880. Operacional: 3120.
    expect(elapsedMinutes(created, resolved, NOW)).toBe(6000);
    expect(pausedMinutes(pauses, NOW)).toBe(2880);
    expect(operationalMinutes(created, resolved, pauses, NOW)).toBe(3120);
  });

  it('Caso 6: pausa ainda aberta conta até agora e congela o operacional', () => {
    const created = t('2026-08-24T08:00:00Z');
    const pauses: PauseInterval[] = [
      { status: 'aguardando_terceiros', startedAt: t('2026-08-24T10:00:00Z'), endedAt: null },
    ];

    // Corrido até NOW (16:00) = 480 min. Pausa aberta desde 10:00 = 360 min.
    expect(elapsedMinutes(created, null, NOW)).toBe(480);
    expect(operationalMinutes(created, null, pauses, NOW)).toBe(120);

    // Duas horas depois o corrido cresce, mas o operacional NÃO se mexe.
    const later = t('2026-08-24T18:00:00Z');
    expect(elapsedMinutes(created, null, later)).toBe(600);
    expect(operationalMinutes(created, null, pauses, later)).toBe(120);
  });

  it('nunca devolve minutos negativos', () => {
    const created = t('2026-08-24T14:00:00Z');
    const pauses: PauseInterval[] = [
      { status: 'aguardando_aquisicao', startedAt: t('2026-08-24T10:00:00Z'), endedAt: t('2026-08-24T20:00:00Z') },
    ];
    expect(operationalMinutes(created, null, pauses, NOW)).toBe(0);
  });
});

describe('relógio de SLA — atraso', () => {
  const created = t('2026-08-20T08:00:00Z');

  it('marca atraso quando o tempo operacional passa do prazo', () => {
    // Prioridade alta = 1440 min. Sem pausa, 4d16h de operacional.
    expect(slaTargetMinutes('high')).toBe(1440);
    expect(
      isOverdue({ status: 'in_progress', priority: 'high', createdAt: created }, [], NOW),
    ).toBe(true);
  });

  it('NÃO marca atraso quando a pausa mantém o operacional dentro do prazo', () => {
    // Mesmo chamado, mas quase todo o período foi espera externa.
    const pauses: PauseInterval[] = [
      { status: 'aguardando_terceiros', startedAt: t('2026-08-20T10:00:00Z'), endedAt: t('2026-08-24T14:00:00Z') },
    ];
    expect(
      isOverdue({ status: 'in_progress', priority: 'high', createdAt: created }, pauses, NOW),
    ).toBe(false);
  });

  it('um chamado em espera externa nunca está atrasado', () => {
    expect(
      isOverdue({ status: 'aguardando_aquisicao', priority: 'urgent', createdAt: created }, [], NOW),
    ).toBe(false);
    expect(
      isOverdue({ status: 'aguardando_terceiros', priority: 'urgent', createdAt: created }, [], NOW),
    ).toBe(false);
  });

  it('chamado concluído não entra no cálculo de atraso', () => {
    expect(
      isOverdue({ status: 'resolved', priority: 'urgent', createdAt: created }, [], NOW),
    ).toBe(false);
    expect(
      isOverdue({ status: 'closed', priority: 'urgent', createdAt: created }, [], NOW),
    ).toBe(false);
  });
});

describe('relógio de SLA — transições de pausa', () => {
  it('entrar em espera abre uma pausa', () => {
    expect(planPauseTransition('in_progress', 'aguardando_aquisicao')).toBe('open');
    expect(planPauseTransition('open', 'aguardando_terceiros')).toBe('open');
  });

  it('sair da espera fecha a pausa', () => {
    expect(planPauseTransition('aguardando_aquisicao', 'in_progress')).toBe('close');
    expect(planPauseTransition('aguardando_terceiros', 'resolved')).toBe('close');
  });

  it('Caso 5: trocar entre os dois estados de espera fecha um e abre outro', () => {
    expect(planPauseTransition('aguardando_aquisicao', 'aguardando_terceiros')).toBe('switch');
    expect(planPauseTransition('aguardando_terceiros', 'aguardando_aquisicao')).toBe('switch');
  });

  it('repetir o mesmo status não gera nova pausa', () => {
    // Editar só o motivo não pode fatiar o período em dois.
    expect(planPauseTransition('aguardando_aquisicao', 'aguardando_aquisicao')).toBe('none');
    expect(planPauseTransition('in_progress', 'in_progress')).toBe('none');
  });

  it('transições entre estados não pausados não mexem no relógio', () => {
    expect(planPauseTransition('open', 'in_progress')).toBe('none');
    expect(planPauseTransition('in_progress', 'resolved')).toBe('none');
    expect(planPauseTransition('waiting_user', 'in_progress')).toBe('none');
  });

  it('resolver um chamado que está em espera fecha a pausa aberta', () => {
    expect(planPauseTransition('aguardando_terceiros', 'closed')).toBe('close');
  });
});
