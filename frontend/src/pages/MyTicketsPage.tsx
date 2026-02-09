import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/MyTicketsPage.css';

interface Ticket {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
}

export default function MyTicketsPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchCode, setSearchCode] = useState('');
  const [codeEmail, setCodeEmail] = useState('');

  const handleChangeEmail = () => {
    if (confirm('Deseja usar outro email? Isso irá limpar os dados do email atual.')) {
      localStorage.removeItem('user_token');
      localStorage.removeItem('ticket_email');
      setEmail('');
      setTickets([]);
      setShowEmailForm(true);
      setError('');
    }
  };

  useEffect(() => {
    const isInternalUser = !!localStorage.getItem('internal_token');
    if (isInternalUser) {
      navigate('/admin/chamados', { replace: true });
      return;
    }

    const storedEmail = localStorage.getItem('ticket_email');
    const storedToken = localStorage.getItem('user_token');

    if (storedEmail && storedToken) {
      setEmail(storedEmail);
      fetchTickets(storedToken);
    } else {
      setShowEmailForm(true);
      setLoading(false);
    }
  }, [navigate]);

  const handleSearchByEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchEmail.trim()) {
      setError('Por favor, informe seu email');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const accessResponse = await fetch('/api/public-auth/public-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: searchEmail,
          name: 'Visitante',
        }),
      });

      if (!accessResponse.ok) {
        throw new Error('Email não encontrado. Você já abriu alguma solicitação com este email?');
      }

      const { user_token } = await accessResponse.json();

      localStorage.setItem('user_token', user_token);
      localStorage.setItem('ticket_email', searchEmail);
      setEmail(searchEmail);
      setShowEmailForm(false);
      
      await fetchTickets(user_token);
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar solicitações');
      setLoading(false);
    }
  };

  const handleSearchByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchCode.trim()) {
      setError('Por favor, informe o código da solicitação');
      return;
    }

    if (!codeEmail.trim()) {
      setError('Por favor, informe seu email');
      return;
    }

    const ticketCode = searchCode.toLowerCase().trim();
    const email = codeEmail.trim();
    
    // Verificar se é um código válido (pelo menos 8 caracteres)
    if (ticketCode.length < 8) {
      setError('O código deve ter pelo menos 8 caracteres. Exemplo: E0743972');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Registrar/obter token do usuário público
      const response = await fetch('/api/public-auth/public-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: email.split('@')[0] }),
      });

      if (!response.ok) {
        setError('Erro ao validar email');
        setLoading(false);
        return;
      }

      const { user_token } = await response.json();
      
      // Buscar tickets do usuário
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-User-Token': user_token,
      };
      
      const ticketsResponse = await fetch('/api/tickets', { headers });
      
      if (!ticketsResponse.ok) {
        setError('Erro ao buscar solicitações');
        setLoading(false);
        return;
      }

      const userTickets = await ticketsResponse.json();
      
      if (userTickets.length === 0) {
        setError('Nenhuma solicitação encontrada para este email');
        setLoading(false);
        return;
      }
      
      // Buscar ticket pelo código (8 chars ou UUID completo)
      const foundTicket = userTickets.find((t: any) => {
        if (ticketCode.length === 8) {
          return t.id.substring(0, 8).toLowerCase() === ticketCode;
        }
        return t.id.toLowerCase() === ticketCode;
      });
      
      if (!foundTicket) {
        setError('Código não encontrado. Verifique se o código pertence a uma solicitação deste email.');
        setLoading(false);
        return;
      }

      // Salvar token e email
      localStorage.setItem('user_token', user_token);
      localStorage.setItem('ticket_email', email);
      
      // Redirecionar para o ticket
      navigate(`/chamado/${foundTicket.id}`);
      
    } catch (err: any) {
      console.error('Erro ao buscar solicitação:', err);
      setError(err.message || 'Erro ao buscar solicitação');
      setLoading(false);
    }
  };

  const fetchTickets = async (token: string) => {
    try {
      setLoading(true);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-User-Token': token,
      };

      const response = await fetch('/api/tickets', { headers });

      if (!response.ok) {
        throw new Error('Erro ao carregar solicitações');
      }

      const data = await response.json();
      setTickets(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar solicitações');
    } finally {
      setLoading(false);
    }
  };

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
        return '📥 Recebido';
      case 'in_progress':
        return '🔍 Em Análise';
      case 'resolved':
        return '⚙️ Resolvendo';
      case 'closed':
        return '✅ Concluído';
      default:
        return status;
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'Baixo';
      case 'medium':
        return 'Médio';
      case 'high':
        return 'Alto';
      case 'critical':
        return 'Crítico';
      default:
        return priority;
    }
  };

  return (
    <div className="my-tickets-page">
      <div className="tickets-container">
        <div className="tickets-header">
          <h1>Minhas Solicitações</h1>
          <p>Acompanhe o progresso das suas solicitações de apoio</p>
          {email && (
            <div className="user-info-section">
              <p className="user-email">Solicitações de: {email}</p>
              <button onClick={handleChangeEmail} className="btn-change-email">
                Usar outro email
              </button>
            </div>
          )}
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {showEmailForm && !loading && (
          <div className="search-forms">
            <div className="search-intro">
              <h2>Como você quer encontrar suas solicitações?</h2>
              <p>Escolha uma das opções abaixo:</p>
            </div>

            <div className="search-options">
              <div className="search-option">
                <div className="option-icon">📧</div>
                <h3>Buscar por Email</h3>
                <p>Informe o email usado para abrir as solicitações</p>
                <form onSubmit={handleSearchByEmail} className="search-form">
                  <input
                    type="email"
                    placeholder="seu@email.com"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    required
                  />
                  <button type="submit" className="btn btn-primary">
                    Buscar Minhas Solicitações
                  </button>
                </form>
              </div>

              <div className="search-option">
                <div className="option-icon">🔍</div>
                <h3>Buscar por Código</h3>
                <p>Digite seu email e o código da solicitação</p>
                <form onSubmit={handleSearchByCode} className="search-form">
                  <input
                    type="email"
                    placeholder="Seu email"
                    value={codeEmail}
                    onChange={(e) => setCodeEmail(e.target.value)}
                    className="search-input"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Código da solicitação (ex: E0743972)"
                    value={searchCode}
                    onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                    className="search-input"
                    required
                  />
                  <button type="submit" className="btn btn-secondary">
                    Buscar Solicitação
                  </button>
                </form>
              </div>
            </div>

            <div className="search-help">
              <p>💡 <strong>Ainda não tem uma solicitação?</strong></p>
              <a href="/abrir-chamado" className="btn-link">
                Clique aqui para solicitar apoio
              </a>
            </div>
          </div>
        )}

        {loading ? (
          <div className="loading">Buscando suas solicitações...</div>
        ) : !showEmailForm && tickets.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p>Você ainda não tem nenhuma solicitação de apoio</p>
            <a href="/abrir-chamado" className="btn btn-primary">
              Solicitar Apoio
            </a>
          </div>
        ) : !showEmailForm && (
          <div className="tickets-list">
            {tickets.map((ticket) => (
              <a
                key={ticket.id}
                href={`/chamado/${ticket.id}`}
                className="ticket-item"
              >
                <div className="ticket-header">
                  <h3>{ticket.title}</h3>
                  <span className={`status-badge ${getStatusColor(ticket.status)}`}>
                    {getStatusLabel(ticket.status)}
                  </span>
                </div>
                <div className="ticket-meta">
                  <span className="priority">
                    Impacto: {getPriorityLabel(ticket.priority)}
                  </span>
                  <span className="date">
                    Aberta em: {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString('pt-BR') : '-'}
                  </span>
                </div>
                <div className="ticket-code">
                  Código: {ticket.id.substring(0, 8).toUpperCase()}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
