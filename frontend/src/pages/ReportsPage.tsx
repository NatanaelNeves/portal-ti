import React, { useEffect, useMemo, useState } from 'react';
import '../styles/ReportsPage.css';
import { BACKEND_URL } from '../services/api';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

interface OverviewStats {
  total: number;
  byStatus: {
    open: number;
    in_progress: number;
    waiting_user: number;
    aguardando_confirmacao: number;
    resolved: number;
    closed: number;
  };
  byPriority: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  avgFirstResponseHours: string;
  avgResolutionHours: string;
  ticketsPerDay: Array<{ date: string; count: number }>;
  resolutionRate: {
    resolved: number;
    total: number;
    percentage: number;
  };
  teamBreakdown?: Array<{
    key: string;
    label: string;
    total: number;
    resolved: number;
    pending: number;
    avgResolutionHours: string;
    resolutionRate: number;
  }>;
}

interface TechnicianStats {
  id: string;
  name: string;
  email: string;
  role: string;
  team: string;
  teamLabel: string;
  totalTickets: number;
  resolvedTickets: number;
  inProgressTickets: number;
  pendingTickets: number;
  handledToday: number;
  avgResolutionHours: string;
  resolutionRate: number;
  slaCompliance: number;
}

interface SLAStats {
  overall: {
    total: number;
    withinSLA: number;
    breachedSLA: number;
    compliancePercentage: number;
  };
  byPriority: Array<{
    priority: string;
    total: number;
    withinSLA: number;
    breachedSLA: number;
    compliancePercentage: number;
    avgResponseHours: string;
    avgResolutionHours: string;
  }>;
}

interface TrendsData {
  created: Array<{ date: string; count: number }>;
  resolved: Array<{ date: string; count: number }>;
  byStatus: Array<{ name: string; value: number }>;
  byPriority: Array<{ name: string; value: number }>;
}

interface SatisfactionData {
  averageRating: number;
  totalRatings: number;
  positiveRate: number;
  byStaff: Array<{
    staffId: string;
    staffName: string;
    averageRating: number;
    totalRatings: number;
    positiveRate: number;
  }>;
  byDepartment: Array<{
    department: string;
    departmentLabel: string;
    averageRating: number;
    totalRatings: number;
    positiveRate: number;
  }>;
  feedbackEntries: Array<{
    ticketId: string;
    ticketTitle: string;
    rating: number;
    feedback: string;
    ratedAt: string;
    department: string;
    departmentLabel: string;
    assigneeName: string;
    requesterName: string;
  }>;
}

type ServiceDepartmentFilter = 'all' | 'ti' | 'rh' | 'administrativo';

interface ReportFilterOptions {
  serviceDepartments: Array<{ value: Exclude<ServiceDepartmentFilter, 'all'>; label: string }>;
  activeServiceDepartment: ServiceDepartmentFilter;
  canSelectServiceDepartment: boolean;
  requesterDepartments: string[];
}

const STATUS_CHART_COLORS = ['#378ADD', '#3B6D11', '#BA7517', '#E24B4A', '#7A8A9A'];

const PRIORITY_CHART_COLORS: Record<string, string> = {
  alta: '#E24B4A',
  high: '#E24B4A',
  urgente: '#E24B4A',
  urgent: '#E24B4A',
  media: '#BA7517',
  média: '#BA7517',
  medium: '#BA7517',
  baixa: '#3B6D11',
  low: '#3B6D11',
  default: '#7A8A9A',
};

const CHART_LEGEND_COLORS: Record<string, string> = {
  criados: '#378ADD',
  resolvidos: '#3B6D11',
  alta: '#E24B4A',
  high: '#E24B4A',
  urgente: '#E24B4A',
  urgent: '#E24B4A',
  media: '#BA7517',
  média: '#BA7517',
  medium: '#BA7517',
  baixa: '#3B6D11',
  low: '#3B6D11',
  default: '#64748b',
};

const getPriorityChartColor = (name?: string): string => {
  const key = String(name || '').trim().toLowerCase();
  return PRIORITY_CHART_COLORS[key] || PRIORITY_CHART_COLORS.default;
};

const formatChartLegend = (value: string) => {
  const key = String(value || '').trim().toLowerCase();
  const color = CHART_LEGEND_COLORS[key] || CHART_LEGEND_COLORS.default;
  return <span style={{ color, fontSize: 12, fontWeight: 500 }}>{value}</span>;
};

