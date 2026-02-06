import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/GestorTicketsPage.css';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  type: string;
  created_at: string;
  updated_at: string;
  assigned_to?: string;
}

interface InternalUser {
  id: string;
  name: string;
}

export default function GestorTicketsPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<InternalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('internal_token');
    if (!token) {
      navigate('/admin/login');
      return;
    }

    const user = localStorage.getItem('internal_user');
    if (user) {
      const userData = JSON.parse(user);
      if (userData.role !== 'manager') {
        navigate('/admin/chamados');
        return;
      }
    }

    fetchTickets(token);
    fetchUsers(token);
  }, [filterStatus, navigate]);

  const fetchUsers = async (token: string) => {
    try {
      const response = await fetch('/api/internal-auth/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
    }
  };

  const fetchTickets = async (token: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/tickets', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Erro ao carregar chamados');

      const data = await response.json();
      setTickets(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar chamados');
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      open: 'Aberto',
      in_progress: 'Em Atendimento',
      waiting_user: 'Aguardando Usuário',
      resolved: 'Resolvido',
      closed: 'Fechado',
    };
    return labels[status] || status;
  };

  const getUserName = (userId?: string) => {
    if (!userId) return 'Não atribuído';
    const user = users.find(u => u.id === userId);
    return user ? user.name : 'Atribuído';
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d`;
    if (diffHours > 0) return `${diffHours}h`;
    return 'agora';
  };

  const filteredTickets = tickets
    .filter(t => filterStatus === 'all' || t.status === filterStatus)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
  };

  return (
    <div className="gestor-tickets-page">
      <div className="page-header">
        <div>
          <h1>📋 Visão Geral de Solicitações</h1>
          <p>Acompanhamento e monitoramento</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Estatísticas */}
      <div className="stats-overview">
        <div className="stat-box">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total</div>
        </div>
        <div className="stat-box stat-open">
          <div className="stat-value">{stats.open}</div>
          <div className="stat-label">Abertos</div>
        </div>
        <div className="stat-box stat-progress">
          <div className="stat-value">{stats.inProgress}</div>
          <div className="stat-label">Em Atendimento</div>
        </div>
        <div className="stat-box stat-resolved">
          <div className="stat-value">{stats.resolved}</div>
          <div className="stat-label">Resolvidos</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="filters-bar">
        <button
          className={`filter-chip ${filterStatus === 'all' ? 'active' : ''}`}
          onClick={() => setFilterStatus('all')}
        >
          Todos
        </button>
        <button
          className={`filter-chip ${filterStatus === 'open' ? 'active' : ''}`}
          onClick={() => setFilterStatus('open')}
        >
          Abertos
        </button>
        <button
          className={`filter-chip ${filterStatus === 'in_progress' ? 'active' : ''}`}
          onClick={() => setFilterStatus('in_progress')}
        >
          Em Atendimento
        </button>
        <button
          className={`filter-chip ${filterStatus === 'resolved' ? 'active' : ''}`}
          onClick={() => setFilterStatus('resolved')}
        >
          Resolvidos
        </button>
      </div>

      {/* Layout Principal */}
      <div className="content-layout">
        {/* Lista de Tickets */}
        <div className="tickets-list-section">
          {loading ? (
            <div className="loading">Carregando...</div>
          ) : filteredTickets.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📭</span>
              <p>Nenhuma solicitação encontrada</p>
            </div>
          ) : (
            <div className="tickets-grid">
              {filteredTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className={`ticket-item ${selectedTicket?.id === ticket.id ? 'selected' : ''}`}
                  onClick={() => setSelectedTicket(ticket)}
                >
                  <div className="ticket-item-header">
                    <span className="ticket-code">#{ticket.id.substring(0, 8).toUpperCase()}</span>
                    <span className={`status-badge status-${ticket.status}`}>
                      {getStatusLabel(ticket.status)}
                    </span>
                  </div>
                  <h3 className="ticket-item-title">{ticket.title}</h3>
                  <p className="ticket-item-desc">{ticket.description}</p>
                  <div className="ticket-item-footer">
                    <span className="ticket-meta">
                      <span className={`priority-dot priority-${ticket.priority}`}></span>
                      {ticket.priority}
                    </span>
                    <span className="ticket-meta">⏱️ {getTimeAgo(ticket.created_at)}</span>
                    <span className="ticket-meta">👤 {getUserName(ticket.assigned_to)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Painel de Detalhes */}
        {selectedTicket && (
          <div className="detail-panel">
            <div className="panel-header">
              <h2>Detalhes da Solicitação</h2>
              <button className="close-btn" onClick={() => setSelectedTicket(null)}>✕</button>
            </div>

            <div className="panel-body">
              <div className="detail-section">
                <label>Código</label>
                <div className="detail-value">#{selectedTicket.id.substring(0, 8).toUpperCase()}</div>
              </div>

              <div className="detail-section">
                <label>Título</label>
                <div className="detail-value">{selectedTicket.title}</div>
              </div>

              <div className="detail-section">
                <label>Descrição</label>
                <div className="detail-value desc">{selectedTicket.description}</div>
              </div>

              <div className="detail-row">
                <div className="detail-section">
                  <label>Status</label>
                  <span className={`status-badge status-${selectedTicket.status}`}>
                    {getStatusLabel(selectedTicket.status)}
                  </span>
                </div>

                <div className="detail-section">
                  <label>Prioridade</label>
                  <span className={`priority-badge priority-${selectedTicket.priority}`}>
                    {selectedTicket.priority}
                  </span>
                </div>
              </div>

              <div className="detail-row">
                <div className="detail-section">
                  <label>Tipo</label>
                  <div className="detail-value">{selectedTicket.type}</div>
                </div>

                <div className="detail-section">
                  <label>Responsável</label>
                  <div className="detail-value">{getUserName(selectedTicket.assigned_to)}</div>
                </div>
              </div>

              <div className="detail-section">
                <label>Criado em</label>
                <div className="detail-value">
                  {new Date(selectedTicket.created_at).toLocaleString('pt-BR')}
                </div>
              </div>

              <div className="detail-section">
                <label>Atualizado em</label>
                <div className="detail-value">
                  {new Date(selectedTicket.updated_at).toLocaleString('pt-BR')}
                </div>
              </div>

              <div className="info-banner">
                ℹ️ Como gestor, você tem acesso de visualização. Para gerenciar chamados, contate a equipe de TI.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
