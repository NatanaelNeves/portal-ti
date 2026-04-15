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
  first_response_at?: string | null;
  resolved_at?: string | null;
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

const FILTER_PRIORITY_STORAGE_KEY = 'adminTickets.filterPriority';

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
  const [isContextReady, setIsContextReady] = useState(false);
  const [priorityFeedback, setPriorityFeedback] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('internal_token');
    const userData = localStorage.getItem('internal_user');
    
    if (!token) {
      navigate('/admin/login');
      return;
    }

    if (!userData) {
      navigate('/admin/login');
      return;
    }

    try {
      const user = JSON.parse(userData);
      setCurrentUserId(user.id || '');
      setUserRole(user.role || '');
      setCurrentPage(1);

      const savedPriority = localStorage.getItem(FILTER_PRIORITY_STORAGE_KEY);
      if (savedPriority === 'high' || savedPriority === 'medium' || savedPriority === 'low') {
        setFilterPriority(savedPriority);
      }

      if (user.role === 'admin_staff') {
        setDepartmentFilter('administrativo');
        setAssignmentFilter('mine');
      } else if (user.role === 'it_staff') {
        setDepartmentFilter('ti');
        setAssignmentFilter('all');
      } else {
        setDepartmentFilter('');
        setAssignmentFilter('all');
      }

      setIsContextReady(true);
    } catch {
      navigate('/admin/login');
      return;
    }
  }, [navigate]);

  useEffect(() => {
    if (filterPriority) {
      localStorage.setItem(FILTER_PRIORITY_STORAGE_KEY, filterPriority);
    } else {
      localStorage.removeItem(FILTER_PRIORITY_STORAGE_KEY);
    }
  }, [filterPriority]);

  useEffect(() => {
    if (!priorityFeedback) return;

    const timer = window.setTimeout(() => {
      setPriorityFeedback('');
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [priorityFeedback]);

  useEffect(() => {
    if (!isContextReady) return;
    fetchTickets();
    fetchUsers();
  }, [isContextReady, filterStatus, assignmentFilter, selectedStatuses, selectedPriorities, searchText, currentPage, departmentFilter, currentUserId]);

  useEffect(() => {
    if (!isContextReady) return;

    const handleRealtimeUpdate = () => {
      fetchTickets();
    };

    window.addEventListener('ticket:new', handleRealtimeUpdate);
    window.addEventListener('ticket:updated', handleRealtimeUpdate);
    window.addEventListener('ticket:resolved', handleRealtimeUpdate);
    window.addEventListener('ticket:reopened', handleRealtimeUpdate);
    window.addEventListener('ticket:auto_close_warning', handleRealtimeUpdate);

    const refreshInterval = window.setInterval(() => {
      fetchTickets();
    }, 30000);

    return () => {
      window.removeEventListener('ticket:new', handleRealtimeUpdate);
      window.removeEventListener('ticket:updated', handleRealtimeUpdate);
      window.removeEventListener('ticket:resolved', handleRealtimeUpdate);
      window.removeEventListener('ticket:reopened', handleRealtimeUpdate);
      window.removeEventListener('ticket:auto_close_warning', handleRealtimeUpdate);
      window.clearInterval(refreshInterval);
    };
  }, [isContextReady, filterStatus, assignmentFilter, selectedStatuses, selectedPriorities, searchText, currentPage, departmentFilter, currentUserId]);

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
      const hasAdvancedFilters = selectedStatuses.length > 0 || selectedPriorities.length > 0 || searchText.trim() !== '';
      const activeStatuses = ['open', 'in_progress', 'waiting_user', 'aguardando_confirmacao'];
      const effectiveAssignmentFilter = userRole === 'admin_staff' ? 'mine' : assignmentFilter;
      const effectiveDepartmentFilter = userRole === 'admin_staff'
        ? 'administrativo'
        : userRole === 'it_staff'
          ? 'ti'
          : departmentFilter;
      
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

      if (selectedStatuses.length > 0) {
        selectedStatuses.forEach((status) => params.append('status', status));
      } else if (!hasAdvancedFilters) {
        if (filterStatus === 'all') {
          activeStatuses.forEach((status) => params.append('status', status));
        } else if (filterStatus !== 'all') {
          params.append('status', filterStatus);
        }
      }
      
      if (effectiveAssignmentFilter === 'mine' && currentUserId) {
        params.append('assigned_to', currentUserId);
      } else if (effectiveAssignmentFilter === 'unassigned') {
        params.append('assigned_to', 'unassigned');
      }
      
      // Filtro por departamento
      if (effectiveDepartmentFilter) {
        params.append('department', effectiveDepartmentFilter);
      }

      if (selectedPriorities.length > 0) {
        selectedPriorities.forEach((priority) => params.append('priority', priority));
      } else if (!hasAdvancedFilters && filterPriority) {
        params.append('priority', filterPriority);
      }
      
      // Paginação
      params.append('page', currentPage.toString());
      params.append('limit', '20');
      params.append('sort', 'created_at');
      params.append('order', 'desc');

      const summaryParams = new URLSearchParams();
      if (effectiveDepartmentFilter) {
        summaryParams.append('department', effectiveDepartmentFilter);
      }
      summaryParams.append('page', '1');
      summaryParams.append('limit', '1');
      summaryParams.append('sort', 'updated_at');
      summaryParams.append('order', 'desc');

      const [response, summaryResponse] = await Promise.all([
        api.get(`/tickets?${params.toString()}`),
        api.get(`/tickets?${summaryParams.toString()}`)
      ]);

      const responseData = response.data;
      const summaryData = summaryResponse.data;
      
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
      console.log('  - Awaiting Confirmation:', ticketList.filter((t: Ticket) => t.status === 'aguardando_confirmacao').length);
      
      setTickets(ticketList);

      // Resumo executivo: usa stats da consulta sem filtros da lista
      if (summaryData?.stats) {
        setStats({
          waitingUser: Number(summaryData.stats.waitingUser || 0),
          inProgress: Number(summaryData.stats.inProgress || 0),
          newToday: Number(summaryData.stats.newToday || 0),
          resolvedToday: Number(summaryData.stats.resolvedToday || 0),
        });
      } else if (responseData.stats) {
        setStats({
          waitingUser: Number(responseData.stats.waitingUser || 0),
          inProgress: Number(responseData.stats.inProgress || 0),
          newToday: Number(responseData.stats.newToday || 0),
          resolvedToday: Number(responseData.stats.resolvedToday || 0),
        });
      } else {
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
      }
      
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
        return 'Em atendimento';
      case 'waiting_user':
        return 'Aguardando usuário';
      case 'aguardando_confirmacao':
        return 'Aguardando confirmação';
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

  const getTypeLabel = (type?: string) => {
    switch (type) {
      case 'incident':
        return 'Incidente';
      case 'request':
        return 'Solicitação';
      case 'change':
        return 'Mudança';
      case 'problem':
        return 'Problema';
      default:
        return 'Outro';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'open':
        return 'badge-status-neutral';
      case 'in_progress':
        return 'badge-status-progress';
      case 'waiting_user':
        return 'badge-status-warning';
      case 'aguardando_confirmacao':
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

  const getTypeBadgeClass = (type?: string) => {
    if (type === 'incident') {
      return 'badge-type-incident';
    }

    return 'badge-type-neutral';
  };

  const getMetricValueClass = (value: number) => {
    return value === 0 ? 'metric-value metric-value--muted' : 'metric-value metric-value--strong';
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
      const activeStatuses = ['open', 'in_progress', 'waiting', 'waiting_user', 'aguardando_confirmacao'];
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

  const getAgeToneClass = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours >= 24) return 'time-ago--critical';
    if (diffHours >= 8) return 'time-ago--warning';
    return 'time-ago--fresh';
  };

  const handlePriorityChipSelect = (value: 'high' | 'medium' | 'low' | null) => {
    setFilterPriority(value);
    if (value) {
      setPriorityFeedback(`Prioridade ${getPriorityLabel(value)} aplicada`);
    } else {
      setPriorityFeedback('Filtro de prioridade limpo');
    }
    setCurrentPage(1);
  };

  const getSLAThresholdHours = (priority: string) => {
    if (priority === 'critical') return 4;
    if (priority === 'high') return 24;
    if (priority === 'medium') return 72;
    return 168;
  };

  const getSlaElapsedHours = (ticket: Ticket) => {
    const start = new Date(ticket.created_at).getTime();
    const end = ticket.resolved_at ? new Date(ticket.resolved_at).getTime() : Date.now();
    const diff = Math.max(0, end - start);
    return Math.round(diff / (1000 * 60 * 60));
  };

  const isTicketOverdue = (ticket: Ticket) => {
    if (ticket.status === 'closed' || ticket.status === 'resolved') return false;
    return getSlaElapsedHours(ticket) > getSLAThresholdHours(ticket.priority);
  };

  const canQuickResolve = (ticket: Ticket) => {
    if (!ticket.assigned_to) return false;
    if (ticket.assigned_to !== currentUserId) return false;
    return ticket.status !== 'closed' && ticket.status !== 'resolved';
  };

  const canMoveToWaiting = (ticket: Ticket) => {
    if (!ticket.assigned_to) return false;
    if (ticket.assigned_to !== currentUserId) return false;
    return ticket.status !== 'closed' && ticket.status !== 'open';
  };

  // A filtragem agora é feita no backend para manter paginação e contagem consistentes
  const hasAdvancedFilters = selectedStatuses.length > 0 || selectedPriorities.length > 0 || searchText.trim() !== '';
  const filteredTickets = tickets;
  
  console.log('🔍 Filtros ativos:', { 
    filterStatus, 
    filterPriority,
    selectedStatuses, 
    selectedPriorities, 
    assignmentFilter,
    totalTickets: tickets.length,
    afterFilter: filteredTickets.length 
  });
  
  // A API já retorna ordenado e paginado
  const sortedTickets = filteredTickets;

  const myTicketsCount = tickets.filter(t => 
    t.assigned_to === currentUserId && 
    t.status !== 'closed' && 
    t.status !== 'resolved'
  ).length;

  const activeFiltersCount = selectedStatuses.length + selectedPriorities.length + (searchText.trim() ? 1 : 0);
  const formattedLastUpdate = lastUpdate
    ? `${lastUpdate.toLocaleDateString('pt-BR')} às ${lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    : 'Ainda sem atualização';
  const priorityOptions: Array<{ value: 'high' | 'medium' | 'low' | null; label: string; count: number }> = [
    { value: null, label: 'Todas', count: totalTickets || sortedTickets.length },
    { value: 'high', label: 'Alta', count: getPriorityCount('high') },
    { value: 'medium', label: 'Media', count: getPriorityCount('medium') },
    { value: 'low', label: 'Baixa', count: getPriorityCount('low') },
  ];
  const panelCanResolve = selectedTicket ? canQuickResolve(selectedTicket) : false;
  const panelCanWait = selectedTicket ? canMoveToWaiting(selectedTicket) : false;

  if (!localStorage.getItem('internal_token')) {
    return null;
  }

  return (
    <div className="admin-tickets-dashboard">
      <header className="dashboard-header card">
        <div className="dashboard-header-main">
          <h1>{departmentFilter === 'administrativo' ? 'Central Operacional Administrativa' : 'Central Operacional TI'}</h1>
        </div>
        <div className="dashboard-header-status">
          <span className="status-chip">
            <span className="status-dot" aria-hidden="true"></span>
            <span>{formattedLastUpdate}</span>
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
        <div className="priority-toolbar" role="group" aria-label="Filtrar por prioridade">
          <span className="priority-toolbar-label">Prioridade</span>
          <div className="priority-chip-row">
            {priorityOptions.map((option) => {
              const isActive = option.value === null ? filterPriority === null : filterPriority === option.value;
              const optionClass = option.value === null ? 'all' : option.value;
              return (
                <button
                  key={option.value ?? 'all'}
                  type="button"
                  className={`priority-chip priority-chip--${optionClass} ${isActive ? 'is-active' : ''}`}
                  onClick={() => {
                    if (!hasAdvancedFilters) {
                      handlePriorityChipSelect(option.value);
                    }
                  }}
                  disabled={hasAdvancedFilters}
                  aria-pressed={isActive}
                >
                  <span>{option.label}</span>
                  <span className="priority-chip-count">{option.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="day-summary-compact" aria-label="Resumo do dia">
          <div className="summary-pill">
            <span className={getMetricValueClass(stats.newToday)}>{stats.newToday}</span>
            <span className="summary-pill-label">Novos</span>
          </div>
          <div className="summary-pill">
            <span className={getMetricValueClass(stats.resolvedToday)}>{stats.resolvedToday}</span>
            <span className="summary-pill-label">Resolvidos</span>
          </div>
        </div>
      </div>

      {priorityFeedback && (
        <div className="priority-feedback" role="status" aria-live="polite">
          {priorityFeedback}
        </div>
      )}

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

      {/* Filtros Avançados (Collapsible) */}
      {showFilters && (
        <div className="advanced-filters card">
          {hasAdvancedFilters && (
            <div className="advanced-filters-alert">
              <strong>Filtros ativos:</strong>
              {searchText.trim() && <span>Busca: "{searchText}"</span>}
              {selectedStatuses.length > 0 && <span>Status: {selectedStatuses.length} selecionado(s)</span>}
              {selectedPriorities.length > 0 && <span>Prioridades: {selectedPriorities.length} selecionada(s)</span>}
            </div>
          )}
          <div className="advanced-filters-grid">
            <div className="filter-group">
              <label className="filter-label">Buscar</label>
              <div className="filter-input-wrap">
                <span className="filter-input-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                    <path d="M20 20L16.6 16.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </span>
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
              <label className="filter-label">Status</label>
              <div className="advanced-chip-list">
                {[
                  { value: 'open', label: 'Aberto', dotClass: 'advanced-chip-dot--open' },
                  { value: 'in_progress', label: 'Em atendimento', dotClass: 'advanced-chip-dot--in-progress' },
                  { value: 'waiting_user', label: 'Aguardando usuário', dotClass: 'advanced-chip-dot--waiting' },
                  { value: 'aguardando_confirmacao', label: 'Aguardando confirmação', dotClass: 'advanced-chip-dot--confirm' },
                  { value: 'resolved', label: 'Resolvido', dotClass: 'advanced-chip-dot--resolved' },
                  { value: 'closed', label: 'Fechado', dotClass: 'advanced-chip-dot--closed' }
                ].map(status => (
                  <button
                    key={status.value}
                    type="button"
                    className={`advanced-chip ${selectedStatuses.includes(status.value) ? 'is-selected' : ''}`}
                    aria-pressed={selectedStatuses.includes(status.value)}
                    onClick={() => {
                      if (selectedStatuses.includes(status.value)) {
                        setSelectedStatuses(selectedStatuses.filter(s => s !== status.value));
                      } else {
                        setSelectedStatuses([...selectedStatuses, status.value]);
                      }
                      setCurrentPage(1);
                    }}
                  >
                    <span className={`advanced-chip-dot ${status.dotClass}`} aria-hidden="true"></span>
                    {status.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <label className="filter-label">Prioridade</label>
              <div className="advanced-chip-list">
                {[
                  { value: 'high', label: 'Alta', dotClass: 'advanced-chip-dot--high' },
                  { value: 'medium', label: 'Média', dotClass: 'advanced-chip-dot--medium' },
                  { value: 'low', label: 'Baixa', dotClass: 'advanced-chip-dot--low' }
                ].map(priority => (
                  <button
                    key={priority.value}
                    type="button"
                    className={`advanced-chip ${selectedPriorities.includes(priority.value) ? 'is-selected' : ''}`}
                    aria-pressed={selectedPriorities.includes(priority.value)}
                    onClick={() => {
                      if (selectedPriorities.includes(priority.value)) {
                        setSelectedPriorities(selectedPriorities.filter(p => p !== priority.value));
                      } else {
                        setSelectedPriorities([...selectedPriorities, priority.value]);
                      }
                      setCurrentPage(1);
                    }}
                  >
                    <span className={`advanced-chip-dot ${priority.dotClass}`} aria-hidden="true"></span>
                    {priority.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="advanced-filters-footer">
            <button 
              type="button"
              className="advanced-clear-btn advanced-clear-btn-inline"
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
        <div className="queue-column">
          <div className="assignment-filters assignment-filters--integrated">
            {userRole !== 'admin_staff' && (
              <button
                className={`filter-btn ${assignmentFilter === 'all' && filterStatus === 'all' ? 'active' : ''}`}
                onClick={() => {
                  setAssignmentFilter('all');
                  setFilterStatus('all');
                }}
              >
                Fila ativa
              </button>
            )}
            <button
              className={`filter-btn filter-mine ${assignmentFilter === 'mine' ? 'active' : ''}`}
              onClick={() => {
                setAssignmentFilter('mine');
                setFilterStatus('all');
              }}
            >
              Meus atendimentos ({myTicketsCount})
            </button>
            {userRole !== 'admin_staff' && (
              <button
                className={`filter-btn ${assignmentFilter === 'unassigned' ? 'active' : ''}`}
                onClick={() => {
                  setAssignmentFilter('unassigned');
                  setFilterStatus('all');
                }}
              >
                Não atribuídos
              </button>
            )}
            <button
              className={`filter-btn filter-btn-toggle ${showFilters ? 'active' : ''}`}
              onClick={() => {
                setShowFilters(!showFilters);
                if (!showFilters) {
                  setFilterStatus('all');
                  setFilterPriority(null);
                }
              }}
            >
              {showFilters ? 'Ocultar filtros' : 'Filtros avançados'}
              {hasAdvancedFilters && (
                <span className="filter-counter">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
          <section className="ticket-queue card ticket-queue--attached">
            <div className="queue-header card-header">
              <h2>Fila de Atendimento</h2>
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
                <small>Voce esta em dia com o atendimento</small>
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
                              <span className="requester-name">{ticket.requester_name}</span>
                              {ticket.requester_email && (
                                <span className="requester-meta">{ticket.requester_email}</span>
                              )}
                              {(ticket.requester_department || ticket.requester_unit) && (
                                <span className="requester-meta">
                                  {ticket.requester_department && `${ticket.requester_department}`}
                                  {ticket.requester_department && ticket.requester_unit && ' • '}
                                  {ticket.requester_unit && `${ticket.requester_unit}`}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="requester-name">Solicitante interno</span>
                          )}
                        </div>
                      </div>
                      <span className={`time-ago ${getAgeToneClass(ticket.created_at)}`}>{getTimeAgo(ticket.created_at)}</span>
                    </div>

                    <div className="ticket-card-badges">
                      {ticket.department && ticket.department !== 'ti' && (
                        <span className="badge badge-dept-admin">Administrativo</span>
                      )}
                      {(!ticket.department || ticket.department === 'ti') && departmentFilter === '' && (
                        <span className="badge badge-dept-ti">TI</span>
                      )}
                      {ticket.category && (
                        <span className="badge badge-category">{ticket.category}</span>
                      )}
                      <span className={`badge ${getTypeBadgeClass(ticket.type)}`}>
                        {getTypeLabel(ticket.type)}
                      </span>
                      <span className={`badge ${getPriorityBadgeClass(ticket.priority)}`}>
                        {getPriorityLabel(ticket.priority)}
                      </span>
                      <span className={`badge ${getStatusBadgeClass(ticket.status)}`}>
                        {getStatusLabel(ticket.status)}
                      </span>
                    </div>

                    <div className="ticket-card-footer">
                      <span className="assigned">
                        {getUserName(ticket.assigned_to)}
                      </span>
                      <span className={`sla-chip ${isTicketOverdue(ticket) ? 'sla-chip-overdue' : ''}`}>
                        {getSlaElapsedHours(ticket)}h
                        {isTicketOverdue(ticket) ? ' • Atrasado' : ''}
                      </span>
                      <div className="footer-actions">
                        <div className="card-quick-actions">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/chamados/${ticket.id}`);
                            }}
                            title="Ver detalhes"
                          >
                            Detalhes
                          </button>
                          {canQuickResolve(ticket) && (
                            <button
                              type="button"
                              className="btn btn-success btn-sm"
                              onClick={(e) => handleQuickStatusChange(ticket.id, 'resolved', e)}
                              title="Resolver chamado"
                            >
                              Resolver
                            </button>
                          )}
                        </div>
                        {!ticket.assigned_to && ticket.status === 'open' && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm btn-assume"
                            onClick={(e) => handleQuickAssume(ticket.id, e)}
                            title="Assumir atendimento"
                          >
                            Assumir
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
                  Proxima ▶
                </button>
              </div>
            )}
          </section>
        </div>

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
                <span className={`badge ${getTypeBadgeClass(selectedTicket.type)}`}>
                  {getTypeLabel(selectedTicket.type)}
                </span>
              </div>

              <div className="panel-meta">
                Aberto há {getTimeAgo(selectedTicket.created_at)} • Responsável: {getUserName(selectedTicket.assigned_to)}
              </div>

              <div className="panel-actions">
                <button 
                  className="btn btn-primary btn-block"
                  onClick={() => navigate(`/admin/chamados/${selectedTicket.id}`)}
                >
                  Ver detalhes completos
                </button>
                <button 
                  className="btn btn-warning"
                  onClick={() => handleQuickStatusChange(selectedTicket.id, 'waiting_user')}
                  disabled={!panelCanWait}
                  title={panelCanWait ? 'Marcar como aguardando resposta do usuário' : 'Somente o responsável atual pode usar esta ação.'}
                >
                  Aguardar
                </button>
                <button 
                  className="btn btn-success"
                  onClick={() => handleQuickStatusChange(selectedTicket.id, 'resolved')}
                  disabled={!panelCanResolve}
                  title={panelCanResolve ? 'Marcar ticket como resolvido' : 'Somente o responsável atual pode usar esta ação.'}
                >
                  Resolver
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
                  <span className={getMetricValueClass(sortedTickets.length)}>{sortedTickets.length}</span>
                  <span className="empty-metric-label">Na fila</span>
                </div>
                <div className="empty-metric-card">
                  <span className={getMetricValueClass(myTicketsCount)}>{myTicketsCount}</span>
                  <span className="empty-metric-label">Meus atendimentos</span>
                </div>
                <div className="empty-metric-card">
                  <span className={getMetricValueClass(stats.waitingUser)}>{stats.waitingUser}</span>
                  <span className="empty-metric-label">Aguardando usuário</span>
                </div>
                <div className="empty-metric-card">
                  <span className={getMetricValueClass(stats.resolvedToday)}>{stats.resolvedToday}</span>
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

