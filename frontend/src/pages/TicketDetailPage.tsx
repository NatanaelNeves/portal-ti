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
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

interface Message {
  id: string;
  message: string;
  author_type: string;
  author_name?: string;
  created_at: string;
  is_internal: boolean;
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const token = searchParams.get('token');
  const isInternalUser = !!localStorage.getItem('internal_token');
  const internalToken = localStorage.getItem('internal_token');
  const userToken = localStorage.getItem('user_token');

  useEffect(() => {
    if (id) {
      fetchTicket(id);
    }
  }, [id]);

  const fetchTicket = async (ticketId: string) => {
    try {
      setLoading(true);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Usuário interno usa JWT, usuário público usa token
      if (isInternalUser && internalToken) {
        headers['Authorization'] = `Bearer ${internalToken}`;
      } else if (token) {
        headers['X-User-Token'] = token;
      } else if (userToken) {
        headers['X-User-Token'] = userToken;
      }

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
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar chamado');
    } finally {
      setLoading(false);
    }
  };

  const silentRefresh = async (ticketId: string, updateStatus = true) => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (isInternalUser && internalToken) {
        headers['Authorization'] = `Bearer ${internalToken}`;
      } else if (token) {
        headers['X-User-Token'] = token;
      } else if (userToken) {
        headers['X-User-Token'] = userToken;
      }
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
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Usuário interno usa JWT, usuário público usa token (URL param ou localStorage)
      if (isInternalUser && internalToken) {
        headers['Authorization'] = `Bearer ${internalToken}`;
      } else if (token) {
        headers['X-User-Token'] = token;
      } else if (userToken) {
        headers['X-User-Token'] = userToken;
      }

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

      // Se o backend retornou o status atualizado do chamado, aplica imediatamente
      if (responseData.ticket_status) {
        setTicket(prev => prev ? { ...prev, status: responseData.ticket_status } : prev);
      } else if (!isInternalUser && ticket?.status === 'waiting_user') {
        // Fallback otimista caso backend antigo não retorne ticket_status
        setTicket(prev => prev ? { ...prev, status: 'in_progress' } : prev);
      }

      await silentRefresh(id, false); // Só atualiza mensagens — não sobrescreve o status já setado do POST
    } catch (err: any) {
      setError(err.message || 'Erro ao adicionar mensagem');
    } finally {
      setSubmitting(false);
    }
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
      case 'resolved':
        return 'Resolvido';
      case 'closed':
        return 'Fechado';
      default:
        return status;
    }
  };

  return (
    <div className="ticket-detail-page">
      <div className="ticket-container">
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
          lastUpdate={ticket.updated_at}
        />

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

          {ticket.status !== 'closed' && ticket.status !== 'resolved' && (
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
          </div>
        </details>

        <div className="action-buttons">
          <a href="/meus-chamados" className="btn btn-secondary">
            ← Voltar para Minhas Solicitações
          </a>
        </div>
      </div>
    </div>
  );
}
