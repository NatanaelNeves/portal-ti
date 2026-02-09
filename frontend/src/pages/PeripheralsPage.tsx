import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import InventoryLayout from '../components/InventoryLayout';
import '../styles/PeripheralsPage.css';

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

      const response = await fetch(`/api/inventory/peripherals?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar periféricos');
      }

      const data = await response.json();
      setPeripherals(data.peripherals || []);
      setByType(data.byType || {});
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: any = {
      available: { icon: '🟢', text: 'Disponível', class: 'status-available' },
      in_use: { icon: '🔵', text: 'Em Uso', class: 'status-in-use' },
      maintenance: { icon: '🟡', text: 'Manutenção', class: 'status-maintenance' },
      retired: { icon: '🔴', text: 'Baixado', class: 'status-retired' }
    };
    return badges[status] || badges.available;
  };

  const getTypeIcon = (type: string) => {
    const typeLower = type.toLowerCase();
    if (typeLower.includes('mouse')) return '🖱️';
    if (typeLower.includes('teclado') || typeLower.includes('keyboard')) return '⌨️';
    if (typeLower.includes('monitor')) return '🖥️';
    if (typeLower.includes('carregador') || typeLower.includes('charger')) return '🔌';
    if (typeLower.includes('webcam')) return '📷';
    if (typeLower.includes('fone') || typeLower.includes('headset')) return '🎧';
    return '📦';
  };

  const stats = {
    total: peripherals.length,
    available: peripherals.filter(p => p.current_status === 'available').length,
    in_use: peripherals.filter(p => p.current_status === 'in_use').length,
    maintenance: peripherals.filter(p => p.current_status === 'maintenance').length
  };

  const uniqueTypes = Array.from(new Set(peripherals.map(p => p.type))).sort();

  if (loading) {
    return (
      <InventoryLayout>
        <div className="peripherals-page">
          <div className="loading">Carregando periféricos...</div>
        </div>
      </InventoryLayout>
    );
  }

  return (
    <InventoryLayout>
      <div className="peripherals-page">
        <div className="page-header">
          <div>
            <h1>🖱️ Periféricos</h1>
            <p>Mouses, teclados, monitores, carregadores e outros</p>
          </div>
          <div className="header-actions">
            <button
              className="btn btn-primary"
              onClick={() => navigate('/inventario/equipamentos/novo')}
            >
              ➕ Cadastrar Periférico
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/inventario/perifericos/lote')}
            >
              📦 Cadastro em Lote
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
            <div className="stat-value">{stats.available}</div>
            <div className="stat-label">Disponíveis</div>
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

        {/* Type Summary */}
        {Object.keys(byType).length > 0 && (
          <div className="type-summary">
            <h3>Resumo por Tipo</h3>
            <div className="type-cards">
              {Object.entries(byType).map(([type, stats]) => (
                <div key={type} className="type-card">
                  <div className="type-header">
                    <span className="type-icon">{getTypeIcon(type)}</span>
                    <span className="type-name">{type}</span>
                  </div>
                  <div className="type-stats">
                    <div>Total: <strong>{stats.total}</strong></div>
                    <div>Livres: <strong>{stats.available}</strong></div>
                    <div>Em uso: <strong>{stats.in_use}</strong></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="filters-bar">
          <div className="filter-group">
            <label>Tipo:</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">Todos</option>
              {uniqueTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Todos</option>
              <option value="available">Disponíveis</option>
              <option value="in_use">Em Uso</option>
              <option value="maintenance">Manutenção</option>
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

        {/* Peripherals Table */}
        <div className="peripherals-table">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Tipo</th>
                <th>Marca/Modelo</th>
                <th>Descrição</th>
                <th>Status</th>
                <th>Responsável</th>
                <th>Unidade</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {peripherals.map((peripheral) => {
                const status = getStatusBadge(peripheral.current_status);
                const typeIcon = getTypeIcon(peripheral.type);

                return (
                  <tr key={peripheral.id}>
                    <td>
                      <strong>{peripheral.internal_code}</strong>
                    </td>
                    <td>
                      <span className="type-badge">
                        {typeIcon} {peripheral.type}
                      </span>
                    </td>
                    <td>
                      <strong>{peripheral.brand}</strong>
                      <br />
                      <small>{peripheral.model}</small>
                    </td>
                    <td>
                      <small>{peripheral.description || '-'}</small>
                    </td>
                    <td>
                      <span className={`badge ${status.class}`}>
                        {status.icon} {status.text}
                      </span>
                    </td>
                    <td>
                      {peripheral.responsible_name ? (
                        <div>
                          <strong>{peripheral.responsible_name}</strong>
                          {peripheral.in_use_since && (
                            <div>
                              <small>
                                Desde {new Date(peripheral.in_use_since).toLocaleDateString('pt-BR')}
                              </small>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>{peripheral.current_unit || '-'}</td>
                    <td className="actions">
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => navigate(`/inventario/equipamento/${peripheral.id}`)}
                      >
                        📋
                      </button>
                      {peripheral.current_status === 'available' && (
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => navigate(`/inventario/equipamentos/entregar?equipment=${peripheral.id}`)}
                        >
                          📤 Entregar
                        </button>
                      )}
                      {peripheral.current_status === 'in_use' && (
                        <button
                          className="btn btn-sm btn-warning"
                          onClick={() => navigate(`/inventario/equipamentos/devolver?equipment=${peripheral.id}`)}
                        >
                          ↩️
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {peripherals.length === 0 && (
            <div className="empty-state">
              <p>Nenhum periférico encontrado com os filtros selecionados.</p>
            </div>
          )}
        </div>
      </div>
    </InventoryLayout>
  );
}
