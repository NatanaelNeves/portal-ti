import React, { useEffect, useState } from 'react';
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
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'technicians' | 'sla' | 'trends'>('overview');
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [satisfactionDepartment, setSatisfactionDepartment] = useState<'all' | 'ti' | 'administrativo'>('all');
  
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);
  const [technicianStats, setTechnicianStats] = useState<TechnicianStats[]>([]);
  const [slaStats, setSlaStats] = useState<SLAStats | null>(null);
  const [trendsData, setTrendsData] = useState<TrendsData | null>(null);
  const [satisfactionData, setSatisfactionData] = useState<SatisfactionData | null>(null);
  const [trendsPeriod, setTrendsPeriod] = useState<'7days' | '30days' | '90days' | '12months'>('30days');

  useEffect(() => {
    loadData();
  }, [activeTab, dateFrom, dateTo, trendsPeriod, satisfactionDepartment]);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('internal_token') || localStorage.getItem('token');
      const params = new URLSearchParams();
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      
      const queryString = params.toString();
      
      if (activeTab === 'overview') {
        const [overviewResponse, satisfactionResponse] = await Promise.all([
          fetch(
            `${BACKEND_URL}/api/reports/stats/overview${queryString ? '?' + queryString : ''}`,
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          ),
          fetch(
            `${BACKEND_URL}/api/reports/satisfaction${(() => {
              const satisfactionParams = new URLSearchParams();
              if (dateFrom) satisfactionParams.append('date_from', dateFrom);
              if (dateTo) satisfactionParams.append('date_to', dateTo);
              if (satisfactionDepartment !== 'all') satisfactionParams.append('department', satisfactionDepartment);
              const qs = satisfactionParams.toString();
              return qs ? `?${qs}` : '';
            })()}`,
            {
              headers: { Authorization: `Bearer ${token}` }
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
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        const data = await response.json();
        setTechnicianStats(data);
      } else if (activeTab === 'sla') {
        const response = await fetch(
          `${BACKEND_URL}/api/reports/stats/sla${queryString ? '?' + queryString : ''}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('SLA data received:', data);
        setSlaStats(data);
      } else if (activeTab === 'trends') {
        const response = await fetch(
          `${BACKEND_URL}/api/reports/stats/trends?period=${trendsPeriod}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        const data = await response.json();
        setTrendsData(data);
      }
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportTickets = async () => {
    const token = localStorage.getItem('internal_token') || localStorage.getItem('token');
    const params = new URLSearchParams();
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    
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
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  const handleExportTechnicians = async () => {
    const token = localStorage.getItem('internal_token') || localStorage.getItem('token');
    const params = new URLSearchParams();
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    
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
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  const handleExportConsolidated = async () => {
    const token = localStorage.getItem('internal_token') || localStorage.getItem('token');
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/reports/export/excel/consolidated`,
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
    } catch (err) {
      console.error('Export error:', err);
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
      critical: 'Crítica',
    };
    return labels[priority] || priority;
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Administrador',
      it_staff: 'TI',
      admin_staff: 'Assistente Administrativo',
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

  const orderedTeams = ['ti', 'administrativo'].filter((team) => groupedTeamStats[team]?.length > 0);

  return (
    <div className="reports-page">
      <div className="reports-header">
        <h1>📊 Relatórios e Análises</h1>
        <div className="export-buttons">
          <button onClick={handleExportTickets} className="export-btn">
            📥 Exportar Tickets
          </button>
          <button onClick={handleExportTechnicians} className="export-btn">
            📥 Exportar Equipe
          </button>
          <button onClick={handleExportConsolidated} className="export-btn primary">
            📥 Relatório Completo
          </button>
        </div>
      </div>

      <div className="date-filters">
        <label>
          Data Início:
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </label>
        <label>
          Data Fim:
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </label>
        <label>
          Departamento (Satisfação):
          <select
            value={satisfactionDepartment}
            onChange={(e) => setSatisfactionDepartment(e.target.value as 'all' | 'ti' | 'administrativo')}
          >
            <option value="all">Todos</option>
            <option value="ti">TI</option>
            <option value="administrativo">Administrativo</option>
          </select>
        </label>
        <button 
          onClick={() => { setDateFrom(''); setDateTo(''); setSatisfactionDepartment('all'); }} 
          className="clear-filters-btn"
        >
          Limpar Filtros
        </button>
      </div>

      <div className="reports-tabs">
        <button
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          📈 Visão Geral
        </button>
        <button
          className={activeTab === 'technicians' ? 'active' : ''}
          onClick={() => setActiveTab('technicians')}
        >
          👥 Equipe
        </button>
        <button
          className={activeTab === 'sla' ? 'active' : ''}
          onClick={() => setActiveTab('sla')}
        >
          ⏱️ SLA
        </button>
        <button
          className={activeTab === 'trends' ? 'active' : ''}
          onClick={() => setActiveTab('trends')}
        >
          📊 Tendências
        </button>
      </div>

      <div className="reports-content">
        {loading ? (
          <div className="loading">Carregando dados...</div>
        ) : (
          <>
            {activeTab === 'overview' && overviewStats && (
              <div className="overview-section">
                <div className="stats-grid">
                  <div className="stat-card">
                    <h3>Total de Tickets</h3>
                    <div className="stat-value">{overviewStats.total}</div>
                  </div>
                  <div className="stat-card">
                    <h3>Taxa de Resolução</h3>
                    <div className="stat-value">{overviewStats.resolutionRate.percentage}%</div>
                    <div className="stat-detail">
                      {overviewStats.resolutionRate.resolved} de {overviewStats.resolutionRate.total}
                    </div>
                  </div>
                  <div className="stat-card">
                    <h3>Tempo Médio de Primeira Resposta</h3>
                    <div className="stat-value">{overviewStats.avgFirstResponseHours}h</div>
                  </div>
                  <div className="stat-card">
                    <h3>Tempo Médio de Resolução</h3>
                    <div className="stat-value">{overviewStats.avgResolutionHours}h</div>
                  </div>
                  <div className="stat-card">
                    <h3>Média de Avaliação</h3>
                    <div className="stat-value">{satisfactionData?.averageRating?.toFixed(2) ?? '0.00'}</div>
                  </div>
                  <div className="stat-card">
                    <h3>Total de Avaliações</h3>
                    <div className="stat-value">{satisfactionData?.totalRatings ?? 0}</div>
                  </div>
                  <div className="stat-card">
                    <h3>Avaliações ≥ 4</h3>
                    <div className="stat-value">{satisfactionData?.positiveRate ?? 0}%</div>
                  </div>
                </div>

                {satisfactionData && satisfactionData.byStaff.length > 0 && (
                  <div className="chart-container">
                    <h3>Satisfação por Atendente</h3>
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
                    <h3>Satisfação por Departamento</h3>
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
                    <h3>Tickets por Status</h3>
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
                    <h3>Tickets por Prioridade</h3>
                    <div className="priority-list">
                      {Object.entries(overviewStats.byPriority).map(([priority, count]) => (
                        <div key={priority} className={`priority-item priority-${priority}`}>
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
                <h2>Performance por Equipe</h2>

                {orderedTeams.length === 0 ? (
                  <div className="empty-state">
                    <p>📊 Nenhum atendimento encontrado para a equipe no período selecionado.</p>
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
                                    <td>{tech.name}</td>
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
                                      <span className={`sla-badge ${tech.resolutionRate >= 80 ? 'good' : tech.resolutionRate >= 60 ? 'warning' : 'critical'}`}>
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
                <h2>Análise de SLA</h2>
                
                {slaStats.overall.total === 0 ? (
                  <div className="empty-state">
                    <p>📊 Nenhum ticket encontrado para análise de SLA no período selecionado.</p>
                    <p>Ajuste os filtros de data ou aguarde a criação de novos tickets.</p>
                  </div>
                ) : (
                  <>
                    <div className="sla-overview">
                      <div className="stat-card">
                        <h3>Conformidade Geral</h3>
                        <div className="stat-value">{slaStats.overall.compliancePercentage}%</div>
                        <div className="stat-detail">
                          {slaStats.overall.withinSLA} dentro / {slaStats.overall.breachedSLA} fora
                        </div>
                      </div>
                    </div>

                    <h3>Por Prioridade</h3>
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
                                <span className={`priority-badge priority-${item.priority}`}>
                                  {getPriorityLabel(item.priority)}
                                </span>
                              </td>
                              <td>{item.total}</td>
                              <td>{item.withinSLA}</td>
                              <td>{item.breachedSLA}</td>
                              <td>
                                <span className={`sla-badge ${item.compliancePercentage >= 80 ? 'good' : item.compliancePercentage >= 60 ? 'warning' : 'critical'}`}>
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
                <p>❌ Erro ao carregar dados de SLA.</p>
              </div>
            )}

            {activeTab === 'trends' && trendsData && (
              <div className="trends-section">
                <div className="trends-header">
                  <h2>📊 Tendências e Análises</h2>
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
                    <h3>📈 Tickets Criados vs Resolvidos</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={mergeChartData(trendsData.created, trendsData.resolved)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 12 }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="created" 
                          stroke="#1a73e8" 
                          strokeWidth={2}
                          name="Criados"
                          dot={{ r: 4 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="resolved" 
                          stroke="#34a853" 
                          strokeWidth={2}
                          name="Resolvidos"
                          dot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Gráfico de Área - Tendência de Criação */}
                  <div className="chart-container">
                    <h3>📉 Tendência de Abertura de Tickets</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={trendsData.created}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 12 }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis />
                        <Tooltip />
                        <Area 
                          type="monotone" 
                          dataKey="count" 
                          stroke="#1a73e8" 
                          fill="#1a73e8"
                          fillOpacity={0.6}
                          name="Tickets"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Gráfico de Barras - Distribuição por Status */}
                  <div className="chart-container">
                    <h3>📊 Distribuição por Status</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={trendsData.byStatus}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#1a73e8" name="Quantidade">
                          {trendsData.byStatus.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Gráfico de Pizza - Distribuição por Prioridade */}
                  <div className="chart-container">
                    <h3>🎯 Distribuição por Prioridade</h3>
                    <ResponsiveContainer width="100%" height={300}>
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
                          {trendsData.byPriority.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
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
