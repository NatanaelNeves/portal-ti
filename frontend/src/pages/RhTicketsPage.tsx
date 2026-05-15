import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { showToast } from '../utils/toast';
import '../styles/RhTicketsPage.css';

interface Ticket {
  id: string;
  title: string;
  status: string;
  priority: string;
  category?: string;
  created_at: string;
  updated_at: string;
  assigned_to?: string;
  assigned_to_name?: string;
  requester_name?: string;
  requester_email?: string;
  message_count?: number;
}

interface TicketStats {
  waitingUser: number;
  inProgress: number;
  newToday: number;
  resolvedToday: number;
}

const RH_CATEGORY_LABELS: Record<string, string> = {
  RH_ATESTADO: 'Atestado Médico',
  RH_PONTO: 'Ajuste de Ponto',
  RH_FOLHA: 'Folha de Pagamento',
  RH_DECLARACAO: 'Declaração',
  RH_BENEFICIOS: 'Benefícios',
  RH_OUTROS: 'Outros',
  RH_CONFIDENCIAL: 'Confidencial',
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Aberto',
  in_progress: 'Em Atendimento',
  waiting_user: 'Aguardando',
  aguardando_confirmacao: 'Ag. Confirmação',
  resolved: 'Resolvido',
  closed: 'Fechado',
};

const PRIORITY_LABELS: Record<string, string> = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
  critical: 'Crítica',
};

const STAT_CONFIG = [
  { key: 'newToday',     label: 'Novos hoje',       icon: '📥', accent: '#3b82f6' },
  { key: 'inProgress',  label: 'Em atendimento',    icon: '⚙️',  accent: '#f59e0b' },
  { key: 'waitingUser', label: 'Aguardando',         icon: '⏳', accent: '#8b5cf6' },
  { key: 'resolvedToday', label: 'Resolvidos hoje', icon: '✅', accent: '#10b981' },
] as const;

const POLL_INTERVAL_MS = 30_000;

