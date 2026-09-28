import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { showToast } from '../utils/toast';
import { ACTIVE_TICKET_STATUSES } from '../utils/ticketStatus';
import {
  ADM_KIND_KEYS, ADM_STATUS_LABEL, ADM_URGENT, admAge, admDaysSince, admKind, admKindByKey, admKindKey, admReadUser,
} from '../components/adm/admKinds';
import { useSlidingPill } from '../components/adm/useSlidingPill';
import '../styles/AdmTicketsPage.css';

interface Ticket {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  category?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
  assigned_to?: string | null;
  requester_name?: string;
  requester_unit?: string;
  requester_department?: string;
}

type Tab = 'quadro' | 'comigo' | 'encerrados';
type Sort = 'old' | 'new' | 'urgent';

const TABS: Array<{ key: Tab; label: string; icon: string; empty: { title: string; text: string } }> = [
  {
    key: 'quadro',
    label: 'No quadro',
    icon: 'ti-layout-board',
    empty: { title: 'O quadro está vazio', text: 'Nenhum pedido esperando alguém pegar. Os novos aparecem aqui assim que chegam.' },
  },
  {
    key: 'comigo',
    label: 'Comigo',
    icon: 'ti-hand-grab',
    empty: { title: 'Nada com você agora', text: 'Pegue um pedido do quadro para começar.' },
  },
  {
    key: 'encerrados',
    label: 'Encerrados',
    icon: 'ti-archive',
    empty: { title: 'Nenhum pedido encerrado ainda', text: 'Os pedidos que você resolver ficam guardados aqui.' },
  },
];

const SORTS: Array<{ key: Sort; label: string }> = [
  { key: 'old', label: 'Mais antigos primeiro' },
  { key: 'new', label: 'Mais recentes primeiro' },
  { key: 'urgent', label: 'Urgentes primeiro' },
];

// Em "Comigo", os pedidos ficam nos mesmos grupos das bandejas do Painel.
const GROUPS = [
  { key: 'open', title: 'Para começar', icon: 'ti-inbox' },
  { key: 'in_progress', title: 'Em andamento', icon: 'ti-run' },
  { key: 'waiting', title: 'Esperando alguém', icon: 'ti-hourglass' },
] as const;

const groupOf = (status: string) => (status === 'open' ? 'open' : status === 'in_progress' ? 'in_progress' : 'waiting');

const isTab = (value: string | null): value is Tab => value === 'quadro' || value === 'comigo' || value === 'encerrados';

const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const defaultSort = (tab: Tab): Sort => (tab === 'encerrados' ? 'new' : 'old');

/** Quanto tempo levou entre chegar e ser resolvido, em palavras. */
function tookLabel(from: string, to?: string | null) {
  if (!to) return '';
  const hours = (new Date(to).getTime() - new Date(from).getTime()) / 3600000;
  if (!Number.isFinite(hours) || hours < 0) return '';
  if (hours < 1) return `resolvido em ${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 24) return `resolvido em ${Math.round(hours)} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'resolvido em 1 dia' : `resolvido em ${days} dias`;
}

