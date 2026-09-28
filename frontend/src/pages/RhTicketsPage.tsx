import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { showToast } from '../utils/toast';
import useTicketsOverview from '../hooks/useTicketsOverview';
import RhTicketCard, { type RhTicket } from '../components/rh/RhTicketCard';
import { ACTIVE_STATUSES, currentInternalUser } from '../components/rh/rhLabels';
import '../styles/RhTicketsPage.css';

type Tab = 'novos' | 'comigo' | 'abertos' | 'encerrados';

const TABS: Array<{ id: Tab; label: string; icon: string; empty: { title: string; text: string } }> = [
  {
    id: 'novos',
    label: 'Novos',
    icon: 'ti-sparkles',
    empty: { title: 'Nenhum chamado novo', text: 'Quando alguém pedir algo ao RH, o chamado aparece aqui para ser assumido.' },
  },
  {
    id: 'comigo',
    label: 'Com você',
    icon: 'ti-user-check',
    empty: { title: 'Nada com você agora', text: 'Assuma um chamado na aba Novos para começar um atendimento.' },
  },
  {
    id: 'abertos',
    label: 'Todos em aberto',
    icon: 'ti-inbox',
    empty: { title: 'Nenhum chamado em aberto', text: 'Todos os pedidos ao RH foram resolvidos.' },
  },
  {
    id: 'encerrados',
    label: 'Encerrados',
    icon: 'ti-circle-check',
    empty: { title: 'Nenhum chamado encerrado', text: 'Os chamados resolvidos aparecem aqui.' },
  },
];

const PAGE_SIZE = 20;
const POLL_MS = 30_000;

const isTab = (value: string | null): value is Tab => TABS.some((tab) => tab.id === value);

