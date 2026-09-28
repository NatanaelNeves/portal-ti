import { useState, useEffect } from 'react';
import { BACKEND_URL } from '../services/api';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../components/ConfirmDialog';
import '../styles/MyTicketsPage.css';

interface Ticket {
  id: string;
  title: string;
  status: string;
  priority: string;
  department?: string;
  category?: string;
  created_at: string;
  updated_at: string;
  sla_due_at?: string | null;
}

type StatusTone = 'new' | 'progress' | 'you' | 'waiting' | 'done' | 'closed';

// Rótulos escritos para quem pediu, não para quem atende.
const PUBLIC_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  open: { label: 'Recebido', tone: 'new' },
  in_progress: { label: 'Em atendimento', tone: 'progress' },
  waiting_user: { label: 'Aguardando você', tone: 'you' },
  aguardando_confirmacao: { label: 'Confirme a solução', tone: 'you' },
  aguardando_aquisicao: { label: 'Aguardando compra', tone: 'waiting' },
  aguardando_terceiros: { label: 'Aguardando fornecedor', tone: 'waiting' },
  resolved: { label: 'Resolvido', tone: 'done' },
  closed: { label: 'Concluído', tone: 'closed' },
  cancelled: { label: 'Cancelado', tone: 'closed' },
};

// `fetch` rejeita com TypeError quando não há conexão com o servidor.
const OFFLINE_MESSAGE = 'Sem conexão com o portal. Confira sua internet e tente de novo.';

// Em que trecho da jornada o chamado está: 1 recebido, 2 andando, 3 concluído.
const TONE_STAGE: Record<StatusTone, number> = { new: 1, progress: 2, you: 2, waiting: 2, done: 3, closed: 3 };

const DEPARTMENT_LABEL: Record<string, string> = {
  ti: 'TI',
  administrativo: 'Administrativo',
  rh: 'RH',
};

const formatSla = (slaDueAt: string | null | undefined): { text: string; late: boolean } | null => {
  if (!slaDueAt) return null;

  const diffMs = new Date(slaDueAt).getTime() - Date.now();
  if (diffMs <= 0) return { text: 'Meta de atendimento excedida', late: true };

  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffHours < 24) return { text: `Meta: em até ${Math.max(1, Math.ceil(diffHours))}h`, late: false };

  const dueDate = new Date(slaDueAt);
  return { text: `Meta: até ${dueDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`, late: false };
};

const normalizeTickets = (data: any): Ticket[] => {
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (Array.isArray(data)) return data;
  return [];
};