export default function RhTicketsPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);
  const [stats, setStats] = useState<TicketStats>({ waitingUser: 0, inProgress: 0, newToday: 0, resolvedToday: 0 });

  const prevTotalRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const LIMIT = 20;

  const buildParams = useCallback((page: number) => {
    const params = new URLSearchParams({
      department: 'rh',
      page: String(page),
      limit: String(LIMIT),
      sort: 'created_at',
      order: 'desc',
    });
    if (filterStatus !== 'all') params.set('status', filterStatus);
    if (searchText.trim()) params.set('search', searchText.trim());
    return params;
  }, [filterStatus, searchText]);

  const applyData = useCallback((resp: any, silent: boolean) => {
    const newTotal: number = resp.data?.pagination?.total || 0;
    let data: Ticket[] = resp.data?.data || [];
    if (filterCategory !== 'all') {
      data = data.filter((t) => t.category === filterCategory);
    }
    if (silent && prevTotalRef.current > 0 && newTotal > prevTotalRef.current) {
      const diff = newTotal - prevTotalRef.current;
      showToast.info(`${diff} novo${diff > 1 ? 's' : ''} chamado${diff > 1 ? 's' : ''} recebido${diff > 1 ? 's' : ''}! 📨`);
    }
    prevTotalRef.current = newTotal;
    setTickets(data);
    setTotalPages(resp.data?.pagination?.totalPages || 1);
    setTotalTickets(newTotal);
    setStats(resp.data?.stats || { waitingUser: 0, inProgress: 0, newToday: 0, resolvedToday: 0 });
  }, [filterCategory]);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const resp = await api.get(`/tickets?${buildParams(currentPage).toString()}`);
      applyData(resp, false);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao carregar chamados');
    } finally {
      setLoading(false);
    }
  }, [currentPage, buildParams, applyData]);

  const silentRefresh = useCallback(async () => {
    try {
      setIsSyncing(true);
      const resp = await api.get(`/tickets?${buildParams(currentPage).toString()}`);
      applyData(resp, true);
    } catch {
      // silent — don't show error for background refresh
    } finally {
      setIsSyncing(false);
    }
  }, [currentPage, buildParams, applyData]);

  // Auth guard + initial fetch
  useEffect(() => {
    const token = localStorage.getItem('internal_token');
    const userRaw = localStorage.getItem('internal_user');
    if (!token || !userRaw) { navigate('/admin/login'); return; }
    try {
      const user = JSON.parse(userRaw) as { role?: string };
      if (!['rh_staff', 'admin'].includes(user.role || '')) {
        navigate('/admin/login'); return;
      }
    } catch { navigate('/admin/login'); return; }
    void fetchTickets();
  }, [navigate, fetchTickets]);

  // Polling
  useEffect(() => {
    intervalRef.current = setInterval(() => { void silentRefresh(); }, POLL_INTERVAL_MS);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [silentRefresh]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    void fetchTickets();
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });

  const getStatusClass = (status: string) => {
    const map: Record<string, string> = {
      open: 'at-badge at-badge-open',
      in_progress: 'at-badge at-badge-progress',
      waiting_user: 'at-badge at-badge-waiting',
      aguardando_confirmacao: 'at-badge at-badge-waiting',
      resolved: 'at-badge at-badge-resolved',
      closed: 'at-badge at-badge-closed',
    };
    return map[status] || 'at-badge';
  };

  const getPriorityClass = (priority: string) => {
    const map: Record<string, string> = {
      high: 'at-badge at-badge-high',
      critical: 'at-badge at-badge-critical',
      medium: 'at-badge at-badge-medium',
      low: 'at-badge at-badge-low',
    };
    return map[priority] || 'at-badge';
  };

  return (
    <div className="admin-tickets-page">
      {/* Header */}
      <div className="at-header">
        <div className="at-header-info">
          <div className="at-title-row">
            <h1 className="at-title">Chamados de RH</h1>
            <span className={`at-sync-dot ${isSyncing ? 'at-sync-dot--active' : ''}`} title="Sincronização automática ativa" />
          </div>
          <p className="at-subtitle">
            {totalTickets} chamado{totalTickets !== 1 ? 's' : ''} encontrado{totalTickets !== 1 ? 's' : ''}
            {isSyncing && <span className="at-syncing-label"> · sincronizando…</span>}
          </p>
        </div>
        <button className="at-btn at-btn-secondary" onClick={() => navigate('/rh/dashboard')}>
          ← Dashboard
        </button>
      </div>

      {/* Stats bar */}
      <div className="at-stats-bar">
        {STAT_CONFIG.map(({ key, label, icon, accent }) => (
          <div key={key} className="at-stat" style={{ borderLeftColor: accent }}>
            <span className="at-stat-icon">{icon}</span>
            <div className="at-stat-body">
              <span className="at-stat-value" style={{ color: accent }}>
                {stats[key as keyof TicketStats]}
              </span>
              <span className="at-stat-label">{label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="at-filters">
        <form className="at-search-form" onSubmit={handleSearch}>
          <div className="at-search-wrapper">
            <span className="at-search-icon">🔍</span>
            <input
              type="text"
              className="at-search-input"
              placeholder="Buscar chamado..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          <button type="submit" className="at-btn at-btn-search">Buscar</button>
        </form>

        <div className="at-filter-group">
          <select
            className="at-filter-select"
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
          >
            <option value="all">Todos os status</option>
            <option value="open">Aberto</option>
            <option value="in_progress">Em Atendimento</option>
            <option value="waiting_user">Aguardando</option>
            <option value="aguardando_confirmacao">Ag. Confirmação</option>
            <option value="resolved">Resolvido</option>
            <option value="closed">Fechado</option>
          </select>

          <select
            className="at-filter-select"
            value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }}
          >
            <option value="all">Todas as categorias</option>
            {Object.entries(RH_CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="at-error">{error}</div>}

      {loading ? (
        <div className="at-loading">
          <span className="at-loading-spinner" />
          Carregando chamados...
        </div>
      ) : tickets.length === 0 ? (
        <div className="at-empty">
          <div className="at-empty-icon">📭</div>
          Nenhum chamado de RH encontrado.
        </div>
      ) : (
        <>
          <div className="at-table-wrapper">
            <table className="at-table">
              <thead>
                <tr>
                  <th>Chamado</th>
                  <th>Categoria</th>
                  <th>Solicitante</th>
                  <th>Responsável</th>
                  <th>Status</th>
                  <th>Prioridade</th>
                  <th>Criado em</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket, idx) => (
                  <tr
                    key={ticket.id}
                    className={`at-row ${idx % 2 === 1 ? 'at-row--alt' : ''}`}
                    onClick={() => navigate(`/rh/chamados/${ticket.id}`)}
                  >
                    <td>
                      <div className="at-ticket-title">{ticket.title}</div>
                      {(ticket.message_count ?? 0) > 0 && (
                        <span className="at-msg-count">💬 {ticket.message_count}</span>
                      )}
                    </td>
                    <td>{ticket.category ? RH_CATEGORY_LABELS[ticket.category] || ticket.category : '—'}</td>
                    <td>
                      <div>{ticket.requester_name || '—'}</div>
                      {ticket.requester_email && (
                        <div className="at-sub-text">{ticket.requester_email}</div>
                      )}
                    </td>
                    <td>{ticket.assigned_to_name || <span className="at-unassigned">Não atribuído</span>}</td>
                    <td><span className={getStatusClass(ticket.status)}>{STATUS_LABELS[ticket.status] || ticket.status}</span></td>
                    <td><span className={getPriorityClass(ticket.priority)}>{PRIORITY_LABELS[ticket.priority] || ticket.priority}</span></td>
                    <td className="at-date">{formatDate(ticket.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="at-pagination">
              <button className="at-btn at-btn-secondary" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
                ← Anterior
              </button>
              <span className="at-page-info">Página {currentPage} de {totalPages}</span>
              <button className="at-btn at-btn-secondary" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                Próxima →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
