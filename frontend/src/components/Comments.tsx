import React, { useState, useEffect } from 'react';
import '../styles/Comments.css';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';

interface Message {
  id: string;
  message: string;
  author_type: 'public' | 'it_staff';
  author_id: string;
  is_internal: boolean;
  created_at: string;
  author_name?: string;
}

interface CommentsProps {
  ticketId: string;
}

const Comments: React.FC<CommentsProps> = ({ ticketId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const { user } = useAuthStore();
  const { success, error } = useToastStore();

  useEffect(() => {
    fetchMessages();

    // Listen for new messages via WebSocket
    const handleNewMessage = (event: any) => {
      if (event.detail.ticketId === ticketId) {
        fetchMessages();
      }
    };

    window.addEventListener('ticket:message', handleNewMessage);
    return () => window.removeEventListener('ticket:message', handleNewMessage);
  }, [ticketId]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('internal_token') || localStorage.getItem('user_token');
      const headers: HeadersInit = {};

      if (token?.startsWith('Bearer')) {
        headers['Authorization'] = token;
      } else if (token) {
        headers['x-user-token'] = token;
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/tickets/${ticketId}/messages`,
        { headers }
      );

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim()) {
      error('Por favor, escreva uma mensagem');
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem('internal_token') || localStorage.getItem('user_token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };

      if (token?.startsWith('Bearer')) {
        headers['Authorization'] = token;
      } else if (token) {
        headers['x-user-token'] = token;
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/tickets/${ticketId}/messages`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            message: newMessage,
            is_internal: isInternal
          })
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao enviar mensagem');
      }

      success('Mensagem enviada!');
      setNewMessage('');
      setIsInternal(false);
      fetchMessages();
    } catch (err: any) {
      error(err.message || 'Erro ao enviar mensagem');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const timeStr = d.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    if (d.toDateString() === today.toDateString()) {
      return `Hoje às ${timeStr}`;
    } else if (d.toDateString() === yesterday.toDateString()) {
      return `Ontem às ${timeStr}`;
    } else {
      return d.toLocaleDateString('pt-BR') + ' às ' + timeStr;
    }
  };

  const isITStaff = user?.role === 'it_staff' || user?.role === 'admin';

  return (
    <div className="comments-container">
      <h3>Conversação</h3>

      {loading && <div className="comments-loading">Carregando mensagens...</div>}

      <div className="messages-list">
        {messages.length === 0 && !loading && (
          <div className="no-messages">
            Nenhuma mensagem ainda. Seja o primeiro a comentar!
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`message-item ${message.author_type} ${message.is_internal ? 'internal' : ''}`}
          >
            {message.is_internal && (
              <div className="internal-badge">🔒 Nota Interna</div>
            )}
            <div className="message-header">
              <span className="message-author">
                {message.author_type === 'it_staff' ? '👤 Equipe TI' : '👤 Você'}
              </span>
              <span className="message-date">{formatDate(message.created_at)}</span>
            </div>
            <div className="message-content">{message.message}</div>
          </div>
        ))}
      </div>

      <form className="message-form" onSubmit={handleSubmit}>
        <textarea
          className="message-input"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Digite sua mensagem..."
          rows={3}
          disabled={submitting}
        />

        {isITStaff && (
          <label className="internal-checkbox">
            <input
              type="checkbox"
              checked={isInternal}
              onChange={(e) => setIsInternal(e.target.checked)}
              disabled={submitting}
            />
            <span>Nota interna (visível apenas para equipe TI)</span>
          </label>
        )}

        <button
          type="submit"
          className="message-submit-btn"
          disabled={submitting || !newMessage.trim()}
        >
          {submitting ? 'Enviando...' : '📤 Enviar Mensagem'}
        </button>
      </form>
    </div>
  );
};

export default Comments;