export default function RhTicketsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = currentInternalUser();
  const tab: Tab = isTab(searchParams.get('aba')) ? (searchParams.get('aba') as Tab) : 'novos';

  const { overview, reload: reloadOverview } = useTicketsOverview('rh', true);
  const [tickets, setTickets] = useState<RhTicket[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [mineCount, setMineCount] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assumingId, setAssumingId] = useState('');
  const listTopRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('internal_token');
    if (!token || !user || !['rh_staff', 'admin'].includes(user.role || '')) navigate('/admin/login');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  // Espera a pessoa parar de digitar antes de buscar.
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => { setPage(1); }, [tab, debouncedSearch]);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    params.append('department', 'rh');
    if (tab === 'novos') {
      params.append('status', 'open');
      params.append('assigned_to', 'unassigned');
      params.append('sort', 'created_at');
      params.append('order', 'asc');
    } else if (tab === 'comigo') {
      ACTIVE_STATUSES.forEach((s) => params.append('status', s));
      params.append('assigned_to', user?.id || '');
      params.append('sort', 'updated_at');
      params.append('order', 'desc');
    } else if (tab === 'abertos') {
      ACTIVE_STATUSES.forEach((s) => params.append('status', s));
      params.append('sort', 'created_at');
      params.append('order', 'desc');
    } else {
      params.append('status', 'resolved');
      params.append('status', 'closed');
      params.append('sort', 'updated_at');
      params.append('order', 'desc');
    }
    if (debouncedSearch) params.append('search', debouncedSearch);
    params.append('page', String(page));
    params.append('limit', String(PAGE_SIZE));
    return params.toString();
  }, [tab, debouncedSearch, page, user?.id]);

  const load = useCallback(async (quiet = false) => {
    if (!user) return;
    try {
      if (!quiet) setLoading(true);
      const mineParams = ACTIVE_STATUSES.map((s) => `status=${s}`).join('&');
      const [listResp, mineResp] = await Promise.all([
        api.get(`/tickets?${buildQuery()}`),
        api.get(`/tickets?department=rh&${mineParams}&assigned_to=${user.id}&limit=1`),
      ]);
      setTickets(listResp.data?.data || []);
      setTotal(listResp.data?.pagination?.total ?? (listResp.data?.data || []).length);
      setTotalPages(listResp.data?.pagination?.totalPages ?? 1);
      setMineCount(mineResp.data?.pagination?.total ?? null);
      setError('');
    } catch (err: any) {
      if (!quiet) setError(err?.response?.data?.error || 'Não foi possível carregar os chamados. Confira a internet e toque em Tentar de novo.');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildQuery]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const refresh = () => void load(true);
    const timer = window.setInterval(refresh, POLL_MS);
    const events = ['ticket:new', 'ticket:updated', 'ticket:resolved', 'ticket:reopened'];
    events.forEach((name) => window.addEventListener(name, refresh));
    return () => {
      window.clearInterval(timer);
      events.forEach((name) => window.removeEventListener(name, refresh));
    };
  }, [load]);

  const chooseTab = (id: Tab) => {
    setSearchParams({ aba: id }, { replace: true });
  };

  const assume = async (ticket: RhTicket) => {
    if (!user) return;
    try {
      setAssumingId(ticket.id);
      await api.patch(`/tickets/${ticket.id}`, { status: 'in_progress', assigned_to_id: user.id });
      showToast.success('Chamado assumido. Agora ele está com você.');
      navigate(`/rh/chamados/${ticket.id}`);
    } catch (err: any) {
      showToast.error(err?.response?.data?.error || 'Não foi possível assumir o chamado. Tente de novo.');
      void load(true);
      reloadOverview();
    } finally {
      setAssumingId('');
    }
  };

  const goToPage = (next: number) => {
    setPage(next);
    listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openCount = overview
    ? overview.status.open + overview.status.inProgress + overview.status.waitingUser
      + overview.status.awaitingConfirmation + overview.paused.total
    : null;

  const countFor = (id: Tab): number | null => {
    if (id === 'novos') return overview?.attention.unassigned ?? null;
    if (id === 'comigo') return mineCount;
    if (id === 'abertos') return openCount;
    return null;
  };

  const currentTab = TABS.find((t) => t.id === tab)!;

  return (
    <div className="pub-page rh-page rht">
      <header className="rht-head">
        <div className="rh-wrap rht-head__inner">
          <h1>Chamados do RH</h1>
          <p>Escolha uma aba para ver os pedidos. Toque em um chamado para abrir e responder.</p>

          <label className="rht-search" htmlFor="rht-search-input">
            <i className="ti ti-search" aria-hidden="true" />
            <span className="pub-sr-only">Buscar chamados</span>
            <input
              id="rht-search-input"
              type="search"
              placeholder="Buscar por nome ou assunto"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button type="button" className="rht-search__clear" onClick={() => setSearch('')}>
                Limpar
              </button>
            )}
          </label>
        </div>

        <nav className="rht-tabs" aria-label="Tipos de chamado">
          <div className="rh-wrap rht-tabs__row">
            {TABS.map((item) => {
              const count = countFor(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`rht-tab ${item.id === 'novos' && (count ?? 0) > 0 ? 'has-alert' : ''}`}
                  aria-pressed={tab === item.id}
                  onClick={() => chooseTab(item.id)}
                >
                  <i className={`ti ${item.icon}`} aria-hidden="true" />
                  <span>{item.label}</span>
                  {count !== null && <span className="rht-tab__count">{count}</span>}
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      <div className="rh-wrap rht-body" ref={listTopRef}>
        {error && (
          <div className="pub-alert rht-alert" role="alert">
            <i className="ti ti-alert-circle" aria-hidden="true" />
            <span>{error}</span>
            <button type="button" onClick={() => void load()}>Tentar de novo</button>
          </div>
        )}

        {!loading && !error && (
          <p className="rht-count" aria-live="polite">
            {debouncedSearch
              ? `${total} ${total === 1 ? 'chamado encontrado' : 'chamados encontrados'} para "${debouncedSearch}"`
              : `${total} ${total === 1 ? 'chamado' : 'chamados'} em "${currentTab.label}"`}
            {tab === 'novos' && total > 0 && !debouncedSearch && ', os mais antigos primeiro'}
          </p>
        )}

        {loading ? (
          <div className="rht-list">{[0, 1, 2].map((n) => <div key={n} className="rh-skeleton" />)}</div>
        ) : tickets.length === 0 && !error ? (
          <div className="rh-card rh-empty">
            <span className={`pub-gicon ${tab === 'encerrados' ? '' : 'pub-gicon--rh'}`} aria-hidden="true">
              <i className={`ti ${debouncedSearch ? 'ti-search-off' : currentTab.icon}`} />
            </span>
            <h3>{debouncedSearch ? 'Nenhum chamado encontrado' : currentTab.empty.title}</h3>
            <p>{debouncedSearch ? 'Confira se o nome está escrito certo ou tente outra aba.' : currentTab.empty.text}</p>
            {debouncedSearch && (
              <button type="button" className="pub-btn pub-btn--ghost" onClick={() => setSearch('')}>Limpar busca</button>
            )}
          </div>
        ) : (
          <div className="rht-list">
            {tickets.map((ticket) => (
              <RhTicketCard
                key={ticket.id}
                ticket={ticket}
                currentUserId={user?.id || ''}
                onOpen={(t) => navigate(`/rh/chamados/${t.id}`)}
                onAssume={assume}
                assuming={assumingId === ticket.id}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && !loading && (
          <nav className="rht-pages" aria-label="Páginas">
            <button type="button" className="pub-btn pub-btn--ghost" disabled={page === 1} onClick={() => goToPage(page - 1)}>
              <i className="ti ti-chevron-left" aria-hidden="true" />
              Anterior
            </button>
            <span>Página {page} de {totalPages}</span>
            <button type="button" className="pub-btn pub-btn--ghost" disabled={page === totalPages} onClick={() => goToPage(page + 1)}>
              Próxima
              <i className="ti ti-chevron-right" aria-hidden="true" />
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
