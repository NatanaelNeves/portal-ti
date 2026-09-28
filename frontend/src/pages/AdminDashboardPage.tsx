import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { showToast } from '../utils/toast';
import useTicketsOverview from '../hooks/useTicketsOverview';
import '../styles/AdminDashboardPage.css';

type Scope = 'all' | 'ti' | 'rh' | 'administrativo';

interface OpenTicket {
  id: string;
  title: string;
  status: string;
  priority: string;
  department?: string | null;
  created_at: string;
  assigned_to?: string | null;
  assigned_to_name?: string | null;
  requester_name?: string | null;
}

interface DashboardData {
  assets: { inStock: number; assigned: number; inMaintenance: number; total: number; assignedToday: number; returnedToday: number };
  pendingPurchases: number;
  recentActivity: Array<{ id: string; type: string; title: string; detail: string; timestamp: string; route: string }>;
}

const ACTIVE = ['open', 'in_progress', 'waiting_user', 'aguardando_confirmacao', 'aguardando_aquisicao', 'aguardando_terceiros'];

// Faixas de idade da fila, do mais novo ao mais antigo.
const AGE_BANDS = [
  { key: 'h4', label: 'Até 4 horas', maxH: 4 },
  { key: 'h8', label: '4 a 8 horas', maxH: 8 },
  { key: 'h24', label: '8 a 24 horas', maxH: 24 },
  { key: 'd3', label: '1 a 3 dias', maxH: 72 },
  { key: 'old', label: 'Mais de 3 dias', maxH: Infinity },
];

const MAX_DOTS = 42;

const PRIORITY_RANK: Record<string, number> = { critical: 0, urgent: 0, high: 1, medium: 2, low: 3 };
const PRIORITY_LABEL: Record<string, string> = { critical: 'Crítica', urgent: 'Urgente', high: 'Alta', medium: 'Média', low: 'Baixa' };
const priorityTone = (p: string) => (PRIORITY_RANK[p] ?? 2) <= 1 ? 'high' : p === 'low' ? 'low' : 'medium';

// Assuntos dos formulários de abertura (TI, Administrativo e RH).
const CATEGORY_LABEL: Record<string, string> = {
  computador: 'Computador', internet: 'Internet', impressora: 'Impressora', sistema: 'Sistema', outro: 'Outro assunto',
  copia_chave: 'Cópia de chave', apoio_evento: 'Apoio em evento', buscar_doacao: 'Buscar doação', solicitar_documento: 'Solicitar documento',
  RH_ATESTADO: 'Atestado médico', RH_PONTO: 'Ajuste de ponto', RH_FOLHA: 'Folha de pagamento', RH_DECLARACAO: 'Declaração',
  RH_BENEFICIOS: 'Benefícios', RH_OUTROS: 'Outro assunto (RH)', RH_CONFIDENCIAL: 'Confidencial',
};
const categoryLabel = (code: string) => CATEGORY_LABEL[code] ?? code.replace(/_/g, ' ');

const TEAM_LABEL: Record<string, string> = { ti: 'TI', rh: 'RH', administrativo: 'Administrativo' };

const ACTIVITY: Record<string, { label: string; icon: string }> = {
  ticket_created: { label: 'Chamado aberto', icon: 'ti-ticket' },
  ticket_resolved: { label: 'Chamado resolvido', icon: 'ti-circle-check' },
  asset_assigned: { label: 'Equipamento entregue', icon: 'ti-device-laptop' },
  asset_returned: { label: 'Equipamento devolvido', icon: 'ti-arrow-back-up' },
  asset_maintenance: { label: 'Equipamento em manutenção', icon: 'ti-tool' },
};

const hoursSince = (iso: string) => Math.max(0, (Date.now() - new Date(iso).getTime()) / 3600000);

const ageLabel = (iso: string) => {
  const h = hoursSince(iso);
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  if (h < 24) return `${Math.floor(h)} h`;
  const d = Math.floor(h / 24);
  return `${d} ${d === 1 ? 'dia' : 'dias'}`;
};