const formatChartTooltip = (value: unknown, name?: string, entry?: any) => {
  const key = String(name || '').trim().toLowerCase();
  const semanticColor = CHART_LEGEND_COLORS[key] || entry?.color || CHART_LEGEND_COLORS.default;

  return [
    <span style={{ color: semanticColor, fontWeight: 500 }}>{String(value)}</span>,
    <span style={{ color: semanticColor }}>{name}</span>,
  ];
};

const getComplianceTone = (value: number): 'good' | 'warning' | 'bad' => {
  if (value >= 80) return 'good';
  if (value >= 50) return 'warning';
  return 'bad';
};

const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3v12" />
    <path d="m7 10 5 5 5-5" />
    <path d="M5 21h14" />
  </svg>
);

const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'technicians' | 'sla' | 'trends'>('overview');
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [serviceDepartment, setServiceDepartment] = useState<ServiceDepartmentFilter>('all');
  const [requesterDepartment, setRequesterDepartment] = useState('all');
  const [filterOptions, setFilterOptions] = useState<ReportFilterOptions>({
    serviceDepartments: [
      { value: 'ti', label: 'TI' },
      { value: 'rh', label: 'Recursos Humanos' },
      { value: 'administrativo', label: 'Administrativo' },
    ],
    activeServiceDepartment: 'all',
    canSelectServiceDepartment: false,
    requesterDepartments: [],
  });
  
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);
  const [technicianStats, setTechnicianStats] = useState<TechnicianStats[]>([]);
  const [slaStats, setSlaStats] = useState<SLAStats | null>(null);
  const [trendsData, setTrendsData] = useState<TrendsData | null>(null);
  const [satisfactionData, setSatisfactionData] = useState<SatisfactionData | null>(null);
  const [trendsPeriod, setTrendsPeriod] = useState<'7days' | '30days' | '90days' | '12months'>('30days');
  const [exporting, setExporting] = useState<'tickets' | 'technicians' | 'consolidated' | null>(null);
  const [exportFeedback, setExportFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  const buildFilterParams = () => {
    const params = new URLSearchParams();
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    if (serviceDepartment !== 'all') params.append('department', serviceDepartment);
    if (requesterDepartment !== 'all') params.append('requester_department', requesterDepartment);
    return params;
  };

  useEffect(() => {
    const controller = new AbortController();
    const loadFilterOptions = async () => {
      try {
        const token = localStorage.getItem('internal_token') || localStorage.getItem('token');
        const params = new URLSearchParams();
        if (serviceDepartment !== 'all') params.append('department', serviceDepartment);
        const queryString = params.toString();
        const response = await fetch(`${BACKEND_URL}/api/reports/filters${queryString ? `?${queryString}` : ''}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!response.ok) return;
        const options = await response.json() as ReportFilterOptions;
        setFilterOptions(options);
        if (!options.canSelectServiceDepartment && options.activeServiceDepartment !== serviceDepartment) {
          setServiceDepartment(options.activeServiceDepartment);
        }
        setRequesterDepartment((currentDepartment) => (
          currentDepartment !== 'all' && !options.requesterDepartments.includes(currentDepartment)
            ? 'all'
            : currentDepartment
        ));
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Error loading report filters:', error);
        }
      }
    };
    void loadFilterOptions();
    return () => controller.abort();
  }, [serviceDepartment]);

  useEffect(() => {
    const controller = new AbortController();
    void loadData(controller.signal);
    return () => controller.abort();
  }, [activeTab, dateFrom, dateTo, trendsPeriod, serviceDepartment, requesterDepartment]);

  const loadData = async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('internal_token') || localStorage.getItem('token');
      const params = buildFilterParams();
      
      const queryString = params.toString();
      
      if (activeTab === 'overview') {
        const [overviewResponse, satisfactionResponse] = await Promise.all([
          fetch(
            `${BACKEND_URL}/api/reports/stats/overview${queryString ? '?' + queryString : ''}`,
            {
              headers: { Authorization: `Bearer ${token}` },
              signal,
            }
          ),
          fetch(
            `${BACKEND_URL}/api/reports/satisfaction${queryString ? '?' + queryString : ''}`,
            {
              headers: { Authorization: `Bearer ${token}` },
              signal,
            }
          ),
        ]);

        const overview = await overviewResponse.json();
        setOverviewStats(overview);

        if (satisfactionResponse.ok) {
          const satisfaction = await satisfactionResponse.json();
          setSatisfactionData(satisfaction);
        }
      } else if (activeTab === 'technicians') {
        const response = await fetch(
          `${BACKEND_URL}/api/reports/stats/technicians${queryString ? '?' + queryString : ''}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal,
          }
        );
        const data = await response.json();
        setTechnicianStats(data);
      } else if (activeTab === 'sla') {
        const response = await fetch(
          `${BACKEND_URL}/api/reports/stats/sla${queryString ? '?' + queryString : ''}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal,
          }
        );
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('SLA data received:', data);
        setSlaStats(data);
      } else if (activeTab === 'trends') {
        const trendParams = buildFilterParams();
        trendParams.append('period', trendsPeriod);
        const response = await fetch(
          `${BACKEND_URL}/api/reports/stats/trends?${trendParams.toString()}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal,
          }
        );
        const data = await response.json();
        setTrendsData(data);
      }
    } catch (error) {
      if (!signal?.aborted) console.error('Error loading report data:', error);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  const handleExportTickets = async () => {
    const token = localStorage.getItem('internal_token') || localStorage.getItem('token');
    const params = buildFilterParams();
    
    setExporting('tickets');
    setExportFeedback(null);
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/reports/export/excel/tickets?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tickets_${new Date().toISOString().slice(0,10)}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      setExportFeedback({ tone: 'success', message: 'Planilha de chamados exportada com sucesso.' });
    } catch (err) {
      console.error('Export error:', err);
      setExportFeedback({ tone: 'error', message: 'Não foi possível exportar os chamados. Tente novamente.' });
    } finally {
      setExporting(null);
    }
  };

  const handleExportTechnicians = async () => {
    const token = localStorage.getItem('internal_token') || localStorage.getItem('token');
    const params = buildFilterParams();
    
    setExporting('technicians');
    setExportFeedback(null);
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/reports/export/excel/technicians?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `technicians_${new Date().toISOString().slice(0,10)}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      setExportFeedback({ tone: 'success', message: 'Planilha da equipe exportada com sucesso.' });
    } catch (err) {
      console.error('Export error:', err);
      setExportFeedback({ tone: 'error', message: 'Não foi possível exportar os dados da equipe. Tente novamente.' });
    } finally {
      setExporting(null);
    }
  };

  const handleExportConsolidated = async () => {
    const token = localStorage.getItem('internal_token') || localStorage.getItem('token');
    const params = buildFilterParams();
    const query = params.toString();
    setExporting('consolidated');
    setExportFeedback(null);
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/reports/export/excel/consolidated${query ? `?${query}` : ''}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `consolidated_${new Date().toISOString().slice(0,10)}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      setExportFeedback({ tone: 'success', message: 'Relatório completo exportado com sucesso.' });
    } catch (err) {
      console.error('Export error:', err);
      setExportFeedback({ tone: 'error', message: 'Não foi possível gerar o relatório completo. Tente novamente.' });
    } finally {
      setExporting(null);
    }
  };

  const mergeChartData = (
    created: Array<{ date: string; count: number }>,
    resolved: Array<{ date: string; count: number }>
  ) => {
    const dateMap = new Map<string, { date: string; created: number; resolved: number }>();
    
    created.forEach(item => {
      dateMap.set(item.date, { date: item.date, created: item.count, resolved: 0 });
    });
    
    resolved.forEach(item => {
      const existing = dateMap.get(item.date);
      if (existing) {
        existing.resolved = item.count;
      } else {
        dateMap.set(item.date, { date: item.date, created: 0, resolved: item.count });
      }
    });
    
    return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      open: 'Aberto',
      in_progress: 'Em Andamento',
      waiting_user: 'Aguardando Usuário',
      awaiting_user: 'Aguardando Usuário',
      aguardando_confirmacao: 'Aguardando Confirmação',
      resolved: 'Resolvido',
      closed: 'Concluído'
    };
    return labels[status] || status;
  };

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      low: 'Baixa',
      medium: 'Média',
      high: 'Alta',
      urgent: 'Urgente',
      critical: 'Alta',
    };
    return labels[priority] || priority;
  };

  const getPriorityBadgeClass = (priority: string) => {
    const normalized = priority === 'critical' || priority === 'urgent' ? 'high' : priority;
    return `priority-pill priority-${normalized}`;
  };

  const getSlaBadgeClass = (value: number) => {
    const tone = getComplianceTone(value);
    return `sla-badge sla-badge--${tone}`;
  };

  const hasPriorityChartData = Boolean(trendsData?.byPriority?.some((item) => item.value > 0));

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Administrador',
      it_staff: 'TI',
      admin_staff: 'Assistente Administrativo',
      rh_staff: 'Recursos Humanos',
    };

    return labels[role] || role;
  };

  const groupedTeamStats = technicianStats.reduce<Record<string, TechnicianStats[]>>((acc, member) => {
    const key = member.team || 'ti';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(member);
    return acc;
  }, {});

  const orderedTeams = ['ti', 'rh', 'administrativo'].filter((team) => groupedTeamStats[team]?.length > 0);

  const reportPeriodLabel = useMemo(() => {
    if (dateFrom && dateTo) {
      return `${new Date(`${dateFrom}T12:00:00`).toLocaleDateString('pt-BR')} a ${new Date(`${dateTo}T12:00:00`).toLocaleDateString('pt-BR')}`;
    }
    if (dateFrom) return `Desde ${new Date(`${dateFrom}T12:00:00`).toLocaleDateString('pt-BR')}`;
    if (dateTo) return `Até ${new Date(`${dateTo}T12:00:00`).toLocaleDateString('pt-BR')}`;
    return 'Todo o período disponível';
  }, [dateFrom, dateTo]);

  const serviceDepartmentLabel = serviceDepartment === 'all'
    ? 'Todos os atendimentos'
    : filterOptions.serviceDepartments.find((department) => department.value === serviceDepartment)?.label || serviceDepartment.toUpperCase();

  const executiveImpact = useMemo(() => {
    if (!overviewStats) {
      return { resolved: 0, pending: 0, resolutionRate: 0, satisfaction: '0.00' };
    }

    const resolved = overviewStats.resolutionRate.resolved || 0;
    return {
      resolved,
      pending: Math.max(overviewStats.total - resolved, 0),
      resolutionRate: overviewStats.resolutionRate.percentage || 0,
      satisfaction: satisfactionData?.averageRating?.toFixed(2) ?? '0.00',
    };
  }, [overviewStats, satisfactionData]);

  return (
    <div className="reports-page">
      <div className="reports-header">
        <div>
          <h1 className="page-title">Impacto da operação</h1>
          <p className="reports-subtitle">Uma leitura executiva do volume entregue, da velocidade do atendimento e da qualidade percebida.</p>
        </div>
        <div className="export-buttons">
          <button onClick={handleExportTickets} className="export-btn" title="Exportar Tickets" aria-label="Exportar Tickets" disabled={exporting !== null}>
            <span className="export-btn-icon"><DownloadIcon /></span>
            <span className="export-btn-label">{exporting === 'tickets' ? 'Gerando...' : 'Exportar Tickets'}</span>
          </button>
          <button onClick={handleExportTechnicians} className="export-btn" title="Exportar Equipe" aria-label="Exportar Equipe" disabled={exporting !== null}>
            <span className="export-btn-icon"><DownloadIcon /></span>
            <span className="export-btn-label">{exporting === 'technicians' ? 'Gerando...' : 'Exportar Equipe'}</span>
          </button>
          <button onClick={handleExportConsolidated} className="export-btn primary" title="Relatório Completo" aria-label="Relatório Completo" disabled={exporting !== null}>
            <span className="export-btn-icon"><DownloadIcon /></span>
            <span className="export-btn-label">{exporting === 'consolidated' ? 'Gerando...' : 'Relatório Completo'}</span>
          </button>
        </div>
        {exportFeedback && (
          <div className={`export-feedback export-feedback--${exportFeedback.tone}`} role="status">
            {exportFeedback.message}
          </div>
        )}
      </div>

      <div className="date-filters filter-card">
        <label>
          Início do período
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </label>
        <label>
          Fim do período
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </label>
        <label>
          Equipe responsável
          <select
            value={serviceDepartment}
            onChange={(e) => setServiceDepartment(e.target.value as ServiceDepartmentFilter)}
            disabled={!filterOptions.canSelectServiceDepartment}
          >
            {filterOptions.canSelectServiceDepartment && <option value="all">Todos os atendimentos</option>}
            {filterOptions.serviceDepartments.map((department) => (
              <option key={department.value} value={department.value}>{department.label}</option>
            ))}
          </select>
        </label>
        <label>
          Setor solicitante
          <select
            value={requesterDepartment}
            onChange={(e) => setRequesterDepartment(e.target.value)}
          >
            <option value="all">Todos os setores</option>
            {filterOptions.requesterDepartments.map((department) => (
              <option key={department} value={department}>{department}</option>
            ))}
          </select>
        </label>
        <button 
          onClick={() => {
            setDateFrom('');
            setDateTo('');
            if (filterOptions.canSelectServiceDepartment) setServiceDepartment('all');
            setRequesterDepartment('all');
          }}
          className="clear-filters-btn"
        >
          Limpar Filtros
        </button>
      </div>

      <div className="report-scope-summary" role="status">
        <span>Escopo atual</span>
        <strong>{serviceDepartmentLabel}</strong>
        <span>Solicitantes: {requesterDepartment === 'all' ? 'todos os setores' : requesterDepartment}</span>
        <span>{reportPeriodLabel}</span>
      </div>

      <div className="reports-tabs" aria-label="Seções do relatório">
        <button
          aria-pressed={activeTab === 'overview'}
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          Resumo executivo
        </button>
        <button
          aria-pressed={activeTab === 'technicians'}
          className={activeTab === 'technicians' ? 'active' : ''}
          onClick={() => setActiveTab('technicians')}
        >
          Equipe e contribuição
        </button>
        <button
          aria-pressed={activeTab === 'sla'}
          className={activeTab === 'sla' ? 'active' : ''}
          onClick={() => setActiveTab('sla')}
        >
          Qualidade e SLA
        </button>
        <button
          aria-pressed={activeTab === 'trends'}
          className={activeTab === 'trends' ? 'active' : ''}
          onClick={() => setActiveTab('trends')}
        >
          Evolução
        </button>
      </div>

      <div className="reports-content">
        {loading ? (
          <div className="loading">Carregando dados...</div>
        ) : (
          <>
            {activeTab === 'overview' && overviewStats && (
              <div className="overview-section">
                <section className="executive-brief" aria-labelledby="executive-brief-title">
                  <div className="executive-brief-copy">
                    <div>
                      <h2 id="executive-brief-title">O trabalho da equipe, traduzido em resultado.</h2>
                      <p>
                        No período selecionado, a operação resolveu <strong>{executiveImpact.resolved} chamados</strong> e alcançou{' '}
                        <strong>{executiveImpact.resolutionRate}% de resolução</strong>. Os indicadores abaixo mostram o que foi entregue,
                        o que segue em andamento e como o atendimento foi percebido.
                      </p>
                    </div>
                    <span className="executive-period">{reportPeriodLabel}</span>
                  </div>
                  <div className="impact-ledger" aria-label="Principais resultados do período">
                    <div className="impact-ledger-item">
                      <span>Chamados resolvidos</span>
                      <strong>{executiveImpact.resolved}</strong>
                    </div>
                    <div className="impact-ledger-item">
                      <span>Pendências no período</span>
                      <strong>{executiveImpact.pending}</strong>
                    </div>
                    <div className="impact-ledger-item">
                      <span>Tempo médio de resolução</span>
                      <strong>{overviewStats.avgResolutionHours}h</strong>
                    </div>
                    <div className="impact-ledger-item">
                      <span>Satisfação média</span>
                      <strong>{executiveImpact.satisfaction}</strong>
                    </div>
                  </div>
                </section>
                <div className="stats-grid">
                  <div className="stat-card stat-card--default">
                    <h3>Total de Tickets</h3>
                    <div className="stat-value">{overviewStats.total}</div>
                  </div>
                  <div className="stat-card stat-card--alta">
                    <h3>Taxa de Resolução</h3>
                    <div className="stat-value">{overviewStats.resolutionRate.percentage}%</div>
                    <div className="stat-detail">
                      {overviewStats.resolutionRate.resolved} de {overviewStats.resolutionRate.total}
                    </div>
                  </div>
                  <div className="stat-card stat-card--tempo">
                    <h3>Tempo Médio de Primeira Resposta</h3>
                    <div className="stat-value">{overviewStats.avgFirstResponseHours}h</div>
                  </div>
                  <div className="stat-card stat-card--tempo">
                    <h3>Tempo Médio de Resolução</h3>
                    <div className="stat-value">{overviewStats.avgResolutionHours}h</div>
                  </div>
                  <div className="stat-card stat-card--avaliacao">
                    <h3>Média de Avaliação</h3>
                    <div className="stat-value">{satisfactionData?.averageRating?.toFixed(2) ?? '0.00'}</div>
                  </div>
                  <div className="stat-card stat-card--avaliacao">
                    <h3>Total de Avaliações</h3>
                    <div className="stat-value">{satisfactionData?.totalRatings ?? 0}</div>
                  </div>
                  <div className="stat-card stat-card--avaliacao">
                    <h3>Avaliações ≥ 4</h3>
                    <div className="stat-value">{satisfactionData?.positiveRate ?? 0}%</div>
                  </div>
                </div>

                {satisfactionData && satisfactionData.byStaff.length > 0 && (
                  <div className="chart-container">
                    <h3 className="section-header subsection-header">Satisfação por Atendente</h3>
                    <table className="technicians-table">
                      <thead>
                        <tr>
                          <th>Atendente</th>
                          <th>Média</th>
                          <th>Avaliações</th>
                          <th>% Positivas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {satisfactionData.byStaff.map((item) => (
                          <tr key={item.staffId}>
                            <td>{item.staffName}</td>
                            <td>{item.averageRating.toFixed(2)}</td>
                            <td>{item.totalRatings}</td>
                            <td>{item.positiveRate}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {satisfactionData && satisfactionData.byDepartment.length > 0 && (
                  <div className="chart-container">
                    <h3 className="section-header subsection-header">Satisfação por Departamento</h3>
                    <table className="technicians-table">
                      <thead>
                        <tr>
                          <th>Departamento</th>
                          <th>Média</th>
                          <th>Avaliações</th>
                          <th>% Positivas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {satisfactionData.byDepartment.map((item) => (
                          <tr key={item.department}>
                            <td>{item.departmentLabel}</td>
                            <td>{item.averageRating.toFixed(2)}</td>
                            <td>{item.totalRatings}</td>
                            <td>{item.positiveRate}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {satisfactionData && satisfactionData.feedbackEntries.length > 0 && (
                  <div className="chart-container">
                    <h3 className="section-header subsection-header">Feedbacks Recentes</h3>
                    <table className="technicians-table">
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th>Chamado</th>
                          <th>Nota</th>
                          <th>Departamento</th>
                          <th>Atendente</th>
                          <th>Solicitante</th>
                          <th>Comentário</th>
                        </tr>
                      </thead>
                      <tbody>
                        {satisfactionData.feedbackEntries.map((item) => (
                          <tr key={`${item.ticketId}-${item.ratedAt}`}>
                            <td>{new Date(item.ratedAt).toLocaleString('pt-BR')}</td>
                            <td>{item.ticketTitle}</td>
                            <td>{item.rating}/5</td>
                            <td>{item.departmentLabel}</td>
                            <td>{item.assigneeName}</td>
                            <td>{item.requesterName}</td>
                            <td>{item.feedback}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {overviewStats.teamBreakdown && overviewStats.teamBreakdown.length > 0 && (
                  <div className="team-overview-grid">
                    {overviewStats.teamBreakdown.map((team) => (
                      <div key={team.key} className={`team-overview-card team-${team.key}`}>
                        <div className="team-overview-header">
                          <h3>{team.label}</h3>
                          <span>{team.resolutionRate}% resolvido</span>
                        </div>
                        <div className="team-overview-metrics">
                          <div>
                            <strong>{team.total}</strong>
                            <small>Total</small>
                          </div>
                          <div>
                            <strong>{team.resolved}</strong>
                            <small>Resolvidos</small>
                          </div>
                          <div>
                            <strong>{team.pending}</strong>
                            <small>Pendentes</small>
                          </div>
                          <div>
                            <strong>{team.avgResolutionHours}h</strong>
                            <small>Tempo médio</small>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="charts-row">
                  <div className="chart-card">
                    <h3 className="section-header subsection-header">Tickets por Status</h3>
                    <div className="status-list">
                      {Object.entries(overviewStats.byStatus).map(([status, count]) => (
                        <div key={status} className="status-item">
                          <span className="status-label">{getStatusLabel(status)}</span>
                          <span className="status-count">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="chart-card">
                    <h3 className="section-header subsection-header">Tickets por Prioridade</h3>
                    <div className="priority-list">
                      {Object.entries(overviewStats.byPriority).map(([priority, count]) => (
                        <div key={priority} className={`priority-item priority-${priority === 'critical' ? 'high' : priority}`}>
                          <span className="priority-label">{getPriorityLabel(priority)}</span>
                          <span className="priority-count">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'technicians' && (
              <div className="technicians-section">
                <h2 className="section-header">Performance por Equipe</h2>

                {orderedTeams.length === 0 ? (
                  <div className="empty-state">
                    <p>Nenhum atendimento encontrado para a equipe no período selecionado.</p>
                  </div>
                ) : (
                  <div className="team-staff-grid">
                    {orderedTeams.map((teamKey) => {
                      const members = groupedTeamStats[teamKey];
                      const teamLabel = members[0]?.teamLabel || (teamKey === 'administrativo' ? 'Assistente Administrativo' : 'TI');

                      return (
                        <div key={teamKey} className="team-staff-card">
                          <div className="team-staff-header">
                            <h3>{teamLabel}</h3>
                            <span>{members.length} colaborador(es)</span>
                          </div>

                          <div className="technicians-table">
                            <table>
                              <thead>
                                <tr>
                                  <th>Nome</th>
                                  <th>Perfil</th>
                                  <th>Total</th>
                                  <th>Resolvidos</th>
                                  <th>Em Atendimento</th>
                                  <th>Pendentes</th>
                                  <th>Hoje</th>
                                  <th>Tempo Médio</th>
                                  <th>Taxa</th>
                                </tr>
                              </thead>
                              <tbody>
                                {members.map((tech) => (
                                  <tr key={tech.id}>
                                    <td className="table-name-cell">{tech.name}</td>
                                    <td>
                                      <span className={`role-pill role-${tech.team}`}>
                                        {getRoleLabel(tech.role)}
                                      </span>
                                    </td>
                                    <td>{tech.totalTickets}</td>
                                    <td>{tech.resolvedTickets}</td>
                                    <td>{tech.inProgressTickets}</td>
                                    <td>{tech.pendingTickets}</td>
                                    <td>{tech.handledToday}</td>
                                    <td>{tech.avgResolutionHours}h</td>
                                    <td>
                                      <span className={getSlaBadgeClass(tech.resolutionRate)}>
                                        {tech.resolutionRate}%
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'sla' && slaStats && slaStats.overall && (
              <div className="sla-section">
                <h2 className="section-header">Análise de SLA</h2>
                
                {slaStats.overall.total === 0 ? (
                  <div className="empty-state">
                    <p>Nenhum ticket encontrado para análise de SLA no período selecionado.</p>
                    <p>Ajuste os filtros de data ou aguarde a criação de novos tickets.</p>
                  </div>
                ) : (
                  <>
                    <div className="sla-overview">
                      <div className="stat-card sla-overview-card">
                        <h3 className="section-header subsection-header">Conformidade Geral</h3>
                        <div className={`stat-value stat-value--${getComplianceTone(slaStats.overall.compliancePercentage)}`}>
                          {slaStats.overall.compliancePercentage}%
                        </div>
                        <div className="stat-detail">
                          {slaStats.overall.withinSLA} dentro / {slaStats.overall.breachedSLA} fora
                        </div>
                      </div>
                    </div>

                    <h3 className="section-header subsection-header">Por Prioridade</h3>
                    <div className="sla-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Prioridade</th>
                            <th>Total</th>
                            <th>Dentro do SLA</th>
                            <th>Fora do SLA</th>
                            <th>% Conformidade</th>
                            <th>Tempo Médio de Resposta</th>
                            <th>Tempo Médio de Resolução</th>
                          </tr>
                        </thead>
                        <tbody>
                          {slaStats.byPriority?.map((item) => (
                            <tr key={item.priority}>
                              <td>
                                <span className={getPriorityBadgeClass(item.priority)}>
                                  {getPriorityLabel(item.priority)}
                                </span>
                              </td>
                              <td>{item.total}</td>
                              <td>{item.withinSLA}</td>
                              <td>{item.breachedSLA}</td>
                              <td>
                                <span className={getSlaBadgeClass(item.compliancePercentage)}>
                                  {item.compliancePercentage}%
                                </span>
                              </td>
                              <td>{item.avgResponseHours}h</td>
                              <td>{item.avgResolutionHours}h</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}
            
            {activeTab === 'sla' && !loading && !slaStats && (
              <div className="empty-state">
                <p>Não foi possível carregar os dados de SLA. Tente novamente.</p>
              </div>
            )}

            {activeTab === 'trends' && trendsData && (
              <div className="trends-section">
                <div className="trends-header">
                  <h2 className="section-header">Tendências e Análises</h2>
                  <div className="period-selector">
                    <button
                      className={trendsPeriod === '7days' ? 'active' : ''}
                      onClick={() => setTrendsPeriod('7days')}
                    >
                      7 Dias
                    </button>
                    <button
                      className={trendsPeriod === '30days' ? 'active' : ''}
                      onClick={() => setTrendsPeriod('30days')}
                    >
                      30 Dias
                    </button>
                    <button
                      className={trendsPeriod === '90days' ? 'active' : ''}
                      onClick={() => setTrendsPeriod('90days')}
                    >
                      90 Dias
                    </button>
                    <button
                      className={trendsPeriod === '12months' ? 'active' : ''}
                      onClick={() => setTrendsPeriod('12months')}
                    >
                      12 Meses
                    </button>
                  </div>
                </div>

                <div className="charts-grid">
                  {/* Gráfico de Linha - Tickets Criados vs Resolvidos */}
                  <div className="chart-container">
                    <h3 className="section-header subsection-header">Tickets Criados vs Resolvidos</h3>
                    <div className="chart-plot">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={mergeChartData(trendsData.created, trendsData.resolved)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 10 }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          tickMargin={10}
                          interval={0}
                        />
                        <YAxis />
                        <Tooltip formatter={formatChartTooltip} />
                        <Legend formatter={formatChartLegend} wrapperStyle={{ paddingTop: 8 }} />
                        <Line 
                          type="monotone" 
                          dataKey="created" 
                          stroke="#378ADD" 
                          strokeWidth={2}
                          name="Criados"
                          dot={{ r: 4 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="resolved" 
                          stroke="#3B6D11" 
                          strokeWidth={2}
                          name="Resolvidos"
                          dot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Gráfico de Área - Tendência de Criação */}
                  <div className="chart-container">
                    <h3 className="section-header subsection-header">Tendência de Abertura de Tickets</h3>
                    <div className="chart-plot">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendsData.created}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 10 }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          tickMargin={10}
                          interval={0}
                        />
                        <YAxis />
                        <Tooltip formatter={formatChartTooltip} />
                        <Area 
                          type="monotone" 
                          dataKey="count" 
                          stroke="#378ADD" 
                          fill="#378ADD"
                          fillOpacity={0.22}
                          name="Tickets"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Gráfico de Barras - Distribuição por Status */}
                  <div className="chart-container">
                    <h3 className="section-header subsection-header">Distribuição por Status</h3>
                    <div className="chart-plot">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={trendsData.byStatus}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis />
                        <Tooltip formatter={formatChartTooltip} />
                        <Bar dataKey="value" fill="#378ADD" name="Quantidade">
                          {trendsData.byStatus.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={STATUS_CHART_COLORS[index % STATUS_CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Gráfico de Pizza - Distribuição por Prioridade */}
                  <div className="chart-container">
                    <h3 className="section-header subsection-header">Distribuição por Prioridade</h3>
                    <div className="chart-plot">
                      {hasPriorityChartData ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={trendsData.byPriority}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {trendsData.byPriority.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={getPriorityChartColor(entry.name)} />
                              ))}
                            </Pie>
                            <Tooltip formatter={formatChartTooltip} />
                            <Legend formatter={formatChartLegend} wrapperStyle={{ paddingTop: 8 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="chart-empty-state">Sem dados disponíveis</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;
