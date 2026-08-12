import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import '../styles/AdminStaffDashboardPage.css';

interface RecentTicket {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  requester_name?: string;
  department?: string;
  category?: string;
}

interface AdminStaffDashboardData {
  myTicketsTotal: number;
  myOpenTickets: number;
  myInProgressTickets: number;
  myWaitingTickets: number;
  myResolvedTickets: number;
  myUpdatedToday: number;
  myResolvedToday: number;
  myHighPriorityOpen: number;
  myOldestPendingDays: number;
  myAverageResolutionHours: number;
  myTicketsByPriority: Record<string, number>;
  administrativePendingTotal: number;
  unassignedAdministrativeTickets: number;
  recentTickets: RecentTicket[];
}

const EMPTY_DATA: AdminStaffDashboardData = {
  myTicketsTotal: 0,
  myOpenTickets: 0,
  myInProgressTickets: 0,
  myWaitingTickets: 0,
  myResolvedTickets: 0,
  myUpdatedToday: 0,
  myResolvedToday: 0,
  myHighPriorityOpen: 0,
  myOldestPendingDays: 0,
  myAverageResolutionHours: 0,
  myTicketsByPriority: {},
  administrativePendingTotal: 0,
  unassignedAdministrativeTickets: 0,
  recentTickets: [],
};

const STATUS_LABEL: Record<string, string> = {
  open: 'Aberto',
  in_progress: 'Em atendimento',
  waiting_user: 'Aguardando usuário',
  resolved: 'Resolvido',
  closed: 'Fechado',
};

