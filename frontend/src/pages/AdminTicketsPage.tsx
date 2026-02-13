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
  critical: number;
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
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'mine' | 'unassigned'>('all');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [stats, setStats] = useState<TicketStats>({
    critical: 0,
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
    }

    fetchTickets();
    fetchUsers();
  }, [filterStatus, assignmentFilter, selectedStatuses, selectedPriorities, searchText, currentPage, navigate]);

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
        critical: ticketList.filter((t: Ticket) => t.priority === 'high' && t.status !== 'closed').length,
        waitingUser: ticketList.filter((t: Ticket) => t.status === 'waiting_user').length,
        inProgress: ticketList.filter((t: Ticket) => t.status === 'in_progress').length,
        newToday: ticketList.filter((t: Ticket) => new Date(t.created_at).toDateString() === today).length,
        resolvedToday: ticketList.filter((t: Ticket) => 
          t.status === 'resolved' && 
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

  const getUserName = (userId?: string) => {
    if (!userId) return 'Ninguém';
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

  // Aplicar filtro de status aos tickets
  const filteredTickets = tickets.filter(ticket => {
    // Se há filtros avançados ativos (status OU prioridades), não aplicar filtro frontend
    // pois o backend já filtrou corretamente
    if (selectedStatuses.length > 0 || selectedPriorities.length > 0) {
      return true;
    }
    
    // Se filterStatus for 'all' e não há filtros avançados,
    // mostra apenas tickets ativos (não resolvidos nem fechados)
    if (filterStatus === 'all') {
      return ticket.status !== 'resolved' && ticket.status !== 'closed';
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

  // Verifica se há filtros avançados ativos
  const hasAdvancedFilters = selectedStatuses.length > 0 || selectedPriorities.length > 0 || searchText.trim() !== '';

  if (!localStorage.getItem('internal_token')) {
    return null;
  }

  return (
    <div className="admin-tickets-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h1>🧑‍💻 Central Operacional TI</h1>
        <p>Painel de atendimento em tempo real</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {hasAdvancedFilters && (
        <div style={{
          background: '#fff3cd',
          border: '1px solid #ffc107',
          padding: '10px 15px',
          borderRadius: '4px',
          marginBottom: '15px',
          fontSize: '14px'
        }}>
          ℹ️ <strong>Filtros avançados ativos.</strong> Os filtros rápidos abaixo estão desabilitados.
        </div>
      )}

      {/* Timestamp de Última Atualização */}
      {lastUpdate && (
        <div style={{
          textAlign: 'right',
          fontSize: '12px',
          color: '#6c757d',
          marginBottom: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '8px'
        }}>
          <span>🕐</span>
          <span>
            Última atualização: {lastUpdate.toLocaleDateString('pt-BR')} às {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )}

      {/* Indicadores Rápidos */}
      <div className="quick-stats">
        <div 
          className="stat-card critical"
          onClick={() => {
            if (!hasAdvancedFilters) {
              setFilterStatus(filterStatus === 'open' && stats.critical > 0 ? 'all' : 'open');
            }
          }}
          style={{
            cursor: hasAdvancedFilters ? 'not-allowed' : 'pointer',
            opacity: hasAdvancedFilters ? 0.5 : 1,
            border: filterStatus === 'open' ? '3px solid #dc3545' : undefined,
            boxShadow: filterStatus === 'open' ? '0 0 10px rgba(220, 53, 69, 0.3)' : undefined
          }}
        >
          <div className="stat-icon">🔴</div>
          <div className="stat-content">
            <div className="stat-number">{stats.critical}</div>
            <div className="stat-label">Críticos</div>
          </div>
        </div>

        <div 
          className="stat-card waiting"
          onClick={() => {
            if (!hasAdvancedFilters) {
              setFilterStatus(filterStatus === 'waiting_user' ? 'all' : 'waiting_user');
            }
          }}
          style={{
            cursor: hasAdvancedFilters ? 'not-allowed' : 'pointer',
            opacity: hasAdvancedFilters ? 0.5 : 1,
            border: filterStatus === 'waiting_user' ? '3px solid #ffc107' : undefined,
            boxShadow: filterStatus === 'waiting_user' ? '0 0 10px rgba(255, 193, 7, 0.3)' : undefined
          }}
        >
          <div className="stat-icon">🟡</div>
          <div className="stat-content">
            <div className="stat-number">{stats.waitingUser}</div>
            <div className="stat-label">Aguard. Usuário</div>
          </div>
        </div>

        <div 
          className="stat-card progress"
          onClick={() => {
            if (!hasAdvancedFilters) {
              setFilterStatus(filterStatus === 'in_progress' ? 'all' : 'in_progress');
            }
          }}
          style={{
            cursor: hasAdvancedFilters ? 'not-allowed' : 'pointer',
            opacity: hasAdvancedFilters ? 0.5 : 1,
            border: filterStatus === 'in_progress' ? '3px solid #007bff' : undefined,
            boxShadow: filterStatus === 'in_progress' ? '0 0 10px rgba(0, 123, 255, 0.3)' : undefined
          }}
        >
          <div className="stat-icon">🔵</div>
          <div className="stat-content">
            <div className="stat-number">{stats.inProgress}</div>
            <div className="stat-label">Em Atendimento</div>
          </div>
        </div>

        <div className="stat-card new">
          <div className="stat-icon">⚪</div>
          <div className="stat-content">
            <div className="stat-number">{stats.newToday}</div>
            <div className="stat-label">Novos Hoje</div>
          </div>
        </div>

        <div className="stat-card resolved">
          <div className="stat-icon">🟢</div>
          <div className="stat-content">
            <div className="stat-number">{stats.resolvedToday}</div>
            <div className="stat-label">Resolvidos Hoje</div>
          </div>
        </div>
      </div>

      {/* Indicador de Filtro Rápido Ativo */}
      {filterStatus !== 'all' && !hasAdvancedFilters && (
        <div style={{
          background: '#fff3cd',
          border: '2px solid #ffc107',
          borderRadius: '8px',
          padding: '12px 20px',
          marginBottom: '15px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>
              {filterStatus === 'open' ? '🔴' : filterStatus === 'waiting_user' ? '🟡' : filterStatus === 'in_progress' ? '🔵' : '📋'}
            </span>
            <span style={{ fontWeight: '600', color: '#856404' }}>
              Filtro ativo: {getStatusLabel(filterStatus)}
            </span>
          </div>
          <button
            onClick={() => setFilterStatus('all')}
            style={{
              background: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '6px 16px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            ✕ Limpar Filtro
          </button>
        </div>
      )}

      {/* Filtros de Atribuição */}
      <div className="assignment-filters">
        <button 
          className={`filter-btn ${assignmentFilter === 'all' && filterStatus === 'all' ? 'active' : ''}`}
          onClick={() => {
            setAssignmentFilter('all');
            setFilterStatus('all');
          }}
        >
          📋 Fila Ativa
        </button>
        <button 
          className={`filter-btn filter-mine ${assignmentFilter === 'mine' ? 'active' : ''}`}
          onClick={() => {
            setAssignmentFilter('mine');
            setFilterStatus('all');
          }}
        >
          👤 Meus Atendimentos ({myTicketsCount})
        </button>
        <button 
          className={`filter-btn ${assignmentFilter === 'unassigned' ? 'active' : ''}`}
          onClick={() => {
            setAssignmentFilter('unassigned');
            setFilterStatus('all');
          }}
        >
          ⚠️ Não Atribuídos
        </button>
        <button 
          className={`filter-btn ${showFilters ? 'active' : ''}`}
          onClick={() => {
            setShowFilters(!showFilters);
            // Quando abrir filtros avançados, reseta o filtro rápido para evitar conflitos
            if (!showFilters) {
              setFilterStatus('all');
            }
          }}
          style={{
            marginLeft: 'auto',
            background: showFilters ? '#4A90E2' : '#6c757d',
            color: 'white',
            position: 'relative'
          }}
        >
          🔍 {showFilters ? 'Ocultar' : 'Filtros Avançados'}
          {hasAdvancedFilters && (
            <span style={{
              position: 'absolute',
              top: '-5px',
              right: '-5px',
              background: '#dc3545',
              color: 'white',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 'bold'
            }}>
              {(selectedStatuses.length + selectedPriorities.length + (searchText.trim() ? 1 : 0))}
            </span>
          )}
        </button>
      </div>

      {/* Filtros Avançados (Collapsible) */}
      {showFilters && (
        <div className="advanced-filters" style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          {hasAdvancedFilters && (
            <div style={{
              background: '#e7f3ff',
              padding: '10px 15px',
              borderRadius: '4px',
              marginBottom: '15px',
              border: '1px solid #4A90E2',
              fontSize: '14px'
            }}>
              <strong>✅ Filtros ativos:</strong>
              {searchText.trim() && <span style={{ marginLeft: '10px' }}>🔍 Busca: "{searchText}"</span>}
              {selectedStatuses.length > 0 && <span style={{ marginLeft: '10px' }}>📊 Status: {selectedStatuses.length} selecionado(s)</span>}
              {selectedPriorities.length > 0 && <span style={{ marginLeft: '10px' }}>🚨 Prioridades: {selectedPriorities.length} selecionada(s)</span>}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
            <div className="filter-group">
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>🔍 Buscar:</label>
              <input 
                type="text"
                placeholder="Título ou descrição..."
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
            </div>

            <div className="filter-group">
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>📊 Status:</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { value: 'open', label: '⚪ Aberto' },
                  { value: 'in_progress', label: '🔵 Em Atendimento' },
                  { value: 'waiting_user', label: '🟡 Aguardando' },
                  { value: 'resolved', label: '✅ Resolvido' },
                  { value: 'closed', label: '🔒 Fechado' }
                ].map(status => (
                  <label key={status.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
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
                ))}</div>
            </div>

            <div className="filter-group">
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>🚨 Prioridade:</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { value: 'high', label: '🔴 Alto' },
                  { value: 'medium', label: '🟡 Médio' },
                  { value: 'low', label: '🟢 Baixo' }
                ].map(priority => (
                  <label key={priority.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
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

          <div style={{ marginTop: '15px', textAlign: 'right' }}>
            <button 
              onClick={() => {
                setSearchText('');
                setSelectedStatuses([]);
                setSelectedPriorities([]);
                setFilterStatus('all');
                setCurrentPage(1);
              }}
              style={{
                padding: '8px 16px',
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              🗑️ Limpar Filtros
            </button>
          </div>
        </div>
      )}

      {/* Layout Principal: Fila + Painel Lateral */}
      <div className="dashboard-layout">
        {/* Fila Inteligente */}
        <div className="ticket-queue">
          <div className="queue-header">
            <h2>📋 Fila de Atendimento</h2>
            <span className="queue-count">
              {sortedTickets.length} chamados
              {filterStatus !== 'all' && ` (${getStatusLabel(filterStatus)})`}
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
                // Lógica de cor: STATUS tem precedência sobre PRIORIDADE
                let colorIndicator = '⚪'; // Padrão: branco
                if (ticket.status === 'in_progress') {
                  colorIndicator = '🔵'; // AZUL - em atendimento
                } else if (ticket.status === 'waiting_user') {
                  colorIndicator = '🟡'; // AMARELO - aguardando usuário
                } else if (ticket.status === 'resolved') {
                  colorIndicator = '✅'; // VERDE - resolvido
                } else if (ticket.status === 'closed') {
                  colorIndicator = '🔒'; // CINZA - fechado
                } else if (ticket.status === 'open') {
                  // Para tickets ABERTOS, verificar prioridade
                  if (ticket.priority === 'high') {
                    colorIndicator = '🔴'; // VERMELHO - alta prioridade
                  } else {
                    colorIndicator = '⚪'; // BRANCO - normal
                  }
                }
                
                return (
                <div
                  key={ticket.id}
                  className={`ticket-card ticket-status-${ticket.status} ${selectedTicket?.id === ticket.id ? 'active' : ''} priority-${ticket.priority}`}
                  onClick={() => setSelectedTicket(ticket)}
                >
                  <div className="ticket-card-header">
                    <div className="priority-indicator">
                      {colorIndicator}
                    </div>
                    <span className="time-ago">{getTimeAgo(ticket.created_at)} parado</span>
                  </div>

                  {/* Badge de Prioridade */}
                  <div style={{ 
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    marginBottom: '8px',
                    background: 
                      ticket.priority === 'high' ? '#dc3545' :
                      ticket.priority === 'medium' ? '#ffc107' :
                      ticket.priority === 'low' ? '#28a745' : '#6c757d',
                    color: 
                      ticket.priority === 'high' ? 'white' :
                      ticket.priority === 'medium' ? '#000' : 'white'
                  }}>
                    {ticket.priority === 'high' && '🔴 ALTO'}
                    {ticket.priority === 'medium' && '🟡 MÉDIO'}
                    {ticket.priority === 'low' && '🟢 BAIXO'}
                  </div>

                  <div className="ticket-card-title">{ticket.title}</div>
                  <div className="ticket-card-type">{ticket.type}</div>

                  {/* Informações do Solicitante */}
                  {ticket.requester_type === 'public' && ticket.requester_name && (
                    <div style={{
                      background: '#f8f9fa',
                      padding: '8px 10px',
                      borderRadius: '4px',
                      margin: '8px 0',
                      fontSize: '13px',
                      borderLeft: '3px solid #007A33'
                    }}>
                      <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                        👤 {ticket.requester_name}
                      </div>
                      {ticket.requester_email && (
                        <div style={{ color: '#666', fontSize: '12px' }}>
                          📧 {ticket.requester_email}
                        </div>
                      )}
                      {(ticket.requester_department || ticket.requester_unit) && (
                        <div style={{ color: '#666', fontSize: '12px', marginTop: '2px' }}>
                          {ticket.requester_department && `🏢 ${ticket.requester_department}`}
                          {ticket.requester_department && ticket.requester_unit && ' • '}
                          {ticket.requester_unit && `🏛️ ${ticket.requester_unit}`}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="ticket-card-footer">
                    <span className="assigned">
                      👤 {getUserName(ticket.assigned_to)}
                    </span>
                    <div className="footer-actions">
                      {!ticket.assigned_to && ticket.status === 'open' && (
                        <button
                          className="btn-quick-assume"
                          onClick={(e) => handleQuickAssume(ticket.id, e)}
                          title="Assumir atendimento"
                        >
                          🎯 Assumir
                        </button>
                      )}
                      <span className="status-mini">{getStatusLabel(ticket.status)}</span>
                    </div>
                  </div>
                </div>
              )})}
            </div>
          )}

          {/* Paginação */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '10px',
              marginTop: '20px',
              padding: '15px',
              background: 'white',
              borderRadius: '8px'
            }}>
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '8px 16px',
                  background: currentPage === 1 ? '#ddd' : '#007A33',
                  color: currentPage === 1 ? '#666' : 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                }}
              >
                ◀ Anterior
              </button>
              
              <span style={{ padding: '0 15px', fontWeight: 'bold' }}>
                Página {currentPage} de {totalPages} 
                <small style={{ color: '#666', marginLeft: '10px' }}>
                  ({totalTickets} tickets)
                </small>
              </span>
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '8px 16px',
                  background: currentPage === totalPages ? '#ddd' : '#007A33',
                  color: currentPage === totalPages ? '#666' : 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                Próxima ▶
              </button>
            </div>
          )}
        </div>

        {/* Painel Lateral do Ticket Selecionado */}
        {selectedTicket ? (
          <div className="ticket-panel">
            <div className="panel-header">
              <h3>#{selectedTicket.id.substring(0, 8).toUpperCase()}</h3>
              <button 
                className="close-panel"
                onClick={() => setSelectedTicket(null)}
              >
                ✕
              </button>
            </div>

            <div className="panel-content">
              <div className="panel-title">{selectedTicket.title}</div>
              <div className="panel-status-badge">
                <span className={`status-badge status-${selectedTicket.status}`}>
                  {selectedTicket.status === 'open' && '🆕 Novo'}
                  {selectedTicket.status === 'in_progress' && '⚙️ Em Andamento'}
                  {selectedTicket.status === 'waiting_user' && '⏳ Aguardando Usuário'}
                  {selectedTicket.status === 'resolved' && '✅ Resolvido'}
                  {selectedTicket.status === 'closed' && '🔒 Fechado'}
                </span>
              </div>
              <div className="panel-meta">
                Aberto há {getTimeAgo(selectedTicket.created_at)}
              </div>

              <div className="panel-actions">
                <button 
                  className="action-btn primary full-width"
                  onClick={() => navigate(`/admin/chamados/${selectedTicket.id}`)}
                >
                  🔧 Ver Detalhes Completos
                </button>
                <button 
                  className="action-btn secondary"
                  onClick={() => handleQuickStatusChange(selectedTicket.id, 'waiting_user')}
                  disabled={selectedTicket.status === 'closed'}
                  title="Marcar como aguardando resposta do usuário"
                >
                  ⏳ Aguardar
                </button>
                <button 
                  className="action-btn success"
                  onClick={() => handleQuickStatusChange(selectedTicket.id, 'resolved')}
                  disabled={selectedTicket.status === 'closed'}
                  title="Marcar ticket como resolvido"
                >
                  ✅ Resolver
                </button>
              </div>

              <div className="panel-description">
                <h4>Descrição</h4>
                <p>{selectedTicket.description}</p>
              </div>

              <div className="panel-info">
                <div className="info-row">
                  <span className="info-label">Prioridade:</span>
                  <span className="info-value">{selectedTicket.priority}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Tipo:</span>
                  <span className="info-value">{selectedTicket.type}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Status:</span>
                  <span className="info-value">{getStatusLabel(selectedTicket.status)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Responsável:</span>
                  <span className="info-value">{getUserName(selectedTicket.assigned_to)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="ticket-panel empty">
            <div className="empty-panel">
              <span className="empty-icon-large">👆</span>
              <p>Selecione um chamado da fila</p>
              <small>Clique em um card para ver detalhes e atender</small>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

