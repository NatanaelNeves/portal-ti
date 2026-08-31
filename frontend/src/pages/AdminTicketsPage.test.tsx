import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../services/api';
import AdminTicketsPage from './AdminTicketsPage';

vi.mock('../services/api', () => ({ default: { get: vi.fn(), patch: vi.fn() } }));
vi.mock('../hooks/useTicketsOverview', () => ({ default: () => ({ overview: null, loading: false, error: '', reload: vi.fn() }) }));
vi.mock('../hooks/useAnimatedCount', () => ({ default: (value: number) => value }));

const tickets = Array.from({ length: 20 }, (_, index) => ({
  id: `ticket-${index}`, title: `Solicitação de suporte ${index}`, description: 'Descrição do problema',
  status: 'open', priority: 'medium', type: 'incident', department: 'ti',
  created_at: '2026-08-31T12:00:00Z', updated_at: '2026-08-31T12:00:00Z',
  requester_id: 'requester', requester_name: 'Pessoa de teste', requester_type: 'public',
}));
const response = (rows = tickets) => ({ data: { data: rows, pagination: { total: rows.length, totalPages: 1 } } });

async function mount() {
  const view = render(<MemoryRouter><AdminTicketsPage /></MemoryRouter>);
  await act(async () => {});
  return view;
}

