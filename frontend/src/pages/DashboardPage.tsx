import '../styles/DashboardPage.css';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [greeting, setGreeting] = useState('');
  const [userName, setUserName] = useState('Colaborador');

  useEffect(() => {
    // Saudação dinâmica baseada no horário
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Bom dia');
    } else if (hour < 18) {
      setGreeting('Boa tarde');
    } else {
      setGreeting('Boa noite');
    }

    // Pegar nome do usuário
    const internalUser = localStorage.getItem('internal_user');
    if (internalUser) {
      const userData = JSON.parse(internalUser);
      setUserName(userData.name?.split(' ')[0] || 'Colaborador');
    }
  }, []);

  return (
    <div className="page-container">
      <div className="welcome-section">
        <h1>{greeting}, {userName}! 👋</h1>
        <p className="welcome-message">Como podemos apoiar seu trabalho hoje?</p>
      </div>

      <div className="dashboard-grid">
        {/* Card de Solicitações Ativas */}
        <button 
          className="dashboard-card card-primary"
          onClick={() => navigate('/meus-chamados')}
          title="Acompanhar suas solicitações de apoio"
        >
          <div className="card-icon">🤝</div>
          <h3>Minhas Solicitações de Apoio</h3>
          <p className="stat">0</p>
          <small>Em andamento</small>
        </button>

        {/* Card de Recursos Atribuídos */}
        <button 
          className="dashboard-card card-secondary"
          onClick={() => navigate('/inventario')}
          title="Ver seus equipamentos"
        >
          <div className="card-icon">💻</div>
          <h3>Recursos Sob Minha Responsabilidade</h3>
          <p className="stat">0</p>
          <small>Equipamentos e materiais</small>
        </button>

        {/* Card de Ações Pendentes */}
        <button 
          className="dashboard-card card-accent"
          onClick={() => navigate('/notificacoes')}
          title="Ver ações pendentes"
        >
          <div className="card-icon">⏳</div>
          <h3>Aguardando Minha Ação</h3>
          <p className="stat">0</p>
          <small>Feedbacks e aprovações</small>
        </button>
      </div>

      {/* Seção de Status Recente */}
      <div className="recent-status">
        <h2>Status das Solicitações Recentes</h2>
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <p>Nenhuma solicitação de apoio ativa no momento</p>
          <button 
            className="btn-primary"
            onClick={() => navigate('/abrir-chamado')}
          >
            Nova Solicitação
          </button>
        </div>
      </div>

      {/* Seção de Acesso Rápido */}
      <div className="quick-access">
        <h2>Acesso Rápido</h2>
        <div className="quick-links">
          <a href="/central" className="quick-link">
            <span className="link-icon">💡</span>
            <span>Central de Dúvidas</span>
          </a>
          <a href="/abrir-chamado" className="quick-link">
            <span className="link-icon">🤝</span>
            <span>Solicitar Apoio</span>
          </a>
          <a href="/meus-chamados" className="quick-link">
            <span className="link-icon">📋</span>
            <span>Minhas Solicitações</span>
          </a>
        </div>
      </div>
    </div>
  );
}
