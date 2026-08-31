import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import StatusTimeline from '../components/StatusTimeline';
import { showToast } from '../utils/toast';
import useTicketsOverview from '../hooks/useTicketsOverview';
import TicketsHero from '../components/tickets/TicketsHero';
import MetricCard from '../components/tickets/MetricCard';
import MetricSkeleton from '../components/tickets/MetricSkeleton';
import InsightStrip from '../components/tickets/InsightStrip';
import SectorBreakdown from '../components/tickets/SectorBreakdown';
import TeamWorkload from '../components/tickets/TeamWorkload';
import QuickFilters from '../components/tickets/QuickFilters';
import EmptyState from '../components/tickets/EmptyState';
import TicketRef from '../components/tickets/TicketRef';
import TicketRowMenu from '../components/tickets/TicketRowMenu';
import { isUntouched, isSlaPaused } from '../components/tickets/ticketPermissions';
import { ACTIVE_TICKET_STATUSES } from '../utils/ticketStatus';
import { profileForDepartment } from '../components/tickets/sectorProfiles';
import '../styles/AdminTicketsPage.css';
import '../styles/TicketsExperience.css';

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

interface TicketMessage {
  id: string;
  message: string;
  author_type: string;
  author_name?: string;
  created_at: string;
  is_internal: boolean;
}

const FILTER_PRIORITY_STORAGE_KEY = 'adminTickets.filterPriority';