export default function MyTicketsPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchCode, setSearchCode] = useState('');
  const [changeEmailConfirm, setChangeEmailConfirm] = useState(false);

  const confirmChangeEmail = () => {
    localStorage.removeItem('user_token');
    localStorage.removeItem('ticket_email');
    setEmail('');
    setTickets([]);
    setShowEmailForm(true);
    setError('');
    setChangeEmailConfirm(false);
  };

  useEffect(() => {
    // O RH usa esta tela para acompanhar o que pediu a outras equipes; as
    // demais equipes internas seguem para a própria central.
    const isInternalUser = !!localStorage.getItem('internal_token');
    const isRhStaff = (() => {
      try {
        return JSON.parse(localStorage.getItem('internal_user') || 'null')?.role === 'rh_staff';
      } catch {
        return false;
      }
    })();
    if (isInternalUser && !isRhStaff) {
      navigate('/admin/chamados', { replace: true });
      return;
    }

    const storedEmail = localStorage.getItem('ticket_email');
    const storedToken = localStorage.getItem('user_token');

    if (storedEmail && storedToken) {
      setEmail(storedEmail);
      fetchTickets(storedToken);
    } else {
      let accountEmail = '';
      try {
        accountEmail = JSON.parse(localStorage.getItem('internal_user') || 'null')?.email || '';
      } catch { /* sem conta interna */ }
      setSearchEmail(storedEmail || accountEmail);
      setShowEmailForm(true);
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    const token = localStorage.getItem('user_token');
    if (!token || showEmailForm) return;

    const refresh = () => fetchTickets(token, { quiet: true });
    const interval = window.setInterval(refresh, 30000);

    const onRealtime = (event: Event) => {
      const detail = (event as CustomEvent<any>).detail;
      if (!detail?.ticketId) return;
      refresh();
    };

    window.addEventListener('ticket:updated', onRealtime);
    window.addEventListener('ticket:resolved', onRealtime);
    window.addEventListener('ticket:reopened', onRealtime);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('ticket:updated', onRealtime);
      window.removeEventListener('ticket:resolved', onRealtime);
      window.removeEventListener('ticket:reopened', onRealtime);
    };
  }, [showEmailForm]);

  const requestAccess = async (address: string) => {
    const response = await fetch(`${BACKEND_URL}/api/public-auth/public-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: address, name: address.split('@')[0] || 'Visitante' }),
    });
    if (!response.ok) {
      throw new Error('Não encontramos chamados com este e-mail. Confira se é o mesmo usado ao abrir o chamado.');
    }
    const { user_token } = await response.json();
    return user_token as string;
  };

  // Um formulário só: com protocolo, abre direto o chamado; sem ele, lista todos.
  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const address = searchEmail.trim();
    const code = searchCode.trim().toLowerCase();

    if (!address) {
      setError('Informe o e-mail usado para abrir o chamado.');
      return;
    }
    if (code && code.length < 8) {
      setError('O protocolo tem 8 caracteres, como E0743972.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const userToken = await requestAccess(address);

      if (!code) {
        localStorage.setItem('user_token', userToken);
        localStorage.setItem('ticket_email', address);
        setEmail(address);
        setShowEmailForm(false);
        await fetchTickets(userToken);
        return;
      }

      const ticketsResponse = await fetch(`${BACKEND_URL}/api/tickets`, {
        headers: { 'Content-Type': 'application/json', 'X-User-Token': userToken },
      });
      if (!ticketsResponse.ok) throw new Error('Não foi possível buscar seus chamados agora. Tente de novo em instantes.');

      const userTickets = normalizeTickets(await ticketsResponse.json());
      const foundTicket = userTickets.find((t) =>
        code.length === 8 ? t.id.substring(0, 8).toLowerCase() === code : t.id.toLowerCase() === code,
      );

      if (!foundTicket) {
        throw new Error('Este protocolo não pertence a um chamado deste e-mail. Confira os dois e tente de novo.');
      }

      localStorage.setItem('user_token', userToken);
      localStorage.setItem('ticket_email', address);
      navigate(`/chamado/${foundTicket.id}`);
    } catch (err: any) {
      setError(err instanceof TypeError ? OFFLINE_MESSAGE : err.message || 'Não foi possível buscar seus chamados agora.');
      setLoading(false);
    }
  };

  const fetchTickets = async (token: string, { quiet = false } = {}) => {
    try {
      if (!quiet) setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/tickets`, {
        headers: { 'Content-Type': 'application/json', 'X-User-Token': token },
      });

      if (!response.ok) {
        throw new Error('Não foi possível carregar seus chamados. Tente de novo em instantes.');
      }

      setTickets(normalizeTickets(await response.json()));
      setError('');
    } catch (err: any) {
      setError(err instanceof TypeError ? OFFLINE_MESSAGE : err.message || 'Não foi possível carregar seus chamados.');
    } finally {
      setLoading(false);
    }
  };

  const toneOf = (status: string): StatusTone => PUBLIC_STATUS[status]?.tone ?? 'closed';
  const waitingOnYou = tickets.filter((t) => toneOf(t.status) === 'you').length;
  const finished = tickets.filter((t) => TONE_STAGE[toneOf(t.status)] === 3).length;
  const ongoing = tickets.length - finished - waitingOnYou;

  return (
    <div className="pub-page mtk">
      <section className="mtk-hero pub-aurora">
        <div className="pub-wrap mtk-wrap mtk-hero__inner">
          <h1>Meus chamados</h1>
          {email ? (
            <div className="mtk-who">
              <i className="ti ti-mail" aria-hidden="true" />
              <span>{email}</span>
              <button type="button" onClick={() => setChangeEmailConfirm(true)}>Trocar e-mail</button>
            </div>
          ) : (
            <p>Veja em que etapa está cada pedido que você fez.</p>
          )}

          {!showEmailForm && !loading && tickets.length > 0 && (
            <dl className="mtk-stats">
              <div className={waitingOnYou > 0 ? 'is-alert' : ''}>
                <dt>Precisam de você</dt>
                <dd>{waitingOnYou}</dd>
              </div>
              <div>
                <dt>Em andamento</dt>
                <dd>{ongoing}</dd>
              </div>
              <div>
                <dt>Concluídos</dt>
                <dd>{finished}</dd>
              </div>
            </dl>
          )}
        </div>
      </section>

      <div className="pub-wrap mtk-wrap mtk-body">

        {error && (
          <div className="pub-alert mtk-alert" role="alert">
            <i className="ti ti-alert-circle" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {showEmailForm && (
          <form onSubmit={handleLookup} className="mtk-lookup" noValidate>
            <div className="pub-field">
              <label htmlFor="mtk-email">E-mail usado no chamado</label>
              <input
                id="mtk-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="off"
                placeholder="nome@exemplo.com"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                required
              />
            </div>
            <div className="pub-field">
              <label htmlFor="mtk-code">
                Protocolo <span className="pub-field__optional">(opcional)</span>
              </label>
              <input
                id="mtk-code"
                type="text"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                placeholder="E0743972"
                maxLength={36}
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                aria-describedby="mtk-code-hint"
              />
              <span id="mtk-code-hint" className="pub-field__hint">
                Com o protocolo, abrimos direto aquele chamado.
              </span>
            </div>
            <button type="submit" className="pub-btn pub-btn--primary pub-btn--block" disabled={loading}>
              {loading ? 'Buscando…' : searchCode.trim() ? 'Abrir chamado' : 'Ver meus chamados'}
            </button>
            <p className="mtk-lookup__alt">
              Ainda não pediu nada? <a href="/abrir-chamado">Abrir um chamado</a>
            </p>
          </form>
        )}

        {!showEmailForm && loading && (
          <ul className="mtk-list" aria-busy="true" aria-label="Carregando chamados">
            {[0, 1, 2].map((n) => <li key={n} className="mtk-skeleton" />)}
          </ul>
        )}

        {!showEmailForm && !loading && tickets.length === 0 && !error && (
          <div className="mtk-empty">
            <h2>Nenhum chamado com este e-mail</h2>
            <p>Quando você abrir um chamado, ele aparece aqui com cada etapa do atendimento.</p>
            <a href="/abrir-chamado" className="pub-btn pub-btn--primary">Abrir um chamado</a>
          </div>
        )}

        {!showEmailForm && !loading && tickets.length > 0 && (
          <>
            {waitingOnYou > 0 && (
              <p className="mtk-callout">
                <i className="ti ti-hand-finger" aria-hidden="true" />
                {waitingOnYou === 1
                  ? 'Um chamado espera uma resposta sua. Ele está no topo da lista.'
                  : `${waitingOnYou} chamados esperam uma resposta sua. Eles estão no topo da lista.`}
              </p>
            )}
            <ul className="mtk-list">
              {[...tickets]
                .sort((a, b) => Number(toneOf(b.status) === 'you') - Number(toneOf(a.status) === 'you'))
                .map((ticket) => {
                const status = PUBLIC_STATUS[ticket.status] ?? { label: ticket.status, tone: 'closed' as StatusTone };
                const stage = TONE_STAGE[status.tone];
                const sla = status.tone === 'done' || status.tone === 'closed' ? null : formatSla(ticket.sla_due_at);
                return (
                  <li key={ticket.id}>
                    <a href={`/chamado/${ticket.id}`} className={`mtk-item mtk-item--${status.tone}`}>
                      <span className={`mtk-status mtk-status--${status.tone}`}>{status.label}</span>
                      <strong className="mtk-item__title">{ticket.title}</strong>
                      <span className="mtk-item__meta">
                        <span>#{ticket.id.substring(0, 8).toUpperCase()}</span>
                        {ticket.department && DEPARTMENT_LABEL[ticket.department] && (
                          <span>{DEPARTMENT_LABEL[ticket.department]}</span>
                        )}
                        <span>
                          Aberto em {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '-'}
                        </span>
                      </span>
                      <span className="mtk-track" aria-hidden="true">
                        {[1, 2, 3].map((n) => (
                          <span key={n} className={n <= stage ? 'is-on' : ''} />
                        ))}
                      </span>
                      {sla && <span className={`mtk-item__sla ${sla.late ? 'is-late' : ''}`}>{sla.text}</span>}
                      <i className="ti ti-chevron-right mtk-item__chevron" aria-hidden="true" />
                    </a>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={changeEmailConfirm}
        title="Trocar de e-mail?"
        message="Você volta para a busca e pode ver os chamados de outro e-mail."
        confirmText="Trocar e-mail"
        cancelText="Cancelar"
        type="warning"
        onConfirm={confirmChangeEmail}
        onCancel={() => setChangeEmailConfirm(false)}
      />
    </div>
  );
}
