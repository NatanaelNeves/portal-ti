import React, { useEffect, useState } from 'react';
import '../styles/ReportsPage.css';
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
    awaiting_user: number;
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
}

interface TechnicianStats {
  id: number;
  name: string;
  email: string;
  totalTickets: number;
  resolvedTickets: number;
  inProgressTickets: number;
  pendingTickets: number;
  avgResolutionHours: string;
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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'technicians' | 'sla' | 'trends'>('overview');
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);
  const [technicianStats, setTechnicianStats] = useState<TechnicianStats[]>([]);
  const [slaStats, setSlaStats] = useState<SLAStats | null>(null);
  const [trendsData, setTrendsData] = useState<TrendsData | null>(null);
  const [trendsPeriod, setTrendsPeriod] = useState<'7days' | '30days' | '90days' | '12months'>('30days');

  useEffect(() => {
    loadData();
  }, [activeTab, dateFrom, dateTo, trendsPeriod]);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      
      const queryString = params.toString();
      
      if (activeTab === 'overview') {
        const response = await fetch(
          `http://localhost:3001/api/reports/stats/overview${queryString ? '?' + queryString : ''}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        const data = await response.json();
        setOverviewStats(data);
      } else if (activeTab === 'technicians') {
        const response = await fetch(
          `http://localhost:3001/api/reports/stats/technicians${queryString ? '?' + queryString : ''}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        const data = await response.json();
        setTechnicianStats(data);
      } else if (activeTab === 'sla') {
        const response = await fetch(
          `http://localhost:3001/api/reports/stats/sla${queryString ? '?' + queryString : ''}`,
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
          `http://localhost:3001/api/reports/stats/trends?period=${trendsPeriod}`,
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

  const handleExportTickets = () => {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams();
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    
    window.open(
      `http://localhost:3001/api/reports/export/excel/tickets?${params.toString()}&token=${token}`,
      '_blank'
    );
  };

  const handleExportTechnicians = () => {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams();
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    
    window.open(
      `http://localhost:3001/api/reports/export/excel/technicians?${params.toString()}&token=${token}`,
      '_blank'
    );
  };

  const handleExportConsolidated = () => {
    const token = localStorage.getItem('token');
    window.open(
      `http://localhost:3001/api/reports/export/excel/consolidated?token=${token}`,
      '_blank'
    );
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
      awaiting_user: 'Aguardando Usuário',
      resolved: 'Resolvido',
      closed: 'Fechado'
    };
    return labels[status] || status;
  };

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      low: 'Baixa',
      medium: 'Média',
      high: 'Alta',
      critical: 'Crítica'
    };
    return labels[priority] || priority;
  };

  return (
    <div className="reports-page">
      <div className="reports-header">
        <h1>📊 Relatórios e Análises</h1>
        <div className="export-buttons">
          <button onClick={handleExportTickets} className="export-btn">
            📥 Exportar Tickets
          </button>
          <button onClick={handleExportTechnicians} className="export-btn">
            📥 Exportar Técnicos
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
        <button 
          onClick={() => { setDateFrom(''); setDateTo(''); }} 
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
          👥 Técnicos
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
                </div>

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
                <h2>Performance dos Técnicos</h2>
                <div className="technicians-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>Total de Tickets</th>
                        <th>Resolvidos</th>
                        <th>Em Andamento</th>
                        <th>Pendentes</th>
                        <th>Tempo Médio de Resolução</th>
                        <th>Conformidade SLA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {technicianStats.map((tech) => (
                        <tr key={tech.id}>
                          <td>{tech.name}</td>
                          <td>{tech.totalTickets}</td>
                          <td>{tech.resolvedTickets}</td>
                          <td>{tech.inProgressTickets}</td>
                          <td>{tech.pendingTickets}</td>
                          <td>{tech.avgResolutionHours}h</td>
                          <td>
                            <span className={`sla-badge ${tech.slaCompliance >= 80 ? 'good' : tech.slaCompliance >= 60 ? 'warning' : 'critical'}`}>
                              {tech.slaCompliance}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
