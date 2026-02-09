import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import InventoryLayout from '../components/InventoryLayout';
import '../styles/EquipmentPage.css';

interface Equipment {
  id: string;
  internal_code: string;
  type: string;
  brand: string;
  model: string;
  current_status: string;
  current_location: string;
  serial_number: string;
  created_at: string;
}

export default function EquipmentPage() {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchEquipments();
  }, [statusFilter]);

  const fetchEquipments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('internal_token');
      
      // Buscar notebooks e periféricos separadamente
      const [notebooksRes, peripheralsRes] = await Promise.all([
        fetch('/api/inventory/notebooks', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/inventory/peripherals', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (!notebooksRes.ok || !peripheralsRes.ok) {
        throw new Error('Erro ao carregar equipamentos');
      }

      const notebooksData = await notebooksRes.json();
      const peripheralsData = await peripheralsRes.json();
      
      // Combinar e formatar para o formato esperado
      const allEquipments = [
        ...(notebooksData.notebooks || []).map((nb: any) => ({
          id: nb.id,
          internal_code: nb.internal_code,
          type: 'Notebook',
          brand: nb.brand,
          model: nb.model,
          current_unit: nb.current_unit,
          current_status: nb.current_status,
          current_responsible_name: nb.current_responsible_name
        })),
        ...(peripheralsData.peripherals || []).map((per: any) => ({
          id: per.id,
          internal_code: per.internal_code,
          type: per.type,
          brand: per.brand,
          model: per.model,
          current_unit: per.current_unit,
          current_status: per.current_status
        }))
      ];
      
      // Aplicar filtro de status se houver
      const filtered = statusFilter 
        ? allEquipments.filter(eq => eq.current_status === statusFilter)
        : allEquipments;
      
      setEquipments(filtered);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <InventoryLayout><div className="equipment-page"><div className="loading">Carregando...</div></div></InventoryLayout>;
  }

  return (
    <InventoryLayout>
      <div className="equipment-page">
        <div className="page-header">
          <h1>🖥️ Equipamentos</h1>
          <p>Inventário geral da instituição</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="filters">
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">Todos os status</option>
            <option value="in_use">Em uso</option>
            <option value="in_stock">Em estoque</option>
            <option value="in_maintenance">Manutenção</option>
          </select>
        </div>

        <div className="equipment-container">
          <table className="equipment-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Tipo</th>
                <th>Marca / Modelo</th>
                <th>Status</th>
                <th>Local</th>
                <th>Data de entrada</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {equipments.map((eq) => (
                <tr key={eq.id} className={`status-${eq.current_status}`}>
                  <td className="code-cell"><strong>{eq.internal_code}</strong></td>
                  <td>{eq.type}</td>
                  <td>{eq.brand} {eq.model}</td>
                  <td>
                    <span className={`status-badge status-${eq.current_status}`}>
                      {eq.current_status === 'in_use' && '✓ Em uso'}
                      {eq.current_status === 'in_stock' && '📦 Em estoque'}
                      {eq.current_status === 'in_maintenance' && '🔧 Manutenção'}
                    </span>
                  </td>
                  <td>{eq.current_location || '-'}</td>
                  <td>{eq.created_at ? new Date(eq.created_at).toLocaleDateString('pt-BR') : '-'}</td>
                  <td>
                    <button 
                      className="btn-action"
                      onClick={() => navigate(`/inventario/equipamento/${eq.id}`)}
                    >
                      Ver histórico
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="quick-actions">
          <button className="btn btn-primary" onClick={() => navigate('/inventario/equipamentos/novo')}>
            + Novo equipamento
          </button>
        </div>
      </div>
    </InventoryLayout>
  );
}
