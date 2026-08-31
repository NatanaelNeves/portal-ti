import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
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
    HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
    HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
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
});
