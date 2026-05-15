import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { showToast } from '../utils/toast';
import '../styles/RhTicketsPage.css';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category?: string;
  created_at: string;
  updated_at: string;
  assigned_to?: string;
  assigned_to_name?: string;
  resolved_at?: string | null;
  message_count?: number;
  requester_name?: string;
  requester_email?: string;
  requester_department?: string;
  requester_unit?: string;
}

interface InternalUser {
  id: string;
  name: string;
  email: string;
}

interface TicketStats {
  waitingUser: number;
  inProgress: number;
  newToday: number;
  resolvedToday: number;
}

const RH_CATEGORY_LABELS: Record<string, string> = {
  RH_ATESTADO:    'Atestado Médico',
  RH_PONTO:       'Ajuste de Ponto',
  RH_FOLHA:       'Folha de Pagamento',
  RH_DECLARACAO:  'Declaração',
  RH_BENEFICIOS:  'Benefícios',
  RH_OUTROS:      'Outros RH',
  RH_CONFIDENCIAL:'Confidencial',
};

const STATUS_LABELS: Record<string, string> = {
  open:                  'Aberto',
  in_progress:           'Em Atendimento',
  waiting_user:          'Aguardando',
  aguardando_confirmacao:'Ag. Confirmação',
  resolved:              'Resolvido',
  closed:                'Fechado',
};

const PRIORITY_LABELS: Record<string, string> = {
  high: 'Alta', medium: 'Média', low: 'Baixa', critical: 'Crítica', urgent: 'Urgente',
};

const POLL_MS = 30_000;

