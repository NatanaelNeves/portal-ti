import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import '../styles/AdminTicketsPage.css';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  type: string;
  department?: string;
  category?: string;
  created_at: string;
  updated_at: string;
  requester_id: string;
  requester_type?: string;
  assigned_to?: string;
  message_count?: number;
  requester_name?: string;
  requester_email?: string;
  requester_department?: string;
  requester_unit?: string;
}

interface InternalUser {
  id: string;
  name: string;
  email: string;
}

interface TicketStats {
  waitingUser: number;
  inProgress: number;
  newToday: number;
  resolvedToday: number;
}

export default function AdminTicketsPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<InternalUser[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState<'high' | 'medium' | 'low' | null>(null);
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'mine' | 'unassigned'>('all');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [stats, setStats] = useState<TicketStats>({
    waitingUser: 0,
    inProgress: 0,
    newToday: 0,
    resolvedToday: 0
  });
  
  // Novos estados para filtros avançados e paginação
  const [searchText, setSearchText] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    const token = localStorage.getItem('internal_token');
    const userData = localStorage.getItem('internal_user');
    
    if (!token) {
      navigate('/admin/login');
      return;
    }

    if (userData) {
      const user = JSON.parse(userData);
      setCurrentUserId(user.id);
      setUserRole(user.role);
      // Auto-set department filter based on role
      if (user.role === 'admin_staff') {
        setDepartmentFilter('administrativo');
        setAssignmentFilter('mine');
      } else if (user.role === 'it_staff') {
        setDepartmentFilter('ti');
      }
      // admin and manager see all by default (empty filter)
    }

    fetchTickets();
    fetchUsers();
  }, [filterStatus, assignmentFilter, selectedStatuses, selectedPriorities, searchText, currentPage, departmentFilter, currentUserId, navigate]);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/internal-auth/users');
      console.log('Usuários carregados:', response.data);
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
    }
  };

  const handleQuickAssume = async (ticketId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Evita abrir o painel lateral
    
    console.log('🎯 Assumindo ticket:', ticketId);
    
    try {
      const userData = localStorage.getItem('internal_user');
      
      if (!userData) {
        console.error('❌ Usuário não encontrado');
        return;
      }
      
      const user = JSON.parse(userData);
      console.log('👤 Usuário logado:', user.name, '- ID:', user.id);
      
      const payload = {
        status: 'in_progress',
        assigned_to_id: user.id
      };
      console.log('📤 Enviando para backend:', payload);
      
      const response = await api.patch(`/tickets/${ticketId}`, payload);
      
      console.log('📥 Resposta do backend - Status:', response.status);
      console.log('✅ Ticket atualizado:', response.data);
      console.log('Status:', response.data.status, '| Assigned to:', response.data.assigned_to_id);
      
      // Recarregar tickets
      console.log('🔄 Recarregando lista de tickets...');
      fetchTickets();
    } catch (err: any) {
      console.error('❌ Erro ao assumir:', err);
      setError(err.message || 'Erro ao assumir chamado');
    }
  };

  const handleQuickStatusChange = async (ticketId: string, newStatus: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    console.log(`🔄 Mudando status do ticket ${ticketId} para:`, newStatus);
    
    try {
      const payload = { status: newStatus };
      console.log('📤 Enviando para backend:', payload);
      
      const response = await api.patch(`/tickets/${ticketId}`, payload);
      
      console.log('📥 Resposta do backend - Status:', response.status);
      console.log('✅ Ticket atualizado:', response.data);
      
      // Fechar painel lateral se estava aberto
      setSelectedTicket(null);
      
      // Recarregar tickets
      console.log('🔄 Recarregando lista de tickets...');
      fetchTickets();
    } catch (err: any) {
      console.error('❌ Erro ao atualizar status:', err);
      setError(err.message || 'Erro ao atualizar chamado');
    }
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      // Filtros avançados
      if (selectedStatuses.length > 0) {
        selectedStatuses.forEach(status => params.append('status', status));
      }
      
      if (selectedPriorities.length > 0) {
        selectedPriorities.forEach(priority => params.append('priority', priority));
      }
      
      if (searchText.trim()) {
        params.append('search', searchText.trim());
      }
      
      if (assignmentFilter === 'mine' && currentUserId) {
        params.append('assigned_to', currentUserId);
      } else if (assignmentFilter === 'unassigned') {
        params.append('assigned_to', 'unassigned');
      }
      
      // Filtro por departamento
      if (departmentFilter) {
        params.append('department', departmentFilter);
      }
      
      // Paginação
      params.append('page', currentPage.toString());
      params.append('limit', '20');
      params.append('sort', 'created_at');
      params.append('order', 'desc');

      const response = await api.get(`/tickets?${params.toString()}`);
      const responseData = response.data;
      
      // Suporte para a nova resposta com paginação e para a resposta antiga (array)
      const ticketList = responseData.data || (Array.isArray(responseData) ? responseData : []);
      const pagination = responseData.pagination;
      
      if (pagination) {
        setTotalPages(pagination.totalPages);
        setTotalTickets(pagination.total);
      }
      
      console.log('📋 Tickets carregados:', ticketList.length);
      console.log('  - Open:', ticketList.filter((t: Ticket) => t.status === 'open').length);
      console.log('  - In Progress:', ticketList.filter((t: Ticket) => t.status === 'in_progress').length);
      console.log('  - Closed:', ticketList.filter((t: Ticket) => t.status === 'closed').length);
      console.log('  - Resolved:', ticketList.filter((t: Ticket) => t.status === 'resolved').length);
      
      setTickets(ticketList);
      
      // Calculate stats (do total, não apenas da página)
      const today = new Date().toDateString();
      setStats({
        waitingUser: ticketList.filter((t: Ticket) => t.status === 'waiting_user').length,
        inProgress: ticketList.filter((t: Ticket) => t.status === 'in_progress').length,
        newToday: ticketList.filter((t: Ticket) => new Date(t.created_at).toDateString() === today).length,
        resolvedToday: ticketList.filter((t: Ticket) => 
          (t.status === 'resolved' || t.status === 'closed') && 
          new Date(t.updated_at).toDateString() === today
        ).length
      });
      
      // Atualizar timestamp
      setLastUpdate(new Date());
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar chamados');
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open':
        return 'Aberto';
      case 'in_progress':
        return 'Em Atendimento';
      case 'waiting_user':
        return 'Aguardando Usuário';
      case 'resolved':
        return 'Resolvido';
      case 'closed':
        return 'Fechado';
      default:
        return status;
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent':
      case 'high':
        return 'Alta';
      case 'medium':
        return 'Média';
      case 'low':
        return 'Baixa';
      default:
        return priority;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'open':
        return 'badge-status-open';
      case 'in_progress':
        return 'badge-status-progress';
      case 'waiting_user':
        return 'badge-status-warning';
      case 'resolved':
        return 'badge-status-success';
      case 'closed':
        return 'badge-status-neutral';
      default:
        return 'badge-status-neutral';
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'urgent':
      case 'high':
        return 'badge-priority-high';
      case 'medium':
        return 'badge-priority-medium';
      case 'low':
        return 'badge-priority-low';
      default:
        return 'badge-priority-neutral';
    }
  };

  const getUserName = (userId?: string) => {
    if (!userId) return 'Ninguém';
    const user = users.find(u => u.id === userId);
    return user ? user.name : 'Atribuído';
  };

  const isPriorityMatch = (ticket: Ticket, priority: 'high' | 'medium' | 'low') => {
    if (priority === 'high') {
      return ticket.priority === 'high' || ticket.priority === 'urgent';
    }
    return ticket.priority === priority;
  };

  const getPriorityCount = (priority: 'high' | 'medium' | 'low') => {
    return tickets.filter(ticket => {
      // Só conta chamados ativos (open, in_progress ou waiting)
      const activeStatuses = ['open', 'in_progress', 'waiting', 'waiting_user'];
      if (!activeStatuses.includes(ticket.status)) {
        return false;
      }
      return isPriorityMatch(ticket, priority);
    }).length;
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d atrás`;
    if (diffHours > 0) return `${diffHours}h atrás`;
    return 'agora';
  };

  // Verifica se há filtros avançados ativos
  const hasAdvancedFilters = selectedStatuses.length > 0 || selectedPriorities.length > 0 || searchText.trim() !== '';

  // Aplicar filtro de status aos tickets
  const filteredTickets = tickets.filter(ticket => {
    // Filtro rápido por prioridade (apenas quando filtros avançados não estão ativos)
    if (!hasAdvancedFilters && filterPriority) {
      // Só mostrar chamados ativos (open, in_progress ou waiting)
      const activeStatuses = ['open', 'in_progress', 'waiting', 'waiting_user'];
      if (!activeStatuses.includes(ticket.status)) {
        return false;
      }

      if (!isPriorityMatch(ticket, filterPriority)) {
        return false;
      }
    }
    
    // Se há filtros avançados ativos (status OU prioridades), não aplicar filtro frontend
    // pois o backend já filtrou corretamente
    if (selectedStatuses.length > 0 || selectedPriorities.length > 0) {
      return true;
    }
    
    // Se filterStatus for 'all' e não há filtros avançados,
    // mostra apenas tickets ativos (não resolvidos nem fechados)
    if (filterStatus === 'all') {
      const activeStatuses = ['open', 'in_progress', 'waiting', 'waiting_user'];
      return activeStatuses.includes(ticket.status);
    }
    
    // Se filterStatus for 'open', mostra apenas tickets abertos
    // Incluindo os críticos (que são tickets abertos com prioridade alta/crítica)
    if (filterStatus === 'open') {
      return ticket.status === 'open';
    }
    
    // Para outros status, filtra exatamente pelo status
    return ticket.status === filterStatus;
  });
  
  console.log('🔍 Filtros ativos:', { 
    filterStatus, 
    filterPriority,
    selectedStatuses, 
    selectedPriorities, 
    assignmentFilter,
    totalTickets: tickets.length,
    afterFilter: filteredTickets.length 
  });
  
  // Não precisamos mais ordenar no client-side, a API já retorna ordenado
  const sortedTickets = [...filteredTickets];

  const myTicketsCount = tickets.filter(t => 
    t.assigned_to === currentUserId && 
    t.status !== 'closed' && 
    t.status !== 'resolved'
  ).length;

  const activeFiltersCount = selectedStatuses.length + selectedPriorities.length + (searchText.trim() ? 1 : 0);
  const formattedLastUpdate = lastUpdate
    ? `${lastUpdate.toLocaleDateString('pt-BR')} às ${lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    : 'Ainda sem atualização';
  const panelActionsBlocked = selectedTicket
    ? selectedTicket.status === 'open' || !selectedTicket.assigned_to || selectedTicket.status === 'closed'
    : true;

  if (!localStorage.getItem('internal_token')) {
    return null;
  }

  return (
    <div className="admin-tickets-dashboard">
      <header className="dashboard-header card">
        <div className="dashboard-header-main">
          <h1>{departmentFilter === 'administrativo' ? '🏢 Central Operacional Administrativa' : '🧑‍💻 Central Operacional TI'}</h1>
          <p>Painel de atendimento em tempo real</p>
        </div>
        <div className="dashboard-header-status">
          <span className="status-chip">
            <span className="status-dot" aria-hidden="true"></span>
            Última atualização: {formattedLastUpdate}
          </span>
          <span className="status-chip">
            <strong>{sortedTickets.length}</strong> na fila
          </span>
          <span className="status-chip">
            <strong>{myTicketsCount}</strong> meus atendimentos
          </span>
        </div>
      </header>

      {/* Department Tabs - visible for admin and manager */}
      {(userRole === 'admin' || userRole === 'manager') && (
        <div className="department-tabs">
          <button
            className={`dept-tab ${departmentFilter === '' ? 'active' : ''}`}
            onClick={() => { setDepartmentFilter(''); setCurrentPage(1); }}
          >
            📊 Todos
          </button>
          <button
            className={`dept-tab ${departmentFilter === 'ti' ? 'active' : ''}`}
            onClick={() => { setDepartmentFilter('ti'); setCurrentPage(1); }}
          >
            🖥️ TI
          </button>
          <button
            className={`dept-tab ${departmentFilter === 'administrativo' ? 'active' : ''}`}
            onClick={() => { setDepartmentFilter('administrativo'); setCurrentPage(1); }}
          >
            🏢 Administrativo
          </button>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      {hasAdvancedFilters && (
        <div className="filters-warning">
          ℹ️ <strong>Filtros avançados ativos.</strong> Os filtros rápidos abaixo estão desabilitados.
        </div>
      )}

      {/* Filtros Rápidos por Prioridade */}
      <div className="stats-container">
        <div className="stats-section">
          <h3 className="stats-section-title">Filtrar por Prioridade</h3>
          <div className="stats-grid stats-grid-filters stats-grid-priority">

            <button
              type="button"
              className={`stat-card stat-priority-high ${hasAdvancedFilters ? 'is-disabled' : ''} ${filterPriority === 'high' ? 'is-active' : ''}`}
              onClick={() => {
                if (!hasAdvancedFilters) {
                  setFilterPriority(filterPriority === 'high' ? null : 'high');
                }
              }}
              disabled={hasAdvancedFilters}
              aria-pressed={filterPriority === 'high'}
            >
              <span className="stat-icon-wrap" aria-hidden="true">
                <span className="stat-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </span>
              </span>
              <span className="stat-number">{getPriorityCount('high')}</span>
              <span className="stat-label">Alta</span>
            </button>

            <button
              type="button"
              className={`stat-card stat-priority-medium ${hasAdvancedFilters ? 'is-disabled' : ''} ${filterPriority === 'medium' ? 'is-active' : ''}`}
              onClick={() => {
                if (!hasAdvancedFilters) {
                  setFilterPriority(filterPriority === 'medium' ? null : 'medium');
                }
              }}
              disabled={hasAdvancedFilters}
              aria-pressed={filterPriority === 'medium'}
            >
              <span className="stat-icon-wrap" aria-hidden="true">
                <span className="stat-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </span>
              </span>
              <span className="stat-number">{getPriorityCount('medium')}</span>
              <span className="stat-label">Média</span>
            </button>

            <button
              type="button"
              className={`stat-card stat-priority-low ${hasAdvancedFilters ? 'is-disabled' : ''} ${filterPriority === 'low' ? 'is-active' : ''}`}
              onClick={() => {
                if (!hasAdvancedFilters) {
                  setFilterPriority(filterPriority === 'low' ? null : 'low');
                }
              }}
              disabled={hasAdvancedFilters}
              aria-pressed={filterPriority === 'low'}
            >
              <span className="stat-icon-wrap" aria-hidden="true">
                <span className="stat-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                </span>
              </span>
              <span className="stat-number">{getPriorityCount('low')}</span>
              <span className="stat-label">Baixa</span>
            </button>
          </div>
        </div>

        <div className="stats-section">
          <h3 className="stats-section-title">Resumo do Dia</h3>
          <div className="stats-grid stats-grid-metrics">
            <div className="stat-card new is-static">
              <span className="stat-icon-wrap" aria-hidden="true">
                <span className="stat-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                  </svg>
                </span>
              </span>
              <span className="stat-number">{stats.newToday}</span>
              <span className="stat-label">Novos Hoje</span>
            </div>

            <div className="stat-card resolved is-static">
              <span className="stat-icon-wrap" aria-hidden="true">
                <span className="stat-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                </span>
              </span>
              <span className="stat-number">{stats.resolvedToday}</span>
              <span className="stat-label">Resolvidos Hoje</span>
            </div>
          </div>
        </div>
      </div>

      {/* Indicador de Filtro Rápido Ativo */}
      {filterPriority && !hasAdvancedFilters && (
        <div className="active-filter-banner">
          <div className="active-filter-info">
            <span className="active-filter-icon" aria-hidden="true">
              {filterPriority === 'high' ? '🟠' : filterPriority === 'medium' ? '🟡' : '🟢'}
            </span>
            <span>
              Filtro ativo: Prioridade {getPriorityLabel(filterPriority)}
            </span>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setFilterPriority(null)}
          >
            ✕ Limpar Filtro
          </button>
        </div>
      )}

      {/* Filtros de Atribuição */}
      <div className="assignment-filters">
        {userRole !== 'admin_staff' && (
          <button 
            className={`filter-btn ${assignmentFilter === 'all' && filterStatus === 'all' ? 'active' : ''}`}
            onClick={() => {
              setAssignmentFilter('all');
              setFilterStatus('all');
            }}
          >
            📋 Fila Ativa
          </button>
        )}
        <button 
          className={`filter-btn filter-mine ${assignmentFilter === 'mine' ? 'active' : ''}`}
          onClick={() => {
            setAssignmentFilter('mine');
            setFilterStatus('all');
          }}
        >
          👤 Meus Atendimentos ({myTicketsCount})
        </button>
        {userRole !== 'admin_staff' && (
          <button 
            className={`filter-btn ${assignmentFilter === 'unassigned' ? 'active' : ''}`}
            onClick={() => {
              setAssignmentFilter('unassigned');
              setFilterStatus('all');
            }}
          >
            ⚠️ Não Atribuídos
          </button>
        )}
        <button 
          className={`filter-btn filter-btn-toggle ${showFilters ? 'active' : ''}`}
          onClick={() => {
            setShowFilters(!showFilters);
            // Quando abrir filtros avançados, reseta o filtro rápido para evitar conflitos
            if (!showFilters) {
              setFilterStatus('all');
              setFilterPriority(null);
            }
          }}
        >
          🔍 {showFilters ? 'Ocultar' : 'Filtros Avançados'}
          {hasAdvancedFilters && (
            <span className="filter-counter">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* Filtros Avançados (Collapsible) */}
      {showFilters && (
        <div className="advanced-filters card">
          {hasAdvancedFilters && (
            <div className="advanced-filters-alert">
              <strong>✅ Filtros ativos:</strong>
              {searchText.trim() && <span>🔍 Busca: "{searchText}"</span>}
              {selectedStatuses.length > 0 && <span>📊 Status: {selectedStatuses.length} selecionado(s)</span>}
              {selectedPriorities.length > 0 && <span>🚨 Prioridades: {selectedPriorities.length} selecionada(s)</span>}
            </div>
          )}
          <div className="advanced-filters-grid">
            <div className="filter-group">
              <label className="filter-label">🔍 Buscar:</label>
              <div className="filter-input-wrap">
                <input 
                  type="text"
                  placeholder="Buscar por título, descrição, usuário ou e-mail"
                  value={searchText}
                  onChange={(e) => {
                    setSearchText(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="filter-input filter-input-search"
                />
                {searchText.trim() && (
                  <button
                    type="button"
                    className="filter-input-clear"
                    onClick={() => {
                      setSearchText('');
                      setCurrentPage(1);
                    }}
                    aria-label="Limpar busca"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="filter-group">
              <label className="filter-label">📊 Status:</label>
              <div className="advanced-checkbox-list">
                {[
                  { value: 'open', label: '⚪ Aberto' },
                  { value: 'in_progress', label: '🔵 Em Atendimento' },
                  { value: 'waiting_user', label: '🟡 Aguardando' },
                  { value: 'resolved', label: '✅ Resolvido' },
                  { value: 'closed', label: '🔒 Fechado' }
                ].map(status => (
                  <label
                    key={status.value}
                    className={`advanced-checkbox-item ${selectedStatuses.includes(status.value) ? 'is-selected' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedStatuses.includes(status.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStatuses([...selectedStatuses, status.value]);
                        } else {
                          setSelectedStatuses(selectedStatuses.filter(s => s !== status.value));
                        }
                        setCurrentPage(1);
                      }}
                    />
                    {status.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <label className="filter-label">🚨 Prioridade:</label>
              <div className="advanced-checkbox-list">
                {[
                  { value: 'high', label: '🟠 Alta' },
                  { value: 'medium', label: '🟡 Média' },
                  { value: 'low', label: '🟢 Baixa' }
                ].map(priority => (
                  <label
                    key={priority.value}
                    className={`advanced-checkbox-item ${selectedPriorities.includes(priority.value) ? 'is-selected' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedPriorities.includes(priority.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPriorities([...selectedPriorities, priority.value]);
                        } else {
                          setSelectedPriorities(selectedPriorities.filter(p => p !== priority.value));
                        }
                        setCurrentPage(1);
                      }}
                    />
                    {priority.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="advanced-filters-footer">
            <button 
              type="button"
              className="advanced-clear-btn"
              onClick={() => {
                setSearchText('');
                setSelectedStatuses([]);
                setSelectedPriorities([]);
                setFilterStatus('all');
                setFilterPriority(null);
                setCurrentPage(1);
              }}
            >
              Limpar filtros
            </button>
          </div>
        </div>
      )}

      {/* Layout Principal: Fila + Painel Lateral */}
      <div className="dashboard-layout">
        {/* Fila Inteligente */}
        <section className="ticket-queue card">
          <div className="queue-header card-header">
            <h2>📋 Fila de Atendimento</h2>
            <span className="queue-count">
              {sortedTickets.length} chamados
              {filterStatus !== 'all' && ` (${getStatusLabel(filterStatus)})`}
              {filterPriority && ` • Prioridade ${getPriorityLabel(filterPriority)}`}
            </span>
          </div>

          {loading ? (
            <div className="loading">Carregando...</div>
          ) : sortedTickets.length === 0 ? (
            <div className="empty-queue">
              <span className="empty-icon">✨</span>
              <p>Nenhum chamado na fila!</p>
              <small>Você está em dia com o atendimento</small>
            </div>
          ) : (
            <div className="tickets-list">
              {sortedTickets.map((ticket) => {
                return (
                <div
                  key={ticket.id}
                  className={`ticket-card ticket-status-${ticket.status} ${selectedTicket?.id === ticket.id ? 'active' : ''} ticket-priority-${ticket.priority || 'neutral'}`}
                  onClick={() => setSelectedTicket(ticket)}
                >
                  <div className="ticket-card-top">
                    <div className="ticket-card-main">
                      <div className="ticket-card-title">{ticket.title}</div>
                      <div className="ticket-card-requester">
                        {ticket.requester_type === 'public' && ticket.requester_name ? (
                          <>
                            <span className="requester-name">👤 {ticket.requester_name}</span>
                            {ticket.requester_email && (
                              <span className="requester-meta">📧 {ticket.requester_email}</span>
                            )}
                            {(ticket.requester_department || ticket.requester_unit) && (
                              <span className="requester-meta">
                                {ticket.requester_department && `🏢 ${ticket.requester_department}`}
                                {ticket.requester_department && ticket.requester_unit && ' • '}
                                {ticket.requester_unit && `🏛️ ${ticket.requester_unit}`}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="requester-name">👤 Solicitante interno</span>
                        )}
                      </div>
                    </div>
                    <span className="time-ago">{getTimeAgo(ticket.created_at)} parado</span>
                  </div>

                  <div className="ticket-card-badges">
                    {ticket.department && ticket.department !== 'ti' && (
                      <span className="badge badge-dept-admin">🏢 Administrativo</span>
                    )}
                    {(!ticket.department || ticket.department === 'ti') && departmentFilter === '' && (
                      <span className="badge badge-dept-ti">🖥️ TI</span>
                    )}
                    {ticket.category && (
                      <span className="badge badge-category">{ticket.category}</span>
                    )}
                    <span className="badge badge-type">{ticket.type}</span>
                    <span className={`badge ${getPriorityBadgeClass(ticket.priority)}`}>
                      {getPriorityLabel(ticket.priority)}
                    </span>
                    <span className={`badge ${getStatusBadgeClass(ticket.status)}`}>
                      {getStatusLabel(ticket.status)}
                    </span>
                  </div>

                  <div className="ticket-card-footer">
                    <span className="assigned">
                      👤 {getUserName(ticket.assigned_to)}
                    </span>
                    <div className="footer-actions">
                      {!ticket.assigned_to && ticket.status === 'open' && (
                        <button
                          className="btn btn-primary btn-sm btn-assume"
                          onClick={(e) => handleQuickAssume(ticket.id, e)}
                          title="Assumir atendimento"
                        >
                          🎯 Assumir
                        </button>
                      )}
                      <span className={`badge badge-mini ${getStatusBadgeClass(ticket.status)}`}>
                        {getStatusLabel(ticket.status)}
                      </span>
                    </div>
                  </div>
                </div>
              )})}
            </div>
          )}

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="pagination card">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                ◀ Anterior
              </button>
              
              <span className="pagination-info">
                Página {currentPage} de {totalPages} 
                <small>
                  ({totalTickets} chamados)
                </small>
              </span>
              
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Próxima ▶
              </button>
            </div>
          )}
        </section>

        {/* Painel Lateral do Ticket Selecionado */}
        {selectedTicket ? (
          <aside className="ticket-panel card">
            <div className="panel-header card-header">
              <div className="panel-header-main">
                <span className="panel-ticket-id">#{selectedTicket.id.substring(0, 8).toUpperCase()}</span>
                <h3 className="panel-title">{selectedTicket.title}</h3>
              </div>
              <button 
                className="close-panel"
                onClick={() => setSelectedTicket(null)}
                aria-label="Fechar preview"
              >
                ✕
              </button>
            </div>

            <div className="panel-content card-body">
              <div className="panel-badges">
                <span className={`badge ${getStatusBadgeClass(selectedTicket.status)}`}>
                  {getStatusLabel(selectedTicket.status)}
                </span>
                <span className={`badge ${getPriorityBadgeClass(selectedTicket.priority)}`}>
                  {getPriorityLabel(selectedTicket.priority)}
                </span>
                <span className="badge badge-type">{selectedTicket.type}</span>
              </div>

              <div className="panel-meta">
                Aberto há {getTimeAgo(selectedTicket.created_at)} • Responsável: {getUserName(selectedTicket.assigned_to)}
              </div>

              <div className="panel-actions">
                <button 
                  className="btn btn-primary btn-block"
                  onClick={() => navigate(`/admin/chamados/${selectedTicket.id}`)}
                >
                  🔧 Ver Detalhes Completos
                </button>
                <button 
                  className="btn btn-warning"
                  onClick={() => handleQuickStatusChange(selectedTicket.id, 'waiting_user')}
                  disabled={panelActionsBlocked}
                  title={panelActionsBlocked ? 'Assuma o chamado primeiro para realizar esta ação.' : 'Marcar como aguardando resposta do usuário'}
                >
                  ⏳ Aguardar
                </button>
                <button 
                  className="btn btn-success"
                  onClick={() => handleQuickStatusChange(selectedTicket.id, 'resolved')}
                  disabled={panelActionsBlocked}
                  title={panelActionsBlocked ? 'Assuma o chamado primeiro para realizar esta ação.' : 'Marcar ticket como resolvido'}
                >
                  ✅ Resolver
                </button>
              </div>

              <section className="panel-section">
                <h4>Descrição</h4>
                <p>{selectedTicket.description}</p>
              </section>

              <section className="panel-section">
                <h4>Informações</h4>
                <div className="panel-info">
                  <div className="info-row">
                    <span className="info-label">Solicitante:</span>
                    <span className="info-value">{selectedTicket.requester_name || 'Usuário interno'}</span>
                  </div>
                  {selectedTicket.requester_email && (
                    <div className="info-row">
                      <span className="info-label">Email:</span>
                      <span className="info-value">{selectedTicket.requester_email}</span>
                    </div>
                  )}
                  {(selectedTicket.requester_department || selectedTicket.requester_unit) && (
                    <div className="info-row">
                      <span className="info-label">Localização:</span>
                      <span className="info-value">
                        {selectedTicket.requester_department || '—'}
                        {selectedTicket.requester_department && selectedTicket.requester_unit && ' • '}
                        {selectedTicket.requester_unit || ''}
                      </span>
                    </div>
                  )}
                  <div className="info-row">
                    <span className="info-label">Departamento:</span>
                    <span className="info-value">
                      {selectedTicket.department === 'administrativo' ? '🏢 Administrativo' : '🖥️ TI'}
                    </span>
                  </div>
                  {selectedTicket.category && (
                    <div className="info-row">
                      <span className="info-label">Categoria:</span>
                      <span className="info-value" style={{ textTransform: 'capitalize' }}>
                        {selectedTicket.category.replace(/_/g, ' ')}
                      </span>
                    </div>
                  )}
                  <div className="info-row">
                    <span className="info-label">Prioridade:</span>
                    <span className="info-value">{getPriorityLabel(selectedTicket.priority)}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Tipo:</span>
                    <span className="info-value">{selectedTicket.type}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Status:</span>
                    <span className="info-value">{getStatusLabel(selectedTicket.status)}</span>
                  </div>
                </div>
              </section>

              <div className="panel-info">
                <div className="info-row">
                  <span className="info-label">Responsável:</span>
                  <span className="info-value">{getUserName(selectedTicket.assigned_to)}</span>
                </div>
              </div>
            </div>
          </aside>
        ) : (
          <aside className="ticket-panel empty card">
            <div className="empty-panel">
              <span className="empty-icon-large">📊</span>
              <h3>Resumo Operacional</h3>
              <p>Selecione um chamado da fila para ver o preview detalhado.</p>
              <div className="empty-panel-metrics">
                <div className="empty-metric-card">
                  <span className="empty-metric-value">{sortedTickets.length}</span>
                  <span className="empty-metric-label">Na fila</span>
                </div>
                <div className="empty-metric-card">
                  <span className="empty-metric-value">{myTicketsCount}</span>
                  <span className="empty-metric-label">Meus atendimentos</span>
                </div>
                <div className="empty-metric-card">
                  <span className="empty-metric-value">{stats.waitingUser}</span>
                  <span className="empty-metric-label">Aguardando usuário</span>
                </div>
                <div className="empty-metric-card">
                  <span className="empty-metric-value">{stats.resolvedToday}</span>
                  <span className="empty-metric-label">Resolvidos hoje</span>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

