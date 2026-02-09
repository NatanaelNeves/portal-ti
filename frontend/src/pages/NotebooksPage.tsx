import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import InventoryLayout from '../components/InventoryLayout';
import { ExcelExportService } from '../services/excelExportService';
import '../styles/NotebooksPage.css';

interface Notebook {
  id: string;
  internal_code: string;
  brand: string;
  model: string;
  processor: string;
  memory_ram: string;
  storage: string;
  screen_size: string;
  operating_system: string;
  serial_number: string;
  current_status: string;
  physical_condition: string;
  current_unit: string;
  responsible_name?: string;
  in_use_since?: string;
}

export default function NotebooksPage() {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterUnit, setFilterUnit] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotebooks();
  }, [filterStatus, filterUnit]);

  const fetchNotebooks = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('internal_token');
      
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterUnit !== 'all') params.append('unit', filterUnit);

      const response = await fetch(`/api/inventory/notebooks?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar notebooks');
      }

      const data = await response.json();
      setNotebooks(data.notebooks || []);
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

  const getConditionBadge = (condition: string) => {
    const badges: any = {
      new: { icon: '⭐', text: 'Novo' },
      good: { icon: '✓', text: 'Bom' },
      regular: { icon: '~', text: 'Regular' },
      bad: { icon: '✗', text: 'Ruim' }
    };
    return badges[condition] || badges.good;
  };

  const stats = {
    total: notebooks.length,
    available: notebooks.filter(n => n.current_status === 'available').length,
    in_use: notebooks.filter(n => n.current_status === 'in_use').length,
    maintenance: notebooks.filter(n => n.current_status === 'maintenance').length
  };

  if (loading) {
    return (
      <InventoryLayout>
        <div className="notebooks-page">
          <div className="loading">Carregando notebooks...</div>
        </div>
      </InventoryLayout>
    );
  }

  return (
    <InventoryLayout>
      <div className="notebooks-page">
        <div className="page-header">
          <div>
            <h1>💻 Notebooks</h1>
            <p>Gerenciamento de notebooks e laptops</p>
          </div>
          <div className="header-actions">
            <button
              className="btn btn-secondary"
              onClick={() => ExcelExportService.exportNotebooks(notebooks)}
              disabled={notebooks.length === 0}
            >
              📊 Exportar Excel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/inventario/equipamentos/novo')}
            >
              ➕ Cadastrar Notebook
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

        {/* Filters */}
        <div className="filters-bar">
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

        {/* Notebooks Table */}
        <div className="notebooks-table">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Marca/Modelo</th>
                <th>Especificações</th>
                <th>Status</th>
                <th>Responsável</th>
                <th>Unidade</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {notebooks.map((notebook) => {
                const status = getStatusBadge(notebook.current_status);
                const condition = getConditionBadge(notebook.physical_condition);

                return (
                  <tr key={notebook.id}>
                    <td>
                      <strong>{notebook.internal_code}</strong>
                      <br />
                      <small>SN: {notebook.serial_number}</small>
                    </td>
                    <td>
                      <strong>{notebook.brand} {notebook.model}</strong>
                      <br />
                      <small>{condition.icon} {condition.text}</small>
                    </td>
                    <td>
                      <div className="specs">
                        {notebook.processor && <div>⚙️ {notebook.processor}</div>}
                        {notebook.memory_ram && <div>🧠 {notebook.memory_ram}</div>}
                        {notebook.storage && <div>💾 {notebook.storage}</div>}
                        {notebook.screen_size && <div>📺 {notebook.screen_size}</div>}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${status.class}`}>
                        {status.icon} {status.text}
                      </span>
                    </td>
                    <td>
                      {notebook.responsible_name ? (
                        <div>
                          <strong>{notebook.responsible_name}</strong>
                          {notebook.in_use_since && (
                            <div>
                              <small>
                                Desde {new Date(notebook.in_use_since).toLocaleDateString('pt-BR')}
                              </small>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>{notebook.current_unit || '-'}</td>
                    <td className="actions">
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => navigate(`/inventario/equipamento/${notebook.id}`)}
                      >
                        📋 Detalhes
                      </button>
                      {notebook.current_status === 'available' && (
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => navigate(`/inventario/equipamentos/entregar?equipment=${notebook.id}`)}
                        >
                          📤 Entregar
                        </button>
                      )}
                      {notebook.current_status === 'in_use' && (
                        <button
                          className="btn btn-sm btn-warning"
                          onClick={() => navigate(`/inventario/equipamentos/devolver?equipment=${notebook.id}`)}
                        >
                          ↩️ Devolver
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {notebooks.length === 0 && (
            <div className="empty-state">
              <p>Nenhum notebook encontrado com os filtros selecionados.</p>
            </div>
          )}
        </div>
      </div>
    </InventoryLayout>
  );
}
