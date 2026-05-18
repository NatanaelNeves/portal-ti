import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import InventoryLayout from '../components/InventoryLayout';
import api from '../services/api';
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

const IcoLaptop = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
);
const IcoBox = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);
const IcoTool = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
  </svg>
);
const IcoClock = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IcoRefresh = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 11A8.1 8.1 0 0 0 4.5 9M4 5v4h4"/>
    <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4"/>
  </svg>
);
const IcoWarning = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m10.29 3.86-8.45 14.62A1 1 0 0 0 2.71 20h16.58a1 1 0 0 0 .87-1.52L12.71 3.86a1 1 0 0 0-1.74 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);
const IcoDeliver = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);
const IcoReceive = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);
const IcoPlus = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IcoCart = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
  </svg>
);
const IcoMouse = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="3" width="12" height="18" rx="6"/><line x1="12" y1="7" x2="12" y2="11"/>
  </svg>
);
const IcoUser = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);

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
      const summaryResponse = await api.get('/inventory/dashboard/summary');
      setDashboard(summaryResponse.data);

      const movementsResponse = await api.get('/inventory/movements/recent', {
        params: { limit: 10 }
      });
      setRecentActivities(movementsResponse.data || []);

      const alertsResponse = await api.get('/inventory/alerts');
      setAlerts(alertsResponse.data || []);
    } catch (err: any) {
      console.error('Erro ao carregar dashboard:', err);
      setError(err.response?.data?.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => (
    type === 'delivery' ? <IcoDeliver /> : <IcoReceive />
  );

  const getAlertSeverityClass = (severity: string) => {
    switch (severity) {
      case 'high':   return 'severity-high';
      case 'medium': return 'severity-medium';
      default:       return 'severity-low';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60)      return `há ${diffMins} min`;
    if (diffHours < 24)     return `há ${diffHours}h`;
    if (diffDays === 1)     return 'ontem';
    if (diffDays < 7)       return `há ${diffDays} dias`;
    return date.toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <InventoryLayout>
        <div className="inv-dashboard">
          <div className="inv-loading">Carregando dashboard...</div>
        </div>
      </InventoryLayout>
    );
  }

  if (!dashboard) {
    return (
      <InventoryLayout>
        <div className="inv-dashboard">
          <div className="inv-loading">Nenhum dado disponível</div>
        </div>
      </InventoryLayout>
    );
  }

  return (
    <InventoryLayout>
      <div className="inv-dashboard">
        {/* Header */}
        <div className="inv-dash-header">
          <div>
            <h1 className="inv-dash-title">Dashboard de Inventário</h1>
            <p className="inv-dash-sub">Visão geral do acervo de equipamentos</p>
          </div>
          <button className="inv-btn-refresh" onClick={fetchDashboardData}>
            <IcoRefresh /> Atualizar
          </button>
        </div>

        {error && <div className="inv-alert-error">{error}</div>}

        {/* KPI Grid */}
        <div className="inv-kpi-grid">
          <div className="inv-kpi-card inv-kpi-inuse clickable" onClick={() => navigate('/inventario/notebooks?status=in_use')}>
            <div className="inv-kpi-icon"><IcoLaptop /></div>
            <div className="inv-kpi-body">
              <div className="inv-kpi-num">{dashboard.equipmentInUse || 0}</div>
              <div className="inv-kpi-label">Em Uso</div>
              <div className="inv-kpi-desc">Equipamentos com usuários</div>
            </div>
          </div>

          <div className="inv-kpi-card inv-kpi-available clickable" onClick={() => navigate('/inventario/notebooks?status=available')}>
            <div className="inv-kpi-icon"><IcoBox /></div>
            <div className="inv-kpi-body">
              <div className="inv-kpi-num">{dashboard.equipmentInStock || 0}</div>
              <div className="inv-kpi-label">Disponível</div>
              <div className="inv-kpi-desc">Prontos para entrega</div>
            </div>
          </div>

          <div className="inv-kpi-card inv-kpi-maintenance clickable" onClick={() => navigate('/inventario/notebooks?status=maintenance')}>
            <div className="inv-kpi-icon"><IcoTool /></div>
            <div className="inv-kpi-body">
              <div className="inv-kpi-num">{dashboard.equipmentInMaintenance || 0}</div>
              <div className="inv-kpi-label">Manutenção</div>
              <div className="inv-kpi-desc">Aguardando reparo</div>
            </div>
          </div>

          <div className="inv-kpi-card inv-kpi-pending clickable" onClick={() => navigate('/inventario/compras')}>
            <div className="inv-kpi-icon"><IcoClock /></div>
            <div className="inv-kpi-body">
              <div className="inv-kpi-num">{dashboard.pendingPurchases || 0}</div>
              <div className="inv-kpi-label">Solicitações</div>
              <div className="inv-kpi-desc">Compras pendentes</div>
            </div>
          </div>
        </div>

        <div className="inv-dash-content">
          {/* Alerts */}
          {alerts.length > 0 && (
            <div className="inv-section inv-alerts-section">
              <h2 className="inv-section-title">
                <IcoWarning /> Alertas e Atenções
              </h2>
              <div className="inv-alerts-list">
                {alerts.map(alert => (
                  <div key={alert.id} className={`inv-alert-item ${getAlertSeverityClass(alert.severity)}`}>
                    <div className="inv-alert-dot" />
                    <div className="inv-alert-body">
                      <div className="inv-alert-title">
                        <strong>{alert.equipment_code}</strong> — {alert.equipment_type}
                      </div>
                      <div className="inv-alert-msg">{alert.message}</div>
                      {alert.days && (
                        <div className="inv-alert-meta">
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

          <div className="inv-dash-row">
            {/* Quick Actions */}
            <div className="inv-section">
              <h2 className="inv-section-title">Ações Rápidas</h2>
              <div className="inv-qa-list">
                <button className="inv-qa-btn" onClick={() => navigate('/inventario/equipamentos/entregar')}>
                  <span className="inv-qa-icon inv-qa-deliver"><IcoDeliver /></span>
                  <span className="inv-qa-text">
                    <strong>Entregar Equipamento</strong>
                    <span>Gerar termo de responsabilidade</span>
                  </span>
                  <span className="inv-qa-arrow">→</span>
                </button>
                <button className="inv-qa-btn" onClick={() => navigate('/inventario/equipamentos/devolver')}>
                  <span className="inv-qa-icon inv-qa-receive"><IcoReceive /></span>
                  <span className="inv-qa-text">
                    <strong>Receber Devolução</strong>
                    <span>Registrar retorno de equipamento</span>
                  </span>
                  <span className="inv-qa-arrow">→</span>
                </button>
                <button className="inv-qa-btn" onClick={() => navigate('/inventario/equipamentos/novo')}>
                  <span className="inv-qa-icon inv-qa-add"><IcoPlus /></span>
                  <span className="inv-qa-text">
                    <strong>Cadastrar Equipamento</strong>
                    <span>Adicionar ao inventário</span>
                  </span>
                  <span className="inv-qa-arrow">→</span>
                </button>
                <button className="inv-qa-btn" onClick={() => navigate('/inventario/compras/nova')}>
                  <span className="inv-qa-icon inv-qa-purchase"><IcoCart /></span>
                  <span className="inv-qa-text">
                    <strong>Nova Compra</strong>
                    <span>Solicitar aquisição</span>
                  </span>
                  <span className="inv-qa-arrow">→</span>
                </button>
              </div>
            </div>

            {/* Activity Timeline */}
            <div className="inv-section">
              <h2 className="inv-section-title">Atividades Recentes</h2>
              {recentActivities.length === 0 ? (
                <div className="inv-empty"><p>Nenhuma atividade recente</p></div>
              ) : (
                <div className="inv-timeline">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="inv-tl-item">
                      <div className={`inv-tl-icon ${activity.type === 'delivery' ? 'inv-tl-deliver' : 'inv-tl-return'}`}>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="inv-tl-body">
                        <div className="inv-tl-header">
                          <strong>{activity.equipment_code}</strong>
                          <span className="inv-tl-date">{formatDate(activity.date)}</span>
                        </div>
                        <div className="inv-tl-desc">
                          {activity.type === 'delivery' ? 'Entregue para' : 'Devolvido por'}{' '}
                          <strong>{activity.responsible_name}</strong>
                        </div>
                        <div className="inv-tl-meta">{activity.equipment_type} · {activity.unit}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Nav Cards */}
        <div className="inv-nav-cards">
          <div className="inv-nav-card" onClick={() => navigate('/inventario/notebooks')}>
            <div className="inv-nav-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="2" y1="20" x2="22" y2="20"/></svg></div>
            <h3>Notebooks</h3>
            <p>Gestão de computadores portáteis</p>
          </div>
          <div className="inv-nav-card" onClick={() => navigate('/inventario/perifericos')}>
            <div className="inv-nav-icon"><IcoMouse /></div>
            <h3>Periféricos</h3>
            <p>Mouses, teclados, monitores...</p>
          </div>
          <div className="inv-nav-card" onClick={() => navigate('/inventario/responsabilidades')}>
            <div className="inv-nav-icon"><IcoUser /></div>
            <h3>Responsabilidades</h3>
            <p>Quem está com cada equipamento</p>
          </div>
          <div className="inv-nav-card" onClick={() => navigate('/inventario/compras')}>
            <div className="inv-nav-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg></div>
            <h3>Compras</h3>
            <p>Solicitações e aquisições</p>
          </div>
        </div>
      </div>
    </InventoryLayout>
  );
}
