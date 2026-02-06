import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/AdminTicketsPage.css';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  type: string;
  created_at: string;
  updated_at: string;
  requester_id: string;
  assigned_to?: string;
  message_count?: number;
}

interface InternalUser {
  id: string;
  name: string;
  email: string;
}

interface TicketStats {
  critical: number;
  waitingUser: number;
  inProgress: number;
  newToday: number;
  resolvedToday: number;
}

export default function AdminTicketsPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<InternalUser[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'mine' | 'unassigned'>('all');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [stats, setStats] = useState<TicketStats>({
    critical: 0,
    waitingUser: 0,
    inProgress: 0,
    newToday: 0,
    resolvedToday: 0
  });

  useEffect(() => {
    const token = localStorage.getItem('internal_token');
    const userData = localStorage.getItem('internal_user');
    
    if (!token) {
      navigate('/admin/login');
      return;
    }

    if (userData) {
      const user = JSON.parse(userData);
      setCurrentUserId(user.id);
    }

    fetchTickets(token);
    fetchUsers(token);
  }, [filterStatus, navigate]);

  const fetchUsers = async (token: string) => {
    try {
      const response = await fetch('/api/internal-auth/users', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Usuários carregados:', data);
        setUsers(Array.isArray(data) ? data : []);
      } else {
        console.error('Erro ao carregar usuários - status:', response.status);
      }
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
    }
  };

  const fetchTickets = async (token: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);

      const response = await fetch(`/api/tickets?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar chamados');
      }

      const data = await response.json();
      const ticketList = Array.isArray(data) ? data : [];
      console.log('Tickets carregados:', ticketList);
      console.log('Primeiro ticket assigned_to:', ticketList[0]?.assigned_to);
      setTickets(ticketList);
      
      // Calculate stats
      const today = new Date().toDateString();
      setStats({
        critical: ticketList.filter((t: Ticket) => t.priority === 'high' && t.status !== 'closed').length,
        waitingUser: ticketList.filter((t: Ticket) => t.status === 'waiting_user').length,
        inProgress: ticketList.filter((t: Ticket) => t.status === 'in_progress').length,
        newToday: ticketList.filter((t: Ticket) => new Date(t.created_at).toDateString() === today).length,
        resolvedToday: ticketList.filter((t: Ticket) => 
          t.status === 'resolved' && 
          new Date(t.updated_at).toDateString() === today
        ).length
      });
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar chamados');
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open':
        return 'Aberto';
      case 'in_progress':
        return 'Em Atendimento';
      case 'waiting_user':
        return 'Aguardando Usuário';
      case 'resolved':
        return 'Resolvido';
      case 'closed':
        return 'Fechado';
      default:
        return status;
    }
  };

  const getUserName = (userId?: string) => {
    if (!userId) return 'Ninguém';
    const user = users.find(u => u.id === userId);
    console.log('getUserName - userId:', userId, 'user found:', user, 'all users:', users.length);
    return user ? user.name : 'Atribuído';
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d atrás`;
    if (diffHours > 0) return `${diffHours}h atrás`;
    return 'agora';
  };

  const getUrgencyScore = (ticket: Ticket) => {
    const priorityScore = {
      'critical': 100,
      'high': 50,
      'medium': 20,
      'low': 10
    }[ticket.priority] || 10;

    const timeScore = Math.floor(
      (new Date().getTime() - new Date(ticket.created_at).getTime()) / (1000 * 60 * 60)
    );

    return priorityScore + timeScore;
  };

  const sortedTickets = [...tickets]
    .filter(t => filterStatus === 'all' || t.status === filterStatus)
    .filter(t => {
      // Filtro de atribuição
      if (assignmentFilter === 'mine') return t.assigned_to === currentUserId;
      if (assignmentFilter === 'unassigned') return !t.assigned_to;
      return true;
    })
    .filter(t => t.status !== 'closed' && t.status !== 'resolved')
    .sort((a, b) => getUrgencyScore(b) - getUrgencyScore(a));

  const myTicketsCount = tickets.filter(t => 
    t.assigned_to === currentUserId && 
    t.status !== 'closed' && 
    t.status !== 'resolved'
  ).length;

  if (!localStorage.getItem('internal_token')) {
    return null;
  }

  return (
    <div className="admin-tickets-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h1>🧑‍💻 Central Operacional TI</h1>
        <p>Painel de atendimento em tempo real</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Indicadores Rápidos */}
      <div className="quick-stats">
        <div 
          className="stat-card critical"
          onClick={() => setFilterStatus(filterStatus === 'open' && stats.critical > 0 ? 'all' : 'open')}
        >
          <div className="stat-icon">🔴</div>
          <div className="stat-content">
            <div className="stat-number">{stats.critical}</div>
            <div className="stat-label">Críticos</div>
          </div>
        </div>

        <div 
          className="stat-card waiting"
          onClick={() => setFilterStatus(filterStatus === 'waiting_user' ? 'all' : 'waiting_user')}
        >
          <div className="stat-icon">🟡</div>
          <div className="stat-content">
            <div className="stat-number">{stats.waitingUser}</div>
            <div className="stat-label">Aguard. Usuário</div>
          </div>
        </div>

        <div 
          className="stat-card progress"
          onClick={() => setFilterStatus(filterStatus === 'in_progress' ? 'all' : 'in_progress')}
        >
          <div className="stat-icon">🔵</div>
          <div className="stat-content">
            <div className="stat-number">{stats.inProgress}</div>
            <div className="stat-label">Em Atendimento</div>
          </div>
        </div>

        <div className="stat-card new">
          <div className="stat-icon">⚪</div>
          <div className="stat-content">
            <div className="stat-number">{stats.newToday}</div>
            <div className="stat-label">Novos Hoje</div>
          </div>
        </div>

        <div className="stat-card resolved">
          <div className="stat-icon">🟢</div>
          <div className="stat-content">
            <div className="stat-number">{stats.resolvedToday}</div>
            <div className="stat-label">Resolvidos Hoje</div>
          </div>
        </div>
      </div>

      {/* Filtros de Atribuição */}
      <div className="assignment-filters">
        <button 
          className={`filter-btn ${assignmentFilter === 'all' ? 'active' : ''}`}
          onClick={() => setAssignmentFilter('all')}
        >
          📋 Todos os Chamados
        </button>
        <button 
          className={`filter-btn filter-mine ${assignmentFilter === 'mine' ? 'active' : ''}`}
          onClick={() => setAssignmentFilter('mine')}
        >
          👤 Meus Atendimentos ({myTicketsCount})
        </button>
        <button 
          className={`filter-btn ${assignmentFilter === 'unassigned' ? 'active' : ''}`}
          onClick={() => setAssignmentFilter('unassigned')}
        >
          ⚠️ Não Atribuídos
        </button>
      </div>

      {/* Layout Principal: Fila + Painel Lateral */}
      <div className="dashboard-layout">
        {/* Fila Inteligente */}
        <div className="ticket-queue">
          <div className="queue-header">
            <h2>📋 Fila de Atendimento</h2>
            <span className="queue-count">{sortedTickets.length} chamados ativos</span>
          </div>

          {loading ? (
            <div className="loading">Carregando...</div>
          ) : sortedTickets.length === 0 ? (
            <div className="empty-queue">
              <span className="empty-icon">✨</span>
              <p>Nenhum chamado na fila!</p>
              <small>Você está em dia com o atendimento</small>
            </div>
          ) : (
            <div className="tickets-list">
              {sortedTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className={`ticket-card ${selectedTicket?.id === ticket.id ? 'active' : ''} priority-${ticket.priority}`}
                  onClick={() => setSelectedTicket(ticket)}
                >
                  <div className="ticket-card-header">
                    <div className="priority-indicator">
                      {ticket.priority === 'critical' || ticket.priority === 'high' ? '🔴' : 
                       ticket.status === 'waiting_user' ? '🟡' :
                       ticket.status === 'in_progress' ? '🔵' : '⚪'}
                    </div>
                    <span className="time-ago">{getTimeAgo(ticket.created_at)} parado</span>
                  </div>

                  <div className="ticket-card-title">{ticket.title}</div>
                  <div className="ticket-card-type">{ticket.type}</div>

                  <div className="ticket-card-footer">
                    <span className="assigned">
                      👤 {getUserName(ticket.assigned_to)}
                    </span>
                    <span className="status-mini">{getStatusLabel(ticket.status)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Painel Lateral do Ticket Selecionado */}
        {selectedTicket ? (
          <div className="ticket-panel">
            <div className="panel-header">
              <h3>#{selectedTicket.id.substring(0, 8).toUpperCase()}</h3>
              <button 
                className="close-panel"
                onClick={() => setSelectedTicket(null)}
              >
                ✕
              </button>
            </div>

            <div className="panel-content">
              <div className="panel-title">{selectedTicket.title}</div>
              <div className="panel-meta">
                Aberto há {getTimeAgo(selectedTicket.created_at)}
              </div>

              <div className="panel-actions">
                <button 
                  className="action-btn primary"
                  onClick={() => navigate(`/admin/chamados/${selectedTicket.id}`)}
                >
                  🔧 Atender
                </button>
                <button className="action-btn secondary">
                  ⏳ Aguardar Usuário
                </button>
                <button className="action-btn success">
                  ✅ Finalizar
                </button>
              </div>

              <div className="panel-description">
                <h4>Descrição</h4>
                <p>{selectedTicket.description}</p>
              </div>

              <div className="panel-info">
                <div className="info-row">
                  <span className="info-label">Prioridade:</span>
                  <span className="info-value">{selectedTicket.priority}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Tipo:</span>
                  <span className="info-value">{selectedTicket.type}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Status:</span>
                  <span className="info-value">{getStatusLabel(selectedTicket.status)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Responsável:</span>
                  <span className="info-value">{getUserName(selectedTicket.assigned_to)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="ticket-panel empty">
            <div className="empty-panel">
              <span className="empty-icon-large">👆</span>
              <p>Selecione um chamado da fila</p>
              <small>Clique em um card para ver detalhes e atender</small>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

