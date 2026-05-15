import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import '../styles/AdminTicketsPage.css';

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
  waiting: 'Aguardando',
  aguardando_confirmacao: 'Aguard. Confirmação',
  resolved: 'Resolvido',
  closed: 'Fechado',
  cancelled: 'Cancelado',
};

const PRIORITY_LABELS: Record<string, string> = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
  critical: 'Crítica',
};

export default function RhTicketsPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);
  const [stats, setStats] = useState<TicketStats>({ waitingUser: 0, inProgress: 0, newToday: 0, resolvedToday: 0 });
  const LIMIT = 20;

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        department: 'rh',
        page: String(currentPage),
        limit: String(LIMIT),
        sort: 'created_at',
        order: 'desc',
      });

      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (searchText.trim()) params.set('search', searchText.trim());

      const resp = await api.get(`/tickets?${params.toString()}`);
      let data: Ticket[] = resp.data?.data || [];

      if (filterCategory !== 'all') {
        data = data.filter((t) => t.category === filterCategory);
      }

      setTickets(data);
      setTotalPages(resp.data?.pagination?.totalPages || 1);
      setTotalTickets(resp.data?.pagination?.total || 0);
      setStats(resp.data?.stats || { waitingUser: 0, inProgress: 0, newToday: 0, resolvedToday: 0 });
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao carregar chamados');
    } finally {
      setLoading(false);
    }
  }, [currentPage, filterStatus, filterCategory, searchText]);

  useEffect(() => {
    const token = localStorage.getItem('internal_token');
    const userRaw = localStorage.getItem('internal_user');
    if (!token || !userRaw) {
      navigate('/admin/login');
      return;
    }
    try {
      const user = JSON.parse(userRaw) as { role?: string };
      if (!['rh_staff', 'admin'].includes(user.role || '')) {
        navigate('/admin/login');
        return;
      }
    } catch {
      navigate('/admin/login');
      return;
    }
    void fetchTickets();
  }, [navigate, fetchTickets]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    void fetchTickets();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusClass = (status: string) => {
    const map: Record<string, string> = {
      open: 'at-badge at-badge-open',
      in_progress: 'at-badge at-badge-progress',
      waiting: 'at-badge at-badge-waiting',
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
      <div className="at-header">
        <div className="at-header-info">
          <h1 className="at-title">Chamados de RH</h1>
          <p className="at-subtitle">{totalTickets} chamado{totalTickets !== 1 ? 's' : ''} encontrado{totalTickets !== 1 ? 's' : ''}</p>
        </div>
        <button className="at-btn at-btn-secondary" onClick={() => navigate('/rh/dashboard')}>
          ← Dashboard
        </button>
      </div>

      {/* Stats bar */}
      <div className="at-stats-bar">
        <div className="at-stat">
          <span className="at-stat-value">{stats.newToday}</span>
          <span className="at-stat-label">Novos hoje</span>
        </div>
        <div className="at-stat">
          <span className="at-stat-value">{stats.inProgress}</span>
          <span className="at-stat-label">Em atendimento</span>
        </div>
        <div className="at-stat">
          <span className="at-stat-value">{stats.waitingUser}</span>
          <span className="at-stat-label">Aguardando</span>
        </div>
        <div className="at-stat">
          <span className="at-stat-value">{stats.resolvedToday}</span>
          <span className="at-stat-label">Resolvidos hoje</span>
        </div>
      </div>

      {/* Filters */}
      <div className="at-filters">
        <form className="at-search-form" onSubmit={handleSearch}>
          <input
            type="text"
            className="at-search-input"
            placeholder="Buscar chamado..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <button type="submit" className="at-btn at-btn-primary">Buscar</button>
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
            <option value="waiting">Aguardando</option>
            <option value="aguardando_confirmacao">Aguard. Confirmação</option>
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
        <div className="at-loading">Carregando chamados...</div>
      ) : tickets.length === 0 ? (
        <div className="at-empty">Nenhum chamado de RH encontrado.</div>
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
                {tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="at-row"
                    onClick={() => navigate(`/rh/chamados/${ticket.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="at-ticket-title">
                      <span>{ticket.title}</span>
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
                    <td>
                      <span className={getStatusClass(ticket.status)}>
                        {STATUS_LABELS[ticket.status] || ticket.status}
                      </span>
                    </td>
                    <td>
                      <span className={getPriorityClass(ticket.priority)}>
                        {PRIORITY_LABELS[ticket.priority] || ticket.priority}
                      </span>
                    </td>
                    <td className="at-date">{formatDate(ticket.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="at-pagination">
              <button
                className="at-btn at-btn-secondary"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                ← Anterior
              </button>
              <span className="at-page-info">
                Página {currentPage} de {totalPages}
              </span>
              <button
                className="at-btn at-btn-secondary"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Próxima →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
