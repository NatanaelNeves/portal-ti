import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { showToast } from '../utils/toast';
import useTicketsOverview from '../hooks/useTicketsOverview';
import RhTicketCard, { type RhTicket } from '../components/rh/RhTicketCard';
import { ACTIVE_STATUSES, currentInternalUser, greeting } from '../components/rh/rhLabels';
import '../styles/RhDashboardPage.css';

const PREVIEW_LIMIT = 4;

export default function RhDashboardPage() {
  const navigate = useNavigate();
  const user = currentInternalUser();
  const firstName = (user?.name || '').trim().split(/\s+/)[0];
  const { overview, reload: reloadOverview } = useTicketsOverview('rh', true);

  const [newTickets, setNewTickets] = useState<RhTicket[]>([]);
  const [mineTickets, setMineTickets] = useState<RhTicket[]>([]);
  const [mineTotal, setMineTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assumingId, setAssumingId] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('internal_token');
    if (!token || !user || !['rh_staff', 'admin'].includes(user.role || '')) {
      navigate('/admin/login');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const active = ACTIVE_STATUSES.map((s) => `status=${s}`).join('&');
      const [newResp, mineResp] = await Promise.all([
        api.get(`/tickets?department=rh&status=open&assigned_to=unassigned&limit=${PREVIEW_LIMIT}&sort=created_at&order=asc`),
        api.get(`/tickets?department=rh&${active}&assigned_to=${user.id}&limit=${PREVIEW_LIMIT}&sort=updated_at&order=desc`),
      ]);
      setNewTickets(newResp.data?.data || []);
      setMineTickets(mineResp.data?.data || []);
      setMineTotal(mineResp.data?.pagination?.total ?? (mineResp.data?.data || []).length);
      setError('');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Não foi possível carregar os chamados. Confira a internet e toque em Tentar de novo.');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void load();
    const refresh = () => void load();
    const events = ['ticket:new', 'ticket:updated', 'ticket:resolved', 'ticket:reopened'];
    events.forEach((name) => window.addEventListener(name, refresh));
    const timer = window.setInterval(refresh, 60_000);
    return () => {
      events.forEach((name) => window.removeEventListener(name, refresh));
      window.clearInterval(timer);
    };
  }, [load]);

  const assume = async (ticket: RhTicket) => {
    if (!user) return;
    try {
      setAssumingId(ticket.id);
      await api.patch(`/tickets/${ticket.id}`, { status: 'in_progress', assigned_to_id: user.id });
      showToast.success('Chamado assumido. Agora ele está com você.');
      navigate(`/rh/chamados/${ticket.id}`);
    } catch (err: any) {
      showToast.error(err?.response?.data?.error || 'Não foi possível assumir o chamado. Tente de novo.');
      void load();
      reloadOverview();
    } finally {
      setAssumingId('');
    }
  };

  const unassigned = overview?.attention.unassigned ?? newTickets.length;
  const waitingRequester = overview?.status.waitingUser ?? 0;
  const resolvedToday = overview?.today.resolved ?? 0;

  const summary = loading
    ? { text: 'Carregando os chamados do RH…', action: null as null | { label: string; tab: string } }
    : unassigned > 0
      ? {
          text: unassigned === 1
            ? 'Há 1 chamado novo esperando alguém do RH.'
            : `Há ${unassigned} chamados novos esperando alguém do RH.`,
          action: { label: 'Ver chamados novos', tab: 'novos' },
        }
      : mineTotal > 0
        ? {
            text: mineTotal === 1
              ? 'Nenhum chamado novo. Você tem 1 atendimento em andamento.'
              : `Nenhum chamado novo. Você tem ${mineTotal} atendimentos em andamento.`,
            action: { label: 'Continuar meus atendimentos', tab: 'comigo' },
          }
        : { text: 'Tudo em dia. Nenhum chamado esperando por você.', action: null };

  const openTab = (tab: string) => navigate(`/rh/chamados?aba=${tab}`);
  const openTicket = (ticket: RhTicket) => navigate(`/rh/chamados/${ticket.id}`);

  return (
    <div className="pub-page rh-page rhd">
      <section className="rhd-hero pub-aurora">
        <div className="rh-wrap rhd-hero__inner">
          <p className="rhd-hero__hello">
            {greeting()}{firstName ? `, ${firstName}` : ''}.
          </p>
          <h1>{summary.text}</h1>
          {summary.action && (
            <button type="button" className="pub-btn pub-btn--sun rhd-hero__cta" onClick={() => openTab(summary.action!.tab)}>
              <i className="ti ti-arrow-right" aria-hidden="true" />
              {summary.action.label}
            </button>
          )}

          <div className="rhd-counts" role="list">
            <button type="button" role="listitem" className={`rhd-count ${unassigned > 0 ? 'is-alert' : ''}`} onClick={() => openTab('novos')}>
              <strong>{loading ? '–' : unassigned}</strong>
              <span>{unassigned === 1 ? 'novo esperando' : 'novos esperando'}</span>
            </button>
            <button type="button" role="listitem" className="rhd-count" onClick={() => openTab('comigo')}>
              <strong>{loading ? '–' : mineTotal}</strong>
              <span>com você</span>
            </button>
            <button type="button" role="listitem" className="rhd-count" onClick={() => openTab('abertos')}>
              <strong>{overview ? waitingRequester : '–'}</strong>
              <span>aguardando o solicitante</span>
            </button>
            <button type="button" role="listitem" className="rhd-count" onClick={() => openTab('encerrados')}>
              <strong>{overview ? resolvedToday : '–'}</strong>
              <span>{resolvedToday === 1 ? 'resolvido hoje' : 'resolvidos hoje'}</span>
            </button>
          </div>
        </div>
      </section>

      <div className="rh-wrap rhd-body">
        <div className="rhd-main">
          {error && (
            <div className="pub-alert rhd-alert" role="alert">
              <i className="ti ti-alert-circle" aria-hidden="true" />
              <span>{error}</span>
              <button type="button" onClick={() => { setLoading(true); void load(); reloadOverview(); }}>Tentar de novo</button>
            </div>
          )}

          <section className="rhd-block" aria-labelledby="rhd-new-title">
            <header className="rhd-block__head">
              <div>
                <h2 id="rhd-new-title" className="rh-section-title">Esperando alguém assumir</h2>
                <p className="rh-section-lead">Os mais antigos aparecem primeiro.</p>
              </div>
              {unassigned > PREVIEW_LIMIT && (
                <button type="button" className="rhd-more" onClick={() => openTab('novos')}>
                  Ver todos os {unassigned}
                </button>
              )}
            </header>

            {loading ? (
              <div className="rhd-list">{[0, 1].map((n) => <div key={n} className="rh-skeleton" />)}</div>
            ) : newTickets.length === 0 ? (
              <div className="rh-card rh-empty">
                <span className="pub-gicon" aria-hidden="true"><i className="ti ti-mood-check" /></span>
                <h3>Nenhum chamado novo</h3>
                <p>Quando alguém pedir algo ao RH, o chamado aparece aqui para você assumir.</p>
              </div>
            ) : (
              <div className="rhd-list">
                {newTickets.map((ticket) => (
                  <RhTicketCard
                    key={ticket.id}
                    ticket={ticket}
                    currentUserId={user?.id || ''}
                    onOpen={openTicket}
                    onAssume={assume}
                    assuming={assumingId === ticket.id}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="rhd-block" aria-labelledby="rhd-mine-title">
            <header className="rhd-block__head">
              <div>
                <h2 id="rhd-mine-title" className="rh-section-title">Com você agora</h2>
                <p className="rh-section-lead">Chamados que você assumiu e ainda não terminou.</p>
              </div>
              {mineTotal > PREVIEW_LIMIT && (
                <button type="button" className="rhd-more" onClick={() => openTab('comigo')}>
                  Ver todos os {mineTotal}
                </button>
              )}
            </header>

            {loading ? (
              <div className="rhd-list"><div className="rh-skeleton" /></div>
            ) : mineTickets.length === 0 ? (
              <div className="rh-card rh-empty">
                <span className="pub-gicon pub-gicon--rh" aria-hidden="true"><i className="ti ti-inbox" /></span>
                <h3>Você não tem atendimentos em andamento</h3>
                <p>Assuma um chamado novo para começar.</p>
              </div>
            ) : (
              <div className="rhd-list">
                {mineTickets.map((ticket) => (
                  <RhTicketCard key={ticket.id} ticket={ticket} currentUserId={user?.id || ''} onOpen={openTicket} />
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="rhd-aside">
          <section className="rh-card rhd-guide" aria-labelledby="rhd-guide-title">
            <h2 id="rhd-guide-title">Como atender um chamado</h2>
            <ol>
              <li>
                <span className="rhd-guide__n" aria-hidden="true">1</span>
                <span>
                  <strong>Assuma</strong>
                  Toque em "Assumir este chamado". Assim todos sabem que está com você.
                </span>
              </li>
              <li>
                <span className="rhd-guide__n" aria-hidden="true">2</span>
                <span>
                  <strong>Responda</strong>
                  Escreva para a pessoa pelo próprio chamado. Ela recebe a resposta.
                </span>
              </li>
              <li>
                <span className="rhd-guide__n" aria-hidden="true">3</span>
                <span>
                  <strong>Resolva</strong>
                  Quando terminar, toque em "Marcar como resolvido".
                </span>
              </li>
            </ol>
          </section>

          <section className="rh-card rhd-ask" aria-labelledby="rhd-ask-title">
            <span className="pub-gicon" aria-hidden="true"><i className="ti ti-message-plus" /></span>
            <h2 id="rhd-ask-title">Precisa de algo da TI ou do Administrativo?</h2>
            <p>Abra um chamado daqui mesmo, sem sair da sua conta. Seus dados já vêm preenchidos.</p>
            <button type="button" className="pub-btn pub-btn--primary" onClick={() => navigate('/abrir-chamado')}>
              <i className="ti ti-message-plus" aria-hidden="true" />
              Abrir um chamado
            </button>
            <button type="button" className="rhd-ask__mine" onClick={() => navigate('/meus-chamados')}>
              Ver os chamados que eu abri
            </button>
          </section>

          <section className="rh-card rhd-exit">
            <i className="ti ti-logout" aria-hidden="true" />
            <p>
              Terminou por hoje? Use o botão <strong>Sair</strong> no alto da tela para fechar sua conta com segurança.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
