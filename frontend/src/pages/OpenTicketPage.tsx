import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { showToast } from '../utils/toast';
import '../styles/OpenTicketPage.css';
import { BACKEND_URL } from '../services/api';

interface FormData {
  email: string;
  name: string;
  department: string;
  unit: string;
  title: string;
  description: string;
  type: string;
  priority: string;
}

export default function OpenTicketPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    email: '',
    name: '',
    department: '',
    unit: '',
    title: '',
    description: '',
    type: 'incident',
    priority: 'medium',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Validação client-side
    if (formData.title.length < 5) {
      setError('Título deve ter no mínimo 5 caracteres');
      showToast.error('Título deve ter no mínimo 5 caracteres');
      setLoading(false);
      return;
    }

    if (formData.description.length < 10) {
      setError('Descrição deve ter no mínimo 10 caracteres');
      showToast.error('Descrição deve ter no mínimo 10 caracteres');
      setLoading(false);
      return;
    }

    console.log('Iniciando criação de chamado...', {
      email: formData.email,
      name: formData.name,
      title: formData.title,
      type: formData.type,
      priority: formData.priority,
      descLength: formData.description.length
    });

    try {
      // First, get access token for public user
      const accessResponse = await fetch(`${BACKEND_URL}/api/public-auth/public-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name,
          department: formData.department,
          unit: formData.unit,
        }),
      });

      if (!accessResponse.ok) {
        const errorData = await accessResponse.json().catch(() => ({}));
        console.error('Erro ao obter token:', errorData);
        throw new Error(errorData.error || 'Erro ao registrar usuário');
      }

      const { user_token } = await accessResponse.json();
      console.log('Token obtido com sucesso');

      // Create ticket
      const ticketResponse = await fetch(`${BACKEND_URL}/api/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Token': user_token,
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          type: formData.type,
          priority: formData.priority,
        }),
      });

      if (!ticketResponse.ok) {
        const errorData = await ticketResponse.json().catch(() => ({}));
        console.error('Erro ao criar chamado:', errorData);
        const errorMessage = errorData.details 
          ? `${errorData.error}: ${errorData.details}` 
          : errorData.error || 'Erro ao criar chamado';
        throw new Error(errorMessage);
      }

      const { id } = await ticketResponse.json();
      
      // Store tokens in localStorage for tracking
      localStorage.setItem('user_token', user_token); // General user token for listing tickets
      localStorage.setItem(`ticket_token_${id}`, user_token);
      localStorage.setItem(`ticket_email`, formData.email);
      
      const ticketCode = id.substring(0, 8).toUpperCase();
      setSuccess(ticketCode);
      showToast.success(`Chamado #${ticketCode} criado com sucesso!`);

      // Redirect after 4 seconds
      setTimeout(() => {
        navigate(`/chamado/${id}?token=${user_token}`);
      }, 4000);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar chamado');
      showToast.error(err.message || 'Erro ao criar chamado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="open-ticket-page">
      <div className="ticket-form-container">
        <div className="form-header">
          <h1>Nova Solicitação de Apoio</h1>
          <p>Descreva sua necessidade para que possamos apoiar seu trabalho</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && (
          <div className="success-message">
            <div className="success-icon">✅</div>
            <h2>Solicitação Criada com Sucesso!</h2>
            <div className="ticket-code-display">
              <p className="code-label">Seu código de protocolo:</p>
              <div className="code-box">{success}</div>
              <p className="code-hint">💡 Guarde este código para acompanhar sua solicitação</p>
            </div>
            <div className="success-actions">
              <p className="redirect-message">Redirecionando para os detalhes...</p>
              <p className="or-message">ou</p>
              <div className="action-buttons">
                <button 
                  onClick={() => navigate(`/chamado/${success.toLowerCase()}`)} 
                  className="btn btn-primary"
                >
                  Ver Detalhes Agora
                </button>
                <button 
                  onClick={() => navigate('/meus-chamados')} 
                  className="btn btn-secondary"
                >
                  Ver Todas Solicitações
                </button>
              </div>
            </div>
          </div>
        )}

        {!success && <form onSubmit={handleSubmit} className="ticket-form">
          {/* Personal Info */}
          <fieldset className="form-section">
            <legend>Suas Informações</legend>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="seu@email.com"
                />
              </div>
               <div className="form-group">
                <label htmlFor="name">Nome Completo</label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Seu Nome"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="department">Setor</label>
                <input
                  id="department"
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  placeholder="Ex: Educação, Saúde, Administração"
                />
              </div>
              <div className="form-group">
                <label htmlFor="unit">Unidade</label>
                <input
                  id="unit"
                  type="text"
                  name="unit"
                  value={formData.unit}
                  onChange={handleChange}
                  placeholder="Ex: CAPS, Escola Municipal X"
                />
              </div>
            </div>
          </fieldset>

          {/* Ticket Info */}
          <fieldset className="form-section">
            <legend>Detalhes da Solicitação</legend>
            <div className="form-group">
              <label htmlFor="title">Resumo</label>
              <input
                id="title"
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="Ex: Computador da sala de aula não liga"
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Descrição Completa</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                placeholder="Descreva em detalhes o que está acontecendo e como isso impacta seu trabalho..."
                rows={6}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="type">Tipo de Solicitação</label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                >
                  <option value="incident">Problema Técnico</option>
                  <option value="request">Pedido de Material/Serviço</option>
                  <option value="change">Alteração de Configuração</option>
                  <option value="problem">Investigação de Problema</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="priority">Impacto no Atendimento</label>
                <select
                  id="priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                >
                  <option value="low">Baixo - Pode esperar alguns dias</option>
                  <option value="medium">Médio - Afeta minhas atividades</option>
                  <option value="high">Alto - Dificulta muito o trabalho</option>
                </select>
              </div>
            </div>
          </fieldset>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Enviando solicitação...' : 'Solicitar Apoio'}
          </button>
        </form>}
      </div>
    </div>
  );
}
