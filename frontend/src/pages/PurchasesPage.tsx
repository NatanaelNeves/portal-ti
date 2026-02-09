import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import InventoryLayout from '../components/InventoryLayout';
import '../styles/PurchasesPage.css';

interface Purchase {
  id: string;
  item_description: string;
  quantity: number;
  status: string;
  estimated_value: number;
  actual_value: number;
  expected_delivery_date: string;
  supplier: string;
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchPurchases();
  }, [statusFilter]);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('internal_token');
      const params = statusFilter ? `?status=${statusFilter}` : '';
      
      const response = await fetch(`/api/inventory/requisitions${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar compras');
      }

      const data = await response.json();
      setPurchases(data.purchases || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      pending: '⏳ Pendente',
      approved: '✓ Aprovado',
      purchased: '📦 Comprado',
      received: '📥 Recebido',
      completed: '✅ Concluído',
    };
    return labels[status] || status;
  };

  if (loading) {
    return <InventoryLayout><div className="purchases-page"><div className="loading">Carregando...</div></div></InventoryLayout>;
  }

  return (
    <InventoryLayout>
      <div className="purchases-page">
        <div className="page-header">
          <h1>🛒 Compras & Solicitações</h1>
          <p>Rastreamento de pedidos em andamento</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="filters">
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">Todos os status</option>
            <option value="pending">Pendente</option>
            <option value="approved">Aprovado</option>
            <option value="purchased">Comprado</option>
            <option value="received">Recebido</option>
          </select>
        </div>

        <div className="purchases-container">
          <table className="purchases-table">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Quantidade</th>
                <th>Valor estimado</th>
                <th>Fornecedor</th>
                <th>Previsão</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((purchase) => (
                <tr key={purchase.id} className={`status-${purchase.status}`}>
                  <td><strong>{purchase.item_description}</strong></td>
                  <td>{purchase.quantity}x</td>
                  <td>R$ {purchase.estimated_value?.toFixed(2) || '-'}</td>
                  <td>{purchase.supplier || '-'}</td>
                  <td>
                    {purchase.expected_delivery_date 
                      ? new Date(purchase.expected_delivery_date).toLocaleDateString('pt-BR')
                      : '-'
                    }
                  </td>
                  <td>
                    <span className={`status-badge status-${purchase.status}`}>
                      {getStatusLabel(purchase.status)}
                    </span>
                  </td>
                  {/* <td>
                    <button 
                      className="btn-action"
                      onClick={() => navigate(`/inventario/compra/${purchase.id}`)}
                    >
                      Detalhes
                    </button>
                  </td> */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="quick-actions">
          <button className="btn btn-primary" onClick={() => navigate('/inventario/compras/nova')}>
            + Nova Solicitação
          </button>
        </div>
      </div>
    </InventoryLayout>
  );
}
