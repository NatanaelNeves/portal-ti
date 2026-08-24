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
  filters?: {
    serviceDepartment: 'all' | 'ti' | 'rh' | 'administrativo';
    serviceDepartmentLabel: string;
    canSelectServiceDepartment: boolean;
  };
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
    filters: payload.filters,
  };
};

/* ── SVG icon helpers (Tabler-style, stroke-based) ── */
const SvgUsers = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.85"/>
  </svg>
);

const SvgHeadset = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 14v-3a8 8 0 1 1 16 0v3"/>
    <path d="M18 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/>
    <path d="M4 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2h-3z"/>
  </svg>
);

const SvgClock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>
  </svg>
);

/* KPI icon map — id → SVG element */
const KPI_ICONS: Record<string, JSX.Element> = {
  'open-tickets': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 6m0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-12a2 2 0 0 1-2-2z"/>
      <path d="M4 13h3l3 3h4l3-3h3"/>
    </svg>
  ),
  'in-progress-tickets': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 14v-3a8 8 0 1 1 16 0v3"/>
      <path d="M18 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/>
      <path d="M4 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2h-3z"/>
    </svg>
  ),
  'resolved-today': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9"/>
      <path d="M9 12l2 2 4-4"/>
    </svg>
  ),
  'total-tickets': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="12" width="4" height="8" rx="1"/>
      <rect x="9.5" y="7" width="4" height="13" rx="1"/>
      <rect x="16" y="3" width="4" height="17" rx="1"/>
    </svg>
  ),
  'assets-in-stock': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l9 5v8l-9 5-9-5v-8z"/>
      <path d="M12 12l9-5M12 12v10M12 12l-9-5"/>
    </svg>
  ),
  'assets-assigned': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 19h18"/>
      <rect x="5" y="6" width="14" height="10" rx="1.5"/>
    </svg>
  ),
  'assets-maintenance': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 10h3v3l-1.5 1.5a6 6 0 1 0 3 0l-1.5-1.5v-3h3a6 6 0 0 0-6-3z"/>
    </svg>
  ),
  'total-assets': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <ellipse cx="12" cy="6" rx="8" ry="3"/>
      <path d="M4 6v6c0 1.657 3.582 3 8 3s8-1.343 8-3v-6"/>
      <path d="M4 12v6c0 1.657 3.582 3 8 3s8-1.343 8-3v-6"/>
    </svg>
  ),
};

/* Activity icon map */
const ACTIVITY_ICONS: Record<string, JSX.Element> = {
  ticket_created: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  ticket_resolved: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 13l4 4L19 7"/>
    </svg>
  ),
  asset_assigned: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l9 5v8l-9 5-9-5v-8z"/>
    </svg>
  ),
  asset_returned: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/>
    </svg>
  ),
  asset_maintenance: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  ),
};

const ACTIVITY_ICON_STYLE: Record<string, string> = {
  ticket_created: 'icon-circle-info',
  ticket_resolved: 'icon-circle-success',
  asset_assigned: 'icon-circle-warning',
  asset_returned: 'icon-circle-neutral',
  asset_maintenance: 'icon-circle-danger',
};

/* Quick action icons */
const QA_ICONS = {
  chamados: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
      <rect x="9" y="3" width="6" height="4" rx="2"/>
      <path d="M9 12h6M9 16h4"/>
    </svg>
  ),
  ativos: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l9 5v8l-9 5-9-5v-8z"/>
      <path d="M12 12l9-5M12 12v10M12 12l-9-5"/>
    </svg>
  ),
  conhecimento: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  ),
  relatorios: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="12" width="4" height="8" rx="1"/>
      <rect x="9.5" y="7" width="4" height="13" rx="1"/>
      <rect x="16" y="3" width="4" height="17" rx="1"/>
    </svg>
  ),
};

const DONUT_COLORS = ['#28a967', '#2d73d2', '#ed8a22', '#7f56c5', '#d9464f', '#8ca097'];

