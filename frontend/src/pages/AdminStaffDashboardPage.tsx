import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import '../styles/AdminStaffDashboardPage.css';

interface RecentTicket {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  requester_name?: string;
  department?: string;
  category?: string;
}

interface AdminStaffDashboardData {
  myTicketsTotal: number;
  myOpenTickets: number;
  myInProgressTickets: number;
  myWaitingTickets: number;
  myResolvedTickets: number;
  myUpdatedToday: number;
  myResolvedToday: number;
  myHighPriorityOpen: number;
  myOldestPendingDays: number;
  myAverageResolutionHours: number;
  myTicketsByPriority: Record<string, number>;
  administrativePendingTotal: number;
  unassignedAdministrativeTickets: number;
  recentTickets: RecentTicket[];
}

const EMPTY_DATA: AdminStaffDashboardData = {
  myTicketsTotal: 0,
  myOpenTickets: 0,
  myInProgressTickets: 0,
  myWaitingTickets: 0,
  myResolvedTickets: 0,
  myUpdatedToday: 0,
  myResolvedToday: 0,
  myHighPriorityOpen: 0,
  myOldestPendingDays: 0,
  myAverageResolutionHours: 0,
  myTicketsByPriority: {},
  administrativePendingTotal: 0,
  unassignedAdministrativeTickets: 0,
  recentTickets: [],
};

