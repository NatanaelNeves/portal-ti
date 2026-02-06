import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import InventoryLayout from '../components/InventoryLayout';
import '../styles/InventoryDashboardPage.css';

interface DashboardData {
  equipmentInUse: number;
  equipmentInStock: number;
  equipmentInMaintenance: number;
  totalNotebooks: number;
  equipmentWithoutTerms: number;
  pendingPurchases: number;
}

export default function InventoryDashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('internal_token');
      const response = await fetch('/api/inventory/dashboard/summary', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar dashboard');
      }

      const data = await response.json();
      setDashboard(data.summary);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="dashboard-page"><div className="loading">Carregando...</div></div>;
  }

  if (!dashboard) {
    return <div className="dashboard-page"><div className="error">Nenhum dado disponível</div></div>;
  }

  return (
    <InventoryLayout>
      <div className="dashboard-page">
        <div className="page-header">
          <h1>📊 Visão Geral do Inventário</h1>
          <p>Status e métricas do acervo de equipamentos</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="kpi-grid">
          <div className="kpi-card" onClick={() => navigate('/inventario/equipamentos?status=in_use')}>
            <div className="kpi-icon">🖥️</div>
            <div className="kpi-content">
              <div className="kpi-number">{dashboard.equipmentInUse}</div>
              <div className="kpi-label">Em Uso</div>
              <div className="kpi-description">Equipamentos em mãos de usuários</div>
            </div>
          </div>

          <div className="kpi-card" onClick={() => navigate('/inventario/equipamentos?status=in_stock')}>
            <div className="kpi-icon">📦</div>
            <div className="kpi-content">
              <div className="kpi-number">{dashboard.equipmentInStock}</div>
              <div className="kpi-label">Em Estoque</div>
              <div className="kpi-description">Equipamentos disponíveis</div>
            </div>
          </div>

          <div className="kpi-card" onClick={() => navigate('/inventario/equipamentos?status=in_maintenance')}>
            <div className="kpi-icon">🔧</div>
            <div className="kpi-content">
              <div className="kpi-number">{dashboard.equipmentInMaintenance}</div>
              <div className="kpi-label">Em Manutenção</div>
              <div className="kpi-description">Aguardando reparo</div>
            </div>
          </div>

          <div className="kpi-card" onClick={() => navigate('/inventario/compras')}>
            <div className="kpi-icon">⏳</div>
            <div className="kpi-content">
              <div className="kpi-number">{dashboard.pendingPurchases}</div>
              <div className="kpi-label">Compras Pendentes</div>
              <div className="kpi-description">Solicitações em aberto</div>
            </div>
          </div>
        </div>

        <div className="attention-cards">
          <div className="attention-card warning">
            <div className="attention-icon">⚠️</div>
            <div className="attention-content">
              <h3>Equipamentos sem termos</h3>
              <p className="attention-number">{dashboard.equipmentWithoutTerms}</p>
              <p className="attention-description">Equipamentos em uso sem responsável formal</p>
              <button 
                className="btn btn-small"
                onClick={() => navigate('/inventario/responsabilidades')}
              >
                Regularizar
              </button>
            </div>
          </div>

          <div className="attention-card info">
            <div className="attention-icon">📚</div>
            <div className="attention-content">
              <h3>Total de Notebooks</h3>
              <p className="attention-number">{dashboard.totalNotebooks}</p>
              <p className="attention-description">Computadores registrados no sistema</p>
              <button 
                className="btn btn-small"
                onClick={() => navigate('/inventario/equipamentos')}
              >
                Consultar
              </button>
            </div>
          </div>
        </div>

        <div className="quick-access">
          <h2>Acessos rápidos</h2>
          <div className="quick-access-grid">
            <button 
              className="quick-btn"
              onClick={() => navigate('/inventario/responsabilidades')}
            >
              <span className="icon">👤</span>
              <span>Quem está com quê</span>
            </button>
            <button 
              className="quick-btn"
              onClick={() => navigate('/inventario/equipamentos')}
            >
              <span className="icon">🏪</span>
              <span>O que a instituição possui</span>
            </button>
            <button 
              className="quick-btn"
              onClick={() => navigate('/inventario/compras')}
            >
              <span className="icon">🛒</span>
              <span>Compras e solicitações</span>
            </button>
            <button 
              className="quick-btn"
              onClick={() => navigate('/inventario/responsabilidades')}
            >
              <span className="icon">📋</span>
              <span>Registrar entrega</span>
            </button>
          </div>
        </div>
      </div>
    </InventoryLayout>
  );
}
