import { INSTITUTION_UNITS } from './institutionOptions';

/**
 * Pedido de notebooks para aula.
 *
 * Cada unidade tem uma sala de aula só, então basta saber quantos notebooks,
 * em qual unidade e quando a aula começa. O resumo e a descrição do chamado
 * são montados daqui, para a TI ler tudo de uma vez na fila, no e-mail e na
 * exportação. O backend confere o mesmo formato em `middleware/validation.ts`.
 */
export const NOTEBOOK_CLASS_CATEGORY = 'notebook_aula';
export const NOTEBOOK_CLASS_MAX_QUANTITY = 60;
export const NOTEBOOK_CLASS_MAX_SESSIONS = 10;

/** Quantidades mais pedidas: aparecem como cartões; outra quantidade é digitada. */
export const NOTEBOOK_CLASS_QUANTITY_PRESETS = [5, 10, 15, 20];

/** Onde as aulas costumam acontecer: aparecem como botões; o resto, numa lista. */
export const NOTEBOOK_CLASS_MAIN_UNITS: string[] = [
  'Senador Alencar - Fortaleza/CE',
  'Vicente Pinzón - Fortaleza/CE',
];
export const NOTEBOOK_CLASS_OTHER_UNITS: string[] = INSTITUTION_UNITS.filter(
  (unit) => !NOTEBOOK_CLASS_MAIN_UNITS.includes(unit),
);

/** "Senador Alencar - Fortaleza/CE" → "Senador Alencar". */
export const unitShortName = (unit: string) => unit.split(' - ')[0].trim();

export interface NotebookSession {
  /** AAAA-MM-DD */
  date: string;
  /** HH:MM */
  start: string;
}

export interface NotebookRequestDetails {
  quantity: string;
  unit: string;
  sessions: NotebookSession[];
  chargers: boolean;
}

export const createEmptyNotebookSession = (): NotebookSession => ({ date: '', start: '' });

export const createEmptyNotebookRequest = (unit = ''): NotebookRequestDetails => ({
  quantity: '',
  unit,
  sessions: [createEmptyNotebookSession()],
  chargers: false,
});

/** Lê o que está no formulário, mesmo que venha incompleto. */
export const readNotebookRequest = (details: Record<string, any>): NotebookRequestDetails => {
  const sessions = Array.isArray(details.sessions) && details.sessions.length > 0
    ? details.sessions.map((item: any) => ({
      date: String(item?.date ?? ''),
      start: String(item?.start ?? ''),
    }))
    : [createEmptyNotebookSession()];

  return {
    quantity: String(details.quantity ?? ''),
    unit: String(details.unit ?? ''),
    sessions,
    chargers: Boolean(details.chargers),
  };
};

const pad = (value: number) => String(value).padStart(2, '0');

/** Hoje no fuso do aparelho, no formato do campo de data. */
export const localToday = (now = new Date()) =>
  `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

const dayNumber = (isoDate: string) => {
  const [year, month, day] = isoDate.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000;
};

const parseQuantity = (value: string) => {
  const quantity = Number(value);
  return Number.isInteger(quantity) ? quantity : NaN;
};

const sessionsInOrder = (sessions: NotebookSession[]) =>
  sessions
    .filter((session) => session.date)
    .sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`));

/** O que falta para enviar, na ordem em que aparece na tela. */
export const notebookRequestError = (
  details: NotebookRequestDetails,
  today = localToday(),
): string | null => {
  const quantity = parseQuantity(details.quantity);
  if (!(quantity >= 1 && quantity <= NOTEBOOK_CLASS_MAX_QUANTITY)) {
    return `Informe quantos notebooks, de 1 a ${NOTEBOOK_CLASS_MAX_QUANTITY}.`;
  }
  if (!details.unit.trim()) return 'Escolha a unidade da aula.';

  for (const session of details.sessions) {
    if (!session.date || !session.start) return 'Cada dia precisa da data e do horário da aula.';
    if (session.date < today) return 'A data da aula já passou. Confira o dia.';
  }
  return null;
};

export const formatSessionDay = (isoDate: string) => {
  const [year, month, day] = isoDate.split('-').map(Number);
  const weekday = new Date(year, month - 1, day)
    .toLocaleDateString('pt-BR', { weekday: 'short' })
    .replace('.', '');
  return `${weekday}, ${pad(day)}/${pad(month)}`;
};

const shortDate = (isoDate: string) => {
  const [, month, day] = isoDate.split('-');
  return `${day}/${month}`;
};

const formatSession = (session: NotebookSession) => `${formatSessionDay(session.date)}, às ${session.start}`;

const joinList = (items: string[]) =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;

/** Resumo e descrição do chamado, montados a partir do formulário. */
export const buildNotebookTicket = (details: NotebookRequestDetails) => {
  const quantity = parseQuantity(details.quantity);
  const sessions = sessionsInOrder(details.sessions).filter((session) => session.start);
  const unit = details.unit.trim();

  const what = quantity >= 1 ? `${quantity} ${quantity === 1 ? 'notebook' : 'notebooks'}` : 'Notebooks';
  const dates = [...new Set(sessions.map((session) => shortDate(session.date)))];
  const when = dates.length === 0
    ? ''
    : dates.length <= 3
      ? ` em ${joinList(dates)}`
      : ` a partir de ${dates[0]} (${dates.length} dias)`;
  const where = unit ? `, ${unitShortName(unit)}` : '';
  const title = `${what} para ${dates.length > 1 ? 'aulas' : 'aula'}${when}${where}`;

  const lines = [`${what} para a sala de aula.`];
  if (unit) lines.push(`Unidade: ${unit}`);
  if (sessions.length === 1) {
    lines.push('', `Aula: ${formatSession(sessions[0])}.`);
  } else if (sessions.length > 1) {
    lines.push('', 'Aulas:', ...sessions.map((session) => `• ${formatSession(session)}`));
  }
  if (details.chargers) lines.push('', 'Levar os carregadores.');

  return { title, description: lines.join('\n') };
};

/** Aula para hoje ou amanhã vai com prioridade alta; o resto, média. */
export const notebookRequestPriority = (details: NotebookRequestDetails, today = localToday()) => {
  const first = sessionsInOrder(details.sessions)[0];
  if (!first) return 'medium';
  return dayNumber(first.date) - dayNumber(today) <= 1 ? 'high' : 'medium';
};

/** Primeira aula do pedido, para o recibo do chamado. */
export const firstNotebookSession = (details: NotebookRequestDetails) =>
  sessionsInOrder(details.sessions).find((session) => session.start) ?? null;
