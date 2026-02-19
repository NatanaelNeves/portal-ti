import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import '../styles/AnalyticsDashboard.css';
import { useToastStore } from '../stores/toastStore';

interface OverviewStats {
  totalTickets: number;
  byStatus: { status: string; count: number }[];
  byPriority: { priority: string; count: number }[];
  avgFirstResponseTime: number;
  avgResolutionTime: number;
  resolutionRate: number;
  ticketsByDay: { date: string; count: number }[];
}

interface TechnicianStats {
  technician: string;
  totalTickets: number;
  resolved: number;
  inProgress: number;
  avgResolutionTime: number;
  slaCompliance: number;
}

interface SLAStats {
  overall: {
    totalTickets: number;
    withinSLA: number;
    outsideSLA: number;
    compliance: number;
  };
  byPriority: {
    priority: string;
    withinSLA: number;
    outsideSLA: number;
    avgResponseTime: number;
    avgResolutionTime: number;
  }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const AnalyticsDashboard: React.FC = () => {
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);
  const [technicianStats, setTechnicianStats] = useState<TechnicianStats[]>([]);
  const [slaStats, setSlaStats] = useState<SLAStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { error } = useToastStore();

  useEffect(() => {
    fetchAllStats();
  }, []);

  const fetchAllStats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('internal_token');
      const headers = {
        'Authorization': token || ''
      };

      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

      // Fetch overview stats
      const overviewRes = await fetch(`${baseUrl}/api/reports/stats/overview`, { headers });
      if (overviewRes.ok) {
        const data = await overviewRes.json();
        setOverviewStats(data);
      }

      // Fetch technician stats
      const techRes = await fetch(`${baseUrl}/api/reports/stats/technicians`, { headers });
      if (techRes.ok) {
        const data = await overviewRes.json();
        setTechnicianStats(data.technicians || []);
      }

      // Fetch SLA stats
      const slaRes = await fetch(`${baseUrl}/api/reports/stats/sla`, { headers });
      if (slaRes.ok) {
        const data = await slaRes.json();
        setSlaStats(data);
      }
    } catch (err: any) {
      error('Erro ao carregar estatísticas');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatHours = (hours: number): string => {
    if (hours < 1) return `${Math.round(hours * 60)} min`;
    if (hours < 24) return `${Math.round(hours)} h`;
    return `${Math.round(hours / 24)} dias`;
  };

  if (loading) {
    return (
      <div className="analytics-loading">
        <div className="spinner"></div>
        <p>Carregando estatísticas...</p>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard">
      <div className="dashboard-header">
        <h1>📊 Dashboard de Análises</h1>
        <button className="refresh-btn" onClick={fetchAllStats}>
          🔄 Atualizar
        </button>
      </div>

      {/* Overview Cards */}
      {overviewStats && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">🎫</div>
              <div className="stat-content">
                <h3>{overviewStats.totalTickets}</h3>
                <p>Total de Chamados</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">⏱️</div>
              <div className="stat-content">
                <h3>{formatHours(overviewStats.avgFirstResponseTime)}</h3>
                <p>Tempo Médio de Resposta</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <h3>{formatHours(overviewStats.avgResolutionTime)}</h3>
                <p>Tempo Médio de Resolução</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">📈</div>
              <div className="stat-content">
                <h3>{overviewStats.resolutionRate.toFixed(1)}%</h3>
                <p>Taxa de Resolução</p>
              </div>
            </div>
          </div>

          {/* Charts Row 1 */}
          <div className="charts-grid">
            <div className="chart-card">
              <h3>Chamados por Status</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={overviewStats.byStatus}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {overviewStats.byStatus.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3>Chamados por Prioridade</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={overviewStats.byPriority}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="priority" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart Row 2 */}
          <div className="charts-grid">
            <div className="chart-card full-width">
              <h3>Chamados Criados (Últimos 30 dias)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={overviewStats.ticketsByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* SLA Stats */}
      {slaStats && (
        <div className="sla-section">
          <h2>📋 Conformidade com SLA</h2>
          <div className="sla-overall">
            <div className="sla-card">
              <h4>Dentro do SLA</h4>
              <div className="sla-value">{slaStats.overall.withinSLA}</div>
            </div>
            <div className="sla-card">
              <h4>Fora do SLA</h4>
              <div className="sla-value red">{slaStats.overall.outsideSLA}</div>
            </div>
            <div className="sla-card">
              <h4>Taxa de Conformidade</h4>
              <div className="sla-value">{slaStats.overall.compliance.toFixed(1)}%</div>
            </div>
          </div>

          <div className="chart-card">
            <h3>SLA por Prioridade</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={slaStats.byPriority}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="priority" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="withinSLA" fill="#28a745" name="Dentro do SLA" />
                <Bar dataKey="outsideSLA" fill="#dc3545" name="Fora do SLA" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Technician Stats */}
      {technicianStats.length > 0 && (
        <div className="technicians-section">
          <h2>👥 Performance dos Técnicos</h2>
          <div className="technicians-table">
            <table>
              <thead>
                <tr>
                  <th>Técnico</th>
                  <th>Total</th>
                  <th>Resolvidos</th>
                  <th>Em Andamento</th>
                  <th>Tempo Médio</th>
                  <th>SLA</th>
                </tr>
              </thead>
              <tbody>
                {technicianStats.map((tech, index) => (
                  <tr key={index}>
                    <td>{tech.technician}</td>
                    <td>{tech.totalTickets}</td>
                    <td>{tech.resolved}</td>
                    <td>{tech.inProgress}</td>
                    <td>{formatHours(tech.avgResolutionTime)}</td>
                    <td>
                      <span className={`sla-badge ${tech.slaCompliance >= 90 ? 'good' : tech.slaCompliance >= 70 ? 'warning' : 'bad'}`}>
                        {tech.slaCompliance.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
