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
  const [currentUserName, setCurrentUserName] = useState('Assistente Administrativo');

  useEffect(() => {
    const token = localStorage.getItem('internal_token');
    const userRaw = localStorage.getItem('internal_user');
    if (!token || !userRaw) { navigate('/admin/login'); return; }
    try {
      const user = JSON.parse(userRaw) as { role?: string; name?: string };
      if (user.role !== 'admin_staff') { navigate('/admin/dashboard'); return; }
      setCurrentUserName(user.name || 'Assistente Administrativo');
    } catch {
      navigate('/admin/login'); return;
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

  const getStatusLabel = (s: string) => ({ open: 'Aberto', in_progress: 'Em Atendimento', waiting_user: 'Aguardando', resolved: 'Resolvido', closed: 'Fechado' }[s] ?? s);
  const getPriorityLabel = (p: string) => ({ urgent: 'Urgente', critical: 'Crítica', high: 'Alta', medium: 'Média', low: 'Baixa' }[p] ?? p ?? 'Sem prioridade');

  const getStatusClass = (s: string) => {
    const map: Record<string, string> = { open: 'asd-badge-open', in_progress: 'asd-badge-progress', waiting_user: 'asd-badge-waiting', resolved: 'asd-badge-resolved', closed: 'asd-badge-resolved' };
    return `asd-badge ${map[s] ?? ''}`;
  };

  const getPriorityClass = (p: string) => {
    const map: Record<string, string> = { urgent: 'asd-badge-critical', critical: 'asd-badge-critical', high: 'asd-badge-high', medium: 'asd-badge-medium', low: 'asd-badge-low' };
    return `asd-badge ${map[p] ?? ''}`;
  };

  const formatElapsedTime = (dateString: string) => {
    const diffMs = Date.now() - new Date(dateString).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `${Math.max(mins, 1)}min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  if (!localStorage.getItem('internal_token')) return null;

  const pendingMine = data.myOpenTickets + data.myInProgressTickets + data.myWaitingTickets;

  const topKpis = [
    { key: 'pending',    icon: 'ti-inbox',          title: 'Pendentes',           value: pendingMine,                         sub: 'Abertos + em atend. + aguardando',   tone: 'warning' },
    { key: 'resolved',   icon: 'ti-circle-check',   title: 'Resolvidos Hoje',     value: data.myResolvedToday,                sub: 'Chamados finalizados no dia atual',   tone: 'success' },
    { key: 'assigned',   icon: 'ti-user-check',     title: 'Atribuídos a Mim',    value: data.myTicketsTotal,                 sub: 'Total sob minha responsabilidade',   tone: 'info'    },
    { key: 'unassigned', icon: 'ti-alert-triangle', title: 'Sem Responsável',     value: data.unassignedAdministrativeTickets, sub: 'Fila sem atribuição — ação urgente', tone: 'danger'  },
  ];

  const secondaryKpis = [
    { key: 'open',       icon: 'ti-mail-opened',  title: 'Abertos',          value: data.myOpenTickets,             sub: 'Aguardando atendimento',            accent: '#F59E0B' },
    { key: 'progress',   icon: 'ti-loader',       title: 'Em Atendimento',   value: data.myInProgressTickets,       sub: 'Em tratativa agora',               accent: '#3B82F6' },
    { key: 'waiting',    icon: 'ti-clock',        title: 'Aguard. Usuário',  value: data.myWaitingTickets,          sub: 'Dependem do solicitante',          accent: '#EAB308' },
    { key: 'sla',        icon: 'ti-chart-line',   title: 'SLA Médio',        value: data.myAverageResolutionHours,  sub: 'Horas para resolução',             accent: '#14B8A6', suffix: 'h' },
  ];

  const priorityData = [
    { key: 'urgent',   label: 'Urgente',  value: data.myTicketsByPriority?.urgent   ?? 0, color: '#EF4444' },
    { key: 'critical', label: 'Crítica',  value: data.myTicketsByPriority?.critical ?? 0, color: '#F97316' },
    { key: 'high',     label: 'Alta',     value: data.myTicketsByPriority?.high     ?? 0, color: '#EAB308' },
    { key: 'medium',   label: 'Média',    value: data.myTicketsByPriority?.medium   ?? 0, color: '#60A5FA' },
    { key: 'low',      label: 'Baixa',    value: data.myTicketsByPriority?.low      ?? 0, color: '#22C55E' },
  ];

  const maxPriorityValue = Math.max(1, ...priorityData.map((i) => i.value));
  const totalPriorityTickets = priorityData.reduce((s, i) => s + i.value, 0);

  return (
    <div className="asd-page">
      <div className="asd-shell">

        {/* ── Header ── */}
        <header className="asd-header">
          <div className="asd-header-left">
            <div className="asd-header-eyebrow">
              <i className="ti ti-layout-dashboard" />
              <span>Painel Operacional</span>
            </div>
            <h1 className="asd-header-title">Assistente Administrativo</h1>
            <p className="asd-header-sub">Olá, <strong>{currentUserName}</strong>. Acompanhe prioridades e atendimentos em tempo real.</p>
          </div>
          <div className="asd-header-actions">
            <button className="asd-btn-ghost" onClick={() => void fetchDashboard()}>
              <i className="ti ti-refresh" /> Atualizar
            </button>
            <button className="asd-btn-primary" onClick={() => navigate('/admin/chamados')}>
              <i className="ti ti-clipboard-list" /> Ver chamados
            </button>
          </div>
        </header>

        {error && (
          <div className="asd-error">
            <i className="ti ti-alert-circle" /> {error}
          </div>
        )}

        {loading ? (
          <div className="asd-loading">
            <div className="asd-spinner" />
            <span>Carregando dados...</span>
          </div>
        ) : (
          <>
            {/* ── KPIs principais ── */}
            <section className="asd-kpis-main">
              {topKpis.map((kpi) => (
                <article key={kpi.key} className={`asd-kpi-card asd-kpi-${kpi.tone}`}>
                  <div className="asd-kpi-head">
                    <div className={`asd-kpi-icon-wrap asd-kpi-icon-${kpi.tone}`}>
                      <i className={`ti ${kpi.icon}`} />
                    </div>
                    <span className="asd-kpi-label">{kpi.title}</span>
                  </div>
                  <strong className="asd-kpi-value">{kpi.value}</strong>
                  <p className="asd-kpi-sub">{kpi.sub}</p>
                </article>
              ))}
            </section>

            {/* ── KPIs secundários ── */}
            <section className="asd-kpis-secondary">
              {secondaryKpis.map((kpi) => (
                <article key={kpi.key} className="asd-kpi-sec-card" style={{ '--accent': kpi.accent } as React.CSSProperties}>
                  <div className="asd-kpi-sec-head">
                    <i className={`ti ${kpi.icon} asd-kpi-sec-icon`} />
                    <span className="asd-kpi-sec-label">{kpi.title}</span>
                  </div>
                  <strong className="asd-kpi-sec-value">{kpi.value}{kpi.suffix ?? ''}</strong>
                  <p className="asd-kpi-sec-sub">{kpi.sub}</p>
                </article>
              ))}
            </section>

            {/* ── Operacional ── */}
            <section className="asd-ops-grid">
              {/* Prioridades */}
              <article className="asd-panel">
                <div className="asd-panel-hd">
                  <h2><i className="ti ti-chart-bar" /> Distribuição por Prioridade</h2>
                  <span className="asd-panel-badge">{totalPriorityTickets} chamados</span>
                </div>
                <div className="asd-priority-list">
                  {priorityData.map((item) => {
                    const pct = totalPriorityTickets > 0 ? Math.round((item.value / totalPriorityTickets) * 100) : 0;
                    const w   = item.value > 0 ? Math.max(6, (item.value / maxPriorityValue) * 100) : 0;
                    return (
                      <div key={item.key} className="asd-priority-row">
                        <div className="asd-priority-meta">
                          <span className="asd-priority-dot" style={{ background: item.color }} />
                          <span className="asd-priority-name">{item.label}</span>
                          <span className="asd-priority-count">{item.value}</span>
                          <span className="asd-priority-pct">{pct}%</span>
                        </div>
                        <div className="asd-bar-track">
                          <div className="asd-bar-fill" style={{ width: `${w}%`, background: item.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>

              {/* Ações rápidas */}
              <article className="asd-panel">
                <div className="asd-panel-hd">
                  <h2><i className="ti ti-bolt" /> Ações Rápidas</h2>
                  <span className="asd-panel-badge">Execução imediata</span>
                </div>
                <div className="asd-actions-list">
                  <button className="asd-action-item asd-action-primary" onClick={() => navigate('/admin/chamados')}>
                    <div className="asd-action-icon-wrap">
                      <i className="ti ti-clipboard-list" />
                    </div>
                    <div className="asd-action-txt">
                      <strong>Ver fila de chamados</strong>
                      <span>Visualizar e priorizar atendimentos</span>
                    </div>
                    <i className="ti ti-chevron-right asd-action-arrow" />
                  </button>
                  <button className="asd-action-item asd-action-warning" onClick={() => navigate('/admin/chamados')}>
                    <div className="asd-action-icon-wrap">
                      <i className="ti ti-player-play" />
                    </div>
                    <div className="asd-action-txt">
                      <strong>Atender pendentes</strong>
                      <span>Assumir chamados em aberto</span>
                    </div>
                    <i className="ti ti-chevron-right asd-action-arrow" />
                  </button>
                  <button className="asd-action-item asd-action-neutral" onClick={() => void fetchDashboard()}>
                    <div className="asd-action-icon-wrap">
                      <i className="ti ti-refresh" />
                    </div>
                    <div className="asd-action-txt">
                      <strong>Atualizar painel</strong>
                      <span>Recarregar indicadores</span>
                    </div>
                    <i className="ti ti-chevron-right asd-action-arrow" />
                  </button>
                </div>
              </article>
            </section>

            {/* ── Últimos chamados ── */}
            <section className="asd-table-panel">
              <div className="asd-panel-hd">
                <h2><i className="ti ti-list-details" /> Últimos Chamados Atribuídos</h2>
                <span className="asd-panel-badge">{data.recentTickets.length} itens</span>
              </div>
              {data.recentTickets.length === 0 ? (
                <div className="asd-empty">
                  <i className="ti ti-inbox-off" />
                  <p>Nenhum chamado atribuído no momento.</p>
                </div>
              ) : (
                <div className="asd-table-wrap">
                  <table className="asd-table">
                    <thead>
                      <tr>
                        <th>Título</th>
                        <th>Solicitante</th>
                        <th>Status</th>
                        <th>Prioridade</th>
                        <th>Atualizado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentTickets.map((ticket) => (
                        <tr key={ticket.id} onClick={() => navigate(`/admin/chamados/${ticket.id}`)}>
                          <td className="asd-td-title">{ticket.title}</td>
                          <td className="asd-td-muted">{ticket.requester_name || '—'}</td>
                          <td><span className={getStatusClass(ticket.status)}>{getStatusLabel(ticket.status)}</span></td>
                          <td><span className={getPriorityClass(ticket.priority)}>{getPriorityLabel(ticket.priority)}</span></td>
                          <td className="asd-td-muted">{formatElapsedTime(ticket.updated_at)}</td>
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
