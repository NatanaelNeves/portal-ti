import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { showToast } from '../utils/toast';
import { ACTIVE_TICKET_STATUSES } from '../utils/ticketStatus';
import CountUp from '../components/adm/CountUp';
import '../styles/AdminStaffDashboardPage.css';

interface DashboardData {
  myUpdatedToday: number;
  myResolvedToday: number;
  myResolvedTickets: number;
  myAverageResolutionHours: number;
  administrativePendingTotal: number;
  unassignedAdministrativeTickets: number;
}

interface QueueTicket {
  id: string;
  title: string;
  status: string;
  priority: string;
  category?: string;
  created_at: string;
  updated_at: string;
  assigned_to?: string | null;
  requester_name?: string;
  requester_unit?: string;
}

const EMPTY: DashboardData = {
  myUpdatedToday: 0,
  myResolvedToday: 0,
  myResolvedTickets: 0,
  myAverageResolutionHours: 0,
  administrativePendingTotal: 0,
  unassignedAdministrativeTickets: 0,
};

/** Cada tipo de pedido tem a cor da sua etiqueta no quadro. */
const KINDS: Record<string, { label: string; icon: string; tone: string }> = {
  copia_chave: { label: 'Cópia de chave', icon: 'ti-key', tone: 'key' },
  apoio_evento: { label: 'Apoio em evento', icon: 'ti-calendar-event', tone: 'event' },
  buscar_doacao: { label: 'Buscar doação', icon: 'ti-package', tone: 'gift' },
  solicitar_documento: { label: 'Documento', icon: 'ti-file-text', tone: 'doc' },
};
const OTHER_KIND = { label: 'Outro pedido', icon: 'ti-dots', tone: 'other' };
const kindOf = (category?: string) => (category && KINDS[category]) || OTHER_KIND;

const URGENT = new Set(['urgent', 'critical', 'high']);

// Quantas etiquetas cabem penduradas antes de virar "+N na fila".
const RAIL_LIMIT = 6;

const TRAYS = [
  { key: 'open', title: 'Para começar', hint: 'Você pegou, falta dar o primeiro passo.', icon: 'ti-inbox' },
  { key: 'in_progress', title: 'Em andamento', hint: 'Você está cuidando disso agora.', icon: 'ti-run' },
  { key: 'waiting_user', title: 'Esperando alguém', hint: 'Depende de resposta de quem pediu.', icon: 'ti-hourglass' },
] as const;

