import { useEffect, useState } from 'react';
import { ticketService } from '../services/ticketService';
import { Ticket } from '../types';
import '../styles/TicketsPage.css';

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'request',
    priority: 'medium',
  });

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const data = await ticketService.getMyTickets();
      setTickets(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao carregar chamados');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ticketService.create(
        formData.title,
        formData.description,
        formData.type as any,
        formData.priority as any
      );
      setFormData({ title: '', description: '', type: 'request', priority: 'medium' });
      setShowForm(false);
      loadTickets();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao criar chamado');
    }
  };

  return (
    <div className="page-container">
      <h1>Meus Chamados</h1>

      {error && <div className="alert alert-error">{error}</div>}

      <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
        {showForm ? 'Cancelar' : 'Novo Chamado'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="ticket-form">
          <div className="form-group">
            <label>Título</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Descrição</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Tipo</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="request">Solicitação</option>
                <option value="incident">Incidente</option>
                <option value="problem">Problema</option>
                <option value="change">Mudança</option>
              </select>
            </div>
            <div className="form-group">
              <label>Prioridade</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
                <option value="critical">Crítica</option>
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn-primary">
            Criar Chamado
          </button>
        </form>
      )}

      {loading ? (
        <div className="loading">Carregando...</div>
      ) : tickets.length === 0 ? (
        <div className="empty-state">
          <p>Você ainda não tem chamados</p>
        </div>
      ) : (
        <div className="tickets-grid">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="ticket-card">
              <h3>{ticket.title}</h3>
              <p className="description">{ticket.description}</p>
              <div className="ticket-meta">
                <span className={`status status-${ticket.status}`}>{ticket.status}</span>
                <span className={`priority priority-${ticket.priority}`}>{ticket.priority}</span>
              </div>
              <small>Criado em {new Date(ticket.createdAt).toLocaleDateString()}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
