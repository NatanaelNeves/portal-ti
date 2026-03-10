import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import '../styles/AdminDashboardPage.css';

interface TicketIndicators {
  openToday: number;
  inProgressToday: number;
  totalCreatedToday: number;
  resolvedChangePercent: number;
}

interface AssetIndicators {
  inStock: number;
  assigned: number;
  inMaintenance: number;
  total: number;
  assignedToday: number;
  returnedToday: number;
  maintenanceToday: number;
  addedThisMonth: number;
}

interface RecentActivityItem {
  id: string;
  type: string;
  title: string;
  detail: string;
  timestamp: string;
  route: string;
}

interface DashboardData {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  averageSLA: number;
  previousAverageSLA: number;
  pendingPurchases: number;
  ticketsByStatus: Record<string, number>;
  ticketsByPriority: Record<string, number>;
  ticketIndicators: TicketIndicators;
  assets: AssetIndicators;
  recentActivity: RecentActivityItem[];
}

const EMPTY_DASHBOARD_DATA: DashboardData = {
  totalTickets: 0,
  openTickets: 0,
  inProgressTickets: 0,
  resolvedTickets: 0,
  averageSLA: 0,
  previousAverageSLA: 0,
  pendingPurchases: 0,
  ticketsByStatus: {},
  ticketsByPriority: {},
  ticketIndicators: {
    openToday: 0,
    inProgressToday: 0,
    totalCreatedToday: 0,
    resolvedChangePercent: 0,
  },
  assets: {
    inStock: 0,
    assigned: 0,
    inMaintenance: 0,
    total: 0,
    assignedToday: 0,
    returnedToday: 0,
    maintenanceToday: 0,
    addedThisMonth: 0,
  },
  recentActivity: [],
};

