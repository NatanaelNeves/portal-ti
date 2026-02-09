import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import InventoryLayout from '../components/InventoryLayout';
import axios from 'axios';
import '../styles/InventoryDashboardPage.css';

interface DashboardData {
  equipmentInUse: number;
  equipmentInStock: number;
  equipmentInMaintenance: number;
  totalNotebooks: number;
  equipmentWithoutTerms: number;
  pendingPurchases: number;
}

interface RecentActivity {
  id: string;
  type: 'delivery' | 'return';
  equipment_code: string;
  equipment_type: string;
  responsible_name: string;
  date: string;
  unit: string;
}

interface Alert {
  id: string;
  type: 'maintenance' | 'long_use' | 'missing_term';
  severity: 'high' | 'medium' | 'low';
  equipment_code: string;
  equipment_type: string;
  message: string;
  days?: number;
}

export default function InventoryDashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Buscar dados do dashboard
      const summaryResponse = await axios.get('/api/inventory/dashboard/summary', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboard(summaryResponse.data);

      // Buscar atividades recentes (últimas movimentações)
      const movementsResponse = await axios.get('/api/inventory/movements/recent', {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 10 }
      });
      setRecentActivities(movementsResponse.data || []);

      // Buscar alertas
      const alertsResponse = await axios.get('/api/inventory/alerts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAlerts(alertsResponse.data || []);

    } catch (err: any) {
      console.error('Erro ao carregar dashboard:', err);
      setError(err.response?.data?.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    return type === 'delivery' ? '📤' : '📥';
  };

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return 'ℹ️';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `há ${diffMins} min`;
    } else if (diffHours < 24) {
      return `há ${diffHours}h`;
    } else if (diffDays === 1) {
      return 'ontem';
    } else if (diffDays < 7) {
      return `há ${diffDays} dias`;
    } else {
      return date.toLocaleDateString('pt-BR');
    }
  };

  if (loading) {
    return (
      <InventoryLayout>
        <div className="dashboard-page">
          <div className="loading">Carregando dashboard...</div>
        </div>
      </InventoryLayout>
    );
  }

  if (!dashboard) {
    return (
      <InventoryLayout>
        <div className="dashboard-page">
          <div className="error">Nenhum dado disponível</div>
        </div>
      </InventoryLayout>
    );
  }

  return (
    <InventoryLayout>
      <div className="dashboard-page">
        <div className="page-header">
          <div>
            <h1>📊 Dashboard de Inventário</h1>
            <p>Visão geral do acervo de equipamentos do Pequeno Nazareno</p>
          </div>
          <button className="btn-refresh" onClick={fetchDashboardData}>
            🔄 Atualizar
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {/* KPIs principais */}
        <div className="kpi-grid">
          <div className="kpi-card clickable" onClick={() => navigate('/inventario/notebooks?status=in_use')}>
            <div className="kpi-icon in-use">🖥️</div>
            <div className="kpi-content">
              <div className="kpi-number">{dashboard.equipmentInUse || 0}</div>
              <div className="kpi-label">Em Uso</div>
              <div className="kpi-description">Equipamentos em mãos de usuários</div>
            </div>
          </div>

          <div className="kpi-card clickable" onClick={() => navigate('/inventario/notebooks?status=available')}>
            <div className="kpi-icon available">📦</div>
            <div className="kpi-content">
              <div className="kpi-number">{dashboard.equipmentInStock || 0}</div>
              <div className="kpi-label">Disponível</div>
              <div className="kpi-description">Prontos para entrega</div>
            </div>
          </div>

          <div className="kpi-card clickable" onClick={() => navigate('/inventario/notebooks?status=maintenance')}>
            <div className="kpi-icon maintenance">🔧</div>
            <div className="kpi-content">
              <div className="kpi-number">{dashboard.equipmentInMaintenance || 0}</div>
              <div className="kpi-label">Manutenção</div>
              <div className="kpi-description">Aguardando reparo</div>
            </div>
          </div>

          <div className="kpi-card clickable" onClick={() => navigate('/inventario/compras')}>
            <div className="kpi-icon pending">⏳</div>
            <div className="kpi-content">
              <div className="kpi-number">{dashboard.pendingPurchases || 0}</div>
              <div className="kpi-label">Solicitações</div>
              <div className="kpi-description">Compras pendentes</div>
            </div>
          </div>
        </div>

        <div className="dashboard-content">
          {/* Seção de alertas */}
          {alerts.length > 0 && (
            <div className="dashboard-section alerts-section">
              <h2>⚠️ Alertas e Atenções</h2>
              <div className="alerts-list">
                {alerts.map(alert => (
                  <div key={alert.id} className={`alert-item severity-${alert.severity}`}>
                    <div className="alert-icon">{getAlertIcon(alert.severity)}</div>
                    <div className="alert-content">
                      <div className="alert-title">
                        <strong>{alert.equipment_code}</strong> - {alert.equipment_type}
                      </div>
                      <div className="alert-message">{alert.message}</div>
                      {alert.days && (
                        <div className="alert-meta">
                          {alert.type === 'maintenance' && `Em manutenção há ${alert.days} dias`}
                          {alert.type === 'long_use' && `Em uso há ${alert.days} dias`}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="dashboard-row">
            {/* Ações rápidas */}
            <div className="dashboard-section quick-actions-section">
              <h2>⚡ Ações Rápidas</h2>
              <div className="quick-actions-grid">
                <button 
                  className="quick-action-btn primary"
                  onClick={() => navigate('/inventario/equipamentos/entregar')}
                >
                  <span className="action-icon">📤</span>
                  <div className="action-text">
                    <strong>Entregar Equipamento</strong>
                    <span>Gerar termo de responsabilidade</span>
                  </div>
                </button>

                <button 
                  className="quick-action-btn success"
                  onClick={() => navigate('/inventario/equipamentos/devolver')}
                >
                  <span className="action-icon">📥</span>
                  <div className="action-text">
                    <strong>Receber Devolução</strong>
                    <span>Registrar retorno de equipamento</span>
                  </div>
                </button>

                <button 
                  className="quick-action-btn secondary"
                  onClick={() => navigate('/inventario/equipamentos/novo')}
                >
                  <span className="action-icon">➕</span>
                  <div className="action-text">
                    <strong>Cadastrar Equipamento</strong>
                    <span>Adicionar ao inventário</span>
                  </div>
                </button>

                <button 
                  className="quick-action-btn info"
                  onClick={() => navigate('/inventario/compras/nova')}
                >
                  <span className="action-icon">🛒</span>
                  <div className="action-text">
                    <strong>Nova Compra</strong>
                    <span>Solicitar aquisição</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Timeline de atividades recentes */}
            <div className="dashboard-section timeline-section">
              <h2>📅 Atividades Recentes</h2>
              {recentActivities.length === 0 ? (
                <div className="empty-state">
                  <p>Nenhuma atividade recente</p>
                </div>
              ) : (
                <div className="timeline">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="timeline-item">
                      <div className="timeline-icon">{getActivityIcon(activity.type)}</div>
                      <div className="timeline-content">
                        <div className="timeline-header">
                          <strong>{activity.equipment_code}</strong>
                          <span className="timeline-date">{formatDate(activity.date)}</span>
                        </div>
                        <div className="timeline-description">
                          {activity.type === 'delivery' ? 'Entregue para' : 'Devolvido por'}{' '}
                          <strong>{activity.responsible_name}</strong>
                        </div>
                        <div className="timeline-meta">
                          {activity.equipment_type} • {activity.unit}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Links de navegação */}
        <div className="navigation-cards">
          <div className="nav-card" onClick={() => navigate('/inventario/notebooks')}>
            <div className="nav-icon">💻</div>
            <h3>Notebooks</h3>
            <p>Gestão de computadores portáteis</p>
          </div>

          <div className="nav-card" onClick={() => navigate('/inventario/perifericos')}>
            <div className="nav-icon">⌨️</div>
            <h3>Periféricos</h3>
            <p>Mouses, teclados, monitores...</p>
          </div>

          <div className="nav-card" onClick={() => navigate('/inventario/responsabilidades')}>
            <div className="nav-icon">👤</div>
            <h3>Responsabilidades</h3>
            <p>Quem está com cada equipamento</p>
          </div>

          <div className="nav-card" onClick={() => navigate('/inventario/compras')}>
            <div className="nav-icon">🛒</div>
            <h3>Compras</h3>
            <p>Solicitações e aquisições</p>
          </div>
        </div>
      </div>
    </InventoryLayout>
  );
}
