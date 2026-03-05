import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/AdminDashboardPage.css';
import { BACKEND_URL } from '../services/api';

interface DashboardData {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  averageSLA: number;
  ticketsByStatus: Record<string, number>;
  ticketsByPriority: Record<string, number>;
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('internal_token');
    if (!token) {
      navigate('/admin/login');
      return;
    }

    fetchDashboardData(token);
  }, [navigate]);

  const fetchDashboardData = async (token: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/dashboard/admin`, {
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

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      open: '🔵 Aberto',
      in_progress: '🔧 Em Atendimento',
      waiting_user: '⏳ Aguardando Usuário',
      resolved: '✅ Resolvido',
      closed: '🔒 Fechado'
    };
    return labels[status] || status;
  };

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      low: '🟢 Baixa',
      medium: '🟡 Média',
      high: '🟠 Alta',
      critical: '🔴 Crítica'
    };
    return labels[priority] || priority;
  };

  if (!localStorage.getItem('internal_token')) {
    return null;
  }

  const internalUser = localStorage.getItem('internal_user');
  const userData = internalUser ? JSON.parse(internalUser) : null;
  const userName = userData?.name || 'Equipe';
  const canManageUsers = userData && (userData.role === 'admin' || userData.role === 'it_staff');

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '☀️ Bom dia';
    if (hour < 18) return '🌤️ Boa tarde';
    return '🌙 Boa noite';
  };

  return (
    <div className="admin-dashboard-page">
      <div className="dashboard-hero">
        <div className="hero-content">
          <h1>{getGreeting()}, {userName}!</h1>
          <p>Aqui está um resumo do que está acontecendo hoje</p>
        </div>
        <div className="hero-actions">
          {canManageUsers && (
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/admin/usuarios')}
            >
              👥 Gerenciar Equipe
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={() => navigate('/admin/chamados')}
          >
            🚀 Atender Chamados
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading">Carregando dashboard...</div>
      ) : data ? (
        <div className="dashboard-content">
          {/* KPI Cards com mais contexto */}
          <section className="kpi-section">
            <div className="kpi-card critical">
              <div className="kpi-icon">🚨</div>
              <div className="kpi-info">
                <div className="kpi-value">{data.openTickets}</div>
                <div className="kpi-label">Aguardando Atendimento</div>
                <div className="kpi-action" onClick={() => navigate('/admin/chamados?status=open')}>
                  Ver agora →
                </div>
              </div>
            </div>

            <div className="kpi-card active">
              <div className="kpi-icon">🔧</div>
              <div className="kpi-info">
                <div className="kpi-value">{data.inProgressTickets}</div>
                <div className="kpi-label">Em Atendimento</div>
                <div className="kpi-action" onClick={() => navigate('/admin/chamados?status=in_progress')}>
                  Acompanhar →
                </div>
              </div>
            </div>

            <div className="kpi-card success">
              <div className="kpi-icon">✅</div>
              <div className="kpi-info">
                <div className="kpi-value">{data.resolvedTickets}</div>
                <div className="kpi-label">Resolvidos Hoje</div>
                <div className="kpi-subtitle">Parabéns pelo trabalho!</div>
              </div>
            </div>

            <div className="kpi-card total">
              <div className="kpi-icon">📊</div>
              <div className="kpi-info">
                <div className="kpi-value">{data.totalTickets}</div>
                <div className="kpi-label">Total de Chamados</div>
                <div className="kpi-subtitle">Desde o início</div>
              </div>
            </div>
          </section>

          {/* Performance Card */}
          <section className="performance-section">
            <div className="performance-card">
              <div className="performance-header">
                <h3>⚡ Tempo Médio de Atendimento</h3>
                <span className="performance-trend">📈 -15% esta semana</span>
              </div>
              <div className="performance-metric">
                <span className="metric-value">{data.averageSLA}</span>
                <span className="metric-unit">horas</span>
              </div>
              <div className="performance-footer">
                Ótimo trabalho! Vocês estão cada vez mais rápidos 🎯
              </div>
            </div>
          </section>

          {/* Charts Section com melhor design */}
          <section className="charts-section">
            <div className="chart-card">
              <div className="chart-header">
                <h3>📋 Distribuição por Status</h3>
                <span className="chart-total">{data.totalTickets} chamados</span>
              </div>
              <div className="chart-content">
                {data.ticketsByStatus && Object.entries(data.ticketsByStatus).map(([status, count]) => (
                  <div key={status} className="chart-item">
                    <span className="chart-label">{getStatusLabel(status)}</span>
                    <div className="chart-bar-container">
                      <div className="chart-bar">
                        <div
                          className={`chart-fill status-${status}`}
                          style={{
                            width: `${(count / data.totalTickets) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="chart-value">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-header">
                <h3>🎯 Distribuição por Prioridade</h3>
                <span className="chart-total">{data.totalTickets} chamados</span>
              </div>
              <div className="chart-content">
                {data.ticketsByPriority && Object.entries(data.ticketsByPriority).map(([priority, count]) => (
                  <div key={priority} className="chart-item">
                    <span className="chart-label">{getPriorityLabel(priority)}</span>
                    <div className="chart-bar-container">
                      <div className="chart-bar">
                        <div
                          className={`chart-fill priority-${priority}`}
                          style={{
                            width: `${(count / data.totalTickets) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="chart-value">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Quick Actions */}
          <section className="actions-section">
            <h3>🚀 Ações Rápidas</h3>
            <div className="action-grid">
              <button
                className="action-card"
                onClick={() => navigate('/admin/chamados')}
              >
                <div className="action-icon">📋</div>
                <div className="action-title">Central de Atendimento</div>
                <div className="action-description">Ver e gerenciar todos os chamados</div>
              </button>
              <button
                className="action-card"
                onClick={() => navigate('/admin/estoque')}
              >
                <div className="action-icon">📦</div>
                <div className="action-title">Gestão de Ativos</div>
                <div className="action-description">Controle de equipamentos e estoque</div>
              </button>
              <button
                className="action-card"
                onClick={() => navigate('/admin/documentos')}
              >
                <div className="action-icon">📚</div>
                <div className="action-title">Base de Conhecimento</div>
                <div className="action-description">Documentos e procedimentos</div>
              </button>
              <button
                className="action-card"
                onClick={() => navigate('/admin/relatorios')}
              >
                <div className="action-icon">📊</div>
                <div className="action-title">Relatórios</div>
                <div className="action-description">Métricas e análises</div>
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
