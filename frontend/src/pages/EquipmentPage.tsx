import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import InventoryLayout from '../components/InventoryLayout';
import { ExcelExportService } from '../services/excelExportService';
import '../styles/EquipmentPage.css';
import '../styles/InventoryButtons.css';

interface Equipment {
  id: string;
  internal_code: string;
  type: string;
  brand: string;
  model: string;
  current_status: string;
  current_location: string;
  current_unit: string;
  current_responsible_name?: string;
  serial_number: string;
  created_at: string;
}

export default function EquipmentPage() {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterUnit, setFilterUnit] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchEquipments();
  }, [filterStatus, filterUnit]);

  const fetchEquipments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('internal_token');
      
      const response = await fetch('/api/inventory/equipment', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Erro ao carregar equipamentos');

      const data = await response.json();
      let allEquipments = data.equipment || [];
      
      // Aplicar filtros
      if (filterStatus !== 'all') {
        allEquipments = allEquipments.filter((eq: Equipment) => eq.current_status === filterStatus);
      }
      if (filterUnit !== 'all') {
        allEquipments = allEquipments.filter((eq: Equipment) => eq.current_unit === filterUnit);
      }
      
      setEquipments(allEquipments);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: any = {
      in_stock: { icon: '🟢', text: 'Em Estoque', class: 'status-available' },
      available: { icon: '🟢', text: 'Disponível', class: 'status-available' },
      in_use: { icon: '🔵', text: 'Em Uso', class: 'status-in-use' },
      in_maintenance: { icon: '🟡', text: 'Manutenção', class: 'status-maintenance' },
      maintenance: { icon: '🟡', text: 'Manutenção', class: 'status-maintenance' }
    };
    return badges[status] || { icon: '⚫', text: status, class: 'status-unknown' };
  };

  const stats = {
    total: equipments.length,
    in_stock: equipments.filter(eq => eq.current_status === 'in_stock').length,
    in_use: equipments.filter(eq => eq.current_status === 'in_use').length,
    maintenance: equipments.filter(eq => eq.current_status === 'in_maintenance').length
  };

  if (loading) {
    return (
      <InventoryLayout>
        <div className="equipment-page">
          <div className="loading">Carregando equipamentos...</div>
        </div>
      </InventoryLayout>
    );
  }

  return (
    <InventoryLayout>
      <div className="equipment-page">
        <div className="page-header">
          <div>
            <h1>🖥️ Todos os Equipamentos</h1>
            <p>Inventário completo de notebooks e periféricos</p>
          </div>
          <div className="header-actions">
            <button
              className="btn btn-secondary"
              onClick={() => {
                const exportData = equipments.map(eq => ({
                  internal_code: eq.internal_code,
                  type: eq.type,
                  brand: eq.brand,
                  model: eq.model,
                  serial_number: eq.serial_number,
                  current_status: eq.current_status,
                  current_location: eq.current_location,
                  current_unit: eq.current_unit,
                  current_responsible_name: eq.current_responsible_name || '-'
                }));
                ExcelExportService.exportToExcel(
                  exportData,
                  [
                    { header: 'Código', field: 'internal_code', width: 15 },
                    { header: 'Tipo', field: 'type', width: 15 },
                    { header: 'Marca', field: 'brand', width: 15 },
                    { header: 'Modelo', field: 'model', width: 20 },
                    { header: 'Serial', field: 'serial_number', width: 20 },
                    { header: 'Status', field: 'current_status', width: 15 },
                    { header: 'Localização', field: 'current_location', width: 25 },
                    { header: 'Unidade', field: 'current_unit', width: 20 },
                    { header: 'Responsável', field: 'current_responsible_name', width: 25 }
                  ],
                  'equipamentos',
                  'Todos os Equipamentos'
                );
              }}
              disabled={equipments.length === 0}
              title="Exportar lista para Excel"
            >
              <span className="btn-icon">📊</span> Exportar Excel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/inventario/equipamentos/novo')}
              title="Cadastrar novo equipamento"
            >
              <span className="btn-icon">➕</span> Cadastrar Equipamento
            </button>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total</div>
          </div>
          <div className="stat-card stat-available">
            <div className="stat-icon">🟢</div>
            <div className="stat-value">{stats.in_stock}</div>
            <div className="stat-label">Em Estoque</div>
          </div>
          <div className="stat-card stat-in-use">
            <div className="stat-icon">🔵</div>
            <div className="stat-value">{stats.in_use}</div>
            <div className="stat-label">Em Uso</div>
          </div>
          <div className="stat-card stat-maintenance">
            <div className="stat-icon">🟡</div>
            <div className="stat-value">{stats.maintenance}</div>
            <div className="stat-label">Manutenção</div>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-bar">
          <div className="filter-group">
            <label>Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Todos</option>
              <option value="in_stock">Em Estoque</option>
              <option value="in_use">Em Uso</option>
              <option value="in_maintenance">Manutenção</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Unidade:</label>
            <select
              value={filterUnit}
              onChange={(e) => setFilterUnit(e.target.value)}
            >
              <option value="all">Todas</option>
              <option value="Agapito">Agapito</option>
              <option value="Senador">Senador</option>
              <option value="Caucaia">Caucaia</option>
              <option value="Maracanaú">Maracanaú</option>
              <option value="VP">VP</option>
              <option value="Maranguape">Maranguape</option>
            </select>
          </div>
        </div>

        {/* Equipment Table */}
        <div className="equipment-table">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Tipo</th>
                <th>Marca/Modelo</th>
                <th>Status</th>
                <th>Responsável</th>
                <th>Unidade</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {equipments.map((equipment, index) => {
                const status = getStatusBadge(equipment.current_status);
                
                return (
                  <tr key={`${equipment.id}-${index}`}>
                    <td>
                      <strong>{equipment.internal_code}</strong>
                      <br />
                      <small>SN: {equipment.serial_number}</small>
                    </td>
                    <td>
                      <span className="type-badge">
                        {equipment.type}
                      </span>
                    </td>
                    <td>
                      <strong>{equipment.brand}</strong>
                      <br />
                      <small>{equipment.model}</small>
                    </td>
                    <td>
                      <span className={`status-badge ${status.class}`}>
                        {status.icon} {status.text}
                      </span>
                    </td>
                    <td>
                      {equipment.current_responsible_name ? (
                        <div>
                          <strong>{equipment.current_responsible_name}</strong>
                        </div>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>{equipment.current_unit || '-'}</td>
                    <td>
                      <div className="btn-group">
                        <button
                          className="btn btn-sm btn-view"
                          onClick={() => navigate(`/inventario/equipamento/${equipment.id}`)}
                          title="Ver detalhes"
                        >
                          <span className="btn-icon">📋</span> Detalhes
                        </button>
                        {equipment.current_status === 'in_stock' && (
                          <button
                            className="btn btn-sm btn-deliver"
                            onClick={() => navigate('/inventario/equipamentos/entregar')}
                            title="Entregar equipamento"
                          >
                            <span className="btn-icon">📤</span> Entregar
                          </button>
                        )}
                        {equipment.current_status === 'in_use' && (
                          <>
                            <button
                              className="btn btn-sm btn-move"
                              onClick={() => navigate(`/inventario/equipamento/${equipment.id}/movimentar`)}
                              title="Transferir equipamento"
                            >
                              <span className="btn-icon">🔄</span> Transferir
                            </button>
                            <button
                              className="btn btn-sm btn-return"
                              onClick={() => navigate(`/inventario/equipamentos/devolver?equipment=${equipment.id}`)}
                              title="Devolver equipamento"
                            >
                              <span className="btn-icon">📥</span> Devolver
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {equipments.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <h3>Nenhum equipamento encontrado</h3>
            <p>Tente ajustar os filtros ou cadastre um novo equipamento.</p>
          </div>
        )}
      </div>
    </InventoryLayout>
  );
}
