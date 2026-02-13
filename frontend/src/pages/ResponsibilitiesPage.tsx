import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import InventoryLayout from '../components/InventoryLayout';
import { ExcelExportService } from '../services/excelExportService';
import '../styles/ResponsibilitiesPage.css';
import '../styles/InventoryButtons.css';

interface Equipment {
  id: string;
  term_id: string;
  internal_code: string;
  type: string;
  brand: string;
  model: string;
  responsible_name: string;
  responsible_id: string;
  department: string;
  issued_date: string;
  current_status: string;
  term_status: string;
}

export default function ResponsibilitiesPage() {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchResponsibilities();
  }, []);

  const fetchResponsibilities = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('internal_token');
      const response = await fetch('/api/inventory/responsibilities', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar responsabilidades');
      }

      const data = await response.json();
      setEquipments(data.responsibilities || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: any = {
      in_use: { icon: '🔵', text: 'Em Uso', class: 'status-in-use' },
      in_stock: { icon: '🟢', text: 'Em Estoque', class: 'status-available' },
      in_maintenance: { icon: '🟡', text: 'Manutenção', class: 'status-maintenance' }
    };
    return badges[status] || { icon: '⚪', text: status, class: 'status-unknown' };
  };

  const stats = {
    total: equipments.length,
    unique_people: new Set(equipments.map(eq => eq.responsible_name)).size,
    departments: new Set(equipments.map(eq => eq.department)).size
  };

  const filteredEquipments = filterDepartment === 'all' 
    ? equipments 
    : equipments.filter(eq => eq.department === filterDepartment);

  const uniqueDepartments = Array.from(new Set(equipments.map(eq => eq.department))).filter(Boolean);

  if (loading) {
    return (
      <InventoryLayout>
        <div className="responsibilities-page">
          <div className="loading">Carregando responsabilidades...</div>
        </div>
      </InventoryLayout>
    );
  }

  return (
    <InventoryLayout>
      <div className="responsibilities-page">
        <div className="page-header">
          <div>
            <h1>👤 Responsabilidades</h1>
            <p>Equipamentos em posse de colaboradores</p>
          </div>
          <div className="header-actions">
            <button
              className="btn btn-outline"
              onClick={() => {
                const exportData = equipments.map(eq => ({
                  responsible_name: eq.responsible_name || 'Sem responsável',
                  department: eq.department || '-',
                  equipment_type: eq.type,
                  brand: eq.brand,
                  model: eq.model,
                  internal_code: eq.internal_code,
                  issued_date: eq.issued_date,
                  current_status: eq.current_status
                }));
                ExcelExportService.exportToExcel(
                  exportData,
                  [
                    { header: 'Responsável', field: 'responsible_name', width: 25 },
                    { header: 'Setor', field: 'department', width: 20 },
                    { header: 'Tipo', field: 'equipment_type', width: 15 },
                    { header: 'Marca', field: 'brand', width: 15 },
                    { header: 'Modelo', field: 'model', width: 20 },
                    { header: 'Código', field: 'internal_code', width: 15 },
                    { header: 'Desde', field: 'issued_date', width: 15, format: (v) => v ? new Date(v).toLocaleDateString('pt-BR') : '-' },
                    { header: 'Status', field: 'current_status', width: 15 }
                  ],
                  'responsabilidades',
                  'Responsabilidades'
                );
              }}
              disabled={equipments.length === 0}
              title="Exportar lista para Excel"
            >
              <span className="btn-icon">📊</span> Exportar Excel
            </button>
            <button
              className="btn btn-deliver"
              onClick={() => navigate('/inventario/equipamentos/entregar')}
              title="Entregar equipamento a colaborador"
            >
              <span className="btn-icon">📤</span> Entregar Equipamento
            </button>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Equipamentos</div>
          </div>
          <div className="stat-card stat-in-use">
            <div className="stat-icon">👥</div>
            <div className="stat-value">{stats.unique_people}</div>
            <div className="stat-label">Colaboradores</div>
          </div>
          <div className="stat-card stat-maintenance">
            <div className="stat-icon">🏢</div>
            <div className="stat-value">{stats.departments}</div>
            <div className="stat-label">Setores</div>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-bar">
          <div className="filter-group">
            <label>Setor:</label>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
            >
              <option value="all">Todos</option>
              {uniqueDepartments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Responsibilities Table */}
        <div className="responsibilities-table">
          <table>
            <thead>
              <tr>
                <th>Responsável</th>
                <th>Setor</th>
                <th>Equipamento</th>
                <th>Código</th>
                <th>Desde</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredEquipments.map((eq) => {
                const status = getStatusBadge(eq.current_status);
                
                return (
                  <tr key={eq.term_id || `${eq.id}-${eq.internal_code}`}>
                    <td>
                      <div className="person-info">
                        <div className="person-avatar">
                          {eq.responsible_name?.charAt(0).toUpperCase()}
                        </div>
                        <strong>{eq.responsible_name || 'Sem responsável'}</strong>
                      </div>
                    </td>
                    <td>
                      <span className="department-badge">
                        {eq.department || '-'}
                      </span>
                    </td>
                    <td>
                      <div>
                        <strong>{eq.type}</strong>
                        <br />
                        <small>{eq.brand} {eq.model}</small>
                      </div>
                    </td>
                    <td>
                      <strong>{eq.internal_code}</strong>
                    </td>
                    <td>
                      {eq.issued_date ? new Date(eq.issued_date).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td>
                      <span className={`status-badge ${status.class}`}>
                        {status.icon} {status.text}
                      </span>
                    </td>
                    <td>
                      <div className="btn-group">
                        <button
                          className="btn btn-sm btn-view"
                          onClick={() => navigate(`/inventario/equipamento/${eq.id}`)}
                          title="Ver detalhes"
                        >
                          <span className="btn-icon">�</span> Detalhes
                        </button>
                        <button
                          className="btn btn-sm btn-move"
                          onClick={() => navigate(`/inventario/equipamento/${eq.id}/movimentar`)}
                          title="Transferir equipamento"
                        >
                          <span className="btn-icon">🔄</span> Transferir
                        </button>
                        <button
                          className="btn btn-sm btn-return"
                          onClick={() => navigate(`/inventario/equipamentos/devolver?equipment=${eq.id}`)}
                          title="Devolver equipamento"
                        >
                          <span className="btn-icon">📥</span> Devolver
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredEquipments.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>Nenhuma responsabilidade encontrada</h3>
            <p>Não há equipamentos em uso no momento.</p>
          </div>
        )}
      </div>
    </InventoryLayout>
  );
}
