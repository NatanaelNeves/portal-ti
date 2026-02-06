import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';import StatusTimeline from '../components/StatusTimeline';import '../styles/AdminTicketDetailPage.css';

interface TicketDetail {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  type: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  requester_type: string;
  assigned_to?: string; // UUID do usuário interno
}

interface Message {
  id: string;
  message: string;
  author_type: string;
  created_at: string;
  is_internal: boolean;
}

interface InternalUser {
  id: string; // UUID
  name: string;
  email: string;
}

export default function AdminTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<InternalUser[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const internalToken = localStorage.getItem('internal_token');

  useEffect(() => {
    if (!internalToken) {
      navigate('/admin/login');
      return;
    }
    if (id) {
      fetchTicket(id);
      fetchUsers();
    }
  }, [id, internalToken, navigate]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/internal-auth/users', {
        headers: {
          'Authorization': `Bearer ${internalToken}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchTicket = async (ticketId: string) => {
    try {
      setLoading(true);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${internalToken}`,
      };

      const ticketRes = await fetch(`/api/tickets/${ticketId}`, { headers });

      if (!ticketRes.ok) {
        throw new Error('Erro ao carregar chamado');
      }

      const ticketData = await ticketRes.json();
      
      // Mapear assigned_to_id do backend para assigned_to no frontend
      if (ticketData.assigned_to_id) {
        ticketData.assigned_to = ticketData.assigned_to_id;
      }
      
      setTicket(ticketData);
      setMessages(ticketData.messages || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar chamado');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTicket = async (updates: Partial<TicketDetail>) => {
    if (!id || !internalToken) return;

    try {
      setSubmitting(true);
      
      // Converter assigned_to para assigned_to_id e remover campos undefined
      const payload: any = {};
      
      if ('status' in updates && updates.status !== undefined && updates.status !== '') {
        payload.status = updates.status;
      }
      
      if ('priority' in updates && updates.priority !== undefined && updates.priority !== '') {
        payload.priority = updates.priority;
      }
      
      if ('assigned_to' in updates) {
        // assigned_to é UUID (string), não número
        const value = updates.assigned_to;
        if (value === '' || value === null || value === undefined) {
          payload.assigned_to_id = null;
        } else {
          // Enviar UUID diretamente
          payload.assigned_to_id = value;
        }
      }
      
      if (Object.keys(payload).length === 0) {
        setError('Nenhuma alteração para salvar');
        setSubmitting(false);
        return;
      }
      
      const response = await fetch(`/api/tickets/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${internalToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Erro ao atualizar chamado');
      }

      await fetchTicket(id);
      setIsEditing(false);
      setError('');
    } catch (err: any) {
      console.error('Erro ao atualizar:', err);
      setError(err.message || 'Erro ao atualizar chamado');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !id || !internalToken) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/tickets/${id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${internalToken}`,
        },
        body: JSON.stringify({
          message: newMessage,
          is_internal: isInternalNote,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao adicionar mensagem');
      }

      setNewMessage('');
      setIsInternalNote(false);
      await fetchTicket(id);
    } catch (err: any) {
      setError(err.message || 'Erro ao adicionar mensagem');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      open: { label: 'Aberto', className: 'badge-open' },
      in_progress: { label: 'Em Progresso', className: 'badge-progress' },
      waiting_user: { label: 'Aguardando Usuário', className: 'badge-waiting' },
      resolved: { label: 'Resolvido', className: 'badge-resolved' },
      closed: { label: 'Fechado', className: 'badge-closed' },
    };
    return badges[status] || { label: status, className: '' };
  };

  const getPriorityBadge = (priority: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      low: { label: 'Baixa', className: 'priority-low' },
      medium: { label: 'Média', className: 'priority-medium' },
      high: { label: 'Alta', className: 'priority-high' },
      urgent: { label: 'Urgente', className: 'priority-urgent' },
    };
    return badges[priority] || { label: priority, className: '' };
  };

  if (loading) {
    return <div className="admin-ticket-detail loading">Carregando...</div>;
  }

  if (error && !ticket) {
    return (
      <div className="admin-ticket-detail">
        <div className="alert alert-error">{error}</div>
        <button onClick={() => navigate('/admin/chamados')} className="btn btn-secondary">
          ← Voltar
        </button>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="admin-ticket-detail">
        <div className="alert alert-error">Chamado não encontrado</div>
        <button onClick={() => navigate('/admin/chamados')} className="btn btn-secondary">
          ← Voltar
        </button>
      </div>
    );
  }

  const statusBadge = getStatusBadge(ticket.status);
  const priorityBadge = getPriorityBadge(ticket.priority);

  // Ações rápidas de status
  const handleQuickAction = async (action: 'assume' | 'waiting' | 'resolve' | 'close') => {
    const statusMap = {
      assume: 'in_progress',
      waiting: 'waiting_user',
      resolve: 'resolved',
      close: 'closed'
    };
    
    const updates: any = { status: statusMap[action] };
    
    // Se assumir, atribuir ao usuário logado
    if (action === 'assume') {
      const userData = localStorage.getItem('internal_user');
      if (userData) {
        const user = JSON.parse(userData);
        updates.assigned_to = user.id;
      }
    }
    
    await handleUpdateTicket(updates);
  };

  return (
    <div className="admin-ticket-detail">
      {/* Header com navegação */}
      <div className="ticket-header">
        <button onClick={() => navigate('/admin/chamados')} className="btn-back">
          ← Voltar para Fila
        </button>
        <div className="ticket-header-info">
          <h1>Chamado #{ticket.id.substring(0, 8).toUpperCase()}</h1>
          <span className={`badge ${statusBadge.className}`}>
            {statusBadge.label}
          </span>
          <span className={`badge ${priorityBadge.className}`}>
            {priorityBadge.label}
          </span>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="ticket-content">
        {/* Ações Rápidas - Destacadas no topo */}
        <div className="quick-actions-card">
          <h2>⚡ Ações Rápidas</h2>
          <div className="quick-actions-grid">
            <button 
              className="action-btn action-assume"
              onClick={() => handleQuickAction('assume')}
              disabled={submitting || ticket.status !== 'open'}
            >
              <span className="action-icon">🎯</span>
              <span className="action-label">Assumir</span>
              <span className="action-description">Iniciar atendimento</span>
            </button>
            
            <button 
              className="action-btn action-waiting"
              onClick={() => handleQuickAction('waiting')}
              disabled={submitting || ticket.status === 'closed'}
            >
              <span className="action-icon">⏳</span>
              <span className="action-label">Aguardar Usuário</span>
              <span className="action-description">Pendente de resposta</span>
            </button>
            
            <button 
              className="action-btn action-resolve"
              onClick={() => handleQuickAction('resolve')}
              disabled={submitting || ticket.status === 'closed'}
            >
              <span className="action-icon">✅</span>
              <span className="action-label">Resolver</span>
              <span className="action-description">Marcar como resolvido</span>
            </button>
            
            <button 
              className="action-btn action-close"
              onClick={() => handleQuickAction('close')}
              disabled={submitting || ticket.status === 'closed'}
            >
              <span className="action-icon">🔒</span>
              <span className="action-label">Fechar</span>
              <span className="action-description">Encerrar definitivamente</span>
            </button>
          </div>
        </div>

        {/* Timeline Visual */}
        <div className="timeline-card">
          <h2>📊 Progresso do Chamado</h2>
          <StatusTimeline currentStatus={ticket.status} />
        </div>

        {/* Informações Principais */}
        <div className="ticket-info-card">
          <div className="card-header">
            <h2>📋 Detalhes do Chamado</h2>
            <button 
              onClick={() => setIsEditing(!isEditing)} 
              className="btn-edit"
            >
              {isEditing ? '✕ Cancelar' : '✏️ Editar'}
            </button>
          </div>
          
          <div className="info-grid">
            <div className="info-item info-item-full">
              <label>📌 Título:</label>
              <div className="value value-title">{ticket.title}</div>
            </div>

            <div className="info-item info-item-full">
              <label>📝 Descrição:</label>
              <div className="value value-description">{ticket.description}</div>
            </div>

            <div className="info-item">
              <label>🏷️ Tipo:</label>
              <div className="value">{ticket.type}</div>
            </div>

            <div className="info-item">
              <label>⚡ Status:</label>
              {isEditing ? (
                <select
                  value={ticket.status}
                  onChange={(e) => handleUpdateTicket({ status: e.target.value })}
                  disabled={submitting}
                  className="select-input"
                >
                  <option value="open">Aberto</option>
                  <option value="in_progress">Em Progresso</option>
                  <option value="waiting_user">Aguardando Usuário</option>
                  <option value="resolved">Resolvido</option>
                  <option value="closed">Fechado</option>
                </select>
              ) : (
                <span className={`badge ${statusBadge.className}`}>
                  {statusBadge.label}
                </span>
              )}
            </div>

            <div className="info-item">
              <label>🚨 Prioridade:</label>
              {isEditing ? (
                <select
                  value={ticket.priority}
                  onChange={(e) => handleUpdateTicket({ priority: e.target.value })}
                  disabled={submitting}
                  className="select-input"
                >
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
              ) : (
                <span className={`badge ${priorityBadge.className}`}>
                  {priorityBadge.label}
                </span>
              )}
            </div>

            <div className="info-item">
              <label>👤 Responsável:</label>
              {isEditing ? (
                <select
                  value={ticket.assigned_to || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    handleUpdateTicket({ 
                      assigned_to: value === '' ? undefined : value 
                    });
                  }}
                  disabled={submitting}
                  className="select-input"
                >
                  <option value="">Não atribuído</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="value">
                  {ticket.assigned_to 
                    ? users.find(u => u.id === ticket.assigned_to)?.name || 'Atribuído'
                    : 'Não atribuído'
                  }
                </div>
              )}
            </div>

            <div className="info-item">
              <label>📅 Criado em:</label>
              <div className="value value-date">
                {new Date(ticket.created_at).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>

            <div className="info-item">
              <label>🔄 Atualizado em:</label>
              <div className="value value-date">
                {new Date(ticket.updated_at).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>

            <div className="info-item">
              <label>⏱️ Tempo decorrido:</label>
              <div className="value value-time">
                {Math.floor((Date.now() - new Date(ticket.created_at).getTime()) / (1000 * 60 * 60))}h
              </div>
            </div>
          </div>
        </div>

        {/* Mensagens - Estilo Conversa */}
        <div className="messages-card">
          <h2>💬 Histórico de Conversas</h2>
          
          <div className="messages-list">
            {messages.length === 0 ? (
              <div className="no-messages">
                <span className="no-messages-icon">💭</span>
                <p>Nenhuma mensagem ainda. Seja o primeiro a responder!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`message ${msg.author_type === 'it_staff' ? 'message-staff' : 'message-user'} ${msg.is_internal ? 'message-internal' : ''}`}
                >
                  <div className="message-header">
                    <span className="message-author">
                      {msg.author_type === 'it_staff' ? '👨‍💼 Equipe TI' : '👤 Usuário'}
                    </span>
                    {msg.is_internal && <span className="internal-badge">🔒 Interno</span>}
                    <span className="message-date">
                      {new Date(msg.created_at).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <div className="message-content">{msg.message}</div>
                </div>
              ))
            )}
          </div>

          {/* Formulário de Nova Mensagem */}
          <form onSubmit={handleAddMessage} className="message-form">
            <div className="form-header">
              <label>📤 Nova Mensagem</label>
              <label className="internal-checkbox">
                <input 
                  type="checkbox" 
                  checked={isInternalNote}
                  onChange={(e) => setIsInternalNote(e.target.checked)}
                />
                <span>🔒 Nota interna (visível apenas para TI)</span>
              </label>
            </div>
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={isInternalNote ? "Digite uma nota interna para a equipe..." : "Digite sua resposta ao usuário..."}
              rows={4}
              disabled={submitting}
              className="message-input"
            />
            <button
              type="submit"
              disabled={submitting || !newMessage.trim()}
              className="btn btn-send"
            >
              {submitting ? '⏳ Enviando...' : isInternalNote ? '📝 Adicionar Nota Interna' : '📤 Enviar Resposta ao Usuário'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