export default function AdminStaffDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<AdminStaffDashboardData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUserName, setCurrentUserName] = useState('Auxiliar Administrativo');

  useEffect(() => {
    const token = localStorage.getItem('internal_token');
    const userRaw = localStorage.getItem('internal_user');

    if (!token || !userRaw) {
      navigate('/admin/login');
      return;
    }

    try {
      const user = JSON.parse(userRaw) as { role?: string; name?: string };
      if (user.role !== 'admin_staff') {
        navigate('/admin/dashboard');
        return;
      }
      setCurrentUserName(user.name || 'Auxiliar Administrativo');
    } catch {
      navigate('/admin/login');
      return;
    }

    void fetchDashboard();
  }, [navigate]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await api.get<AdminStaffDashboardData>('/dashboard/admin-staff');
      setData({ ...EMPTY_DATA, ...(response.data || {}) });
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao carregar dashboard');
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

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'open':
        return 'asd-badge asd-badge-open';
      case 'in_progress':
        return 'asd-badge asd-badge-progress';
      case 'waiting_user':
        return 'asd-badge asd-badge-waiting';
      case 'resolved':
      case 'closed':
        return 'asd-badge asd-badge-resolved';
      default:
        return 'asd-badge';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'Urgente';
      case 'critical':
        return 'Crítica';
      case 'high':
        return 'Alta';
      case 'medium':
        return 'Média';
      case 'low':
        return 'Baixa';
      default:
        return priority || 'Sem prioridade';
    }
  };

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'urgent':
      case 'critical':
        return 'asd-badge asd-badge-critical';
      case 'high':
        return 'asd-badge asd-badge-high';
      case 'medium':
        return 'asd-badge asd-badge-medium';
      case 'low':
        return 'asd-badge asd-badge-low';
      default:
        return 'asd-badge';
    }
  };

  const formatElapsedTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 60) return `${Math.max(diffMinutes, 1)} min`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d`;
  };

  if (!localStorage.getItem('internal_token')) {
    return null;
  }

  const pendingMine = data.myOpenTickets + data.myInProgressTickets + data.myWaitingTickets;
  const topKpis = [
    {
      key: 'myTicketsTotal',
      title: 'Meus chamados',
      value: data.myTicketsTotal,
      subtitle: 'Total sob minha responsabilidade',
    },
    {
      key: 'pendingMine',
      title: 'Pendentes',
      value: pendingMine,
      subtitle: 'Abertos, em atendimento e aguardando',
    },
    {
      key: 'myResolvedToday',
      title: 'Resolvidos hoje',
      value: data.myResolvedToday,
      subtitle: 'Finalizados hoje',
    },
    {
      key: 'unassignedAdministrativeTickets',
      title: 'Sem responsável',
      value: data.unassignedAdministrativeTickets,
      subtitle: 'Fila sem atribuição',
    },
  ];

  const secondaryKpis = [
    {
      key: 'myOpenTickets',
      title: 'Abertos',
      value: data.myOpenTickets,
      subtitle: 'Aguardando primeiro atendimento',
    },
    {
      key: 'myInProgressTickets',
      title: 'Em atendimento',
      value: data.myInProgressTickets,
      subtitle: 'Já em tratativa',
    },
    {
      key: 'myWaitingTickets',
      title: 'Aguardando usuário',
      value: data.myWaitingTickets,
      subtitle: 'Dependem de retorno do solicitante',
    },
    {
      key: 'myHighPriorityOpen',
      title: 'Alta prioridade',
      value: data.myHighPriorityOpen,
      subtitle: 'Urgente, crítica e alta',
    },
    {
      key: 'myAverageResolutionHours',
      title: 'SLA médio',
      value: data.myAverageResolutionHours,
      subtitle: 'Tempo médio para concluir',
      suffix: 'h',
    },
  ];

  const priorityData = [
    { key: 'urgent', label: 'Urgente', value: data.myTicketsByPriority?.urgent ?? 0, colorClass: 'asd-priority-urgent' },
    { key: 'critical', label: 'Crítica', value: data.myTicketsByPriority?.critical ?? 0, colorClass: 'asd-priority-critical' },
    { key: 'high', label: 'Alta', value: data.myTicketsByPriority?.high ?? 0, colorClass: 'asd-priority-high' },
    { key: 'medium', label: 'Média', value: data.myTicketsByPriority?.medium ?? 0, colorClass: 'asd-priority-medium' },
    { key: 'low', label: 'Baixa', value: data.myTicketsByPriority?.low ?? 0, colorClass: 'asd-priority-low' },
  ];

  const quickActions = [
    {
      key: 'queue',
      icon: '📋',
      label: 'Ver fila',
      description: 'Visualizar chamados e priorizar atendimentos',
      action: () => navigate('/admin/chamados'),
    },
    {
      key: 'pending',
      icon: '⚡',
      label: 'Atender pendentes',
      description: 'Assumir e tratar os chamados em aberto',
      action: () => navigate('/admin/chamados'),
    },
    {
      key: 'refresh',
      icon: '🔄',
      label: 'Atualizar painel',
      description: 'Recarregar indicadores e últimos chamados',
      action: () => void fetchDashboard(),
    },
  ];

  const maxPriorityValue = Math.max(1, ...priorityData.map((item) => item.value));

  const getKpiCardClass = (value: number, compact = false) => {
    const baseClass = compact ? 'asd-kpi-card asd-kpi-card-compact' : 'asd-kpi-card';
    return `${baseClass} ${value > 0 ? 'asd-kpi-card-positive' : 'asd-kpi-card-zero'}`;
  };

  const formatCardValue = (value: number, suffix?: string) => `${value}${suffix || ''}`;

  return (
    <div className="admin-staff-dashboard-page">
      <header className="asd-header">
        <div className="asd-header-left">
          <h1>Dashboard Auxiliar Administrativo</h1>
          <p>Olá, {currentUserName}. Aqui está a visão dos seus chamados e do administrativo.</p>
        </div>
        <div className="asd-header-actions">
          <button className="asd-btn-refresh" onClick={() => void fetchDashboard()}>
            Atualizar
          </button>
          <button className="asd-btn-chamados" onClick={() => navigate('/admin/chamados')}>
            Ir para chamados
          </button>
        </div>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="asd-loading">Carregando dados...</div>
      ) : (
        <>
          <section className="asd-kpis-top-row">
            {topKpis.map((item) => (
              <div key={item.key} className={getKpiCardClass(item.value)}>
                <span className="asd-kpi-title">{item.title}</span>
                <strong>{formatCardValue(item.value)}</strong>
                <small>{item.subtitle}</small>
              </div>
            ))}
          </section>

          <section className="asd-kpis-secondary-row">
            {secondaryKpis.map((item) => (
              <div key={item.key} className={getKpiCardClass(item.value, true)}>
                <span className="asd-kpi-title">{item.title}</span>
                <strong>{formatCardValue(item.value, item.suffix)}</strong>
                <small>{item.subtitle}</small>
              </div>
            ))}
          </section>

          <section className="asd-panels-grid">
            <article className="asd-panel">
              <div className="asd-panel-header">
                <h2>Distribuição por prioridade (meus chamados)</h2>
              </div>
              <div className="asd-priority-list">
                {priorityData.map((item) => (
                  <div key={item.key} className="asd-priority-item">
                    <div className="asd-priority-label-row">
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                    <div className="asd-priority-bar">
                      <div
                        className={`asd-priority-fill ${item.colorClass}`}
                        style={{ width: `${(item.value / maxPriorityValue) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="asd-panel">
              <div className="asd-panel-header">
                <h2>Ações rápidas</h2>
              </div>
              <div className="asd-actions-grid">
                {quickActions.map((action) => (
                  <button key={action.key} className="asd-action-btn" onClick={action.action}>
                    <span className="asd-action-icon" aria-hidden="true">{action.icon}</span>
                    <span className="asd-action-content">
                      <strong>{action.label}</strong>
                      <small>{action.description}</small>
                    </span>
                  </button>
                ))}
              </div>
              <div className="asd-status-summary">
                <div className="asd-status-summary-card asd-status-open">
                  <span>Abertos</span>
                  <strong>{data.myOpenTickets}</strong>
                </div>
                <div className="asd-status-summary-card asd-status-progress">
                  <span>Em atendimento</span>
                  <strong>{data.myInProgressTickets}</strong>
                </div>
                <div className="asd-status-summary-card asd-status-waiting">
                  <span>Aguardando usuário</span>
                  <strong>{data.myWaitingTickets}</strong>
                </div>
              </div>
            </article>
          </section>

          <section className="asd-recent">
            <div className="asd-recent-header">
              <h2>Últimos chamados atribuídos a você</h2>
            </div>

            {data.recentTickets.length === 0 ? (
              <p className="asd-empty">Nenhum chamado atribuído no momento.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>Solicitante</th>
                    <th>Status</th>
                    <th>Prioridade</th>
                    <th>Atualizado há</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentTickets.map((ticket) => (
                    <tr key={ticket.id} onClick={() => navigate(`/admin/chamados/${ticket.id}`)}>
                      <td>{ticket.title}</td>
                      <td>{ticket.requester_name || 'Solicitante'}</td>
                      <td>
                        <span className={getStatusClass(ticket.status)}>{getStatusLabel(ticket.status)}</span>
                      </td>
                      <td>
                        <span className={getPriorityClass(ticket.priority)}>{getPriorityLabel(ticket.priority)}</span>
                      </td>
                      <td>{formatElapsedTime(ticket.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  );
}