export default function RhTicketsPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<InternalUser[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState<'high' | 'medium' | 'low' | null>(null);
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'mine' | 'unassigned'>('all');
  const [currentUserId, setCurrentUserId] = useState('');
  const [stats, setStats] = useState<TicketStats>({ waitingUser: 0, inProgress: 0, newToday: 0, resolvedToday: 0 });
  const [searchText, setSearchText] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [priorityFeedback, setPriorityFeedback] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const prevTotalRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Auth guard ──────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('internal_token');
    const userData = localStorage.getItem('internal_user');
    if (!token || !userData) { navigate('/admin/login'); return; }
    try {
      const user = JSON.parse(userData);
      if (!['rh_staff', 'admin'].includes(user.role || '')) { navigate('/admin/login'); return; }
      setCurrentUserId(user.id || '');
    } catch { navigate('/admin/login'); }
  }, [navigate]);

  // ── Feedback toast timeout ──────────────────────────────
  useEffect(() => {
    if (!priorityFeedback) return;
    const t = window.setTimeout(() => setPriorityFeedback(''), 1800);
    return () => window.clearTimeout(t);
  }, [priorityFeedback]);

  // ── Fetch ───────────────────────────────────────────────
  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    params.append('department', 'rh');
    const hasAdv = selectedStatuses.length > 0 || selectedPriorities.length > 0 || searchText.trim() !== '';
    const active = ['open', 'in_progress', 'waiting_user', 'aguardando_confirmacao'];

    if (selectedStatuses.length > 0) {
      selectedStatuses.forEach(s => params.append('status', s));
    } else if (!hasAdv) {
      if (filterStatus === 'all') {
        active.forEach(s => params.append('status', s));
      } else {
        params.append('status', filterStatus);
      }
    }

    if (searchText.trim()) params.append('search', searchText.trim());

    if (assignmentFilter === 'mine' && currentUserId) params.append('assigned_to', currentUserId);
    else if (assignmentFilter === 'unassigned') params.append('assigned_to', 'unassigned');

    if (selectedPriorities.length > 0) {
      selectedPriorities.forEach(p => params.append('priority', p));
    } else if (!hasAdv && filterPriority) {
      const pv = filterPriority === 'high' ? ['high', 'urgent'] : [filterPriority];
      pv.forEach(p => params.append('priority', p));
    }

    params.append('page', currentPage.toString());
    params.append('limit', '20');
    params.append('sort', 'created_at');
    params.append('order', 'desc');
    return params;
  }, [filterStatus, filterPriority, assignmentFilter, selectedStatuses, selectedPriorities, searchText, currentPage, currentUserId]);

  const applyResponse = useCallback((resp: any, silent: boolean) => {
    const data = resp.data;
    const ticketList: Ticket[] = data.data || [];
    const pagination = data.pagination;
    const newTotal: number = pagination?.total ?? ticketList.length;

    if (pagination) {
      setTotalPages(pagination.totalPages);
      setTotalTickets(newTotal);
    }

    if (data.stats) {
      setStats({
        waitingUser:    Number(data.stats.waitingUser || 0),
        inProgress:     Number(data.stats.inProgress  || 0),
        newToday:       Number(data.stats.newToday    || 0),
        resolvedToday:  Number(data.stats.resolvedToday || 0),
      });
    }

    if (silent && prevTotalRef.current > 0 && newTotal > prevTotalRef.current) {
      const diff = newTotal - prevTotalRef.current;
      showToast.info(`${diff} novo${diff > 1 ? 's' : ''} chamado${diff > 1 ? 's' : ''} de RH! 📨`);
    }
    prevTotalRef.current = newTotal;
    setTickets(ticketList);
    setLastUpdate(new Date());
  }, []);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const [resp, summaryResp] = await Promise.all([
        api.get(`/tickets?${buildParams().toString()}`),
        api.get('/tickets?department=rh&page=1&limit=1&sort=updated_at&order=desc'),
      ]);
      applyResponse(resp, false);
      if (summaryResp.data?.stats) {
        setStats({
          waitingUser:   Number(summaryResp.data.stats.waitingUser  || 0),
          inProgress:    Number(summaryResp.data.stats.inProgress   || 0),
          newToday:      Number(summaryResp.data.stats.newToday     || 0),
          resolvedToday: Number(summaryResp.data.stats.resolvedToday|| 0),
        });
      }
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao carregar chamados');
    } finally {
      setLoading(false);
    }
  }, [buildParams, applyResponse]);

  const silentRefresh = useCallback(async () => {
    try {
      setIsSyncing(true);
      const resp = await api.get(`/tickets?${buildParams().toString()}`);
      applyResponse(resp, true);
    } catch { /* silent */ } finally {
      setIsSyncing(false);
    }
  }, [buildParams, applyResponse]);

  useEffect(() => {
    if (!currentUserId && currentUserId !== '') return;
    void fetchTickets();
    void fetchUsers();
  }, [filterStatus, filterPriority, assignmentFilter, selectedStatuses, selectedPriorities, searchText, currentPage, currentUserId]);

  // Polling
  useEffect(() => {
    intervalRef.current = setInterval(() => void silentRefresh(), POLL_MS);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [silentRefresh]);

  const fetchUsers = async () => {
    try {
      const resp = await api.get('/internal-auth/users');
      setUsers(Array.isArray(resp.data) ? resp.data : []);
    } catch { /* non-critical */ }
  };

  // ── Actions ─────────────────────────────────────────────
  const handleQuickAssume = async (ticketId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const userData = localStorage.getItem('internal_user');
      if (!userData) return;
      const user = JSON.parse(userData);
      await api.patch(`/tickets/${ticketId}`, { status: 'in_progress', assigned_to_id: user.id });
      void fetchTickets();
    } catch (err: any) {
      setError(err.message || 'Erro ao assumir chamado');
    }
  };

  const handleQuickStatusChange = async (ticketId: string, newStatus: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api.patch(`/tickets/${ticketId}`, { status: newStatus });
      setSelectedTicket(null);
      void fetchTickets();
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar chamado');
    }
  };

  // ── Helpers ─────────────────────────────────────────────
  const getUserName = (userId?: string) => {
    if (!userId) return 'Ninguém';
    const u = users.find(u => u.id === userId);
    return u ? u.name : 'Atribuído';
  };

  const getStatusBadgeClass = (status: string) => {
    const map: Record<string, string> = {
      open:                  'badge badge-status-open',
      in_progress:           'badge badge-status-progress',
      waiting_user:          'badge badge-status-warning',
      aguardando_confirmacao:'badge badge-status-warning',
      resolved:              'badge badge-status-success',
      closed:                'badge badge-status-neutral',
    };
    return map[status] || 'badge badge-status-neutral';
  };

  const getPriorityBadgeClass = (priority: string) => {
    const map: Record<string, string> = {
      high:     'badge badge-priority-high',
      urgent:   'badge badge-priority-high',
      critical: 'badge badge-priority-critical',
      medium:   'badge badge-priority-medium',
      low:      'badge badge-priority-low',
    };
    return map[priority] || 'badge badge-priority-neutral';
  };

  const getMetricClass = (n: number) =>
    n === 0 ? 'rh-metric-value rh-metric-value--muted' : 'rh-metric-value rh-metric-value--strong';

  const getTimeAgo = (date: string) => {
    const ms = Date.now() - new Date(date).getTime();
    const h = Math.floor(ms / 3600000);
    const d = Math.floor(h / 24);
    if (d > 0) return `${d}d atrás`;
    if (h > 0) return `${h}h atrás`;
    return 'agora';
  };

  const getAgeTone = (date: string) => {
    const h = Math.floor((Date.now() - new Date(date).getTime()) / 3600000);
    if (h >= 24) return 'rh-time-ago--critical';
    if (h >= 8)  return 'rh-time-ago--warning';
    return 'rh-time-ago--fresh';
  };

  const getSLAHours = (priority: string) =>
    priority === 'critical' ? 4 : priority === 'high' ? 24 : priority === 'medium' ? 72 : 168;

  const getSlaElapsed = (ticket: Ticket) => {
    const start = new Date(ticket.created_at).getTime();
    const end   = ticket.resolved_at ? new Date(ticket.resolved_at).getTime() : Date.now();
    return Math.round(Math.max(0, end - start) / 3600000);
  };

  const isOverdue = (ticket: Ticket) =>
    !['closed','resolved'].includes(ticket.status) && getSlaElapsed(ticket) > getSLAHours(ticket.priority);

  const canResolve = (ticket: Ticket) =>
    ticket.assigned_to === currentUserId &&
    !['closed','resolved'].includes(ticket.status);

  const canWait = (ticket: Ticket) =>
    ticket.assigned_to === currentUserId &&
    !['closed','open'].includes(ticket.status);

  const isPriorityMatch = (ticket: Ticket, p: 'high' | 'medium' | 'low') =>
    p === 'high' ? ticket.priority === 'high' || ticket.priority === 'urgent' : ticket.priority === p;

  const activeStatuses = ['open','in_progress','waiting','waiting_user','aguardando_confirmacao'];
  const getPriorityCount = (p: 'high' | 'medium' | 'low') =>
    tickets.filter(t => activeStatuses.includes(t.status) && isPriorityMatch(t, p)).length;

  const hasAdv = selectedStatuses.length > 0 || selectedPriorities.length > 0 || searchText.trim() !== '';
  const myCount = tickets.filter(t => t.assigned_to === currentUserId && !['closed','resolved'].includes(t.status)).length;
  const activeFiltersCount = selectedStatuses.length + selectedPriorities.length + (searchText.trim() ? 1 : 0);

  const formattedUpdate = lastUpdate
    ? `${lastUpdate.toLocaleDateString('pt-BR')} às ${lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    : 'Ainda sem atualização';

  const priorityOptions: Array<{ value: 'high' | 'medium' | 'low' | null; label: string; count: number }> = [
    { value: null,     label: 'Todas',  count: totalTickets || tickets.length },
    { value: 'high',   label: 'Alta',   count: getPriorityCount('high')   },
    { value: 'medium', label: 'Média',  count: getPriorityCount('medium') },
    { value: 'low',    label: 'Baixa',  count: getPriorityCount('low')    },
  ];

  const handlePriorityChip = (v: 'high' | 'medium' | 'low' | null) => {
    setFilterPriority(v);
    setPriorityFeedback(v ? `Prioridade ${PRIORITY_LABELS[v]} aplicada` : 'Filtro de prioridade limpo');
    setCurrentPage(1);
  };

  if (!localStorage.getItem('internal_token')) return null;

  return (
    <div className="rh-tickets-dashboard">
      {/* Header */}
      <header className="rh-dashboard-header card">
        <div>
          <h1>Central Operacional RH</h1>
        </div>
        <div className="rh-dashboard-header-status">
          <span className="rh-status-chip">
            <span className={`rh-status-dot`} style={{ opacity: isSyncing ? 1 : 0.5 }} />
            <span>{formattedUpdate}</span>
          </span>
          <span className="rh-status-chip">
            <strong>{tickets.length}</strong> na fila
          </span>
          <span className="rh-status-chip">
            <strong>{myCount}</strong> meus atendimentos
          </span>
        </div>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      {hasAdv && (
        <div className="rh-filters-warning">
          ℹ️ <strong>Filtros avançados ativos.</strong> Os filtros rápidos abaixo estão desabilitados.
        </div>
      )}

      {/* Priority toolbar */}
      <div className="rh-stats-container">
        <div className="rh-priority-toolbar">
          <span className="rh-priority-toolbar-label">Prioridade</span>
          <div className="rh-priority-chip-row">
            {priorityOptions.map(opt => {
              const isActive = opt.value === null ? filterPriority === null : filterPriority === opt.value;
              const cls = opt.value ?? 'all';
              return (
                <button
                  key={opt.value ?? 'all'}
                  type="button"
                  className={`rh-priority-chip rh-priority-chip--${cls} ${isActive ? 'is-active' : ''}`}
                  onClick={() => { if (!hasAdv) handlePriorityChip(opt.value); }}
                  disabled={hasAdv}
                  aria-pressed={isActive}
                >
                  <span>{opt.label}</span>
                  <span className="rh-priority-chip-count">{opt.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rh-day-summary">
          <div className="rh-summary-pill">
            <span className={getMetricClass(stats.newToday)}>{stats.newToday}</span>
            <span className="rh-summary-pill-label">Novos</span>
          </div>
          <div className="rh-summary-pill">
            <span className={getMetricClass(stats.resolvedToday)}>{stats.resolvedToday}</span>
            <span className="rh-summary-pill-label">Resolvidos</span>
          </div>
        </div>
      </div>

      {priorityFeedback && (
        <div className="rh-priority-feedback">{priorityFeedback}</div>
      )}

      {filterPriority && !hasAdv && (
        <div className="rh-active-filter-banner">
          <div className="rh-active-filter-info">
            <span>{filterPriority === 'high' ? '🟠' : filterPriority === 'medium' ? '🟡' : '🟢'}</span>
            <span>Filtro ativo: Prioridade {PRIORITY_LABELS[filterPriority]}</span>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFilterPriority(null)}>
            ✕ Limpar Filtro
          </button>
        </div>
      )}

      {/* Advanced filters */}
      {showFilters && (
        <div className="rh-advanced-filters card">
          {hasAdv && (
            <div className="rh-advanced-filters-alert">
              <strong>Filtros ativos:</strong>
              {searchText.trim() && <span>Busca: "{searchText}"</span>}
              {selectedStatuses.length > 0 && <span>Status: {selectedStatuses.length} selecionado(s)</span>}
              {selectedPriorities.length > 0 && <span>Prioridades: {selectedPriorities.length} selecionada(s)</span>}
            </div>
          )}
          <div className="rh-advanced-filters-grid">
            <div className="rh-filter-group">
              <label className="rh-filter-label">Buscar</label>
              <div className="rh-filter-input-wrap">
                <span className="rh-filter-input-icon">
                  <svg viewBox="0 0 24 24" fill="none">
                    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                    <path d="M20 20L16.6 16.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Buscar por título, solicitante ou e-mail"
                  value={searchText}
                  onChange={e => { setSearchText(e.target.value); setCurrentPage(1); }}
                  className="rh-filter-input rh-filter-input-search"
                />
                {searchText.trim() && (
                  <button type="button" className="rh-filter-input-clear" onClick={() => { setSearchText(''); setCurrentPage(1); }}>✕</button>
                )}
              </div>
            </div>

            <div className="rh-filter-group">
              <label className="rh-filter-label">Status</label>
              <div className="rh-advanced-chip-list">
                {[
                  { value: 'open',                  label: 'Aberto',          dot: 'rh-advanced-chip-dot--open'     },
                  { value: 'in_progress',           label: 'Em Atendimento',  dot: 'rh-advanced-chip-dot--progress' },
                  { value: 'waiting_user',          label: 'Aguardando',      dot: 'rh-advanced-chip-dot--waiting'  },
                  { value: 'aguardando_confirmacao',label: 'Ag. Confirmação', dot: 'rh-advanced-chip-dot--confirm'  },
                  { value: 'resolved',              label: 'Resolvido',       dot: 'rh-advanced-chip-dot--resolved' },
                  { value: 'closed',                label: 'Fechado',         dot: 'rh-advanced-chip-dot--closed'   },
                ].map(s => (
                  <button
                    key={s.value}
                    type="button"
                    className={`rh-advanced-chip ${selectedStatuses.includes(s.value) ? 'is-selected' : ''}`}
                    onClick={() => {
                      setSelectedStatuses(selectedStatuses.includes(s.value)
                        ? selectedStatuses.filter(x => x !== s.value)
                        : [...selectedStatuses, s.value]);
                      setCurrentPage(1);
                    }}
                  >
                    <span className={`rh-advanced-chip-dot ${s.dot}`} />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rh-filter-group">
              <label className="rh-filter-label">Prioridade</label>
              <div className="rh-advanced-chip-list">
                {[
                  { value: 'high',   label: 'Alta',  dot: 'rh-advanced-chip-dot--high'   },
                  { value: 'medium', label: 'Média', dot: 'rh-advanced-chip-dot--medium' },
                  { value: 'low',    label: 'Baixa', dot: 'rh-advanced-chip-dot--low'    },
                ].map(p => (
                  <button
                    key={p.value}
                    type="button"
                    className={`rh-advanced-chip ${selectedPriorities.includes(p.value) ? 'is-selected' : ''}`}
                    onClick={() => {
                      setSelectedPriorities(selectedPriorities.includes(p.value)
                        ? selectedPriorities.filter(x => x !== p.value)
                        : [...selectedPriorities, p.value]);
                      setCurrentPage(1);
                    }}
                  >
                    <span className={`rh-advanced-chip-dot ${p.dot}`} />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rh-advanced-filters-footer">
            <button
              type="button"
              className="rh-advanced-clear-btn"
              onClick={() => {
                setSearchText(''); setSelectedStatuses([]); setSelectedPriorities([]);
                setFilterStatus('all'); setFilterPriority(null); setCurrentPage(1);
              }}
            >
              Limpar filtros
            </button>
          </div>
        </div>
      )}

      {/* Main layout */}
      <div className="rh-dashboard-layout">
        {/* Queue column */}
        <div className="rh-queue-column">
          <div className="rh-assignment-filters">
            <button
              className={`rh-filter-btn ${assignmentFilter === 'all' ? 'active' : ''}`}
              onClick={() => { setAssignmentFilter('all'); setFilterStatus('all'); }}
            >
              Fila ativa
            </button>
            <button
              className={`rh-filter-btn ${assignmentFilter === 'mine' ? 'active' : ''}`}
              onClick={() => { setAssignmentFilter('mine'); setFilterStatus('all'); }}
            >
              Meus atendimentos ({myCount})
            </button>
            <button
              className={`rh-filter-btn ${assignmentFilter === 'unassigned' ? 'active' : ''}`}
              onClick={() => { setAssignmentFilter('unassigned'); setFilterStatus('all'); }}
            >
              Não atribuídos
            </button>
            <button
              className={`rh-filter-btn rh-filter-btn-toggle ${showFilters ? 'active' : ''}`}
              onClick={() => {
                setShowFilters(!showFilters);
                if (!showFilters) { setFilterStatus('all'); setFilterPriority(null); }
              }}
            >
              {showFilters ? 'Ocultar filtros' : 'Filtros avançados'}
              {hasAdv && <span className="rh-filter-counter">{activeFiltersCount}</span>}
            </button>
          </div>

          <section className="card rh-ticket-queue">
            <div className="rh-queue-header card-header">
              <h2>Fila de Atendimento RH</h2>
              <span className="rh-queue-count">
                {tickets.length} chamados
                {filterPriority && ` • Prioridade ${PRIORITY_LABELS[filterPriority]}`}
              </span>
            </div>

            {loading ? (
              <div className="loading">Carregando...</div>
            ) : tickets.length === 0 ? (
              <div className="rh-empty-queue">
                <span className="rh-empty-icon">✨</span>
                <p>Nenhum chamado na fila!</p>
                <small>Você está em dia com o atendimento</small>
              </div>
            ) : (
              <div className="rh-tickets-list">
                {tickets.map(ticket => (
                  <div
                    key={ticket.id}
                    className={`rh-ticket-card rh-status-${ticket.status} rh-priority-${ticket.priority || 'neutral'} ${selectedTicket?.id === ticket.id ? 'active' : ''}`}
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <div className="rh-card-top">
                      <div className="rh-card-main">
                        <div className="rh-card-title">{ticket.title}</div>
                        <div className="rh-card-requester">
                          {ticket.requester_name && (
                            <span className="rh-requester-name">{ticket.requester_name}</span>
                          )}
                          {ticket.requester_email && (
                            <span className="rh-requester-meta">{ticket.requester_email}</span>
                          )}
                          {(ticket.requester_department || ticket.requester_unit) && (
                            <span className="rh-requester-meta">
                              {ticket.requester_department}
                              {ticket.requester_department && ticket.requester_unit && ' • '}
                              {ticket.requester_unit}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`rh-time-ago ${getAgeTone(ticket.created_at)}`}>
                        {getTimeAgo(ticket.created_at)}
                      </span>
                    </div>

                    <div className="rh-card-badges">
                      {ticket.category && (
                        <span className="badge badge-category">
                          {RH_CATEGORY_LABELS[ticket.category] || ticket.category}
                        </span>
                      )}
                      <span className={getPriorityBadgeClass(ticket.priority)}>
                        {PRIORITY_LABELS[ticket.priority] || ticket.priority}
                      </span>
                      <span className={getStatusBadgeClass(ticket.status)}>
                        {STATUS_LABELS[ticket.status] || ticket.status}
                      </span>
                    </div>

                    <div className="rh-card-footer">
                      <span className="rh-assigned">{getUserName(ticket.assigned_to)}</span>
                      <span className={`rh-sla-chip ${isOverdue(ticket) ? 'rh-sla-chip--overdue' : ''}`}>
                        {getSlaElapsed(ticket)}h{isOverdue(ticket) ? ' • Atrasado' : ''}
                      </span>
                      <div className="rh-footer-actions">
                        <div className="rh-quick-actions">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={e => { e.stopPropagation(); navigate(`/rh/chamados/${ticket.id}`); }}
                          >
                            Detalhes
                          </button>
                          {canResolve(ticket) && (
                            <button
                              type="button"
                              className="btn btn-success btn-sm"
                              onClick={e => void handleQuickStatusChange(ticket.id, 'resolved', e)}
                            >
                              Resolver
                            </button>
                          )}
                        </div>
                        {!ticket.assigned_to && ticket.status === 'open' && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={e => void handleQuickAssume(ticket.id, e)}
                          >
                            Assumir
                          </button>
                        )}
                        <span className={`badge badge-mini ${getStatusBadgeClass(ticket.status)}`}>
                          {STATUS_LABELS[ticket.status] || ticket.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="rh-pagination card">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  ◀ Anterior
                </button>
                <span className="rh-pagination-info">
                  Página {currentPage} de {totalPages}
                  <small>({totalTickets} chamados)</small>
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Próxima ▶
                </button>
              </div>
            )}
          </section>
        </div>

        {/* Side panel */}
        {selectedTicket ? (
          <aside className="rh-ticket-panel card">
            <div className="rh-panel-header card-header">
              <div className="rh-panel-header-main">
                <span className="rh-panel-ticket-id">#{selectedTicket.id.substring(0, 8).toUpperCase()}</span>
                <h3 className="rh-panel-title">{selectedTicket.title}</h3>
              </div>
              <button className="rh-close-panel" onClick={() => setSelectedTicket(null)} aria-label="Fechar preview">✕</button>
            </div>

            <div className="rh-panel-content card-body">
              <div className="rh-panel-badges">
                <span className={getStatusBadgeClass(selectedTicket.status)}>
                  {STATUS_LABELS[selectedTicket.status] || selectedTicket.status}
                </span>
                <span className={getPriorityBadgeClass(selectedTicket.priority)}>
                  {PRIORITY_LABELS[selectedTicket.priority] || selectedTicket.priority}
                </span>
                {selectedTicket.category && (
                  <span className="badge badge-category">
                    {RH_CATEGORY_LABELS[selectedTicket.category] || selectedTicket.category}
                  </span>
                )}
              </div>

              <div className="rh-panel-meta">
                Aberto há {getTimeAgo(selectedTicket.created_at)} • Responsável: {getUserName(selectedTicket.assigned_to)}
              </div>

              <div className="rh-panel-actions">
                <button
                  className="btn btn-primary btn-block"
                  onClick={() => navigate(`/rh/chamados/${selectedTicket.id}`)}
                >
                  Ver detalhes completos
                </button>
                <button
                  className="btn btn-warning"
                  onClick={() => void handleQuickStatusChange(selectedTicket.id, 'waiting_user')}
                  disabled={!canWait(selectedTicket)}
                  title={canWait(selectedTicket) ? undefined : 'Somente o responsável atual pode usar esta ação'}
                >
                  Aguardar
                </button>
                <button
                  className="btn btn-success"
                  onClick={() => void handleQuickStatusChange(selectedTicket.id, 'resolved')}
                  disabled={!canResolve(selectedTicket)}
                  title={canResolve(selectedTicket) ? undefined : 'Somente o responsável atual pode usar esta ação'}
                >
                  Resolver
                </button>
              </div>

              {selectedTicket.description && (
                <section className="rh-panel-section">
                  <h4>Descrição</h4>
                  <p>{selectedTicket.description}</p>
                </section>
              )}

              <section className="rh-panel-section">
                <h4>Informações</h4>
                <div className="rh-panel-info">
                  <div className="rh-info-row">
                    <span className="rh-info-label">Solicitante</span>
                    <span className="rh-info-value">{selectedTicket.requester_name || '—'}</span>
                  </div>
                  {selectedTicket.requester_email && (
                    <div className="rh-info-row">
                      <span className="rh-info-label">Email</span>
                      <span className="rh-info-value">{selectedTicket.requester_email}</span>
                    </div>
                  )}
                  {(selectedTicket.requester_department || selectedTicket.requester_unit) && (
                    <div className="rh-info-row">
                      <span className="rh-info-label">Localização</span>
                      <span className="rh-info-value">
                        {selectedTicket.requester_department || '—'}
                        {selectedTicket.requester_department && selectedTicket.requester_unit && ' • '}
                        {selectedTicket.requester_unit || ''}
                      </span>
                    </div>
                  )}
                  <div className="rh-info-row">
                    <span className="rh-info-label">Departamento</span>
                    <span className="rh-info-value">👥 Recursos Humanos</span>
                  </div>
                  {selectedTicket.category && (
                    <div className="rh-info-row">
                      <span className="rh-info-label">Categoria</span>
                      <span className="rh-info-value">
                        {RH_CATEGORY_LABELS[selectedTicket.category] || selectedTicket.category}
                      </span>
                    </div>
                  )}
                  <div className="rh-info-row">
                    <span className="rh-info-label">SLA</span>
                    <span className="rh-info-value" style={{ color: isOverdue(selectedTicket) ? '#b91c1c' : undefined }}>
                      {getSlaElapsed(selectedTicket)}h{isOverdue(selectedTicket) ? ' — Atrasado' : ''}
                    </span>
                  </div>
                  <div className="rh-info-row">
                    <span className="rh-info-label">Mensagens</span>
                    <span className="rh-info-value">{selectedTicket.message_count ?? 0}</span>
                  </div>
                </div>
              </section>
            </div>
          </aside>
        ) : (
          <aside className="rh-ticket-panel empty card">
            <div className="rh-empty-panel">
              <span className="rh-empty-icon-large">📊</span>
              <h3>Resumo Operacional</h3>
              <p>Selecione um chamado da fila para ver o preview detalhado.</p>
              <div className="rh-empty-panel-metrics">
                <div className="rh-empty-metric-card">
                  <span className={getMetricClass(tickets.length)}>{tickets.length}</span>
                  <span className="rh-empty-metric-label">Na fila</span>
                </div>
                <div className="rh-empty-metric-card">
                  <span className={getMetricClass(myCount)}>{myCount}</span>
                  <span className="rh-empty-metric-label">Meus atendimentos</span>
                </div>
                <div className="rh-empty-metric-card">
                  <span className={getMetricClass(stats.waitingUser)}>{stats.waitingUser}</span>
                  <span className="rh-empty-metric-label">Aguardando usuário</span>
                </div>
                <div className="rh-empty-metric-card">
                  <span className={getMetricClass(stats.resolvedToday)}>{stats.resolvedToday}</span>
                  <span className="rh-empty-metric-label">Resolvidos hoje</span>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
