import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import InventoryLayout from '../components/InventoryLayout';
import StatusBadge from '../components/StatusBadge';
import ActionButtonGroup, { ActionBtn } from '../components/ActionButtonGroup';
import '../styles/PeripheralsPage.css';
import '../styles/InventoryButtons.css';
import { BACKEND_URL } from '../services/api';
import { INSTITUTION_UNITS } from '../utils/institutionOptions';

interface Peripheral {
  id: string;
  internal_code: string;
  type: string;
  brand: string;
  model: string;
  description: string;
  serial_number: string;
  current_status: string;
  physical_condition: string;
  current_unit: string;
  responsible_name?: string;
  in_use_since?: string;
}

interface TypeStats {
  total: number;
  available: number;
  in_use: number;
  maintenance: number;
}

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

const getTypeIcon = (type: string) => {
  const t = type.toLowerCase();
  if (t.includes('mouse')) return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="3" width="12" height="18" rx="6"/><line x1="12" y1="7" x2="12" y2="11"/>
    </svg>
  );
  if (t.includes('teclado') || t.includes('keyboard')) return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2"/>
      <line x1="6" y1="10" x2="6.01" y2="10"/><line x1="10" y1="10" x2="10.01" y2="10"/>
      <line x1="14" y1="10" x2="14.01" y2="10"/><line x1="18" y1="10" x2="18.01" y2="10"/>
      <line x1="6" y1="14" x2="18" y2="14"/>
    </svg>
  );
  if (t.includes('monitor')) return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  );
  if (t.includes('carregador') || t.includes('charger')) return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="13" y1="2" x2="7" y2="14"/><path d="M7 9h10l-4 13"/>
    </svg>
  );
  if (t.includes('fone') || t.includes('headset') || t.includes('webcam')) return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
    </svg>
  );
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    </svg>
  );
};

