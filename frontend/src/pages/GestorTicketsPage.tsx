import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/GestorTicketsPage.css';
import { BACKEND_URL } from '../services/api';

type Tab = 'tickets' | 'equipment' | 'notebooks' | 'purchases';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  type: string;
  created_at: string;
  updated_at: string;
  assigned_to?: string;
  requester_name?: string;
  requester_email?: string;
  requester_department?: string;
  requester_unit?: string;
  requester_type?: string;
}

interface InternalUser {
  id: string;
  name: string;
}

interface Equipment {
  id: string;
  internal_code: string;
  type: string;
  brand: string;
  model: string;
  category: string;
  current_status: string;
  current_user_name?: string;
  current_unit?: string;
}

interface Notebook {
  id: string;
  internal_code: string;
  brand: string;
  model: string;
  patrimony_code?: string;
  current_status: string;
  current_user_name?: string;
  current_unit?: string;
  processor?: string;
  ram_gb?: number;
}

interface Purchase {
  id: string;
  request_number: string;
  item_name: string;
  item_type: string;
  quantity: number;
  status: string;
  estimated_value: number | null;
  actual_value: number | null;
  created_at: string;
  justification?: string;
  requester_name?: string;
}

export default function GestorTicketsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('tickets');

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<InternalUser[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [equipmentLoading, setEquipmentLoading] = useState(false);
  const [equipmentSearch, setEquipmentSearch] = useState('');

  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [notebooksLoading, setNotebooksLoading] = useState(false);
  const [notebookSearch, setNotebookSearch] = useState('');

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);
  const [purchaseStatusFilter, setPurchaseStatusFilter] = useState('all');

  const [error, setError] = useState('');

  const token = localStorage.getItem('internal_token');

  useEffect(() => {
    if (!token) { navigate('/admin/login'); return; }
    const user = localStorage.getItem('internal_user');
    if (user) {
      const userData = JSON.parse(user);
      if (userData.role !== 'manager' && userData.role !== 'gestor') {
        navigate('/admin/chamados');
        return;
      }
    }
    fetchTickets();
    fetchUsers();
  }, [navigate]);

  useEffect(() => {
    if (activeTab === 'equipment' && equipment.length === 0) fetchEquipment();
    if (activeTab === 'notebooks' && notebooks.length === 0) fetchNotebooks();
    if (activeTab === 'purchases' && purchases.length === 0) fetchPurchases();
  }, [activeTab]);

  const fetchUsers = async () => {
    try {
      const r = await fetch(`${BACKEND_URL}/api/internal-auth/users`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) setUsers(await r.json());
    } catch {}
  };

  const fetchTickets = async () => {
    setTicketsLoading(true);
    try {
      const r = await fetch(`${BACKEND_URL}/api/tickets?limit=200&sort=created_at&order=desc`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!r.ok) throw new Error('Erro ao carregar chamados');
      const raw = await r.json();
      const list = raw.data || (Array.isArray(raw) ? raw : []);
      setTickets(list);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTicketsLoading(false);
    }
  };

  const fetchEquipment = async () => {
    setEquipmentLoading(true);
    try {
      const r = await fetch(`${BACKEND_URL}/api/inventory/equipment`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error('Erro ao carregar equipamentos');
      const raw = await r.json();
      setEquipment(Array.isArray(raw) ? raw : (raw.data || []));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setEquipmentLoading(false);
    }
  };

  const fetchNotebooks = async () => {
    setNotebooksLoading(true);
    try {
      const r = await fetch(`${BACKEND_URL}/api/inventory/notebooks`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error('Erro ao carregar notebooks');
      const raw = await r.json();
      setNotebooks(Array.isArray(raw) ? raw : (raw.data || []));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setNotebooksLoading(false);
    }
  };

  const fetchPurchases = async () => {
    setPurchasesLoading(true);
    try {
      const r = await fetch(`${BACKEND_URL}/api/inventory/requisitions`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error('Erro ao carregar compras');
      const raw = await r.json();
      setPurchases(Array.isArray(raw) ? raw : (raw.data || []));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPurchasesLoading(false);
    }
  };

  const getStatusLabel = (s: string) => (({ open: 'Aberto', in_progress: 'Em Atendimento', waiting_user: 'Aguardando', resolved: 'Resolvido', closed: 'Fechado' } as Record<string,string>)[s] || s);
  const getPriorityLabel = (p: string) => (({ critical: 'Critica', urgent: 'Critica', high: 'Alta', medium: 'Media', low: 'Baixa' } as Record<string,string>)[p] || p);
  const getStatusClass = (s: string) => (({ open: 'badge-open', in_progress: 'badge-progress', waiting_user: 'badge-warning', resolved: 'badge-success', closed: 'badge-neutral' } as Record<string,string>)[s] || 'badge-neutral');
  const getPriorityClass = (p: string) => (['critical','urgent'].includes(p) ? 'badge-critical' : (({ high: 'badge-high', medium: 'badge-medium', low: 'badge-low' } as Record<string,string>)[p] || 'badge-neutral'));
  const getEquipStatusLabel = (s: string) => (({ in_use: 'Em Uso', available: 'Disponivel', maintenance: 'Manutencao', inactive: 'Inativo', lost: 'Extraviado' } as Record<string,string>)[s] || s);
  const getEquipStatusClass = (s: string) => (({ in_use: 'badge-success', available: 'badge-info', maintenance: 'badge-warning', inactive: 'badge-neutral', lost: 'badge-danger' } as Record<string,string>)[s] || 'badge-neutral');
  const getPurchaseStatusLabel = (s: string) => (({ pending: 'Pendente', approved: 'Aprovado', purchased: 'Comprado', rejected: 'Rejeitado', cancelled: 'Cancelado' } as Record<string,string>)[s] || s);
  const getPurchaseStatusClass = (s: string) => (({ pending: 'badge-warning', approved: 'badge-info', purchased: 'badge-success', rejected: 'badge-danger', cancelled: 'badge-neutral' } as Record<string,string>)[s] || 'badge-neutral');
  const getUserName = (id?: string) => users.find(u => u.id === id)?.name || 'Nao atribuido';
  const getTimeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const h = Math.floor(diff / 3600000);
    const days = Math.floor(h / 24);
    return days > 0 ? `${days}d` : h > 0 ? `${h}h` : 'agora';
  };

  const filteredTickets = tickets.filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterPriority !== 'all') {
      if (filterPriority === 'critical' && !['critical','urgent'].includes(t.priority)) return false;
      if (filterPriority !== 'critical' && t.priority !== filterPriority) return false;
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        (t.requester_name || '').toLowerCase().includes(q) ||
        (t.requester_email || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredEquipment = equipment.filter(e => {
    if (!equipmentSearch.trim()) return true;
    const q = equipmentSearch.toLowerCase();
    return (e.internal_code||'').toLowerCase().includes(q) || (e.brand||'').toLowerCase().includes(q) || (e.model||'').toLowerCase().includes(q) || (e.current_user_name||'').toLowerCase().includes(q) || (e.current_unit||'').toLowerCase().includes(q);
  });

  const filteredNotebooks = notebooks.filter(n => {
    if (!notebookSearch.trim()) return true;
    const q = notebookSearch.toLowerCase();
    return (n.internal_code||'').toLowerCase().includes(q) || (n.brand||'').toLowerCase().includes(q) || (n.model||'').toLowerCase().includes(q) || (n.current_user_name||'').toLowerCase().includes(q) || (n.current_unit||'').toLowerCase().includes(q);
  });

  const filteredPurchases = purchases.filter(p => purchaseStatusFilter === 'all' || p.status === purchaseStatusFilter);

  const ticketStats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    critical: tickets.filter(t => ['critical','urgent'].includes(t.priority) && !['resolved','closed'].includes(t.status)).length,
  };

  const TABS: Array<{ id: Tab; label: string; count?: number }> = [
    { id: 'tickets', label: '\u{1F3AB} Chamados de TI', count: ticketStats.total },
    { id: 'equipment', label: '\u{1F5A5}\uFE0F Equipamentos', count: equipment.length || undefined },
    { id: 'notebooks', label: '\u{1F4BB} Notebooks', count: notebooks.length || undefined },
    { id: 'purchases', label: '\u{1F6D2} Compras', count: purchases.length || undefined },
  ];

  if (!localStorage.getItem('internal_token')) return null;

  return (
    <div className="gestor-tickets-page">
      <div className="gt-header">
        <div>
          <h1>{'📋'} Acompanhamento Geral</h1>
          <p>Chamados de TI, inventario de equipamentos, notebooks e compras</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="gt-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`gt-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {tab.count !== undefined && <span className="gt-tab-count">{tab.count}</span>}
          </button>
        ))}
      </div>

      {activeTab === 'tickets' && (
        <div className="gt-tab-content">
          <div className="gt-stats-row">
            <div className="gt-stat-box"><span className="gt-stat-val">{ticketStats.total}</span><span className="gt-stat-lbl">Total</span></div>
            <div className="gt-stat-box open"><span className="gt-stat-val">{ticketStats.open}</span><span className="gt-stat-lbl">Abertos</span></div>
            <div className="gt-stat-box progress"><span className="gt-stat-val">{ticketStats.inProgress}</span><span className="gt-stat-lbl">Em Atendimento</span></div>
            <div className="gt-stat-box resolved"><span className="gt-stat-val">{ticketStats.resolved}</span><span className="gt-stat-lbl">Resolvidos</span></div>
            <div className="gt-stat-box critical"><span className="gt-stat-val">{ticketStats.critical}</span><span className="gt-stat-lbl">Criticos Ativos</span></div>
          </div>

          <div className="gt-filters">
            <input
              type="text"
              className="gt-search"
              placeholder="Buscar por titulo, descricao, solicitante..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
            />
            <select className="gt-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">Todos os status</option>
              <option value="open">Aberto</option>
              <option value="in_progress">Em Atendimento</option>
              <option value="waiting_user">Aguardando</option>
              <option value="resolved">Resolvido</option>
              <option value="closed">Fechado</option>
            </select>
            <select className="gt-select" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
              <option value="all">Todas as prioridades</option>
              <option value="critical">Critica</option>
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baixa</option>
            </select>
            <button className="btn btn-secondary btn-sm" onClick={fetchTickets}>Atualizar</button>
          </div>

          <div className="gt-main-layout">
            <div className="gt-list">
              {ticketsLoading ? (
                <div className="gt-loading">Carregando chamados...</div>
              ) : filteredTickets.length === 0 ? (
                <div className="gt-empty">Nenhum chamado encontrado</div>
              ) : filteredTickets.map(ticket => (
                <div
                  key={ticket.id}
                  className={`gt-ticket-card ${selectedTicket?.id === ticket.id ? 'selected' : ''}`}
                  onClick={() => setSelectedTicket(selectedTicket?.id === ticket.id ? null : ticket)}
                >
                  <div className="gt-ticket-top">
                    <span className="gt-ticket-id">#{ticket.id.substring(0, 8).toUpperCase()}</span>
                    <span className="gt-time">{getTimeAgo(ticket.created_at)}</span>
                  </div>
                  <div className="gt-ticket-title">{ticket.title}</div>
                  {ticket.requester_name && (
                    <div className="gt-ticket-meta">{ticket.requester_name}{ticket.requester_department ? ` - ${ticket.requester_department}` : ''}</div>
                  )}
                  <div className="gt-ticket-badges">
                    <span className={`gt-badge ${getStatusClass(ticket.status)}`}>{getStatusLabel(ticket.status)}</span>
                    <span className={`gt-badge ${getPriorityClass(ticket.priority)}`}>{getPriorityLabel(ticket.priority)}</span>
                    <span className="gt-badge badge-type">{ticket.type}</span>
                  </div>
                  <div className="gt-ticket-footer">{getUserName(ticket.assigned_to)}</div>
                </div>
              ))}
            </div>

            {selectedTicket && (
              <div className="gt-detail-panel">
                <div className="gt-panel-header">
                  <h3>Detalhes</h3>
                  <button className="gt-close" onClick={() => setSelectedTicket(null)}>X</button>
                </div>
                <div className="gt-panel-body">
                  <div className="gt-detail-id">#{selectedTicket.id.substring(0,8).toUpperCase()}</div>
                  <h4 className="gt-detail-title">{selectedTicket.title}</h4>
                  <div className="gt-detail-badges">
                    <span className={`gt-badge ${getStatusClass(selectedTicket.status)}`}>{getStatusLabel(selectedTicket.status)}</span>
                    <span className={`gt-badge ${getPriorityClass(selectedTicket.priority)}`}>{getPriorityLabel(selectedTicket.priority)}</span>
                  </div>
                  <div className="gt-detail-section">
                    <label>Descricao</label>
                    <p>{selectedTicket.description}</p>
                  </div>
                  {selectedTicket.requester_name && (
                    <div className="gt-detail-section">
                      <label>Solicitante</label>
                      <p>{selectedTicket.requester_name}{selectedTicket.requester_email ? ` - ${selectedTicket.requester_email}` : ''}</p>
                    </div>
                  )}
                  {(selectedTicket.requester_department || selectedTicket.requester_unit) && (
                    <div className="gt-detail-section">
                      <label>Localizacao</label>
                      <p>{[selectedTicket.requester_department, selectedTicket.requester_unit].filter(Boolean).join(' - ')}</p>
                    </div>
                  )}
                  <div className="gt-detail-section">
                    <label>Responsavel</label>
                    <p>{getUserName(selectedTicket.assigned_to)}</p>
                  </div>
                  <div className="gt-detail-section">
                    <label>Criado em</label>
                    <p>{new Date(selectedTicket.created_at).toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'equipment' && (
        <div className="gt-tab-content">
          <div className="gt-filters">
            <input
              type="text"
              className="gt-search"
              placeholder="Buscar por codigo, marca, modelo, usuario, unidade..."
              value={equipmentSearch}
              onChange={e => setEquipmentSearch(e.target.value)}
            />
            <button className="btn btn-secondary btn-sm" onClick={fetchEquipment}>Atualizar</button>
          </div>
          {equipmentLoading ? (
            <div className="gt-loading">Carregando equipamentos...</div>
          ) : (
            <div className="gt-table-wrap">
              <table className="gt-table">
                <thead>
                  <tr>
                    <th>Codigo</th><th>Tipo</th><th>Marca / Modelo</th><th>Categoria</th>
                    <th>Status</th><th>Usuario</th><th>Unidade</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEquipment.length === 0 ? (
                    <tr><td colSpan={7} className="gt-empty-cell">Nenhum equipamento encontrado</td></tr>
                  ) : filteredEquipment.map(e => (
                    <tr key={e.id}>
                      <td><code className="gt-code">{e.internal_code}</code></td>
                      <td>{e.type}</td>
                      <td>{e.brand} {e.model}</td>
                      <td>{e.category}</td>
                      <td><span className={`gt-badge ${getEquipStatusClass(e.current_status)}`}>{getEquipStatusLabel(e.current_status)}</span></td>
                      <td>{e.current_user_name || '-'}</td>
                      <td>{e.current_unit || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="gt-table-footer">{filteredEquipment.length} equipamento(s)</div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'notebooks' && (
        <div className="gt-tab-content">
          <div className="gt-filters">
            <input
              type="text"
              className="gt-search"
              placeholder="Buscar por codigo, marca, modelo, usuario, unidade..."
              value={notebookSearch}
              onChange={e => setNotebookSearch(e.target.value)}
            />
            <button className="btn btn-secondary btn-sm" onClick={fetchNotebooks}>Atualizar</button>
          </div>
          {notebooksLoading ? (
            <div className="gt-loading">Carregando notebooks...</div>
          ) : (
            <div className="gt-table-wrap">
              <table className="gt-table">
                <thead>
                  <tr>
                    <th>Codigo</th><th>Marca / Modelo</th><th>Processador</th><th>RAM</th>
                    <th>Status</th><th>Usuario</th><th>Unidade</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNotebooks.length === 0 ? (
                    <tr><td colSpan={7} className="gt-empty-cell">Nenhum notebook encontrado</td></tr>
                  ) : filteredNotebooks.map(n => (
                    <tr key={n.id}>
                      <td><code className="gt-code">{n.internal_code}</code></td>
                      <td>{n.brand} {n.model}</td>
                      <td>{n.processor || '-'}</td>
                      <td>{n.ram_gb ? `${n.ram_gb}GB` : '-'}</td>
                      <td><span className={`gt-badge ${getEquipStatusClass(n.current_status)}`}>{getEquipStatusLabel(n.current_status)}</span></td>
                      <td>{n.current_user_name || '-'}</td>
                      <td>{n.current_unit || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="gt-table-footer">{filteredNotebooks.length} notebook(s)</div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'purchases' && (
        <div className="gt-tab-content">
          <div className="gt-filters">
            <select className="gt-select" value={purchaseStatusFilter} onChange={e => setPurchaseStatusFilter(e.target.value)}>
              <option value="all">Todos os status</option>
              <option value="pending">Pendente</option>
              <option value="approved">Aprovado</option>
              <option value="purchased">Comprado</option>
              <option value="rejected">Rejeitado</option>
              <option value="cancelled">Cancelado</option>
            </select>
            <button className="btn btn-secondary btn-sm" onClick={fetchPurchases}>Atualizar</button>
          </div>
          {purchasesLoading ? (
            <div className="gt-loading">Carregando compras...</div>
          ) : (
            <div className="gt-table-wrap">
              <table className="gt-table">
                <thead>
                  <tr>
                    <th>Nr Req.</th><th>Item</th><th>Tipo</th><th>Qtd</th>
                    <th>Valor Est.</th><th>Valor Real</th><th>Status</th><th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPurchases.length === 0 ? (
                    <tr><td colSpan={8} className="gt-empty-cell">Nenhuma requisicao encontrada</td></tr>
                  ) : filteredPurchases.map(p => {
                    const actualVal = p.actual_value && parseFloat(String(p.actual_value)) > 0 ? parseFloat(String(p.actual_value)) : null;
                    const estVal = p.estimated_value ? parseFloat(String(p.estimated_value)) * p.quantity : null;
                    return (
                      <tr key={p.id}>
                        <td><code className="gt-code">{p.request_number}</code></td>
                        <td>{p.item_name}</td>
                        <td>{p.item_type}</td>
                        <td>{p.quantity}</td>
                        <td>{estVal ? `R$ ${estVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}</td>
                        <td>{actualVal ? <strong>R$ {actualVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> : '-'}</td>
                        <td><span className={`gt-badge ${getPurchaseStatusClass(p.status)}`}>{getPurchaseStatusLabel(p.status)}</span></td>
                        <td>{new Date(p.created_at).toLocaleDateString('pt-BR')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="gt-table-footer">{filteredPurchases.length} requisicao(oes)</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
