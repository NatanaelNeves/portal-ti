import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import StatusTimeline from '../components/StatusTimeline';
import NextAction from '../components/NextAction';
import '../styles/TicketDetailPage.css';

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
        fetch(`/api/tickets/${ticketId}`, { headers }),
        fetch(`/api/tickets/${ticketId}/messages`, { headers }),
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

  const handleAddMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !id) return;
    
    // Usuário interno pode enviar sem token público
    if (!isInternalUser && !token) return;

    try {
      setSubmitting(true);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Usuário interno usa JWT, usuário público usa token
      if (isInternalUser && internalToken) {
        headers['Authorization'] = `Bearer ${internalToken}`;
      } else if (token) {
        headers['X-User-Token'] = token;
      }

      const response = await fetch(`/api/tickets/${id}/messages`, {
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

      setNewMessage('');
      fetchTicket(id); // Refresh messages
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
        return 'Em Progresso';
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
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`message ${msg.author_type === 'internal' ? 'message-ti' : 'message-user'}`}
                >
                  <div className="message-avatar">
                    {msg.author_type === 'internal' ? '🔧' : '👤'}
                  </div>
                  <div className="message-content">
                    <div className="message-header">
                      <span className="message-author">
                        {msg.author_type === 'internal' ? 'Equipe TI' : 'Você'}
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
              ))}
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
