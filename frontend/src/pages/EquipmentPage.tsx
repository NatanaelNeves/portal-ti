import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import InventoryLayout from '../components/InventoryLayout';
import StatusBadge from '../components/StatusBadge';
import ActionButtonGroup, { ActionBtn } from '../components/ActionButtonGroup';
import { ExcelExportService } from '../services/excelExportService';
import '../styles/EquipmentPage.css';
import '../styles/InventoryButtons.css';
import { BACKEND_URL } from '../services/api';
import { INSTITUTION_UNITS } from '../utils/institutionOptions';

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

const IcoExcel = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>
  </svg>
);
const IcoPlus = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IcoEye = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);
const IcoDeliver = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);
const IcoTransfer = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
    <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
  </svg>
);
const IcoReturn = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

export default function EquipmentPage() {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterUnit, setFilterUnit] = useState('all');
  const navigate = useNavigate();

  const isAvailableStatus = (status: string) => status === 'available' || status === 'in_stock';

  useEffect(() => {
    fetchEquipments();
  }, [filterStatus, filterUnit]);

  const fetchEquipments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('internal_token');

      const response = await fetch(`${BACKEND_URL}/api/inventory/equipment`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Erro ao carregar equipamentos');

      const data = await response.json();
      let allEquipments = data.equipment || [];

      if (filterStatus !== 'all') {
        if (filterStatus === 'available') {
          allEquipments = allEquipments.filter((eq: Equipment) => isAvailableStatus(eq.current_status));
        } else if (filterStatus === 'in_maintenance') {
          allEquipments = allEquipments.filter((eq: Equipment) => eq.current_status === 'in_maintenance' || eq.current_status === 'maintenance');
        } else {
          allEquipments = allEquipments.filter((eq: Equipment) => eq.current_status === filterStatus);
        }
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

  const stats = {
    total: equipments.length,
    available: equipments.filter(eq => isAvailableStatus(eq.current_status)).length,
    in_use: equipments.filter(eq => eq.current_status === 'in_use').length,
    maintenance: equipments.filter(eq => eq.current_status === 'in_maintenance' || eq.current_status === 'maintenance').length
  };

  if (loading) {
    return (
      <InventoryLayout>
        <div className="equipment-page">
          <div className="eq-loading">Carregando equipamentos...</div>
        </div>
      </InventoryLayout>
    );
  }

  return (
    <InventoryLayout>
      <div className="equipment-page">
        <div className="eq-page-header">
          <div>
            <h1 className="eq-title">Todos os Equipamentos</h1>
            <p className="eq-subtitle">Inventário completo de notebooks e periféricos</p>
          </div>
          <div className="eq-header-actions">
            <button
              className="eq-btn eq-btn-outline"
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
              <IcoExcel /> Exportar Excel
            </button>
            <button
              className="eq-btn eq-btn-primary"
              onClick={() => navigate('/inventario/equipamentos/novo')}
              title="Cadastrar novo equipamento"
            >
              <IcoPlus /> Cadastrar Equipamento
            </button>
          </div>
        </div>

        {error && <div className="eq-alert-error">{error}</div>}

        {/* Stats */}
        <div className="eq-stats-grid">
          <div className="eq-stat">
            <div className="eq-stat-value">{stats.total}</div>
            <div className="eq-stat-label">Total</div>
          </div>
          <div className="eq-stat eq-stat-available">
            <div className="eq-stat-value">{stats.available}</div>
            <div className="eq-stat-label">Disponíveis</div>
          </div>
          <div className="eq-stat eq-stat-inuse">
            <div className="eq-stat-value">{stats.in_use}</div>
            <div className="eq-stat-label">Em Uso</div>
          </div>
          <div className="eq-stat eq-stat-maint">
            <div className="eq-stat-value">{stats.maintenance}</div>
            <div className="eq-stat-label">Manutenção</div>
          </div>
        </div>

        {/* Filters */}
        <div className="eq-filters">
          <div className="eq-filter-group">
            <label>Status:</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">Todos</option>
              <option value="available">Disponível</option>
              <option value="in_use">Em Uso</option>
              <option value="in_maintenance">Manutenção</option>
            </select>
          </div>
          <div className="eq-filter-group">
            <label>Unidade:</label>
            <select value={filterUnit} onChange={(e) => setFilterUnit(e.target.value)}>
              <option value="all">Todas</option>
              {INSTITUTION_UNITS.map((unit) => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="eq-table-wrap">
          <table className="eq-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Tipo</th>
                <th>Marca / Modelo</th>
                <th>Status</th>
                <th>Responsável</th>
                <th>Unidade</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {equipments.map((equipment, index) => {
                const actions: ActionBtn[] = [
                  {
                    label: 'Ver Detalhes',
                    icon: <IcoEye />,
                    onClick: () => navigate(`/inventario/equipamento/${equipment.id}`),
                    variant: 'primary',
                  },
                  ...(isAvailableStatus(equipment.current_status) ? [{
                    label: 'Entregar',
                    icon: <IcoDeliver />,
                    onClick: () => navigate(`/inventario/equipamentos/entregar?equipment=${equipment.id}`),
                    variant: 'success' as const,
                  }] : []),
                  ...(equipment.current_status === 'in_use' ? [
                    {
                      label: 'Transferir',
                      icon: <IcoTransfer />,
                      onClick: () => navigate(`/inventario/equipamento/${equipment.id}/movimentar`),
                      variant: 'warning' as const,
                    },
                    {
                      label: 'Devolver',
                      icon: <IcoReturn />,
                      onClick: () => navigate(`/inventario/equipamentos/devolver?equipment=${equipment.id}`),
                      variant: 'danger' as const,
                    },
                  ] : []),
                ];

                return (
                  <tr key={`${equipment.id}-${index}`}>
                    <td>
                      <code className="eq-code">{equipment.internal_code}</code>
                      <div className="eq-sn">SN: {equipment.serial_number}</div>
                    </td>
                    <td>
                      <span className="eq-type-badge">{equipment.type}</span>
                    </td>
                    <td>
                      <span className="eq-brand">{equipment.brand}</span>
                      <div className="eq-model">{equipment.model}</div>
                    </td>
                    <td>
                      <StatusBadge status={equipment.current_status} />
                    </td>
                    <td>
                      {equipment.current_responsible_name
                        ? <span className="eq-resp">{equipment.current_responsible_name}</span>
                        : <span className="eq-empty">—</span>
                      }
                    </td>
                    <td className="eq-unit">{equipment.current_unit || '—'}</td>
                    <td>
                      <ActionButtonGroup actions={actions} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {equipments.length === 0 && (
          <div className="eq-empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
            <h3>Nenhum equipamento encontrado</h3>
            <p>Tente ajustar os filtros ou cadastre um novo equipamento.</p>
          </div>
        )}
      </div>
    </InventoryLayout>
  );
}
