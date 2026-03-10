import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import InventoryLayout from '../components/InventoryLayout';
import { ExcelExportService } from '../services/excelExportService';
import '../styles/NotebooksPage.css';
import { BACKEND_URL } from '../services/api';

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

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  available:      { label: 'Disponível',  cls: 'nb-status-available' },
  in_stock:       { label: 'Em Estoque',  cls: 'nb-status-stock' },
  in_use:         { label: 'Em Uso',      cls: 'nb-status-inuse' },
  maintenance:    { label: 'Manutenção',  cls: 'nb-status-maint' },
  in_maintenance: { label: 'Manutenção',  cls: 'nb-status-maint' },
  retired:        { label: 'Baixado',     cls: 'nb-status-retired' },
};

const BRAND_COLORS = [
  { accent: '#6366f1', light: '#eef2ff', badge: '#818cf8' },
  { accent: '#0ea5e9', light: '#f0f9ff', badge: '#38bdf8' },
  { accent: '#10b981', light: '#ecfdf5', badge: '#34d399' },
  { accent: '#f59e0b', light: '#fffbeb', badge: '#fbbf24' },
  { accent: '#ec4899', light: '#fdf2f8', badge: '#f472b6' },
  { accent: '#8b5cf6', light: '#f5f3ff', badge: '#a78bfa' },
];

const CONDITION_LABELS: Record<string, string> = {
  new:            'Novo',
  Novo:           'Novo',
  good:           'Bom',
  Bom:            'Bom',
  regular:        'Regular',
  Regular:        'Regular',
  bad:            'Com Defeito',
  damaged:        'Com Defeito',
  'Com Defeito':  'Com Defeito',
  'Para Descarte':'Para Descarte',
};

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase();
}
function getAvatarColor(name: string) {
  const colors = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#0ea5e9','#ef4444','#14b8a6'];
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return colors[h % colors.length];
}

interface ModelGroupProps {
  groupKey: string;
  notebooks: Notebook[];
  colorIdx: number;
  search: string;
  statusFilter: string;
  onNavigate: (path: string) => void;
}