describe('continuidade da fila de chamados', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.setItem('internal_token', 'test-only');
    localStorage.setItem('internal_user', JSON.stringify({ id: 'staff', role: 'it_staff' }));
    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url.includes('internal-auth')) return { data: [] };
      if (url.startsWith('/tickets/')) return { data: { messages: [] } };
      return response();
    });
  });
  afterEach(() => { cleanup(); localStorage.clear(); vi.useRealTimers(); vi.resetAllMocks(); });

  it('mantém os mesmos elementos da fila durante a atualização periódica', async () => {
    const { container } = await mount();
    const row = screen.getByText('Solicitação de suporte 15');
    const list = container.querySelector('.tickets-list')!;
    list.scrollTop = 700;
    vi.mocked(api.get).mockImplementation(() => new Promise(() => {}));
    await act(async () => { vi.advanceTimersByTime(30000); });
    expect(row.isConnected).toBe(true);
    expect(container.querySelector('.tickets-list')).toBe(list);
    expect(list.scrollTop).toBe(700);
  });

  it('não reorganiza a fila nem remove a seleção quando chegam novidades', async () => {
    const { container } = await mount();
    const row = screen.getByText('Solicitação de suporte 15');
    fireEvent.click(row.closest('.ticket-card')!.querySelector('input')!);
    vi.mocked(api.get).mockResolvedValue(response([{ ...tickets[0], id: 'new-ticket', title: 'Novo chamado recebido' }, ...tickets]));
    await act(async () => { window.dispatchEvent(new Event('ticket:new')); vi.advanceTimersByTime(500); });
    expect(screen.queryByText('Novo chamado recebido')).not.toBeInTheDocument();
    expect(row.isConnected).toBe(true);
    expect(row.closest('.ticket-card')!.querySelector('input')).toBeChecked();
    expect(container.querySelectorAll('.tk-ticket-row')).toHaveLength(20);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Aplicar atualizações à fila' })); });
    expect(screen.getByText('Novo chamado recebido')).toBeInTheDocument();
  });

  it('ignora respostas antigas quando a pessoa muda a busca', async () => {
    await mount();
    let finishOldRequest!: (value: ReturnType<typeof response>) => void;
    vi.mocked(api.get).mockImplementationOnce(() => new Promise(resolve => { finishOldRequest = resolve; }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Atualizar fila' })); });
    vi.mocked(api.get).mockResolvedValue(response([{ ...tickets[0], title: 'Busca atual' }]));
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar chamados' }), { target: { value: 'Busca atual' } });
    await act(async () => { vi.advanceTimersByTime(300); });
    await act(async () => { finishOldRequest(response([{ ...tickets[0], title: 'Resposta antiga' }])); });
    expect(screen.getByText('Busca atual')).toBeInTheDocument();
    expect(screen.queryByText('Resposta antiga')).not.toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toHaveValue('Busca atual');
  });

  it('preserva a fila numa falha de atualização e remove o aviso ao recuperar', async () => {
    await mount();
    const row = screen.getByText('Solicitação de suporte 15');
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Conexão indisponível'));
    await act(async () => { vi.advanceTimersByTime(30000); });
    expect(row.isConnected).toBe(true);
    expect(screen.getByRole('alert')).toHaveTextContent('Conexão indisponível');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' })); });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(row.isConnected).toBe(true);
  });

  it('mantém busca e filtros combinados nas atualizações em segundo plano', async () => {
    await mount();
    fireEvent.click(screen.getByRole('button', { name: 'Hoje' }));
    fireEvent.click(screen.getByRole('button', { name: 'Atrasados' }));
    fireEvent.click(screen.getByRole('button', { name: 'Urgentes' }));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'suporte' } });
    await act(async () => { vi.advanceTimersByTime(300); });
    vi.mocked(api.get).mockClear();
    await act(async () => { window.dispatchEvent(new Event('ticket:updated')); vi.advanceTimersByTime(400); });
    const url = vi.mocked(api.get).mock.calls[0][0];
    const params = new URLSearchParams(url.split('?')[1]);
    expect(params.get('search')).toBe('suporte');
    expect(params.get('overdue')).toBe('true');
    expect(params.get('date_from')).toBeTruthy();
    expect(params.getAll('priority')).toEqual(['high', 'urgent']);
    expect(params.getAll('status')).toContain('open');
  }, 15000);

  it('expande na própria linha, separa a seleção e recolhe com foco no assunto', async () => {
    await mount();
    const trigger = screen.getByRole('button', { name: tickets[0].title });
    const row = trigger.closest('.ticket-card')!;
    fireEvent.click(within(row as HTMLElement).getByRole('checkbox'));
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('region', { name: `Detalhes de ${tickets[0].title}` })).not.toBeInTheDocument();
    await act(async () => { fireEvent.click(row); });
    const details = screen.getByRole('region', { name: `Detalhes de ${tickets[0].title}` });
    expect(row).toContainElement(details);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(within(details).getByText('Descrição do problema')).toBeVisible();
    expect(within(details).getByRole('link', { name: 'Abrir atendimento' })).toHaveAttribute('href', '/admin/chamados/ticket-0');
    fireEvent.click(within(details).getByText('Descrição do problema'));
    expect(details).toBeInTheDocument();
    fireEvent.click(within(details).getByRole('button', { name: 'Recolher detalhes' }));
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await act(async () => { fireEvent.click(trigger); });
    fireEvent.keyDown(screen.getByRole('button', { name: 'Recolher detalhes' }), { key: 'Escape' });
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole('region', { name: `Detalhes de ${tickets[0].title}` })).not.toBeInTheDocument();
  });

  it('mantém os detalhes abertos e a seleção quando uma atualização chega', async () => {
    await mount();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: tickets[15].title })); });
    const details = screen.getByRole('region', { name: `Detalhes de ${tickets[15].title}` });
    vi.mocked(api.get).mockResolvedValue(response([{ ...tickets[0], id: 'new-ticket', title: 'Novidade' }, ...tickets]));
    await act(async () => { window.dispatchEvent(new Event('ticket:updated')); vi.advanceTimersByTime(400); });
    expect(details.isConnected).toBe(true);
    expect(screen.getByRole('button', { name: tickets[15].title })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.queryByText('Novidade')).not.toBeInTheDocument();
  });

  it('troca o chamado expandido sem misturar históricos e permite tentar novamente', async () => {
    await mount();
    let finishOldHistory!: (value: { data: { messages: unknown[] } }) => void;
    vi.mocked(api.get).mockImplementationOnce(() => new Promise(resolve => { finishOldHistory = resolve; }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: tickets[0].title })); });
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Falha no histórico'));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: tickets[1].title })); });
    await act(async () => { finishOldHistory({ data: { messages: [{ id: 'old', message: 'Mensagem do chamado anterior' }] } }); });
    expect(screen.queryByText('Mensagem do chamado anterior')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: tickets[0].title })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar o histórico');
    vi.mocked(api.get).mockResolvedValueOnce({ data: { messages: [] } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' })); });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('As respostas e notas deste chamado aparecerão aqui.')).toBeVisible();
  });

  it('assume o chamado pelas ações rápidas sem fechar os detalhes', async () => {
    await mount();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: tickets[0].title })); });
    const details = screen.getByRole('region', { name: `Detalhes de ${tickets[0].title}` });
    let finishPatch!: (value: unknown) => void;
    vi.mocked(api.patch).mockImplementationOnce(() => new Promise(resolve => { finishPatch = resolve; }));
    const assume = within(details).getByRole('button', { name: 'Assumir chamado' });
    fireEvent.click(assume);
    expect(assume).toBeDisabled();
    expect(api.patch).toHaveBeenCalledWith('/tickets/ticket-0', { status: 'in_progress', assigned_to_id: 'staff' });
    const ownedTicket = { ...tickets[0], status: 'in_progress', assigned_to: 'staff' };
    vi.mocked(api.get).mockImplementation(async url => url.startsWith('/tickets/') ? { data: { messages: [] } } : response([ownedTicket, ...tickets.slice(1)]));
    await act(async () => { finishPatch({ data: ownedTicket }); });
    expect(details.isConnected).toBe(true);
    expect(within(details).getByRole('button', { name: 'Resolver chamado' })).toBeEnabled();
    expect(within(details).getByRole('button', { name: 'Aguardar resposta' })).toBeEnabled();
    expect(within(details).queryByRole('button', { name: 'Assumir chamado' })).not.toBeInTheDocument();
  });

  it('não oferece ações de responsável para um chamado de outra pessoa', async () => {
    const someoneElsesTicket = { ...tickets[0], status: 'in_progress', assigned_to: 'other-staff' };
    vi.mocked(api.get).mockImplementation(async url => url.includes('internal-auth') ? { data: [] } : url.startsWith('/tickets/') ? { data: { messages: [] } } : response([someoneElsesTicket]));
    await mount();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: tickets[0].title })); });
    const details = screen.getByRole('region', { name: `Detalhes de ${tickets[0].title}` });
    expect(within(details).queryByRole('button', { name: 'Resolver chamado' })).not.toBeInTheDocument();
    expect(within(details).queryByRole('button', { name: 'Aguardar resposta' })).not.toBeInTheDocument();
    expect(within(details).queryByRole('button', { name: 'Assumir chamado' })).not.toBeInTheDocument();
    expect(within(details).getByRole('link', { name: 'Abrir atendimento' })).toBeVisible();
  });
});
