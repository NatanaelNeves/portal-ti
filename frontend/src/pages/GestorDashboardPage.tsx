import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/GestorDashboardPage.css';
import { BACKEND_URL } from '../services/api';

interface GestorData {
  totalTickets: number;
  resolvedTickets: number;
  averageResolutionTime: number;
  userSatisfaction: number;
  monthlyTrend: Array<{ month: string; tickets: number }>;
  topIssues: Array<{ title: string; count: number }>;
  departmentStats: Record<string, { tickets: number; resolved: number }>;
}

export default function GestorDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<GestorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('internal_token');
    if (!token) {
      navigate('/admin/login');
      return;
    }

    const user = localStorage.getItem('internal_user');
    if (user) {
      const userData = JSON.parse(user);
      if (userData.role !== 'manager' && userData.role !== 'gestor') {
        navigate('/admin/dashboard');
        return;
      }
    }

    fetchDashboardData(token);
  }, [navigate]);

  const fetchDashboardData = async (token: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/dashboard/gestor`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar dashboard');
      }

      const data = await response.json();
      setData(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (!localStorage.getItem('internal_token')) {
    return null;
  }

  return (
    <div className="gestor-dashboard-page">
      <div className="dashboard-header">
        <h1>📊 Dashboard - Gestor/Coordenador</h1>
        <p>Análise estratégica de operações e performance</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading">Carregando dashboard...</div>
      ) : data ? (
        <div className="dashboard-content">
          {/* KPI Cards */}
          <section className="kpi-section">
            <div className="kpi-card">
              <div className="kpi-value">{data.totalTickets}</div>
              <div className="kpi-label">Chamados Totais</div>
              <div className="kpi-change">Todos os registros</div>
            </div>

            <div className="kpi-card accent-green">
              <div className="kpi-value">{data.resolvedTickets}</div>
              <div className="kpi-label">Resolvidos</div>
              <div className="kpi-change">
                {data.totalTickets > 0
                  ? `${((data.resolvedTickets / data.totalTickets) * 100).toFixed(0)}%`
                  : '0%'}
              </div>
            </div>

            <div className="kpi-card accent-blue">
              <div className="kpi-value">{data.averageResolutionTime}h</div>
              <div className="kpi-label">Tempo Médio</div>
              <div className="kpi-change">Resolução</div>
            </div>

            <div className="kpi-card accent-purple">
              <div className="kpi-value">{data.userSatisfaction}%</div>
              <div className="kpi-label">Satisfação</div>
              <div className="kpi-change">Usuários</div>
            </div>
          </section>

          {/* Charts Section */}
          <section className="charts-section">
            <div className="chart-card">
              <h3>Tendência Mensal</h3>
              <div className="trend-chart">
                {data.monthlyTrend && data.monthlyTrend.length > 0 ? (
                  data.monthlyTrend.map((item) => (
                    <div key={item.month} className="trend-item">
                      <div className="trend-label">{item.month}</div>
                      <div className="trend-bar">
                        <div className="trend-fill" style={{
                          height: `${(item.tickets / Math.max(...data.monthlyTrend.map(m => m.tickets))) * 100}%`
                        }} />
                      </div>
                      <div className="trend-value">{item.tickets}</div>
                    </div>
                  ))
                ) : (
                  <p className="no-data">Sem dados disponíveis</p>
                )}
              </div>
            </div>

            <div className="chart-card">
              <h3>Top Issues</h3>
              <div className="issues-list">
                {data.topIssues && data.topIssues.length > 0 ? (
                  data.topIssues.map((issue, idx) => (
                    <div key={idx} className="issue-item">
                      <span className="issue-rank">#{idx + 1}</span>
                      <span className="issue-title">{issue.title}</span>
                      <span className="issue-count">{issue.count}</span>
                    </div>
                  ))
                ) : (
                  <p className="no-data">Sem dados disponíveis</p>
                )}
              </div>
            </div>
          </section>

          {/* Department Stats */}
          <section className="department-stats">
            <h3>Estatísticas por Departamento</h3>
            <div className="stats-table">
              <table>
                <thead>
                  <tr>
                    <th>Departamento</th>
                    <th>Chamados</th>
                    <th>Resolvidos</th>
                    <th>Taxa de Resolução</th>
                  </tr>
                </thead>
                <tbody>
                  {data.departmentStats && Object.entries(data.departmentStats).length > 0 ? (
                    Object.entries(data.departmentStats).map(([dept, stats]) => (
                      <tr key={dept}>
                        <td>{dept}</td>
                        <td>{stats.tickets}</td>
                        <td>{stats.resolved}</td>
                        <td>
                          {stats.tickets > 0
                            ? `${((stats.resolved / stats.tickets) * 100).toFixed(0)}%`
                            : '0%'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} style={{textAlign: 'center'}}>Sem dados disponíveis</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Actions */}
          <section className="actions-section">
            <h3>Ações</h3>
            <div className="action-buttons">
              <button className="btn btn-primary" onClick={() => window.print()}>
                📊 Gerar Relatório
              </button>
              <button className="btn btn-secondary" onClick={() => navigate('/gestor/dashboard')}>
                🔄 Atualizar
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