const minutesLabel = (m: number | null | undefined) => {
  if (m == null) return '—';
  if (m < 60) return `${Math.round(m)} min`;
  if (m < 60 * 24) return `${(m / 60).toFixed(1).replace('.', ',')} h`;
  return `${(m / 1440).toFixed(1).replace('.', ',')} dias`;
};

const relative = (iso: string) => {
  const h = hoursSince(iso);
  if (h < 1 / 60) return 'agora';
  if (h < 1) return `há ${Math.round(h * 60)} min`;
  if (h < 24) return `há ${Math.floor(h)} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'ontem' : `há ${d} dias`;
};

const greeting = () => {
  const hour = new Date().getHours();
  return hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
};

const currentUser = () => {
  try {
    return JSON.parse(localStorage.getItem('internal_user') || 'null') as { id?: string; name?: string; role?: string } | null;
  } catch {
    return null;
  }
};

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const user = currentUser();
  const role = user?.role || '';
  const canPickScope = role === 'admin';
  const [scope, setScope] = useState<Scope>('all');
  const scopeParam = canPickScope && scope !== 'all' ? scope : '';

  const { overview, reload: reloadOverview } = useTicketsOverview(scopeParam, true);
  const [openTickets, setOpenTickets] = useState<OpenTicket[]>([]);
  const [openTotal, setOpenTotal] = useState(0);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assumingId, setAssumingId] = useState('');

  // Cada perfil tem o próprio painel.
  useEffect(() => {
    if (!localStorage.getItem('internal_token')) { navigate('/admin/login'); return; }
    if (role === 'admin_staff') navigate('/admin/auxiliar/dashboard', { replace: true });
    else if (role === 'manager' || role === 'gestor') navigate('/gestor/dashboard', { replace: true });
  }, [navigate, role]);

  const load = useCallback(async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      const base = new URLSearchParams();
      ACTIVE.forEach((s) => base.append('status', s));
      if (scopeParam) base.append('department', scopeParam);
      base.append('limit', '100');
      base.append('sort', 'created_at');

      const oldest = new URLSearchParams(base); oldest.append('order', 'asc');
      const [oldestResp, dashResp] = await Promise.all([
        api.get(`/tickets?${oldest.toString()}`),
        api.get('/dashboard/admin', { params: scopeParam ? { department: scopeParam } : undefined, timeout: 15000 })
          .catch(() => ({ data: null })),
      ]);

      let list: OpenTicket[] = oldestResp.data?.data || [];
      const total: number = oldestResp.data?.pagination?.total ?? list.length;
      if (total > list.length) {
        const newest = new URLSearchParams(base); newest.append('order', 'desc');
        const newestResp = await api.get(`/tickets?${newest.toString()}`);
        const seen = new Set(list.map((t) => t.id));
        list = [...list, ...(newestResp.data?.data || []).filter((t: OpenTicket) => !seen.has(t.id))];
      }

      setOpenTickets(list);
      setOpenTotal(total);
      if (dashResp.data) setDashboard(dashResp.data as DashboardData);
      setError('');
    } catch (err: any) {
      if (!quiet) setError(err?.response?.data?.error || 'Não foi possível carregar o painel. Verifique a conexão e tente de novo.');
    } finally {
      setLoading(false);
    }
  }, [scopeParam]);

  useEffect(() => { void load(); }, [load]);

  // Acompanha a fila em tempo real, sem piscar a tela.
  useEffect(() => {
    const refresh = () => void load(true);
    const events = ['ticket:new', 'ticket:updated', 'ticket:resolved', 'ticket:reopened'];
    events.forEach((name) => window.addEventListener(name, refresh));
    const timer = window.setInterval(refresh, 60_000);
    return () => {
      events.forEach((name) => window.removeEventListener(name, refresh));
      window.clearInterval(timer);
    };
  }, [load]);

  const bands = useMemo(() => {
    const grouped = AGE_BANDS.map((band) => ({ ...band, tickets: [] as OpenTicket[] }));
    openTickets.forEach((ticket) => {
      const h = hoursSince(ticket.created_at);
      const band = grouped.find((b) => h < b.maxH) ?? grouped[grouped.length - 1];
      band.tickets.push(ticket);
    });
    // Mais graves primeiro dentro de cada faixa; sem responsável antes.
    grouped.forEach((b) => b.tickets.sort((a, c) =>
      (PRIORITY_RANK[a.priority] ?? 2) - (PRIORITY_RANK[c.priority] ?? 2)
      || Number(!!a.assigned_to) - Number(!!c.assigned_to)));
    return grouped;
  }, [openTickets]);

  const unassigned = openTickets.filter((t) => !t.assigned_to && t.status === 'open');
  const staleUnassigned = unassigned.filter((t) => hoursSince(t.created_at) >= 24);
  const oldest = openTickets.length > 0
    ? openTickets.reduce((a, b) => (new Date(a.created_at) < new Date(b.created_at) ? a : b))
    : null;

  // Precisa de ação: sem responsável (mais antigos e mais graves primeiro),
  // depois prioridade alta parada há mais de um dia.
  const needsAction = useMemo(() => {
    const byUrgency = (a: OpenTicket, b: OpenTicket) =>
      (PRIORITY_RANK[a.priority] ?? 2) - (PRIORITY_RANK[b.priority] ?? 2)
      || new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    const first = [...unassigned].sort(byUrgency);
    const stuck = openTickets
      .filter((t) => t.assigned_to && (PRIORITY_RANK[t.priority] ?? 2) <= 1 && hoursSince(t.created_at) >= 24)
      .sort(byUrgency);
    return [...first, ...stuck].slice(0, 7);
  }, [openTickets, unassigned]);

  const assume = async (ticket: OpenTicket) => {
    if (!user?.id) return;
    try {
      setAssumingId(ticket.id);
      await api.patch(`/tickets/${ticket.id}`, { status: 'in_progress', assigned_to_id: user.id });
      showToast.success(`Você assumiu "${ticket.title}".`);
      await load(true);
      reloadOverview();
    } catch (err: any) {
      showToast.error(err?.response?.data?.error || 'Não foi possível assumir o chamado.');
    } finally {
      setAssumingId('');
    }
  };

  const summary = (() => {
    if (loading) return 'Lendo a fila…';
    if (openTotal === 0) return 'Nenhum chamado em aberto. A fila está zerada.';
    const parts = [`${openTotal} ${openTotal === 1 ? 'chamado em aberto' : 'chamados em aberto'}`];
    if (unassigned.length > 0) parts.push(`${unassigned.length} sem responsável`);
    if (staleUnassigned.length > 0) parts.push(`${staleUnassigned.length} ${staleUnassigned.length === 1 ? 'esperando' : 'esperando'} há mais de um dia`);
    return parts.join(', ') + '.';
  })();

  const workload = overview?.workload ?? [];
  const maxLoad = Math.max(1, ...workload.map((w) => w.open));
  const trend = overview?.trend;
  const assets = dashboard?.assets;
  const assetTotal = assets ? assets.inStock + assets.assigned + assets.inMaintenance : 0;
  const pct = (n: number) => (assetTotal > 0 ? (n / assetTotal) * 100 : 0);
  const hiddenFromChart = Math.max(0, openTotal - openTickets.length);

  return (
    <div className="pnl">
      <section className="pnl-hero pub-aurora">
        <div className="pnl-wrap">
          <div className="pnl-hero__top">
            <div>
              <p className="pnl-hello">{greeting()}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}.</p>
              <h1>{summary}</h1>
            </div>
            <div className="pnl-hero__actions">
              {canPickScope && (
                <label className="pnl-scope">
                  <span>Equipe</span>
                  <select value={scope} onChange={(e) => setScope(e.target.value as Scope)}>
                    <option value="all">Todas</option>
                    <option value="ti">TI</option>
                    <option value="rh">RH</option>
                    <option value="administrativo">Administrativo</option>
                  </select>
                </label>
              )}
              <button type="button" className="pub-btn pub-btn--sun" onClick={() => navigate('/admin/chamados')}>
                <i className="ti ti-inbox" aria-hidden="true" />
                Atender a fila
              </button>
            </div>
          </div>

          {/* Idade da fila: cada ponto é um chamado aberto. */}
          <figure className="pnl-age" aria-labelledby="pnl-age-title">
            <figcaption className="pnl-age__head">
              <h2 id="pnl-age-title">Idade da fila</h2>
              <ul className="pnl-age__legend" aria-label="Legenda">
                <li><span className="pnl-dot pnl-dot--high" />Alta ou urgente</li>
                <li><span className="pnl-dot pnl-dot--medium" />Média</li>
                <li><span className="pnl-dot pnl-dot--low" />Baixa</li>
                <li><span className="pnl-dot pnl-dot--medium is-free" />Sem responsável</li>
              </ul>
            </figcaption>

            <div className="pnl-age__lanes">
              {bands.map((band, laneIndex) => (
                <div key={band.key} className={`pnl-lane pnl-lane--${band.key}`}>
                  <div className="pnl-lane__dots">
                    {band.tickets.slice(0, MAX_DOTS).map((t, dotIndex) => (
                      <button
                        key={t.id}
                        type="button"
                        style={{ '--pnl-delay': `${laneIndex * 90 + Math.min(dotIndex, 12) * 35}ms` } as React.CSSProperties}
                        className={`pnl-dot pnl-dot--${priorityTone(t.priority)} ${!t.assigned_to && t.status === 'open' ? 'is-free' : ''}`}
                        title={`${t.title}\n${PRIORITY_LABEL[t.priority] || t.priority}, aberto há ${ageLabel(t.created_at)}${t.assigned_to_name ? `, com ${t.assigned_to_name}` : ', sem responsável'}`}
                        aria-label={`${t.title}, aberto há ${ageLabel(t.created_at)}`}
                        onClick={() => navigate(`/admin/chamados/${t.id}`)}
                      />
                    ))}
                    {band.tickets.length > MAX_DOTS && (
                      <span className="pnl-lane__more">+{band.tickets.length - MAX_DOTS}</span>
                    )}
                  </div>
                  <div className="pnl-lane__foot">
                    <strong>{loading ? '–' : band.tickets.length}</strong>
                    <span>{band.label}</span>
                  </div>
                </div>
              ))}
            </div>

            {!loading && (
              <p className="pnl-age__note">
                {oldest
                  ? <>O mais antigo está aberto há <strong>{ageLabel(oldest.created_at)}</strong>: {oldest.title}.</>
                  : 'Nenhum chamado aberto agora.'}
                {hiddenFromChart > 0 && ` ${hiddenFromChart} chamados do meio da fila não aparecem no gráfico.`}
              </p>
            )}
          </figure>
        </div>
      </section>

      <div className="pnl-wrap pnl-body">
        {error && (
          <div className="pnl-alert" role="alert">
            <i className="ti ti-alert-circle" aria-hidden="true" />
            <span>{error}</span>
            <button type="button" onClick={() => { void load(); reloadOverview(); }}>Tentar de novo</button>
          </div>
        )}

        <section className="pnl-card pnl-action" aria-labelledby="pnl-action-title">
          <header className="pnl-card__head">
            <h2 id="pnl-action-title"><span className="pub-gicon pnl-icon pub-gicon--administrativo" aria-hidden="true"><i className="ti ti-bolt" /></span>Precisa de ação</h2>
            <button type="button" className="pnl-link" onClick={() => navigate('/admin/chamados')}>Abrir a fila</button>
          </header>
          {loading ? (
            <div className="pnl-skeleton" />
          ) : needsAction.length === 0 ? (
            <p className="pnl-empty"><i className="ti ti-mood-check" aria-hidden="true" />Todos os chamados têm responsável e nada urgente está parado.</p>
          ) : (
            <ul className="pnl-list">
              {needsAction.map((t) => {
                const free = !t.assigned_to && t.status === 'open';
                const team = t.department ? TEAM_LABEL[t.department] : null;
                return (
                  <li key={t.id} className="pnl-row">
                    <span className={`pnl-dot pnl-dot--${priorityTone(t.priority)} ${free ? 'is-free' : ''}`} aria-hidden="true" />
                    <button type="button" className="pnl-row__main" onClick={() => navigate(`/admin/chamados/${t.id}`)}>
                      <strong>{t.title}</strong>
                      <span>
                        {[t.requester_name, team && canPickScope ? team : null, free ? 'sem responsável' : `com ${t.assigned_to_name || 'outra pessoa'}`]
                          .filter(Boolean).join(', ')}
                      </span>
                    </button>
                    <span className={`pnl-age-tag ${hoursSince(t.created_at) >= 24 ? 'is-late' : ''}`}>{ageLabel(t.created_at)}</span>
                    {free && (
                      <button type="button" className="pnl-assume" onClick={() => void assume(t)} disabled={assumingId === t.id}>
                        {assumingId === t.id ? 'Assumindo…' : 'Assumir'}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="pnl-card pnl-pace" aria-labelledby="pnl-pace-title">
          <header className="pnl-card__head">
            <h2 id="pnl-pace-title"><span className="pub-gicon pnl-icon " aria-hidden="true"><i className="ti ti-activity" /></span>Ritmo</h2>
            <button type="button" className="pnl-link" onClick={() => navigate('/admin/relatorios')}>Relatórios</button>
          </header>
          <dl className="pnl-stats">
            <div>
              <dt>Primeira resposta</dt>
              <dd>{minutesLabel(overview?.timing.firstResponseMinutes)}</dd>
              <span>em média</span>
            </div>
            <div>
              <dt>Até resolver</dt>
              <dd>{minutesLabel(overview?.timing.resolutionMinutes)}</dd>
              {overview?.timing.resolutionDeltaPct != null && (
                <span className={overview.timing.resolutionDeltaPct <= 0 ? 'is-good' : 'is-bad'}>
                  {overview.timing.resolutionDeltaPct <= 0 ? 'mais rápido' : 'mais lento'} que o período anterior ({Math.abs(overview.timing.resolutionDeltaPct)}%)
                </span>
              )}
            </div>
            <div>
              <dt>Hoje</dt>
              <dd>{overview ? `${overview.today.created} / ${overview.today.resolved}` : '—'}</dd>
              <span>abertos / resolvidos</span>
            </div>
            <div>
              <dt>Esta semana</dt>
              <dd>{trend ? trend.thisWeek : '—'}</dd>
              {trend && <span>{trend.lastWeek} na semana passada</span>}
            </div>
          </dl>
        </section>

        <section className="pnl-card pnl-load" aria-labelledby="pnl-load-title">
          <header className="pnl-card__head">
            <h2 id="pnl-load-title"><span className="pub-gicon pnl-icon pub-gicon--rh" aria-hidden="true"><i className="ti ti-users" /></span>Carga da equipe</h2>
            <span className="pnl-card__meta">chamados em aberto por pessoa</span>
          </header>
          {workload.length === 0 ? (
            <p className="pnl-empty">Ninguém com chamados em aberto.</p>
          ) : (
            <ul className="pnl-bars">
              {workload.slice(0, 8).map((w) => (
                <li key={w.userId} className={w.userId === user?.id ? 'is-me' : ''}>
                  <span className="pnl-bars__name">{w.userId === user?.id ? 'Você' : w.name}</span>
                  <span className="pnl-bars__track"><span style={{ width: `${(w.open / maxLoad) * 100}%` }} /></span>
                  <strong>{w.open}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="pnl-card pnl-assets" aria-labelledby="pnl-assets-title">
          <header className="pnl-card__head">
            <h2 id="pnl-assets-title"><span className="pub-gicon pnl-icon pub-gicon--neutral" aria-hidden="true"><i className="ti ti-packages" /></span>Inventário</h2>
            <button type="button" className="pnl-link" onClick={() => navigate('/inventario')}>Abrir inventário</button>
          </header>
          {!assets ? (
            <p className="pnl-empty">Dados do inventário indisponíveis agora.</p>
          ) : (
            <>
              <div className="pnl-split" role="img" aria-label={`${assets.assigned} em uso, ${assets.inStock} em estoque, ${assets.inMaintenance} em manutenção`}>
                <span className="is-use" style={{ width: `${pct(assets.assigned)}%` }} />
                <span className="is-stock" style={{ width: `${pct(assets.inStock)}%` }} />
                <span className="is-fix" style={{ width: `${pct(assets.inMaintenance)}%` }} />
              </div>
              <ul className="pnl-split__legend">
                <li><span className="is-use" />Em uso <strong>{assets.assigned}</strong></li>
                <li><span className="is-stock" />Em estoque <strong>{assets.inStock}</strong></li>
                <li><span className="is-fix" />Em manutenção <strong>{assets.inMaintenance}</strong></li>
              </ul>
              <p className="pnl-assets__foot">
                Hoje: {assets.assignedToday} {assets.assignedToday === 1 ? 'entrega' : 'entregas'}, {assets.returnedToday} {assets.returnedToday === 1 ? 'devolução' : 'devoluções'}.
                {dashboard && dashboard.pendingPurchases > 0 && (
                  <> <button type="button" className="pnl-link" onClick={() => navigate('/inventario/compras')}>{dashboard.pendingPurchases} {dashboard.pendingPurchases === 1 ? 'compra pendente' : 'compras pendentes'}</button></>
                )}
              </p>
            </>
          )}
        </section>

        <section className="pnl-card pnl-feed" aria-labelledby="pnl-feed-title">
          <header className="pnl-card__head">
            <h2 id="pnl-feed-title"><span className="pub-gicon pnl-icon pub-gicon--neutral" aria-hidden="true"><i className="ti ti-history" /></span>Últimas movimentações</h2>
          </header>
          {!dashboard || dashboard.recentActivity.length === 0 ? (
            <p className="pnl-empty">Sem movimentações recentes.</p>
          ) : (
            <ul className="pnl-feed__list">
              {dashboard.recentActivity.slice(0, 6).map((a) => {
                const meta = ACTIVITY[a.type] ?? { label: 'Atualização', icon: 'ti-point' };
                return (
                  <li key={a.id}>
                    <button type="button" onClick={() => navigate(a.route || '/admin/chamados')}>
                      <span className={`pnl-feed__icon pnl-feed__icon--${a.type}`} aria-hidden="true"><i className={`ti ${meta.icon}`} /></span>
                      <span className="pnl-feed__copy">
                        <strong>{a.title}</strong>
                        <span>{meta.label}{a.detail ? `, ${a.detail}` : ''}</span>
                      </span>
                      <time dateTime={a.timestamp}>{relative(a.timestamp)}</time>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {overview && overview.topCategories.length > 0 && (
          <section className="pnl-card pnl-cats" aria-labelledby="pnl-cats-title">
            <header className="pnl-card__head">
              <h2 id="pnl-cats-title"><span className="pub-gicon pnl-icon " aria-hidden="true"><i className="ti ti-tags" /></span>Assuntos mais pedidos</h2>
            </header>
            <ul className="pnl-bars pnl-bars--cats">
              {overview.topCategories.slice(0, 6).map((c) => {
                const max = Math.max(1, ...overview.topCategories.map((x) => x.total));
                return (
                  <li key={c.category}>
                    <span className="pnl-bars__name">{categoryLabel(c.category)}</span>
                    <span className="pnl-bars__track"><span style={{ width: `${(c.total / max) * 100}%` }} /></span>
                    <strong>{c.total}</strong>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
