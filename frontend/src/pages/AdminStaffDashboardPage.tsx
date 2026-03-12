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
      key: 'pendingMine',
      title: 'Chamados Pendentes',
      value: pendingMine,
      subtitle: 'Abertos, em atendimento e aguardando usuário',
      icon: '📦',
      tone: 'pending',
    },
    {
      key: 'myResolvedToday',
      title: 'Chamados Resolvidos Hoje',
      value: data.myResolvedToday,
      subtitle: 'Chamados finalizados no dia atual',
      icon: '🎯',
      tone: 'resolved',
    },
    {
      key: 'myTicketsTotal',
      title: 'Chamados Atribuídos a Mim',
      value: data.myTicketsTotal,
      subtitle: 'Total sob minha responsabilidade',
      icon: '🧑‍💼',
      tone: 'assigned',
    },
    {
      key: 'unassignedAdministrativeTickets',
      title: 'Chamados Sem Responsável',
      value: data.unassignedAdministrativeTickets,
      subtitle: 'Fila administrativa sem atribuição',
      icon: '🚨',
      tone: 'unassigned',
    },
  ];

  const secondaryKpis = [
    {
      key: 'myOpenTickets',
      title: 'Abertos',
      value: data.myOpenTickets,
      subtitle: 'Aguardando primeiro atendimento',
      icon: '📬',
      tone: 'open',
    },
    {
      key: 'myInProgressTickets',
      title: 'Em atendimento',
      value: data.myInProgressTickets,
      subtitle: 'Já em tratativa',
      icon: '🔵',
      tone: 'in-progress',
    },
    {
      key: 'myWaitingTickets',
      title: 'Aguardando usuário',
      value: data.myWaitingTickets,
      subtitle: 'Dependem de retorno do solicitante',
      icon: '⏳',
      tone: 'waiting',
    },
    {
      key: 'myAverageResolutionHours',
      title: 'SLA médio',
      value: data.myAverageResolutionHours,
      subtitle: 'Tempo médio para concluir',
      suffix: 'h',
      icon: '📈',
      tone: 'sla',
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
      tone: 'queue',
    },
    {
      key: 'pending',
      icon: '⚡',
      label: 'Atender pendentes',
      description: 'Assumir e tratar os chamados em aberto',
      action: () => navigate('/admin/chamados'),
      tone: 'pending',
    },
    {
      key: 'refresh',
      icon: '🔄',
      label: 'Atualizar painel',
      description: 'Recarregar indicadores e últimos chamados',
      action: () => void fetchDashboard(),
      tone: 'refresh',
    },
  ];

  const maxPriorityValue = Math.max(1, ...priorityData.map((item) => item.value));
  const totalPriorityTickets = priorityData.reduce((sum, item) => sum + item.value, 0);

  const formatCardValue = (value: number, suffix?: string) => `${value}${suffix || ''}`;

  return (
    <div className="admin-staff-dashboard-page">
      <div className="asd-shell">
        <header className="asd-header">
          <div className="asd-header-left">
            <h1>Painel Operacional — Auxiliar Administrativo</h1>
            <p>Olá, {currentUserName}. Acompanhe prioridades, desempenho e próximos atendimentos em tempo real.</p>
          </div>
          <div className="asd-header-actions">
            <button className="asd-btn-refresh" onClick={() => void fetchDashboard()}>
              🔄 Atualizar
            </button>
            <button className="asd-btn-chamados" onClick={() => navigate('/admin/chamados')}>
              📋 Ver chamados
            </button>
          </div>
        </header>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <div className="asd-loading">Carregando dados...</div>
        ) : (
          <>
            <section className="asd-kpis-main-grid">
              {topKpis.map((item) => (
                <article key={item.key} className={`asd-kpi-main-card asd-kpi-main-${item.tone}`}>
                  <div className="asd-kpi-main-top">
                    <span className="asd-kpi-main-icon" aria-hidden="true">{item.icon}</span>
                    <span className="asd-kpi-main-title">{item.title}</span>
                  </div>
                  <strong className="asd-kpi-main-value">{formatCardValue(item.value)}</strong>
                  <small className="asd-kpi-main-desc">{item.subtitle}</small>
                </article>
              ))}
            </section>

            <section className="asd-kpis-secondary-grid">
              {secondaryKpis.map((item) => (
                <article key={item.key} className={`asd-kpi-secondary-card asd-kpi-secondary-${item.tone}`}>
                  <div className="asd-kpi-secondary-head">
                    <span className="asd-kpi-secondary-icon" aria-hidden="true">{item.icon}</span>
                    <span className="asd-kpi-secondary-title">{item.title}</span>
                  </div>
                  <strong className="asd-kpi-secondary-value">{formatCardValue(item.value, item.suffix)}</strong>
                  <small className="asd-kpi-secondary-desc">{item.subtitle}</small>
                </article>
              ))}
            </section>

            <section className="asd-operational-grid">
              <article className="asd-panel asd-panel-priority">
                <div className="asd-panel-header">
                  <h2>Distribuição por prioridade</h2>
                  <span>{totalPriorityTickets} chamados</span>
                </div>
                <div className="asd-priority-list">
                  {priorityData.map((item) => {
                    const percent = totalPriorityTickets > 0
                      ? Math.round((item.value / totalPriorityTickets) * 100)
                      : 0;
                    const width = item.value > 0
                      ? Math.max(8, (item.value / maxPriorityValue) * 100)
                      : 0;

                    return (
                      <div key={item.key} className="asd-priority-item">
                        <div className="asd-priority-label-row">
                          <div className="asd-priority-label-left">
                            <span className={`asd-priority-dot ${item.colorClass}`} />
                            <span>{item.label}</span>
                          </div>
                          <div className="asd-priority-values">
                            <strong>{item.value}</strong>
                            <small>{percent}%</small>
                          </div>
                        </div>
                        <div className="asd-priority-bar">
                          <div
                            className={`asd-priority-fill ${item.colorClass}`}
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>

              <article className="asd-panel asd-panel-actions">
                <div className="asd-panel-header">
                  <h2>Ações rápidas</h2>
                  <span>Execução imediata</span>
                </div>
                <div className="asd-actions-stack">
                  {quickActions.map((action) => (
                    <button
                      key={action.key}
                      className={`asd-action-cta asd-action-${action.tone}`}
                      onClick={action.action}
                    >
                      <span className="asd-action-icon" aria-hidden="true">{action.icon}</span>
                      <span className="asd-action-content">
                        <strong>{action.label}</strong>
                        <small>{action.description}</small>
                      </span>
                    </button>
                  ))}
                </div>
              </article>
            </section>

            <section className="asd-recent-panel">
              <div className="asd-recent-header">
                <h2>Últimos chamados atribuídos</h2>
                <span>{data.recentTickets.length} itens</span>
              </div>

              {data.recentTickets.length === 0 ? (
                <p className="asd-empty">Nenhum chamado atribuído no momento.</p>
              ) : (
                <div className="asd-recent-table-wrap">
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
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
