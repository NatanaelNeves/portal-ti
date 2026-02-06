import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import '../styles/HomePage.css';

export default function HomePage() {
  const navigate = useNavigate();

  // Redirecionar usuários internos para seu dashboard
  useEffect(() => {
    const isInternalUser = !!localStorage.getItem('internal_token');
    if (isInternalUser) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleOpenTicket = () => {
    navigate('/abrir-chamado');
  };

  const handleTrackTicket = () => {
    navigate('/meus-chamados');
  };

  const handleKnowledge = () => {
    navigate('/central');
  };

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1>Central de Apoio O Pequeno Nazareno</h1>
          <p>Cuidando de quem transforma vidas através da educação e do acolhimento</p>
        </div>
      </section>

      {/* Main Actions */}
      <section className="main-actions">
        <div className="actions-container">
          <div className="action-card" onClick={handleOpenTicket}>
            <div className="action-icon">🤝</div>
            <h3>Solicitar Apoio</h3>
            <p>Relate um problema ou solicite suporte para seu trabalho</p>
            <button className="action-button">Começar</button>
          </div>

          <div className="action-card" onClick={handleTrackTicket}>
            <div className="action-icon">📋</div>
            <h3>Minhas Solicitações</h3>
            <p>Acompanhe o andamento das suas solicitações de apoio</p>
            <button className="action-button">Acompanhar</button>
          </div>

          <div className="action-card" onClick={handleKnowledge}>
            <div className="action-icon">💡</div>
            <h3>Central de Dúvidas</h3>
            <p>Tutoriais, FAQs e documentação institucional</p>
            <button className="action-button">Explorar</button>
          </div>
        </div>
      </section>

      {/* Info Section */}
      <section className="info-section">
        <div className="info-container">
          <div className="info-item">
            <h4>⚡ Ágil</h4>
            <p>Registre sua solicitação em minutos</p>
          </div>
          <div className="info-item">
            <h4>✅ Transparente</h4>
            <p>Acompanhe cada etapa do atendimento</p>
          </div>
          <div className="info-item">
            <h4>🤲 Colaborativo</h4>
            <p>Trabalhando juntos pela nossa missão</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <p>&copy; 2024 O Pequeno Nazareno - Dignidade e Justiça para a Infância</p>
      </footer>
    </div>
  );
}
