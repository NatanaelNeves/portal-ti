import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { showToast } from '../utils/toast';
import StatusTimeline from '../components/StatusTimeline';
import TicketAttachments from '../components/TicketAttachments';
import QuickActionsCard from '../components/QuickActionsCard';
import '../styles/AdminTicketDetailPage.css';
import { BACKEND_URL } from '../services/api';

interface TicketDetail {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  type: string;
  department?: string;
  category?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  closed_at?: string;
  rating?: number | null;
  feedback?: string | null;
  rated_at?: string | null;
  requester_type: string;
  requester_name?: string;
  requester_email?: string;
  requester_department?: string;
  requester_unit?: string;
  assigned_to?: string;
}

interface RhPointAdjustment {
  date?: string;
  correctedTime?: string;
  notes?: string;
}

interface Message {
  id: string;
  message: string;
  author_type: string;
  author_name?: string;
  created_at: string;
  is_internal: boolean;
}

interface InternalUser {
  id: string;
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

  const getBackRoute = () => {
    const raw = localStorage.getItem('internal_user');
    const role = raw ? (JSON.parse(raw)?.role ?? '') : '';
    return role === 'rh_staff' ? '/rh/chamados' : '/admin/chamados';
  };

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
      const response = await fetch(`${BACKEND_URL}/api/internal-auth/users`, {
        headers: { 'Authorization': `Bearer ${internalToken}` },
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
      const ticketRes = await fetch(`${BACKEND_URL}/api/tickets/${ticketId}`, { headers });
      if (!ticketRes.ok) throw new Error('Erro ao carregar chamado');
      const ticketData = await ticketRes.json();
      if (ticketData.assigned_to_id) ticketData.assigned_to = ticketData.assigned_to_id;
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
      const payload: any = {};
      if ('status' in updates && updates.status !== undefined && updates.status !== '') payload.status = updates.status;
      if ('priority' in updates && updates.priority !== undefined && updates.priority !== '') payload.priority = updates.priority;
      if ('assigned_to' in updates) {
        const value = updates.assigned_to;
        payload.assigned_to_id = (value === '' || value === null || value === undefined) ? null : value;
      }
      if (Object.keys(payload).length === 0) {
        setError('Nenhuma alteração para salvar');
        setSubmitting(false);
        return;
      }
      const response = await fetch(`${BACKEND_URL}/api/tickets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${internalToken}` },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Erro ao atualizar chamado');
      }
      await fetchTicket(id);
      setIsEditing(false);
      setError('');
      showToast.success('Chamado atualizado com sucesso!');
    } catch (err: any) {
      console.error('Erro ao atualizar:', err);
      setError(err.message || 'Erro ao atualizar chamado');
      showToast.error(err.message || 'Erro ao atualizar chamado');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !id || !internalToken) return;
    try {
      setSubmitting(true);
      const response = await fetch(`${BACKEND_URL}/api/tickets/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${internalToken}` },
        body: JSON.stringify({ message: newMessage, is_internal: isInternalNote }),
      });
      if (!response.ok) throw new Error('Erro ao adicionar mensagem');
      setNewMessage('');
      setIsInternalNote(false);
      await fetchTicket(id);
      showToast.success(isInternalNote ? 'Nota interna adicionada' : 'Mensagem enviada');
    } catch (err: any) {
      setError(err.message || 'Erro ao adicionar mensagem');
      showToast.error(err.message || 'Erro ao adicionar mensagem');
    } finally {
      setSubmitting(false);
    }
  };

  const rhAdjustments = Array.isArray(ticket?.metadata?.adjustments)
    ? ticket!.metadata!.adjustments.map((adjustment: any) => ({
        date: typeof adjustment?.date === 'string' ? adjustment.date : '',
        correctedTime: typeof adjustment?.correctedTime === 'string' ? adjustment.correctedTime : '',
        notes: typeof adjustment?.notes === 'string' ? adjustment.notes : '',
      })) as RhPointAdjustment[]
    : [];

  const hasRhAdjustments = rhAdjustments.length > 0;

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      open: { label: 'Aberto', className: 'badge-open' },
      in_progress: { label: 'Em Progresso', className: 'badge-progress' },
      waiting_user: { label: 'Aguardando Usuário', className: 'badge-waiting' },
      aguardando_confirmacao: { label: 'Aguardando Confirmação', className: 'badge-waiting' },
      resolved: { label: 'Resolvido', className: 'badge-resolved' },
      closed: { label: 'Concluído', className: 'badge-closed' },
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

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const handleQuickAction = async (action: 'assume' | 'waiting' | 'resolve' | 'close' | 'resume') => {
    const statusMap = { assume: 'in_progress', waiting: 'waiting_user', resolve: 'resolved', close: 'closed', resume: 'in_progress' };
    const updates: any = { status: statusMap[action] };
    if (action === 'assume') {
      const userData = localStorage.getItem('internal_user');
      if (userData) updates.assigned_to = JSON.parse(userData).id;
    }
    await handleUpdateTicket(updates);
  };

  const handleAssignToMe = async () => {
    const userData = localStorage.getItem('internal_user');
    if (userData) {
      const user = JSON.parse(userData);
      try {
        await handleUpdateTicket({ assigned_to: user.id, status: 'in_progress' });
        showToast.success('Chamado atribuído para você e iniciado!');
      } catch (error) {
        console.error('Erro ao auto-atribuir:', error);
      }
    } else {
      showToast.error('Usuário não identificado');
    }
  };

  const handleUnassign = async () => {
    try {
      await handleUpdateTicket({ assigned_to: undefined, status: 'open' });
      showToast.success('Chamado desatribuído e reaberto');
    } catch (error) {
      console.error('Erro ao desatribuir:', error);
    }
  };

  const getLoggedUserName = () => {
    const userData = localStorage.getItem('internal_user');
    return userData ? JSON.parse(userData).name : null;
  };

  const isAssignedToMe = () => {
    const userData = localStorage.getItem('internal_user');
    if (userData && ticket?.assigned_to) {
      return JSON.parse(userData).id === ticket.assigned_to;
    }
    return false;
  };

  if (loading) {
    return (
      <div className="admin-ticket-detail loading">
        <div className="loading-spinner" />
        <span>Carregando chamado...</span>
      </div>
    );
  }

  if (error && !ticket) {
    return (
      <div className="admin-ticket-detail">
        <div className="alert alert-error">{error}</div>
        <button onClick={() => navigate(getBackRoute())} className="btn-back">← Voltar</button>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="admin-ticket-detail">
        <div className="alert alert-error">Chamado não encontrado</div>
        <button onClick={() => navigate(getBackRoute())} className="btn-back">← Voltar</button>
      </div>
    );
  }

  const statusBadge = getStatusBadge(ticket.status);
  const priorityBadge = getPriorityBadge(ticket.priority);
  const normalizedRating = ticket.rating !== null && ticket.rating !== undefined ? Number(ticket.rating) : null;
  const elapsedHours = Math.floor((Date.now() - new Date(ticket.created_at).getTime()) / (1000 * 60 * 60));
  const assigneeName = isAssignedToMe()
    ? `${getLoggedUserName()} (Você)`
    : users.find(u => u.id === ticket.assigned_to)?.name || 'Atribuído';

  return (
    <div className="admin-ticket-detail">

      {/* ── Compact Header ── */}
      <header className="ticket-header">
        <button onClick={() => navigate(getBackRoute())} className="btn-back" aria-label="Voltar para fila">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Voltar para Fila
        </button>

        <div className="ticket-header-content">
          <div className="ticket-header-top">
            <span className="ticket-id-label">#{ticket.id.substring(0, 8).toUpperCase()}</span>
            <div className="ticket-header-badges">
              <span className={`badge ${statusBadge.className}`}>{statusBadge.label}</span>
              <span className={`badge ${priorityBadge.className}`}>{priorityBadge.label}</span>
            </div>
          </div>
          <h1 className="ticket-title-heading">{ticket.title}</h1>
        </div>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      {/* ── Two-column layout ── */}
      <div className="ticket-layout">

        {/* ════ Main Column ════ */}
        <main className="ticket-main">

          {/* Stepper */}
          <div className="stepper-card">
            <StatusTimeline currentStatus={ticket.status} />
          </div>

          {/* Details Card */}
          <section className="ticket-info-card">
            <div className="card-header">
              <h2 className="card-title">Detalhes do Chamado</h2>
              <button onClick={() => setIsEditing(!isEditing)} className="btn-edit" aria-pressed={isEditing}>
                {isEditing ? 'Cancelar' : 'Editar'}
              </button>
            </div>

            {/* Title */}
            <div className="detail-field detail-field-full">
              <label className="field-label">Título</label>
              <div className="field-value field-value-title">{ticket.title}</div>
            </div>

            {/* Description */}
            <div className="detail-field detail-field-full">
              <label className="field-label">Descrição</label>
              <div className="field-value field-value-description">{ticket.description}</div>
            </div>

            {/* Editable fields grid */}
            <div className="details-grid">

              {/* Status */}
              <div className="detail-field">
                <label className="field-label">Status</label>
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
                    <option value="aguardando_confirmacao">Aguardando Confirmação</option>
                    <option value="resolved">Resolvido</option>
                    <option value="closed">Fechado</option>
                  </select>
                ) : (
                  <div className="field-value">
                    <span className={`badge ${statusBadge.className}`}>{statusBadge.label}</span>
                  </div>
                )}
              </div>

              {/* Priority */}
              <div className="detail-field">
                <label className="field-label">Prioridade</label>
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
                  <div className="field-value">
                    <span className={`badge ${priorityBadge.className}`}>{priorityBadge.label}</span>
                  </div>
                )}
              </div>

              {/* Responsible */}
              <div className="detail-field">
                <label className="field-label">Responsável</label>
                {isEditing ? (
                  <select
                    value={ticket.assigned_to || ''}
                    onChange={(e) => handleUpdateTicket({ assigned_to: e.target.value === '' ? undefined : e.target.value })}
                    disabled={submitting}
                    className="select-input"
                  >
                    <option value="">Não atribuído</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>{user.name}</option>
                    ))}
                  </select>
                ) : ticket.assigned_to ? (
                  <div className="field-value assign-container">
                    <div className="assignee-avatar" aria-hidden="true">
                      {getInitials(isAssignedToMe() ? getLoggedUserName() : users.find(u => u.id === ticket.assigned_to)?.name)}
                    </div>
                    <span className="assignee-name">{assigneeName}</span>
                    {isAssignedToMe() && (
                      <button onClick={handleUnassign} className="btn-unassign" disabled={submitting}>
                        Desatribuir
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="field-value assign-container">
                    <span className="text-muted">Não atribuído</span>
                    <button onClick={handleAssignToMe} className="btn-assign-inline" disabled={submitting}>
                      Atribuir para Mim
                    </button>
                  </div>
                )}
              </div>

              {/* Department */}
              <div className="detail-field">
                <label className="field-label">Departamento</label>
                <div className="field-value">
                  {ticket.department === 'administrativo' ? 'Administrativo'
                    : ticket.department === 'rh' ? 'Recursos Humanos'
                    : 'TI'}
                </div>
              </div>

              {/* Category */}
              {ticket.category && (
                <div className="detail-field">
                  <label className="field-label">Categoria</label>
                  <div className="field-value" style={{ textTransform: 'capitalize' }}>
                    {ticket.category.replace(/_/g, ' ')}
                  </div>
                </div>
              )}

              {/* Rating */}
              <div className="detail-field">
                <label className="field-label">Avaliação</label>
                <div className="field-value">
                  {normalizedRating !== null ? (
                    <span className="rating-stars">
                      {'★'.repeat(Math.max(0, Math.min(5, normalizedRating)))}
                      {'☆'.repeat(Math.max(0, 5 - Math.min(5, normalizedRating)))}
                      <span className="rating-number"> {normalizedRating}/5</span>
                    </span>
                  ) : (
                    <span className="text-muted">Sem avaliação</span>
                  )}
                </div>
              </div>

            </div>

            {/* RH Metadata */}
            {ticket.department === 'rh' && ticket.metadata && Object.keys(ticket.metadata).length > 0 && (
              <div className="detail-field detail-field-full rh-metadata-block">
                <label className="field-label">Detalhes da Solicitação RH</label>
                <div className="field-value field-value-rh">
                  {ticket.metadata.medicalLeaveDays && (
                    <span><strong>Dias de afastamento:</strong> {ticket.metadata.medicalLeaveDays}</span>
                  )}
                  {hasRhAdjustments ? (
                    <div style={{ display: 'grid', gap: '0.75rem', width: '100%' }}>
                      <strong>Datas de ajuste:</strong>
                      {rhAdjustments.map((adjustment, index) => (
                        <div key={`${adjustment.date || 'adjustment'}-${index}`} style={{ display: 'grid', gap: '0.35rem', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '10px', background: '#fafafa' }}>
                          <span><strong>Data:</strong> {adjustment.date || 'Não informada'}</span>
                          <span><strong>Horário corrigido:</strong> {adjustment.correctedTime || 'Não informado'}</span>
                          {adjustment.notes && (
                            <span><strong>Justificativa:</strong> {adjustment.notes}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      {ticket.metadata.adjustmentDate && (
                        <span><strong>Data de ajuste:</strong> {ticket.metadata.adjustmentDate}</span>
                      )}
                      {ticket.metadata.correctedTime && (
                        <span><strong>Horário corrigido:</strong> {ticket.metadata.correctedTime}</span>
                      )}
                    </>
                  )}
                  {ticket.metadata.payrollMonth && (
                    <span><strong>Competência:</strong> {ticket.metadata.payrollMonth}</span>
                  )}
                  {ticket.metadata.notes && (
                    <span><strong>Observações:</strong> {ticket.metadata.notes}</span>
                  )}
                </div>
              </div>
            )}

            {/* Feedback */}
            <div className="detail-field detail-field-full">
              <label className="field-label">Feedback do Solicitante</label>
              <div className="field-value field-value-description">
                {ticket.feedback?.trim() ? ticket.feedback : (
                  <span className="text-muted">Nenhum comentário informado</span>
                )}
              </div>
            </div>

            {ticket.rated_at && (
              <div className="detail-field">
                <label className="field-label">Avaliado em</label>
                <div className="field-value field-value-date">{formatDate(ticket.rated_at)}</div>
              </div>
            )}
          </section>

          {/* Conversation Card */}
          <section className="messages-card">
            <h2 className="card-title">Histórico de Conversas</h2>

            <div className="messages-list" role="log" aria-label="Histórico de mensagens">
              {messages.length === 0 ? (
                <div className="no-messages">
                  <div className="no-messages-icon" aria-hidden="true">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                  </div>
                  <p>Nenhuma mensagem ainda. Seja o primeiro a responder!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isStaff = msg.author_type === 'it_staff';
                  const authorDisplay = isStaff
                    ? msg.author_name || 'Equipe TI'
                    : msg.author_name || ticket?.requester_name || 'Usuário';
                  return (
                    <div
                      key={msg.id}
                      className={`message ${isStaff ? 'message-staff' : 'message-user'} ${msg.is_internal ? 'message-internal' : ''}`}
                    >
                      <div className="message-header">
                        <div className={`message-avatar ${isStaff ? 'avatar-staff' : 'avatar-user'}`} aria-hidden="true">
                          {getInitials(authorDisplay)}
                        </div>
                        <div className="message-meta">
                          <span className="message-author">{authorDisplay}</span>
                          <span className="message-date">
                            {new Date(msg.created_at).toLocaleString('pt-BR', {
                              day: '2-digit', month: '2-digit',
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </span>
                        </div>
                        {msg.is_internal && (
                          <span className="internal-badge" role="note">Nota Interna</span>
                        )}
                      </div>
                      <div className="message-content">{msg.message}</div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Reply Form */}
            <form onSubmit={handleAddMessage} className="message-form" aria-label="Formulário de resposta">
              <div className="message-form-header">
                <span className="form-title">Nova Mensagem</span>
                <div className="internal-toggle-container">
                  <label className="internal-toggle" htmlFor="internal-note-toggle" aria-label="Ativar nota interna">
                    <input
                      id="internal-note-toggle"
                      type="checkbox"
                      checked={isInternalNote}
                      onChange={(e) => setIsInternalNote(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                  <span className={`internal-toggle-label ${isInternalNote ? 'active' : ''}`}>
                    Nota Interna
                    {isInternalNote && <span className="internal-badge-inline">ATIVO</span>}
                  </span>
                  {isInternalNote && (
                    <span className="internal-notice">Visível apenas para a equipe</span>
                  )}
                </div>
              </div>

              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={isInternalNote ? 'Digite uma nota interna para a equipe...' : 'Digite sua resposta ao usuário...'}
                rows={4}
                disabled={submitting}
                className={`message-input ${isInternalNote ? 'internal-mode' : ''}`}
                aria-label="Texto da mensagem"
              />

              <div className="message-form-footer">
                <button
                  type="submit"
                  disabled={submitting || !newMessage.trim()}
                  className="btn btn-send"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                  {submitting ? 'Enviando...' : isInternalNote ? 'Adicionar Nota' : 'Enviar Resposta'}
                </button>
              </div>
            </form>
          </section>

          {/* Attachments */}
          <TicketAttachments
            ticketId={ticket.id}
            authToken={internalToken || ''}
          />
        </main>

        {/* ════ Sidebar ════ */}
        <aside className="ticket-sidebar">

          {/* Quick Actions */}
          <QuickActionsCard
            status={ticket.status as 'open' | 'in_progress' | 'waiting_user' | 'aguardando_confirmacao' | 'resolved' | 'closed'}
            isSubmitting={submitting}
            onAssume={() => handleQuickAction('assume')}
            onWaitingUser={() => handleQuickAction('waiting')}
            onResolve={() => handleQuickAction('resolve')}
            onClose={() => handleQuickAction('close')}
            onResume={() => handleQuickAction('resume')}
          />

          {/* Requester Info */}
          {ticket.requester_type === 'public' && (
            <div className="sidebar-card">
              <h3 className="sidebar-card-title">Solicitante</h3>
              <div className="sidebar-meta">
                <div className="meta-item">
                  <span className="meta-label">Nome</span>
                  <span className="meta-value">{ticket.requester_name || '—'}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Email</span>
                  <span className="meta-value meta-email">{ticket.requester_email || '—'}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Setor</span>
                  <span className="meta-value">{ticket.requester_department || '—'}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Unidade</span>
                  <span className="meta-value">{ticket.requester_unit || '—'}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Tipo</span>
                  <span className="meta-value">{ticket.type}</span>
                </div>
              </div>
            </div>
          )}

          {/* Timeline Info */}
          <div className="sidebar-card">
            <h3 className="sidebar-card-title">Linha do Tempo</h3>
            <div className="sidebar-meta">
              <div className="meta-item">
                <span className="meta-label">Criado em</span>
                <span className="meta-value meta-date">{formatDate(ticket.created_at)}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Atualizado em</span>
                <span className="meta-value meta-date">{formatDate(ticket.updated_at)}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Tempo decorrido</span>
                <span className="meta-value meta-elapsed">{elapsedHours}h</span>
              </div>
            </div>
          </div>

        </aside>
      </div>
    </div>
  );
}