export default function AdminTicketsPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<InternalUser[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasUpdates, setHasUpdates] = useState(false);
  const [activeView, setActiveView] = useState<'queue' | 'overview'>('queue');
  const requestVersion = useRef(0);
  const requestInFlight = useRef(false);
  const hasLoaded = useRef(false);
  const queueSnapshot = useRef('');
  const refreshRef = useRef<() => void>(() => {});
  const previewDialog = useRef<HTMLDialogElement>(null);
  const previewTrigger = useRef<HTMLElement | null>(null);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState<'high' | 'medium' | 'low' | null>(null);
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'mine' | 'unassigned'>('all');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  // Novos estados para filtros avançados e paginação
  const [searchText, setSearchText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  // Recortes rapidos da fila (chips do cabecalho).
  const [todayOnly, setTodayOnly] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [previewMessages, setPreviewMessages] = useState<TicketMessage[]>([]);
  const [previewMessagesLoading, setPreviewMessagesLoading] = useState(false);

  // Panorama agregado: calculado no servidor sobre TODO o conjunto visivel,
  // nao sobre a pagina atual da lista.
  const {
    overview,
    loading: overviewLoading,
    error: overviewError,
    reload: reloadOverview,
  } = useTicketsOverview(departmentFilter, isContextReady);

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
        // O servidor ja limita o auxiliar administrativo aos chamados dele ou
        // sem responsavel, e ignora `assigned_to` para esse papel. Marcar
        // "meus chamados" aqui acenderia um filtro que nao filtra nada.
        setDepartmentFilter('administrativo');
        setAssignmentFilter('all');
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
    const timer = window.setTimeout(() => setSearchQuery(searchText), 300);
    return () => window.clearTimeout(timer);
  }, [searchText]);

  useEffect(() => () => { requestVersion.current += 1; }, []);

  useEffect(() => {
    if (selectedTicket) previewDialog.current?.showModal();
    else {
      previewDialog.current?.close();
      previewTrigger.current?.focus({ preventScroll: true });
    }
  }, [selectedTicket?.id]);

  useEffect(() => {
    if (!isContextReady) return;
    setHasUpdates(false);
    setSelectedIds(new Set());
    fetchTickets();
  }, [isContextReady, filterStatus, filterPriority, assignmentFilter, selectedStatuses, selectedPriorities, searchQuery, currentPage, departmentFilter, currentUserId, dateFrom, dateTo, todayOnly, overdueOnly]);

  useEffect(() => {
    if (!isContextReady) return;
    fetchUsers();
  }, [isContextReady]);

  useEffect(() => {
    if (!isContextReady) return;

    let debounceTimer = 0;
    const handleRealtimeUpdate = () => {
      window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => refreshRef.current(), 400);
    };

    window.addEventListener('ticket:new', handleRealtimeUpdate);
    window.addEventListener('ticket:updated', handleRealtimeUpdate);
    window.addEventListener('ticket:resolved', handleRealtimeUpdate);
    window.addEventListener('ticket:reopened', handleRealtimeUpdate);
    window.addEventListener('ticket:auto_close_warning', handleRealtimeUpdate);

    const refreshInterval = window.setInterval(() => {
      if (document.visibilityState === 'visible') refreshRef.current();
    }, 30000);

    return () => {
      window.removeEventListener('ticket:new', handleRealtimeUpdate);
      window.removeEventListener('ticket:updated', handleRealtimeUpdate);
      window.removeEventListener('ticket:resolved', handleRealtimeUpdate);
      window.removeEventListener('ticket:reopened', handleRealtimeUpdate);
      window.removeEventListener('ticket:auto_close_warning', handleRealtimeUpdate);
      window.clearInterval(refreshInterval);
      window.clearTimeout(debounceTimer);
    };
  }, [isContextReady]);

  // Load the activity history for whichever ticket is previewed, so the panel
  // reads like a real workspace instead of a static summary card.
  useEffect(() => {
    if (!selectedTicket) {
      setPreviewMessages([]);
      return;
    }
    let cancelled = false;
    setPreviewMessagesLoading(true);
    api.get(`/tickets/${selectedTicket.id}`)
      .then((res) => {
        if (!cancelled) setPreviewMessages(res.data?.messages || []);
      })
      .catch(() => {
        if (!cancelled) setPreviewMessages([]);
      })
      .finally(() => {
        if (!cancelled) setPreviewMessagesLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedTicket?.id]);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/internal-auth/users', { timeout: 15000 });
      console.log('Usuários carregados:', response.data);
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
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
      reloadOverview();
      showToast.success(
        newStatus === 'resolved' ? 'Chamado resolvido' : 'Status atualizado',
      );
    } catch (err: any) {
      console.error('❌ Erro ao atualizar status:', err);
      setError(err.message || 'Erro ao atualizar chamado');
      showToast.error('Não foi possível atualizar o chamado');
    }
  };

  // O backend e quem valida o escopo; aqui a interface so nao oferece o que
  // sabe que voltaria 403, e traduz a recusa quando ela vier assim mesmo.
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);

  const patchTicket = async (
    ticketId: string,
    payload: Record<string, unknown>,
    successMessage: string,
  ) => {
    setRowBusyId(ticketId);
    try {
      await api.patch(`/tickets/${ticketId}`, payload);
      await fetchTickets();
      reloadOverview();
      showToast.success(successMessage);
    } catch (err: any) {
      const message = err?.response?.data?.message
        || err?.response?.data?.error
        || 'Não foi possível atualizar o chamado';
      showToast.error(message);
    } finally {
      setRowBusyId(null);
    }
  };

  const handleRowPriority = (ticketId: string, priority: string) =>
    patchTicket(ticketId, { priority }, 'Prioridade atualizada');

  const handleRowAssign = (ticketId: string, assignedToId: string | null) =>
    patchTicket(
      ticketId,
      { assigned_to_id: assignedToId },
      assignedToId ? 'Responsável atribuído' : 'Responsável removido',
    );

  const toggleSelect = (ticketId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(ticketId) ? next.delete(ticketId) : next.add(ticketId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedTickets.length && sortedTickets.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedTickets.map(t => t.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkClose = async () => {
    if (!selectedIds.size) return;
    setBulkLoading(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map(id => api.patch(`/tickets/${id}`, { status: 'closed' }))
      );
      clearSelection();
      fetchTickets();
    } catch {
      setError('Erro ao fechar chamados em lote');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkAssignToMe = async () => {
    if (!selectedIds.size || !currentUserId) return;
    setBulkLoading(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          api.patch(`/tickets/${id}`, { status: 'in_progress', assigned_to_id: currentUserId })
        )
      );
      clearSelection();
      fetchTickets();
    } catch {
      setError('Erro ao assumir chamados em lote');
    } finally {
      setBulkLoading(false);
    }
  };

  const fetchTickets = async (background = false) => {
    if (background && requestInFlight.current) return;
    const version = ++requestVersion.current;
    requestInFlight.current = true;
    try {
      if (!background) {
        setError('');
        setRefreshing(true);
        if (!hasLoaded.current) setLoading(true);
      }
      const params = new URLSearchParams();
      const activeStatuses = [...ACTIVE_TICKET_STATUSES];
      const normalizePriorityValues = (priorities: string[]) => {
        return Array.from(
          new Set(
            priorities.flatMap((priority) => (priority === 'high' ? ['high', 'urgent'] : [priority]))
          )
        );
      };
      const effectiveAssignmentFilter = userRole === 'admin_staff' ? 'mine' : assignmentFilter;
      const effectiveDepartmentFilter = userRole === 'admin_staff'
        ? 'administrativo'
        : userRole === 'it_staff'
          ? 'ti'
          : departmentFilter;
      
      // Filtros avançados
      if (selectedStatuses.length > 0) {
        selectedStatuses.forEach((status) => params.append('status', status));
      }

      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      if (selectedStatuses.length === 0) {
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
        normalizePriorityValues(selectedPriorities).forEach((priority) => params.append('priority', priority));
      } else if (filterPriority) {
        const quickPriorities = filterPriority === 'high' ? ['high', 'urgent'] : [filterPriority];
        quickPriorities.forEach((priority) => params.append('priority', priority));
      }
      
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', new Date(dateTo + 'T23:59:59').toISOString());

      // Recortes rapidos: "Hoje" e "Atrasados" convivem com os filtros avancados.
      if (todayOnly && !dateFrom) {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        params.append('date_from', startOfDay.toISOString());
      }
      if (overdueOnly) params.append('overdue', 'true');

      // Paginação
      params.append('page', currentPage.toString());
      params.append('limit', '20');
      params.append('sort', 'created_at');
      params.append('order', 'desc');

      const response = await api.get('/tickets?' + params.toString(), { timeout: 15000 });

      if (version !== requestVersion.current) return;
      setError('');

      const responseData = response.data;
      
      // Suporte para a nova resposta com paginação e para a resposta antiga (array)
      const ticketList = responseData.data || (Array.isArray(responseData) ? responseData : []);
      const pagination = responseData.pagination;
      const snapshot = JSON.stringify({ ticketList, pagination });
      // Automatic refresh only advertises changes. The visible list, its DOM,
      // scroll position and selection belong to the person using the queue.
      if (background) {
        setHasUpdates(snapshot !== queueSnapshot.current);
        return;
      }
      queueSnapshot.current = snapshot;
      hasLoaded.current = true;
      setHasUpdates(false);
      setTotalPages(pagination?.totalPages || 1);
      setTotalTickets(pagination?.total ?? ticketList.length);
      setTickets(ticketList);
      setSelectedIds((current) => new Set([...current].filter((id) => ticketList.some((ticket: Ticket) => ticket.id === id))));
      setSelectedTicket((current) => {
        if (!current) return null;
        return ticketList.find((ticket: Ticket) => ticket.id === current.id) || null;
      });

      // Atualizar timestamp
      setLastUpdate(new Date());
    } catch (err: any) {
      if (version !== requestVersion.current) return;
      setError(err.message || 'Erro ao carregar chamados');
    } finally {
      if (version === requestVersion.current) {
        requestInFlight.current = false;
        if (!background) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }
  };
  refreshRef.current = () => { void fetchTickets(true); };

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
      case 'aguardando_aquisicao':
        return 'Aguardando aquisição';
      case 'aguardando_terceiros':
        return 'Aguardando terceiros';
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
        return 'badge-status-open';
      case 'in_progress':
        return 'badge-status-progress';
      case 'waiting_user':
        return 'badge-status-warning';
      case 'aguardando_confirmacao':
        return 'badge-status-warning';
      // Tom proprio: nao pode ser confundido com resolvido, cancelado, erro
      // nem prioridade critica.
      case 'aguardando_aquisicao':
        return 'badge-status-procurement';
      case 'aguardando_terceiros':
        return 'badge-status-external';
      case 'resolved':
        return 'badge-status-success';
      case 'closed':
        return 'badge-status-closed';
      default:
        return 'badge-status-open';
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

  const getUserName = (userId?: string) => {
    if (!userId) return 'Sem responsável';
    const user = users.find(u => u.id === userId);
    return user ? user.name : 'Atribuído';
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
    // Espera externa congela o prazo: nao ha atraso atribuivel a equipe.
    if (isSlaPaused(ticket.status)) return false;
    return getSlaElapsedHours(ticket) > getSLAThresholdHours(ticket.priority);
  };

  /**
   * Quanto do prazo do chamado já foi consumido.
   *
   * "3h em aberto" sozinho não diz nada — 3h é tranquilo num chamado de
   * prioridade baixa (168h) e é quase o limite num crítico (4h). O que a
   * fila precisa mostrar é a fração gasta, que é comparável entre linhas.
   */
  const getSlaProgress = (ticket: Ticket) => {
    const elapsed = getSlaElapsedHours(ticket);
    const target = getSLAThresholdHours(ticket.priority);
    const ratio = target > 0 ? elapsed / target : 0;
    // Em espera externa o relogio congela: o backend nao conta esse periodo no
    // SLA, e a fila precisa dizer a mesma coisa.
    if (isSlaPaused(ticket.status)) {
      return { elapsed, target, state: 'pausado', pct: Math.min(100, Math.round(ratio * 100)), paused: true };
    }
    const state = ratio >= 1 ? 'estourado' : ratio >= 0.75 ? 'critico' : ratio >= 0.5 ? 'atencao' : 'folga';
    return { elapsed, target, state, pct: Math.min(100, Math.round(ratio * 100)), paused: false };
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

  const sortedTickets = tickets;

  const panelCanResolve = selectedTicket ? canQuickResolve(selectedTicket) : false;
  const panelCanWait = selectedTicket ? canMoveToWaiting(selectedTicket) : false;

  if (!localStorage.getItem('internal_token')) {
    return null;
  }

  // O servidor e quem decide o setor; o cliente so reflete a decisao.
  const sectorProfile = profileForDepartment(overview?.scope.department ?? (departmentFilter || null));
  const canPickSector = overview?.scope.canSelectDepartment ?? (userRole === 'admin' || userRole === 'manager');

  const quickFilterState = {
    assignment: assignmentFilter,
    priority: filterPriority,
    today: todayOnly,
    overdue: overdueOnly,
  };

  const activeQuickFilters =
    (filterStatus !== 'all' ? 1 : 0) +
    (assignmentFilter !== 'all' ? 1 : 0) +
    (filterPriority ? 1 : 0) +
    (todayOnly ? 1 : 0) +
    (overdueOnly ? 1 : 0) +
    (searchText.trim() ? 1 : 0) +
    (selectedStatuses.length > 0 ? 1 : 0) +
    (selectedPriorities.length > 0 ? 1 : 0) +
    (dateFrom || dateTo ? 1 : 0);

  const clearAllFilters = () => {
    setAssignmentFilter('all');
    setFilterStatus('all');
    setFilterPriority(null);
    setTodayOnly(false);
    setOverdueOnly(false);
    setSearchText('');
    setSelectedStatuses([]);
    setSelectedPriorities([]);
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  const handleSectorChange = (department: string) => {
    setDepartmentFilter(department);
    setSelectedTicket(null);
    setCurrentPage(1);
  };

  return (
    <div className="admin-tickets-dashboard tk-workspace">
      <TicketsHero
        profile={sectorProfile}
        scopeLabel={overview?.scope.label ?? sectorProfile.label}
        lastUpdate={lastUpdate}
        searchValue={searchText}
        onSearchChange={(value) => { setActiveView('queue'); setSearchText(value); setCurrentPage(1); }}
        onRefresh={() => { fetchTickets(); reloadOverview(); }}
        onNewTicket={() => navigate('/abrir-chamado')}
        onToggleFilters={() => { setActiveView('queue'); setShowFilters(!showFilters); }}
        filtersOpen={showFilters}
        activeFilterCount={activeQuickFilters}
        refreshing={refreshing}
        hasUpdates={hasUpdates}
      />

      <div className="tk-viewbar">
        <div className="tk-view-switch" role="group" aria-label="Visualização de chamados">
          <button type="button" aria-pressed={activeView === 'queue'} onClick={() => setActiveView('queue')}>
            <i className="ti ti-list-details" aria-hidden="true" /> Atendimento
          </button>
          <button type="button" aria-pressed={activeView === 'overview'} onClick={() => setActiveView('overview')}>
            <i className="ti ti-chart-bar" aria-hidden="true" /> Panorama
          </button>
        </div>
        <div className="tk-scope-control">
          {canPickSector ? <>
            <label htmlFor="ticket-department">Equipe responsável</label>
            <select id="ticket-department" value={departmentFilter} onChange={(e) => handleSectorChange(e.target.value)}>
              <option value="">Todas as equipes</option>
              <option value="ti">Tecnologia da Informação</option>
              <option value="rh">Recursos Humanos</option>
              <option value="administrativo">Administrativo</option>
            </select>
          </> : <span>Equipe responsável: <strong>{sectorProfile.label}</strong></span>}
        </div>
      </div>

      <section className="tk-overview-view" hidden={activeView !== 'overview'} aria-label="Panorama da equipe">
        <div className="tk-section-intro"><h2>O ritmo do atendimento</h2><p>Indicadores de toda a equipe, independentemente dos filtros da sua fila.</p></div>
      {/* Falha no panorama nao derruba a fila: a lista continua utilizavel e o
          usuario ganha um caminho para tentar de novo. */}
      {overviewError && !overview && (
        <div className="tk-panorama-error" role="alert">
          <i className="ti ti-alert-circle" aria-hidden="true" />
          <span>{overviewError}</span>
          <button type="button" onClick={reloadOverview}>Tentar novamente</button>
        </div>
      )}

      {overviewLoading && !overview ? (
        <MetricSkeleton count={5} />
      ) : overview ? (
        <div className="tk-metrics" key={overview.scope.department ?? 'todos'}>
          {sectorProfile.metrics(overview).map((metric, index) => (
            <MetricCard key={metric.key} metric={metric} index={index} />
          ))}
        </div>
      ) : null}

      {overview && <InsightStrip overview={overview} />}

      {overview && (
        <SectorBreakdown overview={overview} onPickDepartment={handleSectorChange} />
      )}

      {overview && overview.workload.length > 0 && (
        <TeamWorkload
          workload={overview.workload}
          activeUserId={assignmentFilter === 'mine' ? currentUserId : undefined}
          onSelect={(userId) => {
            setAssignmentFilter(userId === currentUserId ? 'mine' : 'all');
            setCurrentPage(1);
            setActiveView('queue');
          }}
        />
      )}

      </section>

      <div className="tk-queue-view" hidden={activeView !== 'queue'}>
      <QuickFilters
        showAssignmentChips={userRole !== 'admin_staff'}
        state={quickFilterState}
        counts={{ unassigned: overview?.attention.unassigned, urgent: overview ? overview.priority.urgent + overview.priority.high : undefined, overdue: overview?.attention.overdue }}
        onChange={(next) => {
          if (next.assignment !== undefined) setAssignmentFilter(next.assignment);
          if (next.priority !== undefined) { setFilterPriority(next.priority); setSelectedPriorities([]); }
          if (next.today !== undefined) setTodayOnly(next.today);
          if (next.overdue !== undefined) setOverdueOnly(next.overdue);
          setCurrentPage(1);
        }}
        onClear={clearAllFilters}
        activeCount={activeQuickFilters}
      />

      {error && <div className="tk-queue-error" role="alert"><i className="ti ti-alert-circle" aria-hidden="true" /><span><strong>Não foi possível atualizar.</strong> Sua fila foi mantida. {error}</span><button type="button" onClick={() => fetchTickets()}>Tentar novamente</button></div>}

      {/* Filtros Avançados (Collapsible) */}
      {showFilters && (
        <div id="ticket-advanced-filters" className="advanced-filters card">
          {activeQuickFilters > 0 && (
            <div className="advanced-filters-alert">
              <strong>Filtros ativos:</strong>
              {searchText.trim() && <span>Busca: "{searchText}"</span>}
              {selectedStatuses.length > 0 && <span>Status: {selectedStatuses.length} selecionado(s)</span>}
              {selectedPriorities.length > 0 && <span>Prioridades: {selectedPriorities.length} selecionada(s)</span>}
            </div>
          )}
          <div className="advanced-filters-grid">
            <div className="filter-group">
              <label className="filter-label">Status</label>
              <div className="advanced-chip-list">
                {[
                  { value: 'open', label: 'Aberto', dotClass: 'advanced-chip-dot--open' },
                  { value: 'in_progress', label: 'Em atendimento', dotClass: 'advanced-chip-dot--in-progress' },
                  { value: 'waiting_user', label: 'Aguardando usuário', dotClass: 'advanced-chip-dot--waiting' },
                  { value: 'aguardando_confirmacao', label: 'Aguardando confirmação', dotClass: 'advanced-chip-dot--confirm' },
                  { value: 'aguardando_aquisicao', label: 'Aguardando aquisição', dotClass: 'advanced-chip-dot--procurement' },
                  { value: 'aguardando_terceiros', label: 'Aguardando terceiros', dotClass: 'advanced-chip-dot--external' },
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
                      setFilterPriority(null);
                      } else {
                        setSelectedPriorities([...selectedPriorities, priority.value]);
                      setFilterPriority(null);
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

            <div className="filter-group">
              <label className="filter-label">Período</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="date"
                  aria-label="Data inicial"
                  className="filter-input"
                  value={dateFrom}
                  onChange={e => { setDateFrom(e.target.value); setCurrentPage(1); }}
                  style={{ flex: 1 }}
                />
                <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>até</span>
                <input
                  type="date"
                  className="filter-input"
                  aria-label="Data final"
                  value={dateTo}
                  onChange={e => { setDateTo(e.target.value); setCurrentPage(1); }}
                  style={{ flex: 1 }}
                />
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
                setDateFrom('');
                setDateTo('');
                setCurrentPage(1);
              }}
            >
              Limpar filtros
            </button>
            <button
              type="button"
              className="advanced-close-btn"
              onClick={() => setShowFilters(false)}
            >
              Aplicar
            </button>
          </div>
        </div>
      )}

      {/* Layout Principal: Fila + Painel Lateral */}
      <div className="dashboard-layout">
        {/* Fila Inteligente */}
        <div className="queue-column">
          <section className="ticket-queue card ticket-queue--attached">
            <div className="queue-header card-header">
            <h3>{assignmentFilter === 'mine' ? 'Meus atendimentos' : assignmentFilter === 'unassigned' ? 'Sem responsável' : selectedStatuses.length > 0 ? 'Chamados filtrados' : 'Chamados ativos'}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className="queue-count">
                  {totalTickets} {totalTickets === 1 ? 'chamado' : 'chamados'}
                  {filterStatus !== 'all' && ` (${getStatusLabel(filterStatus)})`}
                  {filterPriority && ` • Prioridade ${getPriorityLabel(filterPriority)}`}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={exportLoading}
                  onClick={async () => {
                    setExportLoading(true);
                    try {
                      const token = localStorage.getItem('internal_token');
                      const p = new URLSearchParams();
                      const activeStatuses = [...ACTIVE_TICKET_STATUSES];
                      const deptForExport = userRole === 'admin_staff' ? 'administrativo' : userRole === 'it_staff' ? 'ti' : departmentFilter;
                      const assignmentForExport = userRole === 'admin_staff' ? 'mine' : assignmentFilter;
                      if (deptForExport) p.append('department', deptForExport);
                      if (selectedStatuses.length > 0) {
                        selectedStatuses.forEach(s => p.append('status', s));
                      } else {
                        if (filterStatus === 'all') activeStatuses.forEach(s => p.append('status', s));
                        else p.append('status', filterStatus);
                      }
                      if (selectedPriorities.length > 0) {
                        selectedPriorities
                          .flatMap(priority => priority === 'high' ? ['high', 'urgent'] : [priority])
                          .forEach(priority => p.append('priority', priority));
                      } else if (filterPriority) {
                        (filterPriority === 'high' ? ['high', 'urgent'] : [filterPriority])
                          .forEach(priority => p.append('priority', priority));
                      }
                      if (assignmentForExport === 'mine' && currentUserId) p.append('assigned_to', currentUserId);
                      else if (assignmentForExport === 'unassigned') p.append('assigned_to', 'unassigned');
                      if (searchText.trim()) p.append('search', searchText.trim());
                      if (dateFrom) p.append('date_from', dateFrom);
                      if (todayOnly && !dateFrom) { const today = new Date(); today.setHours(0, 0, 0, 0); p.append('date_from', today.toISOString()); }
                      if (overdueOnly) p.append('overdue', 'true');
                      if (dateTo) p.append('date_to', new Date(dateTo + 'T23:59:59').toISOString());
                      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/tickets/export/excel?${p.toString()}`, {
                        headers: { Authorization: `Bearer ${token}` },
                      });
                      if (!res.ok) throw new Error();
                      const blob = await res.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `chamados-${new Date().toISOString().split('T')[0]}.xlsx`;
                      a.click();
                      URL.revokeObjectURL(url);
                    } catch {
                      alert('Erro ao exportar');
                    } finally {
                      setExportLoading(false);
                    }
                  }}
                  title="Exportar chamados filtrados para Excel"
                >
                  {exportLoading ? <span className="btn-spinner" aria-label="Exportando..." /> : 'Exportar Excel'}
                </button>
              </div>
            </div>

            {/* Barra de ações em lote */}
            {selectedIds.size > 0 && (
              <div className="bulk-action-bar">
                <span className="bulk-count">{selectedIds.size} selecionado{selectedIds.size !== 1 ? 's' : ''}</span>
                <div className="bulk-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={toggleSelectAll}
                  >
                    {selectedIds.size === sortedTickets.length ? 'Desmarcar todos' : 'Selecionar todos'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleBulkAssignToMe}
                    disabled={bulkLoading}
                  >
                    Assumir selecionados
                  </button>
                  <button
                    type="button"
                    className="btn btn-warning btn-sm"
                    onClick={handleBulkClose}
                    disabled={bulkLoading}
                  >
                    Fechar selecionados
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={clearSelection}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

          {loading ? (
              <div className="tickets-list">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="ticket-card ticket-skeleton">
                    <div className="skeleton-line skeleton-line--title" />
                    <div className="skeleton-line skeleton-line--meta" />
                    <div className="skeleton-line skeleton-line--badges" />
                  </div>
                ))}
              </div>
            ) : sortedTickets.length === 0 ? (
              activeQuickFilters > 0 ? (
                <EmptyState
                  tone="filtered"
                  icon="ti-filter-off"
                  title="Nenhum chamado com esses filtros"
                  description="Nada na fila corresponde à combinação atual. Reveja os recortes ou volte para a fila inteira."
                  actionLabel="Limpar filtros"
                  onAction={clearAllFilters}
                />
              ) : (
                <EmptyState
                  tone="calm"
                  icon="ti-checks"
                  title="Tudo tranquilo por aqui"
                  description="Nenhum chamado em aberto neste escopo. A fila está em dia."
                />
              )
            ) : (
              <div className="tickets-list" role="list" aria-label="Lista de chamados">
                <div className="tk-list-head" aria-hidden="true"><span>Chamado / Solicitante</span><span>Situação</span><span>Responsável</span><span /></div>
                {sortedTickets.map((ticket) => {
                  const overdue = isTicketOverdue(ticket);
                  const sla = getSlaProgress(ticket);
                  return (
                    <article key={ticket.id} role="listitem" className={`ticket-card tk-ticket-row ${selectedTicket?.id === ticket.id ? 'active' : ''} ${selectedIds.has(ticket.id) ? 'ticket-card--selected' : ''}`}>
                      <input type="checkbox" className="ticket-checkbox" checked={selectedIds.has(ticket.id)} onChange={() => {}} onClick={(e) => toggleSelect(ticket.id, e)} aria-label={`Selecionar ${ticket.title}`} />
                      <div className="tk-ticket-subject">
                        <div className="tk-ticket-reference"><TicketRef id={ticket.id} /><span className={`tk-priority-label tk-priority-label--${ticket.priority}`}><span aria-hidden="true" />{getPriorityLabel(ticket.priority)}</span>{isUntouched(ticket) && <span className="tk-unread-dot" title="Ainda sem primeira resposta" aria-label="Novo chamado" />}</div>
                        <button type="button" className="tk-ticket-title" onClick={(event) => { previewTrigger.current = event.currentTarget; setSelectedTicket(ticket); }}>{ticket.title}</button>
                        <p className="tk-ticket-requester">{ticket.requester_name || 'Solicitante interno'}{ticket.requester_department && <span> · {ticket.requester_department}</span>}{ticket.category && <span className="tk-ticket-category"> · {ticket.category.replace(/_/g, ' ')}</span>}</p>
                      </div>
                      <div className="tk-ticket-state">
                        <span className={`badge ${getStatusBadgeClass(ticket.status)}`}>{getStatusLabel(ticket.status)}</span>
                        <span className={`tk-ticket-age ${overdue ? 'is-overdue' : ''}`} title={`Aberto em ${new Date(ticket.created_at).toLocaleString('pt-BR')}. Meta de SLA: ${sla.target}h.`}><i className={`ti ${overdue ? 'ti-clock-exclamation' : 'ti-clock'}`} aria-hidden="true" />{sla.paused ? 'SLA pausado' : overdue ? 'Meta de SLA excedida' : getTimeAgo(ticket.created_at)}</span>
                      </div>
                      <div className="tk-ticket-owner">
                        <span className={`tk-owner-avatar ${!ticket.assigned_to ? 'is-unassigned' : ''}`} aria-hidden="true">{ticket.assigned_to ? getUserName(ticket.assigned_to).split(' ').map(part => part[0]).slice(0, 2).join('') : <i className="ti ti-user" />}</span>
                        <div><span className="tk-owner-name">{getUserName(ticket.assigned_to)}</span>{!ticket.assigned_to && ticket.status === 'open' && <button type="button" className="tk-assume" disabled={rowBusyId === ticket.id} onClick={() => patchTicket(ticket.id, { status: 'in_progress', assigned_to_id: currentUserId }, 'Chamado atribuído a você')}>Assumir chamado</button>}</div>
                      </div>
                      <div className="tk-ticket-menu">                          <TicketRowMenu
                            ticket={ticket}
                            role={userRole}
                            userId={currentUserId}
                            users={users}
                            busy={rowBusyId === ticket.id}
                            onOpen={() => navigate(`/admin/chamados/${ticket.id}`)}
                            onAssume={() => patchTicket(
                              ticket.id,
                              { status: 'in_progress', assigned_to_id: currentUserId },
                              'Chamado atribuído a você',
                            )}
                            onStatus={(status) => patchTicket(
                              ticket.id,
                              { status },
                              status === 'in_progress' ? 'Atendimento retomado' : 'Status atualizado',
                            )}
                            onPause={(status, reason) => patchTicket(
                              ticket.id,
                              { status, pause_reason: reason || undefined },
                              'Chamado em espera · SLA pausado',
                            )}
                            onPriority={(priority) => handleRowPriority(ticket.id, priority)}
                            onAssign={(assignee) => handleRowAssign(ticket.id, assignee)}
                          /></div>
                    </article>
                  );
                })}
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
                  Anterior
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
                  Próxima
                </button>
              </div>
            )}
          </section>
        </div>

        {/* Painel Lateral do Ticket Selecionado */}
        <dialog ref={previewDialog} className="tk-preview-dialog" aria-labelledby="ticket-preview-title" onCancel={() => setSelectedTicket(null)} onClose={() => setSelectedTicket(null)} onClick={(event) => { if (event.target === event.currentTarget) setSelectedTicket(null); }}>
        {selectedTicket && (
          <aside className="ticket-panel card">
            <div className="panel-header card-header">
              <div className="panel-header-main">
                <span className="panel-ticket-id">#{selectedTicket.id.substring(0, 8).toUpperCase()}</span>
                <h3 id="ticket-preview-title" className="panel-title">{selectedTicket.title}</h3>
              </div>
              <button 
                className="close-panel"
                onClick={() => setSelectedTicket(null)}
                aria-label="Fechar detalhes"
              >
                <i className="ti ti-x" />
              </button>
            </div>

            <div className="panel-content card-body">
              <div key={selectedTicket.id} className="panel-fade-in">
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

              <div className="panel-timeline-wrap">
                <StatusTimeline currentStatus={selectedTicket.status} />
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

              <section className="panel-section panel-section--description">
                <h4>Descrição</h4>
                <p>{selectedTicket.description}</p>
              </section>

              <section className="panel-section">
                <h4>Histórico</h4>
                {previewMessagesLoading ? (
                  <p className="panel-history-empty">Carregando histórico...</p>
                ) : previewMessages.length === 0 ? (
                  <p className="panel-history-empty">Nenhuma mensagem registrada ainda.</p>
                ) : (
                  <ul className="panel-history-list">
                    {previewMessages.slice(-6).map((msg) => (
                      <li key={msg.id} className={`panel-history-item ${msg.is_internal ? 'is-internal' : ''}`}>
                        <span className="panel-history-time">
                          {new Date(msg.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="panel-history-author">
                          {msg.author_name || (msg.author_type === 'system' ? 'Sistema' : 'Solicitante')}
                          {msg.is_internal ? ' · nota interna' : ''}
                        </span>
                        <p className="panel-history-text">{msg.message}</p>
                      </li>
                    ))}
                  </ul>
                )}
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
                      {selectedTicket.department === 'administrativo' ? 'Administrativo'
                        : selectedTicket.department === 'rh' ? 'RH'
                        : 'TI'}
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
                    <span className="info-label">Responsável:</span>
                    <span className="info-value">{getUserName(selectedTicket.assigned_to)}</span>
                  </div>
                </div>
              </section>
              </div>
            </div>
          </aside>
        )}
        </dialog>
      </div>
      </div>
    </div>
  );
}