const DonutChart = ({
  entries,
  total,
  centerLabel,
}: {
  entries: Array<{ label: string; count: number }>;
  total: number;
  centerLabel: string;
}) => {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;

  return (
    <div className="donut-visual">
      <svg viewBox="0 0 120 120" role="img" aria-label={`${centerLabel}: ${total}`}>
        <circle className="donut-track" cx="60" cy="60" r={radius} />
        {entries.map((entry, index) => {
          const fraction = total > 0 ? entry.count / total : 0;
          const segment = circumference * fraction;
          const offset = circumference * accumulated;
          accumulated += fraction;
          return (
            <circle
              key={`${entry.label}-${index}`}
              className="donut-segment"
              cx="60"
              cy="60"
              r={radius}
              stroke={DONUT_COLORS[index % DONUT_COLORS.length]}
              strokeDasharray={`${segment} ${Math.max(0, circumference - segment)}`}
              strokeDashoffset={-offset}
            />
          );
        })}
      </svg>
      <span className="donut-center"><strong>{total}</strong><small>{centerLabel}</small></span>
    </div>
  );
};

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData>(EMPTY_DASHBOARD_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [serviceDepartment, setServiceDepartment] = useState<'all' | 'ti' | 'rh' | 'administrativo'>('all');

  useEffect(() => {
    const token = localStorage.getItem('internal_token');
    if (!token) {
      navigate('/admin/login');
      return;
    }

    const userRaw = localStorage.getItem('internal_user');
    if (userRaw) {
      try {
        const user = JSON.parse(userRaw) as { role?: string };
        if (user.role === 'admin_staff') {
          navigate('/admin/auxiliar/dashboard');
          return;
        }
        if (user.role === 'manager' || user.role === 'gestor') {
          navigate('/gestor/dashboard');
          return;
        }
      } catch {
        navigate('/admin/login');
        return;
      }
    }

    const controller = new AbortController();
    void fetchDashboardData(controller.signal);
    return () => controller.abort();
  }, [navigate, serviceDepartment]);

  const fetchDashboardData = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const response = await api.get<Partial<DashboardData>>('/dashboard/admin', {
        params: serviceDepartment === 'all' ? undefined : { department: serviceDepartment },
        signal,
        timeout: 15000,
      });
      setData(normalizeDashboardData(response.data ?? {}));
      setError('');
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || 'Erro ao carregar dashboard';
      if (err?.code !== 'ERR_CANCELED') {
        setError(message);
        console.error('Dashboard fetch error:', err);
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  const STATUS_LABELS: Record<string, string> = {
    open: 'Aberto',
    in_progress: 'Em Atendimento',
    waiting_user: 'Aguardando Usuário',
    aguardando_confirmacao: 'Aguardando Confirmação',
    aguardando_aquisicao: 'Aguardando Aquisição',
    aguardando_terceiros: 'Aguardando Terceiros',
    resolved: 'Resolvido',
    closed: 'Fechado',
  };

  const getStatusLabel = (status: string) => STATUS_LABELS[status] ?? status;

  const PRIORITY_LABELS: Record<string, string> = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    urgent: 'Urgente',
  };

  const getPriorityLabel = (priority: string) => PRIORITY_LABELS[priority] ?? priority;

  const getActivityLabel = (type: string) => {
    switch (type) {
      case 'ticket_created':    return 'Chamado criado';
      case 'ticket_resolved':   return 'Chamado resolvido';
      case 'asset_assigned':    return 'Ativo atribuído';
      case 'asset_returned':    return 'Ativo devolvido';
      case 'asset_maintenance': return 'Ativo em manutenção';
      default:                  return 'Atualização operacional';
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
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const slaTrend = useMemo(() => {
    const previous = data.previousAverageSLA;
    const current = data.averageSLA;
    if (previous <= 0 || current <= 0) return { trendLabel: '0%', isPositive: true };
    const changePercent = ((previous - current) / previous) * 100;
    return {
      trendLabel: `${Math.abs(changePercent).toFixed(0)}%`,
      isPositive: changePercent >= 0,
    };
  }, [data.averageSLA, data.previousAverageSLA]);

  const operationsToday = useMemo(() => (
    data.ticketIndicators.totalCreatedToday +
    data.resolvedTickets +
    data.assets.assignedToday +
    data.assets.returnedToday +
    data.assets.maintenanceToday
  ), [data]);

  const statusEntries = useMemo(
    () => Object.entries(data.ticketsByStatus).sort((a, b) => b[1] - a[1]),
    [data.ticketsByStatus],
  );

  const priorityEntries = useMemo(
    () => Object.entries(data.ticketsByPriority).sort((a, b) => b[1] - a[1]),
    [data.ticketsByPriority],
  );

  const assetStatusEntries = useMemo(() => {
    const entries = [
      { key: 'in-stock',       label: 'Em estoque',     count: data.assets.inStock,       fillClass: 'asset-in-stock' },
      { key: 'in-use',         label: 'Em uso',         count: data.assets.assigned,      fillClass: 'asset-in-use' },
      { key: 'in-maintenance', label: 'Em manutenção',  count: data.assets.inMaintenance, fillClass: 'asset-in-maintenance' },
    ];
    const total = entries.reduce((sum, item) => sum + item.count, 0);
    return entries.map(item => ({ ...item, percent: total > 0 ? Math.round((item.count / total) * 100) : 0 }));
  }, [data.assets.assigned, data.assets.inMaintenance, data.assets.inStock]);

  const totalAssetsForChart = useMemo(() => {
    const derived = data.assets.inStock + data.assets.assigned + data.assets.inMaintenance;
    return data.assets.total > 0 ? data.assets.total : derived;
  }, [data.assets.assigned, data.assets.inMaintenance, data.assets.inStock, data.assets.total]);

  const internalToken = localStorage.getItem('internal_token');
  if (!internalToken) return null;

  let userName = 'Equipe';
  let canManageUsers = false;
  let canSelectServiceDepartment = false;

  const internalUserRaw = localStorage.getItem('internal_user');
  if (internalUserRaw) {
    try {
      const parsedUser = JSON.parse(internalUserRaw) as { name?: string; role?: string };
      userName = parsedUser.name?.trim() || 'Equipe';
      canManageUsers = parsedUser.role === 'admin' || parsedUser.role === 'it_staff';
      canSelectServiceDepartment = parsedUser.role === 'admin';
    } catch {
      userName = 'Equipe';
      canManageUsers = false;
      canSelectServiceDepartment = false;
    }
  }

  const kpiCards = [
    {
      id: 'open-tickets',
      title: 'Chamados Abertos',
      value: data.openTickets,
      secondary: `+${data.ticketIndicators.openToday} hoje`,
      tone: 'critical',
      category: 'Chamados',
      action: () => navigate('/admin/chamados?status=open'),
    },
    {
      id: 'in-progress-tickets',
      title: 'Em Atendimento',
      value: data.inProgressTickets,
      secondary: `+${data.ticketIndicators.inProgressToday} atualizados hoje`,
      tone: 'active',
      category: 'Chamados',
      action: () => navigate('/admin/chamados?status=in_progress'),
    },
    {
      id: 'resolved-today',
      title: 'Resolvidos Hoje',
      value: data.resolvedTickets,
      secondary: `${data.ticketIndicators.resolvedChangePercent >= 0 ? '↑' : '↓'} ${Math.abs(data.ticketIndicators.resolvedChangePercent)}%`,
      tone: 'success',
      category: 'Chamados',
      action: () => navigate('/admin/chamados?status=resolved'),
    },
    {
      id: 'total-tickets',
      title: 'Total de Chamados',
      value: data.totalTickets,
      secondary: `+${data.ticketIndicators.totalCreatedToday} criados hoje`,
      tone: 'info',
      category: 'Chamados',
      action: () => navigate('/admin/chamados'),
    },
    {
      id: 'assets-in-stock',
      title: 'Ativos em Estoque',
      value: data.assets.inStock,
      secondary: `+${data.assets.addedThisMonth} no mês`,
      tone: 'stock',
      category: 'Ativos',
      action: () => navigate('/admin/estoque?status=available'),
    },
    {
      id: 'assets-assigned',
      title: 'Ativos em Uso',
      value: data.assets.assigned,
      secondary: `+${data.assets.assignedToday} atribuições hoje`,
      tone: 'assigned',
      category: 'Ativos',
      action: () => navigate('/admin/estoque?status=in_use'),
    },
    {
      id: 'assets-maintenance',
      title: 'Em Manutenção',
      value: data.assets.inMaintenance,
      secondary: `+${data.assets.maintenanceToday} enviados hoje`,
      tone: 'maintenance',
      category: 'Ativos',
      action: () => navigate('/admin/estoque?status=maintenance'),
    },
    {
      id: 'total-assets',
      title: 'Total de Ativos',
      value: data.assets.total,
      secondary: `${data.assets.returnedToday} devoluções hoje`,
      tone: 'asset-total',
      category: 'Ativos',
      action: () => navigate('/admin/estoque'),
    },
  ] as const;

  const ticketKpiCards = kpiCards.filter(c => c.category === 'Chamados');
  const assetKpiCards  = kpiCards.filter(c => c.category === 'Ativos');

  const renderKpiCard = (card: (typeof kpiCards)[number]) => (
    <button
      key={card.id}
      type="button"
      className={`kpi-card kpi-${card.tone}`}
      onClick={card.action}
      aria-label={`${card.title}: ${card.value}`}
    >
      <div className="kpi-header-row">
        <span className="kpi-icon-container">
          <span className="kpi-icon">{KPI_ICONS[card.id]}</span>
        </span>
        <span className="kpi-category-tag">{card.category}</span>
      </div>
      <span className="kpi-number">{card.value}</span>
      <span className="kpi-title">{card.title}</span>
      <span className="kpi-secondary">{card.secondary}</span>
      <div className="kpi-bottom-bar" />
    </button>
  );

  const renderBarItem = (label: string, count: number, total: number, fillClass: string) => {
    const percent = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
      <div key={label} className="bar-item">
        <div className="bar-label-row">
          <span className="bar-label">{label}</span>
          <span className="bar-right-group">
            <span className="bar-count">{count}</span>
            <span className="bar-percent">{percent}%</span>
          </span>
        </div>
        <div className="bar-track">
          <div
            className={`bar-fill ${fillClass}`}
            style={{ width: `${percent}%` }}
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${label}: ${count}`}
          />
        </div>
      </div>
    );
  };

  const assetDonutEntries = assetStatusEntries.map((entry) => ({ label: entry.label, count: entry.count }));
  const statusDonutEntries = statusEntries.map(([status, count]) => ({ label: getStatusLabel(status), count }));

  return (
    <div className="admin-dashboard-page">
      <header className="ops-dashboard-header">
        <div className="ops-header-content">
          <h1 className="ops-greeting">{getGreeting()}, <span className="ops-greeting-accent">{userName}</span></h1>
          <p className="ops-subtitle">Painel operacional — chamados, ativos e movimentações.</p>
          <div className={`ops-live-badge ${loading ? 'is-syncing' : error ? 'is-offline' : 'is-live'}`}>
            <span className="ops-live-dot" />
            {loading ? 'Sincronizando' : error ? 'Dados indisponíveis' : 'Atualizado agora'}
          </div>
        </div>
        <nav className="ops-header-actions" aria-label="Ações do painel">
          {canSelectServiceDepartment && (
            <label className="ops-scope-control" htmlFor="dashboard-service-department">
              <span>Fila responsável</span>
              <select id="dashboard-service-department" value={serviceDepartment} onChange={(event) => setServiceDepartment(event.target.value as typeof serviceDepartment)}>
                <option value="all">Todos os atendimentos</option>
                <option value="ti">TI</option>
                <option value="rh">Recursos Humanos</option>
                <option value="administrativo">Administrativo</option>
              </select>
            </label>
          )}
          <button type="button" className="ops-btn ops-btn-primary" onClick={() => navigate('/admin/chamados')}><SvgHeadset /> Atender chamados</button>
          {canManageUsers && <button type="button" className="ops-btn ops-btn-secondary" onClick={() => navigate('/admin/usuarios')}><SvgUsers /> Gerenciar equipe</button>}
        </nav>
      </header>

      {error && <div className="alert alert-error" role="alert"><div><strong>Não foi possível atualizar o painel.</strong><span>{error}</span></div><button type="button" onClick={() => void fetchDashboardData()}>Tentar novamente</button></div>}

      {loading ? (
        <div className="loading-container"><div className="spinner" /><p>Carregando painel operacional...</p></div>
      ) : (
        <main className="ops-dashboard-content">
          <section className="kpi-metrics-section">
            <div className="ops-section-heading"><h2 className="ops-section-title">Indicadores operacionais</h2><span>{data.filters?.serviceDepartmentLabel || 'Todos os atendimentos'}</span></div>
            <div className="kpi-grid">{ticketKpiCards.map(renderKpiCard)}</div>
          </section>

          <section className="dashboard-panel asset-summary-section">
            <div className="panel-heading"><h2>Ativos e inventário</h2><button type="button" onClick={() => navigate('/inventario')}>Ver todos</button></div>
            <div className="asset-summary-grid">{assetKpiCards.map(renderKpiCard)}</div>
          </section>

          <section className="dashboard-panel performance-metrics-section">
            <div className="panel-heading"><h2>Ritmo e desempenho</h2><span>Operação atual</span></div>
            <div className="performance-card">
              <div className="performance-header"><div className="performance-header-left"><div className="performance-title-row"><SvgClock /><h3 className="performance-title">SLA Médio Operacional</h3></div><p className="performance-subtitle">Baseado nos chamados resolvidos recentemente</p></div><div className={`performance-trend ${slaTrend.isPositive ? 'positive' : 'negative'}`}><span className="trend-value">{slaTrend.isPositive ? '↓' : '↑'} {slaTrend.trendLabel}</span><span className="trend-label">vs período anterior</span></div></div>
              <div className="performance-main-metric"><span className="metric-value">{data.averageSLA.toFixed(1)}</span><span className="metric-unit">h</span></div>
              <div className="performance-stats-grid">
                <div className="performance-stat"><strong>{operationsToday}</strong><span>Operações hoje</span></div>
                <div className="performance-stat"><strong>{data.assets.assignedToday}</strong><span>Atribuições de ativo</span></div>
                <div className="performance-stat"><strong>{data.assets.inMaintenance}</strong><span>Ativos em manutenção</span></div>
                <div className="performance-stat"><strong>{data.pendingPurchases}</strong><span>Compras pendentes</span></div>
              </div>
            </div>
          </section>

          <section className="dashboard-panel analytics-card asset-overview-section">
            <div className="panel-heading"><h2>Distribuição de ativos por status</h2><span>{totalAssetsForChart} ativos</span></div>
            {totalAssetsForChart === 0 ? <div className="empty-state"><p>Nenhum dado disponível</p></div> : <div className="donut-layout"><DonutChart entries={assetDonutEntries} total={totalAssetsForChart} centerLabel="ativos" /><div className="donut-legend">{assetStatusEntries.map((entry, index) => <div key={entry.key}><span className="legend-dot" style={{ backgroundColor: DONUT_COLORS[index] }} /><span>{entry.label}</span><strong>{entry.count}</strong><small>{entry.percent}%</small></div>)}</div></div>}
          </section>

          <section className="dashboard-panel analytics-card ticket-status-section">
            <div className="panel-heading"><h2>Distribuição de chamados por status</h2><span>{data.totalTickets} chamados</span></div>
            {data.totalTickets === 0 ? <div className="empty-state"><p>Nenhum dado disponível</p></div> : <div className="donut-layout"><DonutChart entries={statusDonutEntries} total={data.totalTickets} centerLabel="chamados" /><div className="donut-legend">{statusEntries.slice(0, 6).map(([status, count], index) => <div key={status}><span className="legend-dot" style={{ backgroundColor: DONUT_COLORS[index] }} /><span>{getStatusLabel(status)}</span><strong>{count}</strong><small>{Math.round((count / data.totalTickets) * 100)}%</small></div>)}</div></div>}
          </section>

          <section className="dashboard-panel recent-activity-section">
            <div className="panel-heading"><h2>Últimas movimentações</h2><button type="button" onClick={() => navigate('/admin/chamados')}>Ver toda a atividade</button></div>
            {data.recentActivity.length === 0 ? <div className="empty-state compact-empty-state"><p>Sem eventos operacionais recentes.</p></div> : <ul className="activity-list">{data.recentActivity.slice(0, 5).map((activity) => <li key={activity.id}><button type="button" className="activity-item" onClick={() => navigate(activity.route || '/admin/chamados')}><div className="activity-main"><span className={`activity-icon-circle ${ACTIVITY_ICON_STYLE[activity.type] ?? 'icon-circle-neutral'}`}>{ACTIVITY_ICONS[activity.type] ?? ACTIVITY_ICONS.ticket_created}</span><div className="activity-texts"><span className="activity-event">{getActivityLabel(activity.type)}</span><p className="activity-title">{activity.title}</p><p className="activity-detail">{activity.detail}</p></div></div><div className="activity-meta"><time dateTime={activity.timestamp}>{formatRelativeTime(activity.timestamp)}</time><span className="activity-arrow" aria-hidden="true">→</span></div></button></li>)}</ul>}
          </section>

          <section className="dashboard-panel analytics-card priority-section">
            <div className="panel-heading"><h2>Distribuição de chamados por prioridade</h2><span>{data.totalTickets} chamados</span></div>
            <div className="chart-bars">{priorityEntries.map(([priority, count]) => renderBarItem(getPriorityLabel(priority), count, data.totalTickets, `priority-${priority}`))}</div>
          </section>

          <section className="quick-actions-section">
            <h2 className="ops-section-title">Acesso rápido</h2>
            <div className="actions-grid">{[
              { icon: QA_ICONS.chamados, title: 'Central de Chamados', desc: 'Gerenciar chamados em fila', route: '/admin/chamados', label: 'Central de atendimento de chamados' },
              { icon: QA_ICONS.ativos, title: 'Gestão de Ativos', desc: 'Inventário e movimentações', route: '/inventario', label: 'Gestão de ativos e equipamentos' },
              { icon: QA_ICONS.conhecimento, title: 'Base de Conhecimento', desc: 'Documentos e playbooks', route: '/admin/documentos', label: 'Base de conhecimento e documentação' },
              { icon: QA_ICONS.relatorios, title: 'Relatórios', desc: 'Indicadores e tendências', route: '/admin/relatorios', label: 'Relatórios e análises' },
            ].map(({ icon, title, desc, route, label }) => <button key={route} type="button" className="action-button" onClick={() => navigate(route)} aria-label={label}><div className="action-icon">{icon}</div><div className="action-content"><h4>{title}</h4><p>{desc}</p></div><div className="action-arrow" aria-hidden="true">→</div></button>)}</div>
          </section>
        </main>
      )}
    </div>
  );
}