export default function AdmTicketsPage() {
  const navigate = useNavigate();
  const me = useMemo(admReadUser, []);
  const [params, setParams] = useSearchParams();
  const tab: Tab = isTab(params.get('aba')) ? (params.get('aba') as Tab) : 'quadro';

  const [active, setActive] = useState<Ticket[]>([]);
  const [closed, setClosed] = useState<Ticket[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState('');
  const [sort, setSort] = useState<Sort>(defaultSort(tab));
  const [leaving, setLeaving] = useState<string | null>(null);
  const [shaking, setShaking] = useState<string | null>(null);

  const tabsRef = useRef<HTMLDivElement | null>(null);
  const pill = useSlidingPill(tabsRef, '.axp-tab', TABS.findIndex((t) => t.key === tab));

  const fetchList = useCallback(async (statuses: readonly string[]) => {
    const query = new URLSearchParams();
    statuses.forEach((s) => query.append('status', s));
    query.append('department', 'administrativo');
    query.append('limit', '100');
    const { data } = await api.get(`/tickets?${query.toString()}`);
    return (Array.isArray(data) ? data : data?.data ?? []) as Ticket[];
  }, []);

  const loadActive = useCallback(async () => {
    try {
      setActive(await fetchList(ACTIVE_TICKET_STATUSES));
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Não foi possível carregar os pedidos.');
    } finally {
      setLoading(false);
    }
  }, [fetchList]);

  useEffect(() => {
    if (!localStorage.getItem('internal_token') || !me) { navigate('/admin/login'); return; }
    void loadActive();
  }, [loadActive, me, navigate]);

  // Os encerrados só carregam quando alguém abre a aba.
  useEffect(() => {
    if (tab !== 'encerrados' || closed !== null) return;
    fetchList(['resolved', 'closed'])
      .then((rows) => setClosed(rows.filter((t) => t.assigned_to === me?.id)))
      .catch(() => setClosed([]));
  }, [tab, closed, fetchList, me]);

  const unclaimed = active.filter((t) => !t.assigned_to);
  const mine = active.filter((t) => t.assigned_to === me?.id);

  const base = tab === 'quadro' ? unclaimed : tab === 'comigo' ? mine : closed ?? [];

  const counts: Record<Tab, number | null> = {
    quadro: unclaimed.length,
    comigo: mine.length,
    encerrados: closed ? closed.length : null,
  };

  const kindCounts = useMemo(() => {
    const map: Record<string, number> = {};
    base.forEach((t) => { const k = admKindKey(t.category); map[k] = (map[k] ?? 0) + 1; });
    return map;
  }, [base]);

  const rows = useMemo(() => {
    const q = normalize(search.trim());
    const filtered = base.filter((t) => {
      if (kind && admKindKey(t.category) !== kind) return false;
      if (!q) return true;
      return normalize(`${t.title} ${t.requester_name ?? ''} ${t.requester_unit ?? ''} ${t.description ?? ''}`).includes(q);
    });
    // Quadro e encerrados contam pela chegada; em "Comigo" conta a última mexida (o parado há mais tempo vem antes).
    const time = (t: Ticket) => new Date(tab === 'comigo' ? t.updated_at : tab === 'encerrados' ? (t.resolved_at || t.updated_at) : t.created_at).getTime();
    const byTime = (a: Ticket, b: Ticket) => (sort === 'new' ? time(b) - time(a) : time(a) - time(b));
    return [...filtered].sort((a, b) => {
      if (sort === 'urgent') {
        const diff = Number(ADM_URGENT.has(b.priority)) - Number(ADM_URGENT.has(a.priority));
        if (diff !== 0) return diff;
      }
      return byTime(a, b);
    });
  }, [base, kind, search, tab, sort]);

  const setTab = (next: Tab) => {
    const p = new URLSearchParams(params);
    p.set('aba', next);
    setParams(p, { replace: true });
    setKind('');
    setSort(defaultSort(next));
  };

  const take = async (ticket: Ticket) => {
    if (!me?.id || leaving) return;
    setLeaving(ticket.id);
    try {
      await api.patch(`/tickets/${ticket.id}`, { status: 'in_progress', assigned_to_id: me.id });
      // A ficha desliza para fora com o visto; depois o pedido muda de aba.
      window.setTimeout(() => {
        setActive((list) => list.map((t) => (t.id === ticket.id ? { ...t, assigned_to: me.id, status: 'in_progress', updated_at: new Date().toISOString() } : t)));
        setLeaving(null);
      }, 520);
      showToast.success('Pedido na sua mesa. Ele está em "Comigo".');
    } catch (err: any) {
      setLeaving(null);
      setShaking(ticket.id);
      window.setTimeout(() => setShaking(null), 500);
      showToast.error(err.response?.data?.error || 'Não foi possível pegar esse pedido. Talvez outra pessoa já tenha pegado.');
      void loadActive();
    }
  };

  const current = TABS.find((t) => t.key === tab)!;
  const oldest = unclaimed.reduce<Ticket | null>((acc, t) => (!acc || t.created_at < acc.created_at ? t : acc), null);
  const urgentHere = rows.filter((t) => ADM_URGENT.has(t.priority)).length;

  const lead = loading
    ? 'Buscando os pedidos…'
    : unclaimed.length === 0
      ? `Nada no quadro. Você tem ${mine.length} ${mine.length === 1 ? 'pedido' : 'pedidos'} em mãos.`
      : `${unclaimed.length} no quadro esperando alguém${oldest ? `, o mais antigo chegou ${admAge(oldest.created_at)}` : ''}. Você tem ${mine.length} em mãos.`;

  const renderSlip = (t: Ticket, i: number) => {
    const meta = admKind(t.category);
    const lateNew = tab === 'quadro' && admDaysSince(t.created_at) >= 2;
    const stale = tab === 'comigo' && admDaysSince(t.updated_at) >= 3;
    const waiting = !['open', 'in_progress'].includes(t.status);
    const excerpt = (t.description ?? '').replace(/\s+/g, ' ').trim();
    const showExcerpt = excerpt && normalize(excerpt) !== normalize(t.title);
    return (
      <li
        key={t.id}
        className={`axp-slip adm-tone--${meta.tone}${leaving === t.id ? ' is-leaving' : ''}${shaking === t.id ? ' is-shaking' : ''}`}
        style={{ '--i': Math.min(i, 10) } as CSSProperties}
      >
        <div className="axp-slip__stub" aria-hidden="true">
          <span className="axp-slip__eye" />
          <i className={`ti ${meta.icon}`} />
        </div>
        <button type="button" className="axp-slip__main" onClick={() => navigate(`/admin/chamados/${t.id}`)}>
          <span className="axp-slip__kind">
            {meta.label}
            {ADM_URGENT.has(t.priority) && <span className="axp-flag">Urgente</span>}
          </span>
          <strong>{t.title}</strong>
          {showExcerpt && <span className="axp-slip__desc">{excerpt}</span>}
          <span className="axp-slip__who">
            <i className="ti ti-user" aria-hidden="true" />
            {t.requester_name || 'Solicitante sem nome'}
            {t.requester_unit && <small><i className="ti ti-map-pin" aria-hidden="true" />{t.requester_unit}</small>}
          </span>
        </button>
        <div className="axp-slip__side">
          {tab === 'quadro' && (
            <>
              <span className={`axp-age${lateNew ? ' is-late' : ''}`}>chegou {admAge(t.created_at)}</span>
              <button
                type="button"
                className="axp-take"
                onClick={() => void take(t)}
                disabled={leaving !== null}
                aria-label={`Pegar o pedido: ${t.title}`}
              >
                {leaving === t.id ? <i className="ti ti-check axp-check" aria-hidden="true" /> : <i className="ti ti-hand-grab" aria-hidden="true" />}
                {leaving === t.id ? 'Pego' : 'Pegar'}
              </button>
            </>
          )}
          {tab === 'comigo' && (
            <>
              <span className="axp-side__info">
                {/* O grupo já diz o estado; só a espera ganha etiqueta, para dizer de quem se espera */}
                {waiting && (
                  <span className="axp-state is-waiting">{ADM_STATUS_LABEL[t.status] ?? 'Esperando alguém'}</span>
                )}
                <span className={`axp-age${stale ? ' is-late' : ''}`}>
                  {stale ? `parado ${admAge(t.updated_at)}` : `mexido ${admAge(t.updated_at)}`}
                </span>
              </span>
              <button type="button" className="axp-open" onClick={() => navigate(`/admin/chamados/${t.id}`)} aria-label={`Abrir o pedido: ${t.title}`}>
                Abrir <i className="ti ti-arrow-right" aria-hidden="true" />
              </button>
            </>
          )}
          {tab === 'encerrados' && (
            <>
              <span className="axp-side__info">
                <span className="axp-state is-done"><i className="ti ti-check" aria-hidden="true" />{ADM_STATUS_LABEL[t.status] ?? 'Encerrado'}</span>
                <span className="axp-age">{tookLabel(t.created_at, t.resolved_at || t.updated_at) || admAge(t.updated_at)}</span>
              </span>
              <button type="button" className="axp-open" onClick={() => navigate(`/admin/chamados/${t.id}`)} aria-label={`Abrir o pedido: ${t.title}`}>
                Abrir <i className="ti ti-arrow-right" aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </li>
    );
  };

  return (
    <div className="axp">
      <header className="axp-head">
        <div className="axp-head__top">
          <div>
            <h1>Pedidos</h1>
            <p>{lead}</p>
          </div>
          <label className="axp-search">
            <i className="ti ti-search" aria-hidden="true" />
            <span className="pub-sr-only">Buscar pedidos</span>
            <input
              type="search"
              data-page-search
              placeholder="Buscar por pedido, pessoa ou unidade"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button type="button" aria-label="Limpar busca" onClick={() => setSearch('')}><i className="ti ti-x" aria-hidden="true" /></button>
            )}
          </label>
        </div>

        <div className="axp-tabs" ref={tabsRef} role="tablist" aria-label="Pedidos">
          {pill.visible && <span className="axp-tabs__pill" aria-hidden="true" style={pill.style} />}
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className="axp-tab"
              onClick={() => setTab(t.key)}
            >
              <i className={`ti ${t.icon}`} aria-hidden="true" />
              {t.label}
              {counts[t.key] !== null && <span className="axp-tab__n">{counts[t.key]}</span>}
            </button>
          ))}
        </div>
      </header>

      <div className="axp-body">
        <div className="axp-tools">
          <div className="axp-kinds" role="group" aria-label="Tipo de pedido">
            <button type="button" className="axp-kind" aria-pressed={!kind} onClick={() => setKind('')}>
              Todos os tipos<span>{base.length}</span>
            </button>
            {ADM_KIND_KEYS.filter((k) => kindCounts[k]).map((k) => {
              const meta = admKindByKey(k);
              return (
                <button
                  key={k}
                  type="button"
                  className={`axp-kind adm-tone--${meta.tone}`}
                  aria-pressed={kind === k}
                  onClick={() => setKind(kind === k ? '' : k)}
                >
                  <i className={`ti ${meta.icon}`} aria-hidden="true" />
                  {meta.plural}
                  <span>{kindCounts[k]}</span>
                </button>
              );
            })}
          </div>
          <label className="axp-sort">
            <i className="ti ti-arrows-sort" aria-hidden="true" />
            <span className="pub-sr-only">Ordem dos pedidos</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </label>
        </div>

        {!loading && rows.length > 0 && (
          <p className="axp-summary">
            {rows.length === base.length
              ? `${rows.length} ${rows.length === 1 ? 'pedido' : 'pedidos'}`
              : `${rows.length} de ${base.length} pedidos`}
            {urgentHere > 0 && <span className="axp-summary__urgent">{urgentHere} {urgentHere === 1 ? 'urgente' : 'urgentes'}</span>}
          </p>
        )}

        {error && (
          <div className="axp-alert" role="alert">
            <i className="ti ti-alert-circle" aria-hidden="true" />
            <span>{error}</span>
            <button type="button" onClick={() => { setLoading(true); void loadActive(); }}>Tentar de novo</button>
          </div>
        )}

        {loading || (tab === 'encerrados' && closed === null) ? (
          <ul className="axp-list" aria-busy="true">
            {[0, 1, 2, 3].map((n) => <li key={n} className="axp-slip axp-slip--ghost" />)}
          </ul>
        ) : rows.length === 0 ? (
          <div className="axp-empty">
            <span className="axp-empty__tag" aria-hidden="true"><i className={`ti ${current.icon}`} /></span>
            <h2>{search || kind ? 'Nenhum pedido com esses filtros' : current.empty.title}</h2>
            <p>{search || kind ? 'Tente outra busca ou mostre todos os tipos.' : current.empty.text}</p>
            {(search || kind) && (
              <button type="button" className="axp-btn" onClick={() => { setSearch(''); setKind(''); }}>Limpar filtros</button>
            )}
            {!search && !kind && tab === 'comigo' && unclaimed.length > 0 && (
              <button type="button" className="axp-btn axp-btn--mint" onClick={() => setTab('quadro')}>Ver o quadro ({unclaimed.length})</button>
            )}
          </div>
        ) : tab === 'comigo' ? (
          <div className="axp-groups">
            {GROUPS.map((group) => {
              const items = rows.filter((t) => groupOf(t.status) === group.key);
              if (items.length === 0) return null;
              return (
                <section key={group.key} className={`axp-group axp-group--${group.key}`} aria-label={group.title}>
                  <h2 className="axp-group__head">
                    <span className="axp-group__dot" aria-hidden="true"><i className={`ti ${group.icon}`} /></span>
                    {group.title}
                    <span className="axp-group__n">{items.length}</span>
                  </h2>
                  <ul className="axp-list">{items.map(renderSlip)}</ul>
                </section>
              );
            })}
          </div>
        ) : (
          <ul className="axp-list">{rows.map(renderSlip)}</ul>
        )}
      </div>
    </div>
  );
}
