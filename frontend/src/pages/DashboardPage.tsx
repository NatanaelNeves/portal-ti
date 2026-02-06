import '../styles/DashboardPage.css';
import { useState, useEffect } from 'react';

export default function DashboardPage() {
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
        <div className="dashboard-card card-primary">
          <div className="card-icon">🤝</div>
          <div className="card-content">
            <h3>Minhas Solicitações de Apoio</h3>
            <p className="stat">0</p>
            <small>Em andamento</small>
          </div>
          <div className="card-action">
            <button className="btn-card">Ver Todas</button>
          </div>
        </div>

        {/* Card de Recursos Atribuídos */}
        <div className="dashboard-card card-secondary">
          <div className="card-icon">💻</div>
          <div className="card-content">
            <h3>Recursos Sob Minha Responsabilidade</h3>
            <p className="stat">0</p>
            <small>Equipamentos e materiais</small>
          </div>
          <div className="card-action">
            <button className="btn-card">Ver Recursos</button>
          </div>
        </div>

        {/* Card de Ações Pendentes */}
        <div className="dashboard-card card-accent">
          <div className="card-icon">⏳</div>
          <div className="card-content">
            <h3>Aguardando Minha Ação</h3>
            <p className="stat">0</p>
            <small>Feedbacks e aprovações</small>
          </div>
          <div className="card-action">
            <button className="btn-card">Ver Pendências</button>
          </div>
        </div>
      </div>

      {/* Seção de Status Recente */}
      <div className="recent-status">
        <h2>Status das Solicitações Recentes</h2>
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <p>Nenhuma solicitação de apoio ativa no momento</p>
          <button className="btn-primary">Nova Solicitação</button>
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