function ageLabel(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return '';
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `há ${Math.max(1, mins)} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'há 1 dia' : `há ${days} dias`;
}

const daysSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);

function duration(hours: number) {
  if (!hours || hours <= 0) return '—';
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 48) return `${Math.round(hours)} h`;
  return `${Math.round(hours / 24)} dias`;
}

function readUser(): { id: string; name: string } | null {
  try {
    const raw = localStorage.getItem('internal_user');
    if (!raw) return null;
    const user = JSON.parse(raw) as { id?: string; name?: string };
    return { id: user.id ?? '', name: user.name ?? '' };
  } catch {
    return null;
  }
}

export default function AdminStaffDashboardPage() {
  const navigate = useNavigate();
  const me = useMemo(readUser, []);
  const [data, setData] = useState<DashboardData>(EMPTY);
  const [tickets, setTickets] = useState<QueueTicket[]>([]);
  const [listFailed, setListFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [taking, setTaking] = useState<string | null>(null);
  const [justTaken, setJustTaken] = useState<string | null>(null);
  const [unhooking, setUnhooking] = useState<string | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true); else setLoading(true);
    const params = new URLSearchParams();
    ACTIVE_TICKET_STATUSES.forEach((s) => params.append('status', s));
    params.append('department', 'administrativo');
    params.append('limit', '100');
    params.append('order', 'asc');

    // Números do dia e lista da fila carregam em paralelo; um não derruba o outro.
    const [summary, list] = await Promise.allSettled([
      api.get<DashboardData>('/dashboard/admin-staff'),
      api.get(`/tickets?${params.toString()}`),
    ]);

    if (summary.status === 'fulfilled') {
      setData({ ...EMPTY, ...(summary.value.data || {}) });
      setError('');
    } else {
      setError('Não foi possível carregar os números do seu dia. Tente atualizar.');
    }

    if (list.status === 'fulfilled') {
      const body = list.value.data;
      const rows: QueueTicket[] = Array.isArray(body) ? body : body?.data ?? [];
      // Mais antigo primeiro: quem espera há mais tempo fica na ponta do quadro.
      setTickets([...rows].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
      setListFailed(false);
    } else {
      setListFailed(true);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('internal_token') || !me) { navigate('/admin/login'); return; }
    void load();
  }, [load, me, navigate]);

  const unclaimed = tickets.filter((t) => !t.assigned_to);
  const mine = tickets.filter((t) => me && t.assigned_to === me.id);
  const onRail = unclaimed.slice(0, RAIL_LIMIT);
  const unclaimedTotal = listFailed ? data.unassignedAdministrativeTickets : unclaimed.length;
  const oldest = unclaimed[0];

  const takeTicket = async (ticket: QueueTicket) => {
    if (!me?.id || taking) return;
    setTaking(ticket.id);
    try {
      await api.patch(`/tickets/${ticket.id}`, { status: 'in_progress', assigned_to_id: me.id });
      // A etiqueta mostra o visto, sai do gancho e cai; depois o pedido aparece na mesa.
      setUnhooking(ticket.id);
      await new Promise((resolve) => window.setTimeout(resolve, 650));
      setUnhooking(null);
      setTickets((list) => list.map((t) => (t.id === ticket.id ? { ...t, assigned_to: me.id, status: 'in_progress', updated_at: new Date().toISOString() } : t)));
      setJustTaken(ticket.id);
      window.setTimeout(() => setJustTaken(null), 2400);
      showToast.success('Pedido na sua mesa.');
    } catch (err: any) {
      showToast.error(err.response?.data?.error || 'Não foi possível pegar esse pedido. Talvez outra pessoa já tenha pegado.');
      void load(true);
    } finally {
      setTaking(null);
    }
  };

  const firstName = (me?.name || '').trim().split(/\s+/)[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  const railSentence = (() => {
    if (unclaimedTotal === 0) return 'Nenhum pedido esperando alguém pegar. O quadro está vazio.';
    const count = unclaimedTotal === 1 ? '1 pedido esperando alguém pegar' : `${unclaimedTotal} pedidos esperando alguém pegar`;
    if (!oldest) return `${count}.`;
    return `${count}. O mais antigo chegou ${ageLabel(oldest.created_at)}.`;
  })();

  return (
    <div className="adx">
      <section className="adx-board" aria-labelledby="adx-title">
        <div className="adx-board__head">
          <div>
            <h1 id="adx-title">{greeting}{firstName ? `, ${firstName}` : ''}.</h1>
            <p className="adx-board__lead">{loading ? 'Olhando o quadro de pedidos…' : railSentence}</p>
          </div>
          <div className="adx-board__actions">
            <button type="button" className="adx-btn adx-btn--ghost adx-btn--refresh" onClick={() => void load(true)} disabled={loading || refreshing} aria-label="Atualizar o painel">
              <i className={`ti ti-refresh${refreshing ? ' adx-spin' : ''}`} aria-hidden="true" />
              <span>{refreshing ? 'Atualizando' : 'Atualizar'}</span>
            </button>
            <button type="button" className="adx-btn adx-btn--brass" onClick={() => navigate('/admin/chamados?aba=quadro')}>
              <i className="ti ti-list-details" aria-hidden="true" />
              Ver todos os pedidos
            </button>
          </div>
        </div>

        {/* O quadro de chaves: cada pedido sem responsável é uma etiqueta pendurada. */}
        <div className="adx-rack">
          <div className="adx-rail" aria-hidden="true" />
          {loading ? (
            <ul className="adx-tags" aria-busy="true">
              {[0, 1, 2, 3].map((n) => (
                <li key={n} className="adx-hook"><div className="adx-tag adx-tag--ghost" /></li>
              ))}
            </ul>
          ) : listFailed ? (
            <div className="adx-rack__note">
              <i className="ti ti-cloud-off" aria-hidden="true" />
              <span>A lista de pedidos não carregou. {unclaimedTotal > 0 ? `São ${unclaimedTotal} sem responsável.` : ''}</span>
              <button type="button" className="adx-btn adx-btn--ghost adx-btn--sm" onClick={() => void load(true)}>Tentar de novo</button>
            </div>
          ) : onRail.length === 0 ? (
            <div className="adx-rack__note adx-rack__note--calm">
              <i className="ti ti-circle-check" aria-hidden="true" />
              <span>Quando alguém pedir uma chave, um documento ou ajuda num evento, o pedido aparece pendurado aqui.</span>
            </div>
          ) : (
            <ul className="adx-tags">
              {onRail.map((t, i) => {
                const kind = kindOf(t.category);
                const late = daysSince(t.created_at) >= 2;
                return (
                  <li
                    key={t.id}
                    className="adx-hook"
                    style={{ '--i': i, '--tilt': `${i % 2 ? 2.2 : -1.6}deg` } as CSSProperties}
                  >
                    <article className={`adx-tag adx-tag--${kind.tone}${unhooking === t.id ? ' is-unhooking' : ''}`}>
                      <span className="adx-tag__eye" aria-hidden="true" />
                      <header className="adx-tag__kind">
                        <i className={`ti ${kind.icon}`} aria-hidden="true" />
                        {kind.label}
                        {URGENT.has(t.priority) && <span className="adx-tag__flag">Urgente</span>}
                      </header>
                      <button type="button" className="adx-tag__title" onClick={() => navigate(`/admin/chamados/${t.id}`)}>
                        {t.title}
                      </button>
                      <p className="adx-tag__who">
                        {t.requester_name || 'Solicitante sem nome'}
                        {t.requester_unit && <small>{t.requester_unit}</small>}
                      </p>
                      <footer className="adx-tag__foot">
                        <span className={late ? 'is-late' : undefined}>{ageLabel(t.created_at)}</span>
                        <button
                          type="button"
                          className="adx-take"
                          onClick={() => void takeTicket(t)}
                          disabled={taking !== null}
                          aria-label={`Pegar o pedido: ${t.title}`}
                        >
                          {unhooking === t.id
                            ? <i className="ti ti-check adx-check" aria-hidden="true" />
                            : taking === t.id
                              ? <i className="ti ti-loader-2 adx-spin" aria-hidden="true" />
                              : <i className="ti ti-hand-grab" aria-hidden="true" />}
                          {unhooking === t.id ? 'Pego' : 'Pegar'}
                        </button>
                      </footer>
                    </article>
                  </li>
                );
              })}
              {unclaimed.length > RAIL_LIMIT && (
                <li className="adx-hook adx-hook--more">
                  <button type="button" className="adx-more" onClick={() => navigate('/admin/chamados?aba=quadro')}>
                    {/* Pilha de etiquetas que se abre em leque ao passar o mouse */}
                    <span className="adx-more__stack" aria-hidden="true">
                      {unclaimed.slice(RAIL_LIMIT, RAIL_LIMIT + 3).map((t) => (
                        <span key={t.id} className={`adx-more__card adx-tag--${kindOf(t.category).tone}`} />
                      ))}
                    </span>
                    <strong>+{unclaimed.length - RAIL_LIMIT}</strong>
                    ainda no quadro
                  </button>
                </li>
              )}
            </ul>
          )}
        </div>
      </section>

      {error && (
        <div className="adx-alert" role="alert">
          <i className="ti ti-alert-circle" aria-hidden="true" />
          <span>{error}</span>
          <button type="button" onClick={() => void load(true)}>Tentar de novo</button>
        </div>
      )}

      <div className="adx-lower">
        <section className="adx-desk" aria-labelledby="adx-desk-title">
          <header className="adx-desk__head">
            <h2 id="adx-desk-title">Na sua mesa</h2>
            <span className="adx-count">{mine.length}</span>
            <button type="button" className="adx-desk__all" onClick={() => navigate('/admin/chamados?aba=comigo')}>
              Ver tudo<span className="adx-desk__all-long"> o que está comigo</span> <i className="ti ti-chevron-right" aria-hidden="true" />
            </button>
          </header>

          {loading ? (
            <div className="adx-trays">
              {TRAYS.map((tray) => <div key={tray.key} className="adx-tray"><div className="adx-slip adx-slip--ghost" /></div>)}
            </div>
          ) : mine.length === 0 && !listFailed ? (
            <div className="adx-desk__empty">
              <strong>Sua mesa está livre.</strong>
              <span>{unclaimedTotal > 0 ? 'Pegue um pedido do quadro acima para começar.' : 'Nada com você e nada esperando. Bom momento para respirar.'}</span>
            </div>
          ) : (
            <div className="adx-trays">
              {TRAYS.map((tray) => {
                // Tudo que não é "open" nem "in_progress" é espera: pelo solicitante, por compra ou por terceiros.
                const items = mine.filter((t) => (tray.key === 'waiting_user' ? !['open', 'in_progress'].includes(t.status) : t.status === tray.key));
                return (
                  <section key={tray.key} className={`adx-tray adx-tray--${tray.key}`} aria-label={tray.title}>
                    <header className="adx-tray__head">
                      <i className={`ti ${tray.icon}`} aria-hidden="true" />
                      <h3>{tray.title}</h3>
                      <span>{items.length}</span>
                    </header>
                    {items.length === 0 ? (
                      <p className="adx-tray__empty">{tray.hint}</p>
                    ) : (
                      <ul>
                        {items.map((t) => {
                          const kind = kindOf(t.category);
                          const stale = daysSince(t.updated_at) >= 3;
                          return (
                            <li key={t.id}>
                              <button
                                type="button"
                                className={`adx-slip adx-slip--${kind.tone}${justTaken === t.id ? ' is-new' : ''}`}
                                onClick={() => navigate(`/admin/chamados/${t.id}`)}
                              >
                                <span className="adx-slip__kind"><i className={`ti ${kind.icon}`} aria-hidden="true" />{kind.label}</span>
                                <strong>{t.title}</strong>
                                <span className="adx-slip__meta">
                                  <span>{t.requester_name || 'Solicitante sem nome'}</span>
                                  <span className={stale ? 'is-late' : undefined}>
                                    {stale ? `parado ${ageLabel(t.updated_at)}` : `mexido ${ageLabel(t.updated_at)}`}
                                  </span>
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </section>

        <aside className="adx-day" aria-labelledby="adx-day-title">
          <h2 id="adx-day-title">Seu dia</h2>
          <dl>
            <div className="adx-day__big">
              <dt>Resolvidos hoje</dt>
              <dd><CountUp value={data.myResolvedToday} /></dd>
            </div>
            <div>
              <dt>Pedidos mexidos hoje</dt>
              <dd><CountUp value={data.myUpdatedToday} /></dd>
            </div>
            <div>
              <dt>Tempo médio para resolver</dt>
              <dd>{duration(data.myAverageResolutionHours)}</dd>
            </div>
            <div>
              <dt>Resolvidos desde o início</dt>
              <dd><CountUp value={data.myResolvedTickets} duration={1200} /></dd>
            </div>
          </dl>
          <p className="adx-day__foot">
            O setor tem {data.administrativePendingTotal} {data.administrativePendingTotal === 1 ? 'pedido aberto' : 'pedidos abertos'} no total.
          </p>
        </aside>
      </div>
    </div>
  );
}