export default function PeripheralsPage() {
  const [peripherals, setPeripherals] = useState<Peripheral[]>([]);
  const [byType, setByType] = useState<Record<string, TypeStats>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterUnit, setFilterUnit] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchPeripherals();
  }, [filterStatus, filterType, filterUnit]);

  const fetchPeripherals = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('internal_token');

      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterType !== 'all') params.append('type', filterType);
      if (filterUnit !== 'all') params.append('unit', filterUnit);

      const response = await fetch(`${BACKEND_URL}/api/inventory/peripherals?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Erro ao carregar periféricos');

      const data = await response.json();
      setPeripherals(data.peripherals || []);
      setByType(data.byType || {});
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: peripherals.length,
    available: peripherals.filter(p => p.current_status === 'available' || p.current_status === 'in_stock').length,
    in_use: peripherals.filter(p => p.current_status === 'in_use').length,
    maintenance: peripherals.filter(p => p.current_status === 'maintenance' || p.current_status === 'in_maintenance').length
  };

  const uniqueTypes = Array.from(new Set(peripherals.map(p => p.type))).sort();

  if (loading) {
    return (
      <InventoryLayout>
        <div className="peripherals-page">
          <div className="per-loading">Carregando periféricos...</div>
        </div>
      </InventoryLayout>
    );
  }

  return (
    <InventoryLayout>
      <div className="peripherals-page">
        <div className="per-header">
          <div>
            <h1 className="per-title">Periféricos</h1>
            <p className="per-subtitle">Mouses, teclados, monitores, carregadores e outros</p>
          </div>
          <div className="per-header-actions">
            <button
              className="per-btn per-btn-primary"
              onClick={() => navigate('/inventario/equipamentos/novo')}
              title="Cadastrar novo periférico"
            >
              <IcoPlus /> Cadastrar Periférico
            </button>
          </div>
        </div>

        {error && <div className="per-alert-error">{error}</div>}

        {/* Stats */}
        <div className="per-stats-grid">
          <div className="per-stat">
            <div className="per-stat-value">{stats.total}</div>
            <div className="per-stat-label">Total</div>
          </div>
          <div className="per-stat per-stat-available">
            <div className="per-stat-value">{stats.available}</div>
            <div className="per-stat-label">Disponíveis</div>
          </div>
          <div className="per-stat per-stat-inuse">
            <div className="per-stat-value">{stats.in_use}</div>
            <div className="per-stat-label">Em Uso</div>
          </div>
          <div className="per-stat per-stat-maint">
            <div className="per-stat-value">{stats.maintenance}</div>
            <div className="per-stat-label">Manutenção</div>
          </div>
        </div>

        {/* Type Summary */}
        {Object.keys(byType).length > 0 && (
          <div className="per-type-summary">
            <h3 className="per-section-title">Resumo por Tipo</h3>
            <div className="per-type-cards">
              {Object.entries(byType).map(([type, ts]) => (
                <div key={type} className="per-type-card">
                  <div className="per-type-header">
                    <span className="per-type-icon-wrap">{getTypeIcon(type)}</span>
                    <span className="per-type-name">{type}</span>
                  </div>
                  <div className="per-type-stats">
                    <span>Total: <strong>{ts.total}</strong></span>
                    <span>Livres: <strong>{ts.available}</strong></span>
                    <span>Em uso: <strong>{ts.in_use}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="per-filters">
          <div className="per-filter-group">
            <label>Tipo:</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="all">Todos</option>
              {uniqueTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div className="per-filter-group">
            <label>Status:</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">Todos</option>
              <option value="available">Disponíveis</option>
              <option value="in_use">Em Uso</option>
              <option value="maintenance">Manutenção</option>
            </select>
          </div>
          <div className="per-filter-group">
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
        <div className="per-table-wrap">
          <table className="per-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Tipo</th>
                <th>Marca / Modelo</th>
                <th>Descrição</th>
                <th>Status</th>
                <th>Responsável</th>
                <th>Unidade</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {peripherals.map((peripheral, index) => {
                const isAvailable = peripheral.current_status === 'available' || peripheral.current_status === 'in_stock';

                const actions: ActionBtn[] = [
                  {
                    label: 'Ver Detalhes',
                    icon: <IcoEye />,
                    onClick: () => navigate(`/inventario/equipamento/${peripheral.id}`),
                    variant: 'primary',
                  },
                  ...(isAvailable ? [{
                    label: 'Entregar',
                    icon: <IcoDeliver />,
                    onClick: () => navigate('/inventario/equipamentos/entregar'),
                    variant: 'success' as const,
                  }] : []),
                  ...(peripheral.current_status === 'in_use' ? [
                    {
                      label: 'Transferir',
                      icon: <IcoTransfer />,
                      onClick: () => navigate(`/inventario/equipamento/${peripheral.id}/movimentar`),
                      variant: 'warning' as const,
                    },
                    {
                      label: 'Devolver',
                      icon: <IcoReturn />,
                      onClick: () => navigate(`/inventario/equipamentos/devolver?equipment=${peripheral.id}`),
                      variant: 'danger' as const,
                    },
                  ] : []),
                ];

                return (
                  <tr key={`${peripheral.id}-${index}`}>
                    <td><code className="per-code">{peripheral.internal_code}</code></td>
                    <td>
                      <span className="per-type-badge">
                        <span className="per-type-icon">{getTypeIcon(peripheral.type)}</span>
                        {peripheral.type}
                      </span>
                    </td>
                    <td>
                      <span className="per-brand">{peripheral.brand}</span>
                      <div className="per-model">{peripheral.model}</div>
                    </td>
                    <td className="per-desc">{peripheral.description || '—'}</td>
                    <td><StatusBadge status={peripheral.current_status} /></td>
                    <td>
                      {peripheral.responsible_name ? (
                        <div>
                          <span className="per-resp">{peripheral.responsible_name}</span>
                          {peripheral.in_use_since && (
                            <div className="per-since">
                              Desde {new Date(peripheral.in_use_since).toLocaleDateString('pt-BR')}
                            </div>
                          )}
                        </div>
                      ) : <span className="per-empty">—</span>}
                    </td>
                    <td className="per-unit">{peripheral.current_unit || '—'}</td>
                    <td><ActionButtonGroup actions={actions} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {peripherals.length === 0 && (
            <div className="per-empty-state">
              <p>Nenhum periférico encontrado com os filtros selecionados.</p>
            </div>
          )}
        </div>
      </div>
    </InventoryLayout>
  );
}