const normalizeDashboardData = (payload: Partial<DashboardData>): DashboardData => {
  return {
    totalTickets: payload.totalTickets ?? 0,
    openTickets: payload.openTickets ?? 0,
    inProgressTickets: payload.inProgressTickets ?? 0,
    resolvedTickets: payload.resolvedTickets ?? 0,
    averageSLA: payload.averageSLA ?? 0,
    previousAverageSLA: payload.previousAverageSLA ?? 0,
    pendingPurchases: payload.pendingPurchases ?? 0,
    ticketsByStatus: payload.ticketsByStatus ?? {},
    ticketsByPriority: payload.ticketsByPriority ?? {},
    ticketIndicators: {
      openToday: payload.ticketIndicators?.openToday ?? 0,
      inProgressToday: payload.ticketIndicators?.inProgressToday ?? 0,
      totalCreatedToday: payload.ticketIndicators?.totalCreatedToday ?? 0,
      resolvedChangePercent: payload.ticketIndicators?.resolvedChangePercent ?? 0,
    },
    assets: {
      inStock: payload.assets?.inStock ?? 0,
      assigned: payload.assets?.assigned ?? 0,
      inMaintenance: payload.assets?.inMaintenance ?? 0,
      total: payload.assets?.total ?? 0,
      assignedToday: payload.assets?.assignedToday ?? 0,
      returnedToday: payload.assets?.returnedToday ?? 0,
      maintenanceToday: payload.assets?.maintenanceToday ?? 0,
      addedThisMonth: payload.assets?.addedThisMonth ?? 0,
    },
    recentActivity: Array.isArray(payload.recentActivity) ? payload.recentActivity : [],
  };
};

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData>(EMPTY_DASHBOARD_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('internal_token');
    if (!token) {
      navigate('/admin/login');
      return;
    }

    void fetchDashboardData();
  }, [navigate]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get<Partial<DashboardData>>('/dashboard/admin');
      setData(normalizeDashboardData(response.data ?? {}));
      setError('');
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || 'Erro ao carregar dashboard';
      setError(message);
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { label: string; icon: string }> = {
      open: { label: 'Aberto', icon: '🔵' },
      in_progress: { label: 'Em Atendimento', icon: '🔧' },
      waiting_user: { label: 'Aguardando Usuário', icon: '⏳' },
      resolved: { label: 'Resolvido', icon: '✅' },
      closed: { label: 'Fechado', icon: '🔒' },
    };
    const item = labels[status] || { label: status, icon: '📌' };
    return `${item.icon} ${item.label}`;
  };

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, { label: string; icon: string }> = {
      low: { label: 'Baixa', icon: '🟢' },
      medium: { label: 'Média', icon: '🟡' },
      high: { label: 'Alta', icon: '🟠' },
    };
    const item = labels[priority] || { label: priority, icon: '📌' };
    return `${item.icon} ${item.label}`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'ticket_created':
        return '🆕';
      case 'ticket_resolved':
        return '✅';
      case 'asset_assigned':
        return '📤';
      case 'asset_returned':
        return '📥';
      case 'asset_maintenance':
        return '🛠️';
      default:
        return '📌';
    }
  };

  const getActivityLabel = (type: string) => {
    switch (type) {
      case 'ticket_created':
        return 'Chamado criado';
      case 'ticket_resolved':
        return 'Chamado resolvido';
      case 'asset_assigned':
        return 'Ativo atribuído';
      case 'asset_returned':
        return 'Ativo devolvido';
      case 'asset_maintenance':
        return 'Ativo em manutenção';
      default:
        return 'Atualização operacional';
    }
  };

  const formatRelativeTime = (timestamp: string) => {
    const eventDate = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - eventDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins <= 1) return 'agora';
    if (diffMins < 60) return `há ${diffMins} min`;
    if (diffHours < 24) return `há ${diffHours}h`;
    if (diffDays === 1) return 'ontem';
    if (diffDays < 7) return `há ${diffDays} dias`;
    return eventDate.toLocaleDateString('pt-BR');
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '☀️ Bom dia';
    if (hour < 18) return '🌤️ Boa tarde';
    return '🌙 Boa noite';
  };

  const slaTrend = useMemo(() => {
    const previous = data.previousAverageSLA;
    const current = data.averageSLA;

    if (previous <= 0 || current <= 0) {
      return { trendLabel: '0%', isPositive: true };
    }

    const changePercent = ((previous - current) / previous) * 100;
    return {
      trendLabel: `${Math.abs(changePercent).toFixed(0)}%`,
      isPositive: changePercent >= 0,
    };
  }, [data.averageSLA, data.previousAverageSLA]);

  const operationsToday = useMemo(() => {
    return (
      data.ticketIndicators.totalCreatedToday +
      data.resolvedTickets +
      data.assets.assignedToday +
      data.assets.returnedToday +
      data.assets.maintenanceToday
    );
  }, [data]);

  const statusEntries = useMemo(() => {
    return Object.entries(data.ticketsByStatus).sort((a, b) => b[1] - a[1]);
  }, [data.ticketsByStatus]);

  const priorityEntries = useMemo(() => {
    return Object.entries(data.ticketsByPriority).sort((a, b) => b[1] - a[1]);
  }, [data.ticketsByPriority]);

  const assetStatusEntries = useMemo(() => {
    const statusEntries = [
      {
        key: 'in-stock',
        label: 'Em estoque',
        count: data.assets.inStock,
        fillClass: 'asset-in-stock',
      },
      {
        key: 'in-use',
        label: 'Em uso',
        count: data.assets.assigned,
        fillClass: 'asset-in-use',
      },
      {
        key: 'in-maintenance',
        label: 'Em manutenção',
        count: data.assets.inMaintenance,
        fillClass: 'asset-in-maintenance',
      },
    ];

    const total = statusEntries.reduce((sum, item) => sum + item.count, 0);

    return statusEntries.map((item) => ({
      ...item,
      percent: total > 0 ? Math.round((item.count / total) * 100) : 0,
    }));
  }, [data.assets.assigned, data.assets.inMaintenance, data.assets.inStock]);

  const totalAssetsForChart = useMemo(() => {
    const derivedTotal = data.assets.inStock + data.assets.assigned + data.assets.inMaintenance;
    return data.assets.total > 0 ? data.assets.total : derivedTotal;
  }, [data.assets.assigned, data.assets.inMaintenance, data.assets.inStock, data.assets.total]);

  const internalToken = localStorage.getItem('internal_token');
  if (!internalToken) {
    return null;
  }

  let userName = 'Equipe';
  let canManageUsers = false;

  const internalUserRaw = localStorage.getItem('internal_user');
  if (internalUserRaw) {
    try {
      const parsedUser = JSON.parse(internalUserRaw) as { name?: string; role?: string };
      userName = parsedUser.name?.trim() || 'Equipe';
      canManageUsers = parsedUser.role === 'admin' || parsedUser.role === 'it_staff';
    } catch {
      userName = 'Equipe';
      canManageUsers = false;
    }
  }

  const kpiCards = [
    {
      id: 'open-tickets',
      icon: '🎫',
      title: 'Chamados Abertos',
      value: data.openTickets,
      secondary: `+${data.ticketIndicators.openToday} hoje`,
      tone: 'critical',
      category: 'Chamados',
      action: () => navigate('/admin/chamados?status=open'),
    },
    {
      id: 'in-progress-tickets',
      icon: '🧰',
      title: 'Em Atendimento',
      value: data.inProgressTickets,
      secondary: `+${data.ticketIndicators.inProgressToday} atualizados hoje`,
      tone: 'active',
      category: 'Chamados',
      action: () => navigate('/admin/chamados?status=in_progress'),
    },
    {
      id: 'resolved-today',
      icon: '✅',
      title: 'Resolvidos Hoje',
      value: data.resolvedTickets,
      secondary: `${data.ticketIndicators.resolvedChangePercent >= 0 ? '↑' : '↓'} ${Math.abs(data.ticketIndicators.resolvedChangePercent)}%`,
      tone: 'success',
      category: 'Chamados',
      action: () => navigate('/admin/chamados?status=resolved'),
    },
    {
      id: 'total-tickets',
      icon: '📊',
      title: 'Total de Chamados',
      value: data.totalTickets,
      secondary: `+${data.ticketIndicators.totalCreatedToday} criados hoje`,
      tone: 'info',
      category: 'Chamados',
      action: () => navigate('/admin/chamados'),
    },
    {
      id: 'assets-in-stock',
      icon: '📦',
      title: 'Ativos em Estoque',
      value: data.assets.inStock,
      secondary: `+${data.assets.addedThisMonth} no mês`,
      tone: 'stock',
      category: 'Ativos',
      action: () => navigate('/admin/estoque?status=available'),
    },
    {
      id: 'assets-assigned',
      icon: '👤',
      title: 'Ativos em Uso',
      value: data.assets.assigned,
      secondary: `+${data.assets.assignedToday} atribuições hoje`,
      tone: 'assigned',
      category: 'Ativos',
      action: () => navigate('/admin/estoque?status=in_use'),
    },
    {
      id: 'assets-maintenance',
      icon: '🛠️',
      title: 'Em Manutenção',
      value: data.assets.inMaintenance,
      secondary: `+${data.assets.maintenanceToday} enviados hoje`,
      tone: 'maintenance',
      category: 'Ativos',
      action: () => navigate('/admin/estoque?status=maintenance'),
    },
    {
      id: 'total-assets',
      icon: '🗂️',
      title: 'Total de Ativos',
      value: data.assets.total,
      secondary: `${data.assets.returnedToday} devoluções hoje`,
      tone: 'asset-total',
      category: 'Ativos',
      action: () => navigate('/admin/estoque'),
    },
  ] as const;

  const ticketKpiCards = kpiCards.filter((card) => card.category === 'Chamados');
  const assetKpiCards = kpiCards.filter((card) => card.category === 'Ativos');

  const renderKpiCard = (card: (typeof kpiCards)[number]) => (
    <button
      key={card.id}
      type="button"
      className={`kpi-card kpi-${card.tone}`}
      onClick={card.action}
      aria-label={`${card.title}: ${card.value}`}
    >
      <div className="kpi-header-row">
        <span className="kpi-icon">{card.icon}</span>
        <span className="kpi-category-tag">{card.category}</span>
      </div>
      <span className="kpi-number">{card.value}</span>
      <span className="kpi-title">{card.title}</span>
      <span className="kpi-secondary">{card.secondary}</span>
    </button>
  );

  return (
    <div className="admin-dashboard-page">
      <header className="ops-dashboard-header">
        <div className="ops-header-content">
          <h1>{getGreeting()}, {userName}!</h1>
          <p>Painel operacional da TI com chamados, ativos e movimentações recentes.</p>
        </div>
        <nav className="ops-header-actions">
          {canManageUsers && (
            <button
              type="button"
              className="ops-btn ops-btn-secondary"
              onClick={() => navigate('/admin/usuarios')}
              aria-label="Gerenciar equipe"
            >
              👥 Gerenciar Equipe
            </button>
          )}
          <button
            type="button"
            className="ops-btn ops-btn-primary"
            onClick={() => navigate('/admin/chamados')}
            aria-label="Atender chamados"
          >
            🚀 Atender Chamados
          </button>
        </nav>
      </header>

      {error && (
        <div className="alert alert-error" role="alert">
          <strong>Erro:</strong> {error}
        </div>
      )}

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Carregando painel operacional...</p>
        </div>
      ) : (
        <main className="ops-dashboard-content">
          <section className="kpi-metrics-section">
            <div className="ops-section-label">Indicadores Operacionais</div>

            <div className="kpi-group">
              <h3 className="kpi-group-title">Chamados</h3>
              <div className="kpi-grid">
                {ticketKpiCards.map(renderKpiCard)}
              </div>
            </div>

            <div className="kpi-group">
              <h3 className="kpi-group-title">Ativos e Inventário</h3>
              <div className="kpi-grid">
                {assetKpiCards.map(renderKpiCard)}
              </div>
            </div>
          </section>

          <section className="performance-metrics-section">
            <div className="ops-section-label">Desempenho</div>
            <div className="performance-card">
              <div className="performance-header">
                <div>
                  <h3 className="performance-title">⚡ SLA Médio Operacional</h3>
                  <p className="performance-subtitle">Baseado nos chamados resolvidos recentemente</p>
                </div>
                <div className={`performance-trend ${slaTrend.isPositive ? 'positive' : 'negative'}`}>
                  <span className="trend-value">{slaTrend.isPositive ? '↓' : '↑'} {slaTrend.trendLabel}</span>
                  <span className="trend-label">vs período anterior</span>
                </div>
              </div>

              <div className="performance-main-metric">
                <span className="metric-value">{data.averageSLA.toFixed(1)}</span>
                <span className="metric-unit">h</span>
              </div>

              <div className="performance-stats-grid">
                <div className="performance-stat">
                  <span>Operações hoje</span>
                  <strong>{operationsToday}</strong>
                </div>
                <div className="performance-stat">
                  <span>Atribuições de ativo</span>
                  <strong>{data.assets.assignedToday}</strong>
                </div>
                <div className="performance-stat">
                  <span>Ativos em manutenção</span>
                  <strong>{data.assets.inMaintenance}</strong>
                </div>
                <div className="performance-stat">
                  <span>Compras pendentes</span>
                  <strong>{data.pendingPurchases}</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="asset-overview-section">
            <div className="ops-section-label">Visão de Ativos</div>
            <div className="asset-overview-grid">
              <div className="ops-card ops-chart-card">
                <div className="ops-card-header">
                  <h3 className="ops-card-title">🖥️ Distribuição de Ativos por Status</h3>
                  <span className="ops-card-meta">{totalAssetsForChart} ativos</span>
                </div>

                <div className="chart-container">
                  {totalAssetsForChart === 0 ? (
                    <div className="empty-state">
                      <p>Nenhum dado disponível</p>
                    </div>
                  ) : (
                    <div className="chart-bars">
                      {assetStatusEntries.map((assetStatus) => {
                        return (
                          <div key={assetStatus.key} className="bar-item">
                            <div className="bar-label-row">
                              <span className="bar-label">{assetStatus.label}</span>
                              <span className="bar-count">{assetStatus.count}</span>
                            </div>
                            <div className="bar-track">
                              <div
                                className={`bar-fill ${assetStatus.fillClass}`}
                                style={{ width: `${assetStatus.percent}%` }}
                                role="progressbar"
                                aria-label={`${assetStatus.label}: ${assetStatus.count} ativos`}
                              />
                            </div>
                            <span className="bar-percent">{assetStatus.percent}%</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="ops-card ops-chart-card">
                <div className="ops-card-header">
                  <h3 className="ops-card-title">🔁 Movimentação de Ativos Hoje</h3>
                  <span className="ops-card-meta">Operação diária</span>
                </div>

                <div className="asset-flow-list">
                  <div className="asset-flow-item">
                    <span>Entregues</span>
                    <strong>{data.assets.assignedToday}</strong>
                  </div>
                  <div className="asset-flow-item">
                    <span>Devolvidos</span>
                    <strong>{data.assets.returnedToday}</strong>
                  </div>
                  <div className="asset-flow-item">
                    <span>Enviados para manutenção</span>
                    <strong>{data.assets.maintenanceToday}</strong>
                  </div>
                  <div className="asset-flow-item">
                    <span>Novos no mês</span>
                    <strong>{data.assets.addedThisMonth}</strong>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="ticket-overview-section">
            <div className="ops-section-label">Visão de Chamados</div>
            <div className="ticket-charts-grid">
              <div className="ops-card ops-chart-card">
                <div className="ops-card-header">
                  <h3 className="ops-card-title">📋 Distribuição de Chamados por Status</h3>
                  <span className="ops-card-meta">{data.totalTickets} chamados</span>
                </div>

                <div className="chart-container">
                  {data.totalTickets === 0 ? (
                    <div className="empty-state">
                      <p>Nenhum dado disponível</p>
                    </div>
                  ) : (
                    <div className="chart-bars">
                      {statusEntries.map(([status, count]) => {
                        const percent = data.totalTickets > 0 ? Math.round((count / data.totalTickets) * 100) : 0;

                        return (
                          <div key={status} className="bar-item">
                            <div className="bar-label-row">
                              <span className="bar-label">{getStatusLabel(status)}</span>
                              <span className="bar-count">{count}</span>
                            </div>
                            <div className="bar-track">
                              <div
                                className={`bar-fill status-${status}`}
                                style={{ width: `${percent}%` }}
                                role="progressbar"
                                aria-label={`${status}: ${count} chamados`}
                              />
                            </div>
                            <span className="bar-percent">{percent}%</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="ops-card ops-chart-card">
                <div className="ops-card-header">
                  <h3 className="ops-card-title">🎯 Distribuição de Chamados por Prioridade</h3>
                  <span className="ops-card-meta">{data.totalTickets} chamados</span>
                </div>

                <div className="chart-container">
                  {data.totalTickets === 0 ? (
                    <div className="empty-state">
                      <p>Nenhum dado disponível</p>
                    </div>
                  ) : (
                    <div className="chart-bars">
                      {priorityEntries.map(([priority, count]) => {
                        const percent = data.totalTickets > 0 ? Math.round((count / data.totalTickets) * 100) : 0;

                        return (
                          <div key={priority} className="bar-item">
                            <div className="bar-label-row">
                              <span className="bar-label">{getPriorityLabel(priority)}</span>
                              <span className="bar-count">{count}</span>
                            </div>
                            <div className="bar-track">
                              <div
                                className={`bar-fill priority-${priority}`}
                                style={{ width: `${percent}%` }}
                                role="progressbar"
                                aria-label={`${priority}: ${count} chamados`}
                              />
                            </div>
                            <span className="bar-percent">{percent}%</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="recent-activity-section">
            <div className="ops-section-label">Atividade Recente</div>
            <div className="ops-card recent-activity-card">
              {data.recentActivity.length === 0 ? (
                <div className="empty-state compact-empty-state">
                  <p>Sem eventos operacionais recentes.</p>
                </div>
              ) : (
                <ul className="activity-list">
                  {data.recentActivity.slice(0, 10).map((activity) => (
                    <li key={activity.id}>
                      <button
                        type="button"
                        className="activity-item"
                        onClick={() => navigate(activity.route || '/admin/chamados')}
                      >
                        <div className="activity-main">
                          <span className="activity-icon">{getActivityIcon(activity.type)}</span>
                          <div className="activity-texts">
                            <p className="activity-event">{getActivityLabel(activity.type)}</p>
                            <p className="activity-title">{activity.title}</p>
                            <p className="activity-detail">{activity.detail}</p>
                          </div>
                        </div>

                        <div className="activity-meta">
                          <time dateTime={activity.timestamp}>{formatRelativeTime(activity.timestamp)}</time>
                          <span className="activity-arrow">→</span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="quick-actions-section">
            <div className="ops-section-label">Ações Rápidas</div>
            <div className="actions-grid">
              <button
                type="button"
                className="action-button"
                onClick={() => navigate('/admin/chamados')}
                aria-label="Central de atendimento de chamados"
              >
                <div className="action-icon">📋</div>
                <div className="action-content">
                  <h4>Central de Chamados</h4>
                  <p>Gerenciar chamados em fila</p>
                </div>
                <div className="action-arrow">→</div>
              </button>

              <button
                type="button"
                className="action-button"
                onClick={() => navigate('/admin/estoque')}
                aria-label="Gestão de ativos e equipamentos"
              >
                <div className="action-icon">📦</div>
                <div className="action-content">
                  <h4>Gestão de Ativos</h4>
                  <p>Inventário e movimentações</p>
                </div>
                <div className="action-arrow">→</div>
              </button>

              <button
                type="button"
                className="action-button"
                onClick={() => navigate('/admin/documentos')}
                aria-label="Base de conhecimento e documentação"
              >
                <div className="action-icon">📚</div>
                <div className="action-content">
                  <h4>Base de Conhecimento</h4>
                  <p>Documentos e playbooks</p>
                </div>
                <div className="action-arrow">→</div>
              </button>

              <button
                type="button"
                className="action-button"
                onClick={() => navigate('/admin/relatorios')}
                aria-label="Relatórios e análises"
              >
                <div className="action-icon">📊</div>
                <div className="action-content">
                  <h4>Relatórios</h4>
                  <p>Indicadores e tendências</p>
                </div>
                <div className="action-arrow">→</div>
              </button>
            </div>
          </section>
        </main>
      )}
    </div>
  );
}