const PRIORITY_LABEL: Record<string, string> = {
  urgent: 'Urgente',
  critical: 'Crítica',
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

/* Tons de estado — cada um só existe para significar algo.
   "Resolvido" é deliberadamente neutro: trabalho concluído não deve chamar atenção. */
const STATUS_TONE: Record<string, string> = {
  open: 'wait',
  in_progress: 'active',
  waiting_user: 'blocked',
  resolved: 'done',
  closed: 'done',
};

const PRIORITY_TONE: Record<string, string> = {
  urgent: 'sev1',
  critical: 'sev1',
  high: 'sev2',
  medium: 'sev3',
  low: 'sev4',
};

/** Número em destaque dentro da frase de briefing. */
function N({ children }: { children: React.ReactNode }) {
  return <span className="asd-n">{children}</span>;
}

export default function AdminStaffDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<AdminStaffDashboardData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [currentUserName, setCurrentUserName] = useState('Assistente Administrativo');
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('internal_token');
    const userRaw = localStorage.getItem('internal_user');
    if (!token || !userRaw) { navigate('/admin/login'); return; }
    try {
      const user = JSON.parse(userRaw) as { role?: string; name?: string };
      if (user.role !== 'admin_staff') { navigate('/admin/dashboard'); return; }
      setCurrentUserName(user.name || 'Assistente Administrativo');
    } catch {
      navigate('/admin/login'); return;
    }
    void fetchDashboard();
  }, [navigate]);

  const fetchDashboard = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const response = await api.get<AdminStaffDashboardData>('/dashboard/admin-staff');
      setData({ ...EMPTY_DATA, ...(response.data || {}) });
      setLastSync(new Date());
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Não foi possível carregar o painel. Tente atualizar novamente.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const firstName = currentUserName.trim().split(' ')[0] || currentUserName;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  })();

  /** Horas → forma legível. O backend devolve float; nunca mostrar o número cru. */
  const formatDuration = (hours: number) => {
    if (!hours || hours <= 0) return '—';
    if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}min`;
    if (hours < 48) return `${Math.round(hours)}h`;
    return `${Math.round(hours / 24)}d`;
  };

  const formatElapsed = (dateString: string) => {
    const diffMs = Date.now() - new Date(dateString).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `${Math.max(mins, 1)}min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  const formatClock = (d: Date) =>
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  if (!localStorage.getItem('internal_token')) return null;

  const pendingMine = data.myOpenTickets + data.myInProgressTickets + data.myWaitingTickets;
  const oldestDays = Math.floor(data.myOldestPendingDays || 0);

  const loadSegments = [
    { key: 'open',     label: 'Abertos',            value: data.myOpenTickets,       tone: 'wait'    },
    { key: 'progress', label: 'Em atendimento',     value: data.myInProgressTickets, tone: 'active'  },
    { key: 'waiting',  label: 'Aguardando usuário', value: data.myWaitingTickets,    tone: 'blocked' },
  ];

  const priorityRows = [
    { key: 'urgent',   label: 'Urgente', value: data.myTicketsByPriority?.urgent   ?? 0, tone: 'sev1' },
    { key: 'critical', label: 'Crítica', value: data.myTicketsByPriority?.critical ?? 0, tone: 'sev1' },
    { key: 'high',     label: 'Alta',    value: data.myTicketsByPriority?.high     ?? 0, tone: 'sev2' },
    { key: 'medium',   label: 'Média',   value: data.myTicketsByPriority?.medium   ?? 0, tone: 'sev3' },
    { key: 'low',      label: 'Baixa',   value: data.myTicketsByPriority?.low      ?? 0, tone: 'sev4' },
  ].filter((row) => row.value > 0);

  const maxPriority = Math.max(1, ...priorityRows.map((r) => r.value));

  return (
    <div className="asd-page">
      <div className="asd-shell">

        {/* ── Barra de comando ── */}
        <header className="asd-topbar">
          <div className="asd-topbar-id">
            <h1 className="asd-topbar-title">Quadro de turno</h1>
            <p className="asd-topbar-meta">
              <span>{currentUserName}</span>
              <span className="asd-dot-sep" aria-hidden="true" />
              <span>Administrativo</span>
              {lastSync && (
                <>
                  <span className="asd-dot-sep" aria-hidden="true" />
                  <span className="asd-mono">atualizado {formatClock(lastSync)}</span>
                </>
              )}
            </p>
          </div>
          <div className="asd-topbar-actions">
            <button
              type="button"
              className="asd-btn asd-btn-quiet"
              onClick={() => void fetchDashboard(true)}
              disabled={refreshing || loading}
            >
              <i className={`ti ti-refresh${refreshing ? ' asd-spin' : ''}`} aria-hidden="true" />
              {refreshing ? 'Atualizando' : 'Atualizar'}
            </button>
            <button
              type="button"
              className="asd-btn asd-btn-solid"
              onClick={() => navigate('/admin/chamados')}
            >
              <i className="ti ti-clipboard-list" aria-hidden="true" />
              Abrir fila completa
            </button>
          </div>
        </header>

        {error && (
          <div className="asd-alert" role="alert">
            <i className="ti ti-alert-triangle" aria-hidden="true" />
            <p>{error}</p>
            <button type="button" className="asd-alert-retry" onClick={() => void fetchDashboard(true)}>
              Tentar de novo
            </button>
          </div>
        )}

        {loading ? (
          /* Esqueleto com a forma real da página — nada de spinner solto. */
          <div className="asd-board" aria-busy="true" aria-label="Carregando painel">
            <div className="asd-col">
              <section className="asd-hero asd-hero-sk">
                <div className="asd-sk asd-sk-line" style={{ width: '82%', height: 34 }} />
                <div className="asd-sk asd-sk-line" style={{ width: '54%', height: 34 }} />
                <div className="asd-sk asd-sk-bar" />
              </section>
              <section className="asd-panel">
                <div className="asd-sk asd-sk-line" style={{ width: 160, height: 14 }} />
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="asd-sk asd-sk-row" style={{ animationDelay: `${i * 70}ms` }} />
                ))}
              </section>
            </div>
            <aside className="asd-col">
              <div className="asd-panel"><div className="asd-sk asd-sk-block" /></div>
              <div className="asd-panel"><div className="asd-sk asd-sk-block" /></div>
            </aside>
          </div>
        ) : (
          <div className="asd-board">

            {/* ══ Coluna principal ══ */}
            <div className="asd-col">

              {/* ── Briefing: a resposta em uma frase, no painel-âncora ── */}
              <section className="asd-hero">
                <p className="asd-brief">
                  {pendingMine === 0 ? (
                    <>
                      {greeting}, {firstName}. Sua fila está limpa —{' '}
                      <N>nenhum</N> chamado pendente atribuído a você.
                    </>
                  ) : (
                    <>
                      {greeting}, {firstName}. Você tem <N>{pendingMine}</N>{' '}
                      {pendingMine === 1 ? 'chamado pendente' : 'chamados pendentes'}
                      {data.myHighPriorityOpen > 0 && (
                        <>
                          , <N>{data.myHighPriorityOpen}</N> de prioridade alta
                        </>
                      )}
                      {oldestDays >= 1 && (
                        <>
                          {' '}e o mais antigo espera há <N>{oldestDays}</N>{' '}
                          {oldestDays === 1 ? 'dia' : 'dias'}
                        </>
                      )}
                      .
                    </>
                  )}
                </p>

                {/* ── Carga da fila: uma barra no lugar de oito cartões ── */}
                {pendingMine > 0 ? (
                  <div className="asd-load">
                    <div className="asd-load-track">
                      {loadSegments
                        .filter((s) => s.value > 0)
                        .map((seg, i) => (
                          <div
                            key={seg.key}
                            className={`asd-load-seg asd-tone-${seg.tone}`}
                            style={{
                              '--w': `${(seg.value / pendingMine) * 100}%`,
                              animationDelay: `${i * 90}ms`,
                            } as React.CSSProperties}
                            title={`${seg.label}: ${seg.value}`}
                          >
                            <span className="asd-load-seg-n">{seg.value}</span>
                          </div>
                        ))}
                    </div>
                    <ul className="asd-legend">
                      {loadSegments.map((seg) => (
                        <li key={seg.key} className={seg.value === 0 ? 'is-zero' : undefined}>
                          <span className={`asd-swatch asd-tone-${seg.tone}`} aria-hidden="true" />
                          <span className="asd-legend-label">{seg.label}</span>
                          <span className="asd-legend-n asd-mono">{seg.value}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="asd-load-empty">
                    <i className="ti ti-check" aria-hidden="true" />
                    Nada na sua fila neste momento.
                  </div>
                )}
              </section>

              {/* ── A fila em si: o motivo de a pessoa estar aqui ── */}
              <section className="asd-panel asd-panel-queue">
                <div className="asd-panel-hd">
                  <h2>Seus últimos chamados</h2>
                  <button
                    type="button"
                    className="asd-link"
                    onClick={() => navigate('/admin/chamados')}
                  >
                    Ver todos <i className="ti ti-arrow-right" aria-hidden="true" />
                  </button>
                </div>

                {data.recentTickets.length === 0 ? (
                  <div className="asd-empty">
                    <p className="asd-empty-title">Nenhum chamado atribuído a você</p>
                    <p className="asd-empty-sub">
                      Assuma um chamado da fila administrativa para começar o turno.
                    </p>
                    <button
                      type="button"
                      className="asd-btn asd-btn-outline"
                      onClick={() => navigate('/admin/chamados')}
                    >
                      Ver fila administrativa
                    </button>
                  </div>
                ) : (
                  <ul className="asd-queue">
                    {data.recentTickets.map((ticket, i) => {
                      const pTone = PRIORITY_TONE[ticket.priority] ?? 'sev4';
                      const sTone = STATUS_TONE[ticket.status] ?? 'done';
                      /* A cor da prioridade vive só na etiqueta — sem ponto duplicando o sinal. */
                      const isStale = Date.now() - new Date(ticket.updated_at).getTime() > 3 * 86400000;
                      return (
                        <li key={ticket.id} style={{ animationDelay: `${Math.min(i, 8) * 34}ms` }}>
                          <button
                            type="button"
                            className="asd-row"
                            onClick={() => navigate(`/admin/chamados/${ticket.id}`)}
                          >
                            <span className="asd-row-main">
                              <span className="asd-row-title">{ticket.title}</span>
                              <span className="asd-row-meta">
                                <i className="ti ti-user" aria-hidden="true" />
                                {ticket.requester_name || 'Solicitante não informado'}
                                {ticket.category && (
                                  <>
                                    <span className="asd-dot-sep" aria-hidden="true" />
                                    {ticket.category}
                                  </>
                                )}
                              </span>
                            </span>
                            <span className={`asd-tag asd-tone-${pTone}`}>
                              {PRIORITY_LABEL[ticket.priority] ?? 'Sem prioridade'}
                            </span>
                            <span className={`asd-tag asd-tag-status asd-tone-${sTone}`}>
                              {STATUS_LABEL[ticket.status] ?? ticket.status}
                            </span>
                            <span className={`asd-row-age asd-mono${isStale ? ' is-stale' : ''}`}>
                              {formatElapsed(ticket.updated_at)}
                            </span>
                            <i className="ti ti-chevron-right asd-row-go" aria-hidden="true" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>

            {/* ══ Trilho lateral ══ */}
            <aside className="asd-col asd-rail-col">

              {/* ── Fila do setor: o único item acionável fora da sua lista ── */}
              <section
                className={`asd-panel asd-claim${data.unassignedAdministrativeTickets > 0 ? ' is-live' : ''}`}
              >
                <div className="asd-panel-hd">
                  <h2>Fila administrativa</h2>
                </div>
                <p className="asd-claim-n asd-mono">{data.unassignedAdministrativeTickets}</p>
                <p className="asd-claim-label">
                  {data.unassignedAdministrativeTickets === 1
                    ? 'chamado sem responsável'
                    : 'chamados sem responsável'}
                </p>
                <p className="asd-claim-context">
                  de <strong className="asd-mono">{data.administrativePendingTotal}</strong> pendentes no setor
                </p>
                <button
                  type="button"
                  className={`asd-btn ${data.unassignedAdministrativeTickets > 0 ? 'asd-btn-solid' : 'asd-btn-outline'} asd-btn-block`}
                  onClick={() => navigate('/admin/chamados')}
                >
                  {data.unassignedAdministrativeTickets > 0 ? 'Assumir um chamado' : 'Ver fila do setor'}
                </button>
              </section>

              {/* ── Prioridades ── */}
              {priorityRows.length > 0 && (
                <section className="asd-panel">
                  <div className="asd-panel-hd">
                    <h2>Por prioridade</h2>
                    <span className="asd-hd-note asd-mono">{data.myTicketsTotal} total</span>
                  </div>
                  <ul className="asd-prio">
                    {priorityRows.map((row, i) => (
                      <li key={row.key}>
                        <span className="asd-prio-label">{row.label}</span>
                        <span className="asd-prio-track">
                          <span
                            className={`asd-prio-fill asd-tone-${row.tone}`}
                            style={{
                              '--w': `${(row.value / maxPriority) * 100}%`,
                              animationDelay: `${i * 60}ms`,
                            } as React.CSSProperties}
                          />
                        </span>
                        <span className="asd-prio-n asd-mono">{row.value}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* ── Ritmo ── */}
              <section className="asd-panel">
                <div className="asd-panel-hd">
                  <h2>Seu ritmo</h2>
                </div>
                <dl className="asd-stats">
                  <div>
                    <dt>Resolvidos hoje</dt>
                    <dd className="asd-mono">{data.myResolvedToday}</dd>
                  </div>
                  <div>
                    <dt>Movimentados hoje</dt>
                    <dd className="asd-mono">{data.myUpdatedToday}</dd>
                  </div>
                  <div>
                    <dt>Tempo médio de resolução</dt>
                    <dd className="asd-mono">{formatDuration(data.myAverageResolutionHours)}</dd>
                  </div>
                  <div>
                    <dt>Resolvidos no total</dt>
                    <dd className="asd-mono">{data.myResolvedTickets}</dd>
                  </div>
                </dl>
              </section>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