function ModelGroup({ groupKey, notebooks, colorIdx, search, statusFilter, onNavigate }: ModelGroupProps) {
  const [expanded, setExpanded] = useState(true);
  const color = BRAND_COLORS[colorIdx % BRAND_COLORS.length];

  const filtered = useMemo(() => notebooks.filter(n => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (n.responsible_name || '').toLowerCase().includes(q) ||
      n.current_unit.toLowerCase().includes(q) ||
      n.internal_code.toLowerCase().includes(q) ||
      n.serial_number.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || n.current_status === statusFilter;
    return matchSearch && matchStatus;
  }), [notebooks, search, statusFilter]);

  const counts = useMemo(() => ({
    inuse:     notebooks.filter(n => n.current_status === 'in_use').length,
    available: notebooks.filter(n => ['available','in_stock'].includes(n.current_status)).length,
    maint:     notebooks.filter(n => ['maintenance','in_maintenance'].includes(n.current_status)).length,
    retired:   notebooks.filter(n => n.current_status === 'retired').length,
  }), [notebooks]);

  // specs from first notebook
  const ref = notebooks[0];
  const specs = [ref?.processor, ref?.memory_ram, ref?.storage, ref?.screen_size].filter(Boolean).join(' · ');

  if (filtered.length === 0 && (search || statusFilter !== 'all')) return null;

  return (
    <div className="nb-group">
      <div
        className="nb-group-header"
        style={{ backgroundColor: color.light, borderLeft: `4px solid ${color.accent}` }}
        onClick={() => setExpanded(e => !e)}
      >
        <div className="nb-group-left">
          <div className="nb-group-icon" style={{ backgroundColor: color.accent }}>NB</div>
          <div>
            <div className="nb-group-title">
              <span className="nb-group-name">{groupKey}</span>
              <span className="nb-group-badge" style={{ backgroundColor: color.badge }}>{notebooks.length} unidades</span>
            </div>
            {specs && <div className="nb-group-specs">{specs}</div>}
          </div>
        </div>
        <div className="nb-group-right">
          <div className="nb-group-counts">
            {counts.inuse > 0     && <span className="nb-cnt nb-cnt-inuse">{counts.inuse} em uso</span>}
            {counts.available > 0 && <span className="nb-cnt nb-cnt-avail">{counts.available} disponível</span>}
            {counts.maint > 0     && <span className="nb-cnt nb-cnt-maint">{counts.maint} manutenção</span>}
            {counts.retired > 0   && <span className="nb-cnt nb-cnt-ret">{counts.retired} baixado</span>}
          </div>
          <button
            className="nb-btn-add-group"
            onClick={e => { e.stopPropagation(); onNavigate(`/inventario/equipamentos/novo?brand=${encodeURIComponent(notebooks[0]?.brand || '')}&model=${encodeURIComponent(notebooks[0]?.model || '')}`); }}
            title="Adicionar notebook a este modelo"
          >
            + Adicionar
          </button>
          <span className="nb-group-chevron">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div className="nb-group-table-wrap">
          <table className="nb-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Código</th>
                <th>Responsável</th>
                <th>Unidade</th>
                <th>Status</th>
                <th>Condição</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((nb, i) => {
                const stCfg = STATUS_CFG[nb.current_status] || { label: nb.current_status, cls: '' };
                return (
                  <tr
                    key={nb.id}
                    className={`nb-row ${nb.current_status === 'retired' ? 'nb-row-dimmed' : ''}`}
                    onClick={() => onNavigate(`/inventario/equipamento/${nb.id}`)}
                  >
                    <td className="nb-td-num">{i + 1}</td>
                    <td>
                      <code className="nb-code">{nb.internal_code}</code>
                      {nb.serial_number && nb.serial_number !== 'S/N' && (
                        <div className="nb-sn">SN: {nb.serial_number}</div>
                      )}
                    </td>
                    <td>
                      {nb.responsible_name ? (
                        <div className="nb-responsible">
                          <div className="nb-avatar" style={{ backgroundColor: getAvatarColor(nb.responsible_name) }}>
                            {getInitials(nb.responsible_name)}
                          </div>
                          <div>
                            <div className="nb-resp-name">{nb.responsible_name}</div>
                            {nb.in_use_since && (
                              <div className="nb-resp-since">
                                Desde {new Date(nb.in_use_since).toLocaleDateString('pt-BR')}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="nb-empty">—</span>
                      )}
                    </td>
                    <td className="nb-unit">{nb.current_unit || '—'}</td>
                    <td><span className={`nb-status ${stCfg.cls}`}>{stCfg.label}</span></td>
                    <td className="nb-condition">{CONDITION_LABELS[nb.physical_condition] || nb.physical_condition || '—'}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="nb-actions">
                        <button className="nb-btn nb-btn-view" onClick={() => onNavigate(`/inventario/equipamento/${nb.id}`)}>
                          Ver
                        </button>
                        {(['available','in_stock'].includes(nb.current_status)) && (
                          <button className="nb-btn nb-btn-deliver" onClick={() => onNavigate('/inventario/equipamentos/entregar')}>
                            Entregar
                          </button>
                        )}
                        {nb.current_status === 'in_use' && (
                          <>
                            <button className="nb-btn nb-btn-move" onClick={() => onNavigate(`/inventario/equipamento/${nb.id}/movimentar`)}>
                              Mover
                            </button>
                            <button className="nb-btn nb-btn-return" onClick={() => onNavigate(`/inventario/equipamentos/devolver?equipment=${nb.id}`)}>
                              Devolver
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
          {filtered.length === 0 && (
            <div className="nb-no-results">Nenhum resultado para os filtros aplicados.</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function NotebooksPage() {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => { fetchNotebooks(); }, []);

  const fetchNotebooks = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('internal_token');
      const response = await fetch(`${BACKEND_URL}/api/inventory/notebooks`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Erro ao carregar notebooks');
      const data = await response.json();
      setNotebooks(data.notebooks || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Agrupar por marca + modelo
  const groups = useMemo(() => {
    const normalize = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();
    const labelMap = new Map<string, string>();
    const map = new Map<string, Notebook[]>();
    notebooks.forEach(nb => {
      const raw = `${nb.brand} ${nb.model}`.trim().replace(/\s+/g, ' ') || 'Sem modelo';
      const key = normalize(raw);
      if (!map.has(key)) {
        map.set(key, []);
        labelMap.set(key, raw);
      }
      map.get(key)!.push(nb);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .map(([key, nbs]) => [labelMap.get(key) ?? key, nbs] as [string, Notebook[]]);
  }, [notebooks]);

  const brands = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    notebooks.forEach(n => {
      if (n.brand) {
        const norm = n.brand.trim().toLowerCase();
        if (!seen.has(norm)) { seen.add(norm); result.push(n.brand.trim()); }
      }
    });
    return result.sort();
  }, [notebooks]);

  const filteredGroups = useMemo(() => {
    if (brandFilter === 'all') return groups;
    return groups.filter(([key]) => key.toLowerCase().startsWith(brandFilter.trim().toLowerCase()));
  }, [groups, brandFilter]);

  const totals = useMemo(() => ({
    total:     notebooks.length,
    inuse:     notebooks.filter(n => n.current_status === 'in_use').length,
    available: notebooks.filter(n => ['available','in_stock'].includes(n.current_status)).length,
    maint:     notebooks.filter(n => ['maintenance','in_maintenance'].includes(n.current_status)).length,
    retired:   notebooks.filter(n => n.current_status === 'retired').length,
  }), [notebooks]);

  if (loading) {
    return (
      <InventoryLayout>
        <div className="nb-page"><div className="nb-loading">Carregando notebooks...</div></div>
      </InventoryLayout>
    );
  }

  return (
    <InventoryLayout>
      <div className="nb-page">

        {/* HEADER */}
        <div className="nb-header">
          <div>
            <h1 className="nb-title">Notebooks</h1>
            <p className="nb-subtitle">Agrupados por marca e modelo · {groups.length} modelos · {notebooks.length} unidades</p>
          </div>
          <div className="nb-header-actions">
            <button className="nb-btn-outline" onClick={() => ExcelExportService.exportNotebooks(notebooks)} disabled={notebooks.length === 0}>
              Exportar Excel
            </button>
            <button className="nb-btn-primary" onClick={() => navigate('/inventario/equipamentos/novo')}>
              + Cadastrar
            </button>
          </div>
        </div>

        {error && <div className="nb-alert">{error}</div>}

        {/* STATS */}
        <div className="nb-stats">
          {[
            { label: 'Total',      value: totals.total,     cls: 'nb-stat-total'   },
            { label: 'Em Uso',     value: totals.inuse,     cls: 'nb-stat-inuse'   },
            { label: 'Disponível', value: totals.available, cls: 'nb-stat-avail'   },
            { label: 'Manutenção', value: totals.maint,     cls: 'nb-stat-maint'   },
            { label: 'Baixado',    value: totals.retired,   cls: 'nb-stat-retired' },
          ].map(s => (
            <div key={s.label} className={`nb-stat ${s.cls}`}>
              <div className="nb-stat-value">{s.value}</div>
              <div className="nb-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* FILTERS */}
        <div className="nb-filters">
          <div className="nb-search-wrap">
            <span className="nb-search-icon">🔍</span>
            <input
              className="nb-search"
              placeholder="Buscar por responsável, código, unidade..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && <button className="nb-search-clear" onClick={() => setSearch('')}>✕</button>}
          </div>
          <select className="nb-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">Todos os status</option>
            <option value="in_use">Em Uso</option>
            <option value="available">Disponível</option>
            <option value="in_stock">Em Estoque</option>
            <option value="maintenance">Manutenção</option>
            <option value="retired">Baixado</option>
          </select>
          <div className="nb-brand-chips">
            <button className={`nb-chip ${brandFilter === 'all' ? 'active' : ''}`} onClick={() => setBrandFilter('all')}>
              Todas as marcas
            </button>
            {brands.map((b, i) => (
              <button
                key={b}
                className={`nb-chip ${brandFilter === b ? 'active' : ''}`}
                style={brandFilter === b ? { backgroundColor: BRAND_COLORS[i % BRAND_COLORS.length].accent, color: '#fff', borderColor: 'transparent' } : {}}
                onClick={() => setBrandFilter(brandFilter === b ? 'all' : b)}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        {/* MODEL GROUPS */}
        {filteredGroups.length === 0 ? (
          <div className="nb-empty">
            <div className="nb-empty-icon">📭</div>
            <h3>Nenhum notebook encontrado</h3>
            <p>Cadastre notebooks ou ajuste os filtros</p>
            <button className="nb-btn-primary" onClick={() => navigate('/inventario/equipamentos/novo')}>
              + Cadastrar Notebook
            </button>
          </div>
        ) : (
          filteredGroups.map(([key, nbs], idx) => (
            <ModelGroup
              key={key}
              groupKey={key}
              notebooks={nbs}
              colorIdx={idx}
              search={search}
              statusFilter={statusFilter}
              onNavigate={navigate}
            />
          ))
        )}
      </div>
    </InventoryLayout>
  );
}
