import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { TICKET_SHORTCUTS } from '../utils/ticketShortcuts';
import '../styles/HomePage.css';

const MORE_SERVICES = [
  { path: '/meus-chamados', icon: 'ti-list-check', label: 'Meus chamados', hint: 'Veja em que etapa está cada pedido' },
  { path: '/central', icon: 'ti-help-circle', label: 'Central de dúvidas', hint: 'Tutoriais e respostas para problemas comuns' },
  { path: '/status', icon: 'ti-activity-heartbeat', label: 'Status dos sistemas', hint: 'Veja se algum serviço está fora do ar' },
];

const DEMO_STAGES = [
  { label: 'Recebido', note: 'A equipe de TI recebeu o pedido' },
  { label: 'Em atendimento', note: 'Um técnico está cuidando disso' },
  { label: 'Resolvido', note: 'Impressora funcionando de novo' },
];

/**
 * Um chamado de exemplo percorrendo as etapas: mostra, sem texto, o que
 * acontece depois de abrir um pedido. Decorativo e marcado como exemplo.
 */
function TicketDemo() {
  const [stage, setStage] = useState(1);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setStage((current) => (current + 1) % DEMO_STAGES.length), 2600);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="home-demo" aria-hidden="true">
      <div className="home-demo__ghost home-demo__ghost--2" />
      <div className="home-demo__ghost home-demo__ghost--1" />
      <div className="home-demo__card">
        <div className="home-demo__top">
          <span className="pub-gicon"><i className="ti ti-printer" /></span>
          <span className="home-demo__tag">Exemplo</span>
        </div>
        <strong className="home-demo__title">Impressora da sala 2 não imprime</strong>
        <span className="home-demo__code">#E0743972, Suporte de TI</span>

        <ol className="home-demo__track" data-stage={stage}>
          {DEMO_STAGES.map((item, index) => (
            <li key={item.label} className={index <= stage ? 'is-on' : ''}>
              <span className="home-demo__dot" />
              {item.label}
            </li>
          ))}
        </ol>
        <p key={stage} className="home-demo__note">{DEMO_STAGES[stage].note}</p>
      </div>
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();

  // Redirecionar usuários internos para seu dashboard
  useEffect(() => {
    const isInternalUser = !!localStorage.getItem('internal_token');
    if (isInternalUser) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [navigate]);

  return (
    <div className="pub-page home">
      <section className="home-hero pub-aurora">
        <div className="pub-wrap home-hero__inner">
          <div className="home-hero__copy">
            <h1>Do que você precisa hoje?</h1>
            <p>
              Peça ajuda à TI, ao RH ou ao Administrativo e acompanhe cada etapa
              do atendimento até a solução.
            </p>
            <div className="home-hero__actions">
              <button type="button" className="pub-btn pub-btn--sun" onClick={() => navigate('/abrir-chamado')}>
                <i className="ti ti-message-plus" aria-hidden="true" />
                Abrir um chamado
              </button>
              <button type="button" className="home-hero__secondary" onClick={() => navigate('/meus-chamados')}>
                <i className="ti ti-list-check" aria-hidden="true" />
                Acompanhar meus chamados
              </button>
            </div>
          </div>
          <TicketDemo />
        </div>
      </section>

      <div className="pub-wrap home-body">
        <section className="home-section" aria-labelledby="home-shortcuts-title">
          <header className="home-section__head">
            <h2 id="home-shortcuts-title">Problemas comuns</h2>
            <p>Toque no seu caso e o chamado já começa preenchido.</p>
          </header>
          <ul className="pub-tiles">
            {TICKET_SHORTCUTS.map((shortcut) => (
              <li key={shortcut.id}>
                <button
                  type="button"
                  className="pub-tile"
                  onClick={() => navigate(`/abrir-chamado?atalho=${shortcut.id}`)}
                >
                  <span className={`pub-gicon pub-gicon--${shortcut.dept}`} aria-hidden="true">
                    <i className={`ti ${shortcut.icon}`} />
                  </span>
                  <span className="pub-tile__copy">
                    <strong>{shortcut.label}</strong>
                    <span>{shortcut.hint}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="home-legend">
            <span><i className="home-legend__dot home-legend__dot--ti" />TI</span>
            <span><i className="home-legend__dot home-legend__dot--administrativo" />Administrativo</span>
            <span><i className="home-legend__dot home-legend__dot--rh" />RH</span>
          </p>
        </section>

        <section className="home-section" aria-labelledby="home-more-title">
          <header className="home-section__head">
            <h2 id="home-more-title">Outros serviços</h2>
          </header>
          <ul className="pub-list">
            {MORE_SERVICES.map((service) => (
              <li key={service.path}>
                <button type="button" className="pub-row" onClick={() => navigate(service.path)}>
                  <span className="pub-gicon pub-gicon--neutral" aria-hidden="true">
                    <i className={`ti ${service.icon}`} />
                  </span>
                  <span className="pub-row__copy">
                    <strong>{service.label}</strong>
                    <span>{service.hint}</span>
                  </span>
                  <i className="ti ti-chevron-right pub-row__chevron" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <footer className="home-footer">
        <div className="pub-wrap">
          <p>O Pequeno Nazareno. Dignidade e justiça para a infância.</p>
        </div>
      </footer>
    </div>
  );
}
