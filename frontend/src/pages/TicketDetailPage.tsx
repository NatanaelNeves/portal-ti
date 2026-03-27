import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import StatusTimeline from '../components/StatusTimeline';
import NextAction from '../components/NextAction';
import TicketAttachments from '../components/TicketAttachments';
import '../styles/TicketDetailPage.css';
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
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  confirmation_requested_at?: string;
  confirmation_response_at?: string;
  confirmed_resolved?: boolean;
  auto_closed?: boolean;
  closed_at?: string;
  rating?: number | null;
  feedback?: string | null;
  rated_at?: string | null;
}

interface Message {
  id: string;
  message: string;
  author_type: string;
  author_name?: string;
  created_at: string;
  is_internal: boolean;
}

interface HistoryItem {
  id: string;
  action: string;
  changed_by_type: string;
  changed_by_name?: string;
  old_value?: string | null;
  new_value?: string | null;
  metadata?: Record<string, any> | null;
  created_at: string;
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittingConfirmation, setSubmittingConfirmation] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [showReopenForm, setShowReopenForm] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [nowMs, setNowMs] = useState<number>(Date.now());

  const token = searchParams.get('token');
  const isInternalUser = !!localStorage.getItem('internal_token');
  const internalToken = localStorage.getItem('internal_token');
  const userToken = localStorage.getItem('user_token');

  useEffect(() => {
    if (id) {
      fetchTicket(id);
    }
  }, [id]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!id) return;
    const interval = window.setInterval(() => {
      silentRefresh(id, true);
    }, 30000);
    return () => window.clearInterval(interval);
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const handleRealtimeUpdate = (event: Event) => {
      const custom = event as CustomEvent<any>;
      if (custom.detail?.ticketId === id) {
        silentRefresh(id, true);
      }
    };

    window.addEventListener('ticket:updated', handleRealtimeUpdate);
    window.addEventListener('ticket:resolved', handleRealtimeUpdate);
    window.addEventListener('ticket:reopened', handleRealtimeUpdate);

    return () => {
      window.removeEventListener('ticket:updated', handleRealtimeUpdate);
      window.removeEventListener('ticket:resolved', handleRealtimeUpdate);
      window.removeEventListener('ticket:reopened', handleRealtimeUpdate);
    };
  }, [id]);

  const buildHeaders = () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (isInternalUser && internalToken) {
      headers['Authorization'] = `Bearer ${internalToken}`;
    } else if (token) {
      headers['X-User-Token'] = token;
    } else if (userToken) {
      headers['X-User-Token'] = userToken;
    }

    return headers;
  };

  const fetchTicket = async (ticketId: string) => {
    try {
      setLoading(true);
      const headers = buildHeaders();

      const [ticketRes, messagesRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/tickets/${ticketId}`, { headers }),
        fetch(`${BACKEND_URL}/api/tickets/${ticketId}/messages`, { headers }),
      ]);

      if (!ticketRes.ok) {
        throw new Error('Erro ao carregar chamado');
      }

      const ticketData = await ticketRes.json();
      setTicket(ticketData);

      if (messagesRes.ok) {
        const messagesData = await messagesRes.json();
        setMessages(messagesData.messages || []);
      }

      const historyRes = await fetch(`${BACKEND_URL}/api/tickets/${ticketId}/history`, { headers });
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setHistory(historyData.history || []);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar chamado');
    } finally {
      setLoading(false);
    }
  };

  const silentRefresh = async (ticketId: string, updateStatus = true) => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      Object.assign(headers, buildHeaders());
      const [ticketRes, messagesRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/tickets/${ticketId}`, { headers }),
        fetch(`${BACKEND_URL}/api/tickets/${ticketId}/messages`, { headers }),
      ]);
      if (ticketRes.ok && updateStatus) {
        const ticketData = await ticketRes.json();
        setTicket(ticketData);
      }
      if (messagesRes.ok) {
        const messagesData = await messagesRes.json();
        setMessages(messagesData.messages || []);
      }

      const historyRes = await fetch(`${BACKEND_URL}/api/tickets/${ticketId}/history`, { headers });
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setHistory(historyData.history || []);
      }
    } catch (err) {
      console.error('Silent refresh error:', err);
    }
  };

  const handleAddMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !id) return;
    
    // Usuário interno pode enviar sem token público
    if (!isInternalUser && !token && !userToken) return;

    try {
      setSubmitting(true);
      const headers = buildHeaders();

      const response = await fetch(`${BACKEND_URL}/api/tickets/${id}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: newMessage,
          is_internal: isInternalUser,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao adicionar mensagem');
      }

      const responseData = await response.json();
      setNewMessage('');

      // Aplica imediatamente o status retornado pelo backend (garantia visual rápida)
      if (responseData.ticket_status) {
        setTicket(prev => prev ? { ...prev, status: responseData.ticket_status } : prev);
      } else if (!isInternalUser && ticket?.status === 'waiting_user') {
        // Fallback otimista: usuário público respondeu ticket em aguardando
        setTicket(prev => prev ? { ...prev, status: 'in_progress' } : prev);
      }

      // Confirma status do banco e atualiza mensagens.
      // O backend só envia a resposta APÓS gravar o UPDATE no DB,
      // então ao chegar aqui o status correto já está persistido.
      await silentRefresh(id, true);
      setSuccessMessage('Mensagem enviada com sucesso.');
    } catch (err: any) {
      setError(err.message || 'Erro ao adicionar mensagem');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmResolution = async (resolved: boolean, reason?: string) => {
    if (!id || isInternalUser) return;

    try {
      setSubmittingConfirmation(true);
      setError('');

      const response = await fetch(`${BACKEND_URL}/api/tickets/${id}/confirm-resolution`, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({ resolved, reopen_reason: reason }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Falha ao confirmar resolução');
      }

      await fetchTicket(id);

      if (resolved) {
        setShowRatingModal(true);
        setSuccessMessage('Obrigado! Sua confirmação foi registrada.');
      } else {
        setShowReopenForm(false);
        setReopenReason('');
        setSuccessMessage('Chamado reaberto. A equipe foi notificada para continuar o atendimento.');
      }
    } catch (err: any) {
      setError(err.message || 'Falha ao confirmar resolução');
    } finally {
      setSubmittingConfirmation(false);
    }
  };

  const handleSubmitRating = async () => {
    if (!id || isInternalUser) return;

    try {
      setSubmittingRating(true);
      setError('');

      const response = await fetch(`${BACKEND_URL}/api/tickets/${id}/rating`, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({ rating: ratingValue, feedback: ratingFeedback || undefined }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Falha ao registrar avaliação');
      }

      setShowRatingModal(false);
      setRatingFeedback('');
      setSuccessMessage('Avaliação enviada. Obrigado pelo feedback!');
      await fetchTicket(id);
    } catch (err: any) {
      setError(err.message || 'Falha ao registrar avaliação');
    } finally {
      setSubmittingRating(false);
    }
  };

  const getInternalRole = () => {
    try {
      const userData = localStorage.getItem('internal_user');
      if (!userData) return null;
      const parsed = JSON.parse(userData);
      return parsed?.role || null;
    } catch {
      return null;
    }
  };

  const canManualClose = () => {
    const role = getInternalRole();
    return role === 'it_staff' || role === 'admin_staff' || role === 'admin' || role === 'manager' || role === 'gestor';
  };

  const handleManualClose = async () => {
    if (!id || !isInternalUser || !canManualClose()) return;

    try {
      setSubmittingConfirmation(true);
      setError('');

      const response = await fetch(`${BACKEND_URL}/api/tickets/${id}/manual-close`, {
        method: 'POST',
        headers: buildHeaders(),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Falha ao encerrar chamado');
      }

      setSuccessMessage('Chamado encerrado manualmente pelo atendente.');
      await fetchTicket(id);
    } catch (err: any) {
      setError(err.message || 'Falha ao encerrar chamado');
    } finally {
      setSubmittingConfirmation(false);
    }
  };

  const getAutoCloseTimeText = () => {
    if (!ticket?.confirmation_requested_at) return null;

    const requestedAt = new Date(ticket.confirmation_requested_at).getTime();
    const deadline = requestedAt + 48 * 60 * 60 * 1000;
    const remainingMs = deadline - nowMs;

    if (remainingMs <= 0) {
      return 'O prazo de confirmação já expirou.';
    }

    const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
    if (remainingHours < 24) {
      return `Faltam aproximadamente ${remainingHours}h para o encerramento automático.`;
    }

    const remainingDays = Math.floor(remainingHours / 24);
    const hoursRemainder = remainingHours % 24;
    return `Faltam aproximadamente ${remainingDays}d e ${hoursRemainder}h para o encerramento automático.`;
  };

  const getTimelineLabel = (action: string) => {
    const labels: Record<string, string> = {
      created: 'Abertura do chamado',
      assigned: 'Chamado atribuído',
      unassigned: 'Responsável removido',
      status_changed: 'Status alterado',
      marked_resolved_pending_confirmation: 'Resolvido e aguardando confirmação',
      confirmed_by_requester: 'Confirmado pelo usuário',
      reopened_by_requester: 'Reaberto pelo usuário',
      reopened_by_message: 'Reaberto por mensagem',
      rating_submitted: 'Avaliação registrada',
      manual_closed_by_staff: 'Encerrado manualmente',
      auto_close_warning_sent: 'Aviso de encerramento automático enviado',
      auto_closed_after_confirmation_timeout: 'Encerrado automaticamente',
      message_added: 'Nova mensagem',
    };
    return labels[action] || action;
  };

  if (loading) {
    return <div className="ticket-detail-page loading">Carregando...</div>;
  }

  if (error) {
    return (
      <div className="ticket-detail-page">
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="ticket-detail-page">
        <div className="alert alert-error">Chamado não encontrado</div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'status-open';
      case 'in_progress':
        return 'status-progress';
      case 'waiting_user':
        return 'status-waiting';
      case 'aguardando_confirmacao':
        return 'status-awaiting-confirmation';
      case 'resolved':
        return 'status-resolved';
      case 'closed':
        return 'status-closed';
      default:
        return 'status-default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open':
        return 'Aberto';
      case 'in_progress':
        return 'Em Atendimento';
      case 'waiting_user':
        return 'Aguardando Você';
      case 'aguardando_confirmacao':
        return 'Aguardando Confirmação';
      case 'resolved':
        return 'Resolvido';
      case 'closed':
        return 'Concluído';
      default:
        return status;
    }
  };

  const normalizedRating = ticket.rating !== null && ticket.rating !== undefined
    ? Number(ticket.rating)
    : null;

  return (
    <div className="ticket-detail-page">
      <div className="ticket-container">
        {successMessage && <div className="alert alert-success">{successMessage}</div>}

        {/* Cabeçalho com resumo */}
        <div className="ticket-hero">
          <div className="hero-badge">
            <span className={`status-badge-large ${getStatusColor(ticket.status)}`}>
              {getStatusLabel(ticket.status)}
            </span>
          </div>
          <h1 className="ticket-title-large">Solicitação #{ticket.id.substring(0, 8).toUpperCase()}</h1>
          <p className="ticket-subtitle">{ticket.title}</p>
          <div className="ticket-meta">
            <span>📅 Aberto em {new Date(ticket.created_at).toLocaleString('pt-BR', { 
              day: '2-digit', 
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })}</span>
            <span>📁 {ticket.type}</span>
          </div>
        </div>

        {/* Linha do tempo de status */}
        <StatusTimeline currentStatus={ticket.status} />

        {/* Próxima ação esperada */}
        <NextAction 
          status={ticket.status}
          department={ticket.department}
          lastUpdate={ticket.updated_at}
        />

        {ticket.status === 'aguardando_confirmacao' && (
          <div className="ticket-section resolution-confirmation">
            <h2 className="section-title">✅ Seu problema foi resolvido?</h2>
            <p className="confirmation-text">
              Seu chamado foi marcado como resolvido pela equipe. Confirme para concluirmos o atendimento.
            </p>
            <p className="confirmation-warning">
              O chamado será encerrado automaticamente após 48h sem resposta (com aviso após 24h).
            </p>
            {getAutoCloseTimeText() && (
              <p className="confirmation-time">{getAutoCloseTimeText()}</p>
            )}

            {!isInternalUser && (
              <div className="confirmation-actions">
                <button
                  type="button"
                  className="btn btn-success"
                  disabled={submittingConfirmation}
                  onClick={() => handleConfirmResolution(true)}
                >
                  {submittingConfirmation ? 'Processando...' : 'Sim, foi resolvido'}
                </button>
                <button
                  type="button"
                  className="btn btn-warning"
                  disabled={submittingConfirmation}
                  onClick={() => setShowReopenForm(true)}
                >
                  Não, ainda preciso de ajuda
                </button>
              </div>
            )}

            {!isInternalUser && showReopenForm && (
              <div className="reopen-form">
                <label htmlFor="reopen-reason">Descreva o que ainda não foi resolvido</label>
                <textarea
                  id="reopen-reason"
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  rows={4}
                  className="reply-textarea"
                  placeholder="Explique o que ainda precisa ser ajustado..."
                />
                <div className="confirmation-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowReopenForm(false);
                      setReopenReason('');
                    }}
                    disabled={submittingConfirmation}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn btn-warning"
                    disabled={submittingConfirmation || reopenReason.trim().length < 10}
                    onClick={() => handleConfirmResolution(false, reopenReason.trim())}
                  >
                    {submittingConfirmation ? 'Processando...' : 'Confirmar Reabertura'}
                  </button>
                </div>
              </div>
            )}

            {isInternalUser && canManualClose() && (
              <div className="confirmation-actions">
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={submittingConfirmation}
                  onClick={handleManualClose}
                >
                  {submittingConfirmation ? 'Encerrando...' : 'Encerrar chamado'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Descrição inicial */}
        <div className="ticket-section">
          <h2 className="section-title">📝 Sua Solicitação</h2>
          <div className="description-box">
            <p>{ticket.description}</p>
          </div>
        </div>

        {/* Conversa / Atualizações */}
        <div className="ticket-section">
          <h2 className="section-title">💬 Conversa e Atualizações</h2>

          {messages.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">💭</span>
              <p>Ainda não há atualizações. Você será notificado quando a equipe responder.</p>
            </div>
          ) : (
            <div className="conversation">
              {messages.map((msg) => {
                const isStaff = msg.author_type !== 'public';
                return (
                <div 
                  key={msg.id} 
                  className={`message ${isStaff ? 'message-ti' : 'message-user'}`}
                >
                  <div className="message-avatar">
                    {isStaff ? '🔧' : '👤'}
                  </div>
                  <div className="message-content">
                    <div className="message-header">
                      <span className="message-author">
                        {isStaff
                          ? msg.author_name || 'Equipe TI'
                          : 'Você'}
                      </span>
                      <span className="message-time">
                        {new Date(msg.created_at).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <p className="message-text">{msg.message}</p>
                  </div>
                </div>
                );
              })}
            </div>
          )}

          {ticket.status !== 'closed' && ticket.status !== 'resolved' && ticket.status !== 'aguardando_confirmacao' && (
            <form onSubmit={handleAddMessage} className="reply-form">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Digite sua mensagem..."
                rows={4}
                className="reply-textarea"
              />
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={submitting || !newMessage.trim()}
              >
                {submitting ? 'Enviando...' : '📤 Enviar Mensagem'}
              </button>
            </form>
          )}
        </div>

        {/* Anexos */}
        <TicketAttachments
          ticketId={id!}
          userToken={token || userToken || undefined}
          authToken={isInternalUser && internalToken ? internalToken : undefined}
        />

        {/* Informações técnicas (colapsável) */}
        <div className="ticket-section">
          <h2 className="section-title">🕒 Linha do Tempo</h2>
          {history.length === 0 ? (
            <p className="confirmation-time">Ainda não há eventos registrados.</p>
          ) : (
            <div className="history-timeline">
              {history.map((item) => (
                <div key={item.id} className="history-item">
                  <div className="history-marker" />
                  <div className="history-content">
                    <div className="history-title">{getTimelineLabel(item.action)}</div>
                    <div className="history-meta">
                      {item.changed_by_name || 'Sistema'} · {new Date(item.created_at).toLocaleString('pt-BR')}
                    </div>
                    {item.metadata?.reason && (
                      <div className="history-detail">Motivo: {String(item.metadata.reason)}</div>
                    )}
                    {item.metadata?.reopen_reason && (
                      <div className="history-detail">Justificativa: {String(item.metadata.reopen_reason)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <details className="ticket-details-section">
          <summary>🔍 Informações Técnicas</summary>
          <div className="details-grid">
            <div className="detail-item">
              <label>ID Completo:</label>
              <span className="mono">{ticket.id}</span>
            </div>
            <div className="detail-item">
              <label>Tipo:</label>
              <span>{ticket.type}</span>
            </div>
            <div className="detail-item">
              <label>Prioridade:</label>
              <span>{ticket.priority}</span>
            </div>
            <div className="detail-item">
              <label>Criado em:</label>
              <span>{new Date(ticket.created_at).toLocaleString('pt-BR')}</span>
            </div>
            <div className="detail-item">
              <label>Última atualização:</label>
              <span>{new Date(ticket.updated_at).toLocaleString('pt-BR')}</span>
            </div>
            {ticket.resolved_at && (
              <div className="detail-item">
                <label>Resolvido em:</label>
                <span>{new Date(ticket.resolved_at).toLocaleString('pt-BR')}</span>
              </div>
            )}
            <div className="detail-item">
              <label>Avaliação:</label>
              <span>
                {normalizedRating !== null
                  ? `${'★'.repeat(Math.max(0, Math.min(5, normalizedRating)))} (${normalizedRating}/5)`
                  : 'Sem avaliação registrada'}
              </span>
            </div>
            <div className="detail-item">
              <label>Feedback:</label>
              <span>{ticket.feedback?.trim() ? ticket.feedback : 'Nenhum comentário informado'}</span>
            </div>
            {ticket.rated_at && (
              <div className="detail-item">
                <label>Avaliado em:</label>
                <span>{new Date(ticket.rated_at).toLocaleString('pt-BR')}</span>
              </div>
            )}
          </div>
        </details>

        <div className="action-buttons">
          <a href="/meus-chamados" className="btn btn-secondary">
            ← Voltar para Minhas Solicitações
          </a>
        </div>

        {showRatingModal && (
          <div className="rating-modal-overlay" role="dialog" aria-modal="true">
            <div className="rating-modal">
              <h3>Avalie o atendimento</h3>
              <p>Sua avaliação ajuda a melhorar o serviço.</p>

              <div className="rating-options">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`rating-star ${ratingValue >= value ? 'selected' : ''}`}
                    onClick={() => setRatingValue(value)}
                  >
                    ★
                  </button>
                ))}
              </div>

              <textarea
                className="rating-feedback"
                placeholder="Comentário opcional"
                value={ratingFeedback}
                onChange={(e) => setRatingFeedback(e.target.value)}
                rows={4}
              />

              <div className="rating-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowRatingModal(false)}
                  disabled={submittingRating}
                >
                  Agora não
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSubmitRating}
                  disabled={submittingRating}
                >
                  {submittingRating ? 'Enviando...' : 'Enviar avaliação'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
