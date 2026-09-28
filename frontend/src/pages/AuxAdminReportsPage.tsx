import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import CountUp from '../components/adm/CountUp';
import { ADM_KINDS, ADM_URGENT, admKind } from '../components/adm/admKinds';
import { useSlidingPill } from '../components/adm/useSlidingPill';
import '../styles/AuxAdminReportsPage.css';

interface AuxAdminReport {
  scope: { department: string; label: string; restrictedToOwn: boolean };
  summary: {
    total: number;
    resolved: number;
    inProgress: number;
    pending: number;
    waiting: number;
    highPriorityOpen: number;
    resolutionRate: number | null;
    avgResolutionMinutes: number | null;
    avgFirstResponseMinutes: number | null;
    perDayWithResolutions: number | null;
    daysWithResolutions: number;
    businessDays: number | null;
    perBusinessDay: number | null;
  };
  volume: Array<{ day: string; received: number; resolved: number }>;
  categories: Array<{ label: string; total: number }>;
  requesterSectors: Array<{ label: string; total: number }>;
  byStatus: Array<{ status: string; label: string; total: number }>;
  attention: Array<{
    id: string;
    title: string;
    status: string;
    statusLabel: string;
    priority: string;
    category?: string | null;
    requesterName: string;
    requesterDepartment: string;
    assignedToName?: string | null;
    openHours: number;
    createdAt: string;
  }>;
}

type PresetKey = '7d' | '30d' | 'month' | 'prev' | 'custom';

const PRESETS: Array<{ key: PresetKey; label: string; phrase: string }> = [
  { key: '7d', label: '7 dias', phrase: 'Nos últimos 7 dias' },
  { key: '30d', label: '30 dias', phrase: 'Nos últimos 30 dias' },
  { key: 'month', label: 'Este mês', phrase: 'Neste mês' },
  { key: 'prev', label: 'Mês passado', phrase: 'No mês passado' },
  { key: 'custom', label: 'Escolher datas', phrase: 'No período escolhido' },
];

const iso = (date: Date) => date.toISOString().slice(0, 10);

/** Traduz um preset numa janela concreta. `custom` não impõe datas. */
function presetRange(preset: PresetKey): { from: string; to: string } | null {
  const today = new Date();
  if (preset === 'custom') return null;
  if (preset === '7d') {
    const from = new Date(today);
    from.setDate(today.getDate() - 6);
    return { from: iso(from), to: iso(today) };
  }
  if (preset === '30d') {
    const from = new Date(today);
    from.setDate(today.getDate() - 29);
    return { from: iso(from), to: iso(today) };
  }
  if (preset === 'month') {
    return { from: iso(new Date(today.getFullYear(), today.getMonth(), 1)), to: iso(today) };
  }
  return {
    from: iso(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
    to: iso(new Date(today.getFullYear(), today.getMonth(), 0)),
  };
}

const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? '1 dia' : `${days} dias`;
};

const PRIORITY_LABEL: Record<string, string> = {
  urgent: 'Urgente',
  critical: 'Crítica',
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

/** O relatório devolve a categoria crua; aqui ela vira o nome que o setor usa. */
const categoryName = (raw: string) => ADM_KINDS[raw]?.label ?? (raw === 'outro' ? 'Outro pedido' : raw);

const STATUS_TONE: Record<string, string> = {
  open: 'new',
  in_progress: 'doing',
  waiting_user: 'waiting',
  aguardando_confirmacao: 'waiting',
  aguardando_aquisicao: 'waiting',
  aguardando_terceiros: 'waiting',
  resolved: 'done',
  closed: 'closed',
};

/**
 * Relatórios do Administrativo. Responde quatro perguntas de coordenação:
 * o que o setor atende, quanto atende, de onde vem a demanda e o que
 * continua pendente. Sem conceitos da TI (equipamento, técnico, SLA).
 */
export default function AuxAdminReportsPage() {
  const navigate = useNavigate();
  const [report, setReport] = useState<AuxAdminReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [preset, setPreset] = useState<PresetKey>('30d');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [category, setCategory] = useState('');
  const [sector, setSector] = useState('');

  const presetsRef = useRef<HTMLDivElement | null>(null);
  const pill = useSlidingPill(presetsRef, '.axq-preset', PRESETS.findIndex((p) => p.key === preset));

  const range = useMemo(() => presetRange(preset) ?? { from, to }, [preset, from, to]);

  const load = useCallback(async () => {
    try {
      setError('');
      const params = new URLSearchParams();
      if (range.from) params.append('date_from', range.from);
      // O middleware do reports exige AAAA-MM-DD estrito; o fim do dia é
      // resolvido no servidor, que soma um dia na comparação.
      if (range.to) params.append('date_to', range.to);
      if (status) params.append('status', status);
      if (priority) params.append('priority', priority);
      if (category) params.append('category', category);
      if (sector) params.append('requester_department', sector);

      const { data } = await api.get(`/reports/auxadmin?${params.toString()}`, { timeout: 20000 });
      setReport(data);
    } catch (err: any) {
      const data = err?.response?.data;
      setError([data?.error || 'Não foi possível carregar o relatório', data?.detail].filter(Boolean).join('. '));
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to, status, priority, category, sector]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const activeFilters = (status ? 1 : 0) + (priority ? 1 : 0) + (category ? 1 : 0) + (sector ? 1 : 0);
  const clearFilters = () => { setStatus(''); setPriority(''); setCategory(''); setSector(''); };

  const s = report?.summary;
  const phrase = PRESETS.find((p) => p.key === preset)!.phrase;
  const volumePeak = useMemo(
    () => Math.max(1, ...(report?.volume ?? []).flatMap((d) => [d.received, d.resolved])),
    [report],
  );
  const hasVolume = report?.volume.some((d) => d.received > 0 || d.resolved > 0) ?? false;
  const catPeak = Math.max(1, ...(report?.categories ?? []).map((c) => c.total));
  const sectorPeak = Math.max(1, ...(report?.requesterSectors ?? []).map((c) => c.total));
  const statusTotal = (report?.byStatus ?? []).reduce((sum, e) => sum + e.total, 0);

  const lead = !s
    ? 'Juntando os números do setor…'
    : s.total === 0
      ? `${phrase} não chegou nenhum pedido${activeFilters ? ' com esses filtros' : ''}.`
      : `${phrase} chegaram ${s.total} ${s.total === 1 ? 'pedido' : 'pedidos'}${s.resolutionRate !== null ? ` e ${s.resolutionRate}% já estão resolvidos` : ''}.${s.pending > 0 ? ` ${s.pending} ainda não começaram.` : ''}`;

  return (
    <div className="axq">
      <header className="axq-head">
        <div className="axq-head__inner">
          <div>
            <h1>Relatórios</h1>
            <p>{lead}</p>
            {report?.scope.restrictedToOwn && (
              <p className="axq-scope"><i className="ti ti-info-circle" aria-hidden="true" />Contando os pedidos que estão com você ou sem ninguém.</p>
            )}
          </div>

          <div className="axq-period">
            <div className="axq-presets" ref={presetsRef} role="group" aria-label="Período">
              {pill.visible && <span className="axq-presets__pill" aria-hidden="true" style={pill.style} />}
              {PRESETS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className="axq-preset"
                  aria-pressed={preset === option.key}
                  onClick={() => setPreset(option.key)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {preset === 'custom' && (
              <div className="axq-range">
                <label><span>De</span><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
                <label><span>Até</span><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="axq-body">
        <section className="axq-filters" aria-label="Filtros">
          <label>
            <span>Situação</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Todas</option>
              {(report?.byStatus ?? []).map((o) => <option key={o.status} value={o.status}>{o.label}</option>)}
            </select>
          </label>
          <label>
            <span>Prioridade</span>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="">Todas</option>
              {Object.entries(PRIORITY_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>
            <span>Tipo de pedido</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Todos</option>
              {(report?.categories ?? []).map((o) => <option key={o.label} value={o.label}>{categoryName(o.label)}</option>)}
            </select>
          </label>
          <label>
            <span>Quem pediu</span>
            <select value={sector} onChange={(e) => setSector(e.target.value)}>
              <option value="">Todos os setores</option>
              {(report?.requesterSectors ?? []).filter((o) => o.label !== 'Não informado').map((o) => (
                <option key={o.label} value={o.label}>{o.label}</option>
              ))}
            </select>
          </label>
          {activeFilters > 0 && (
            <button type="button" className="axq-clear" onClick={clearFilters}>
              <i className="ti ti-x" aria-hidden="true" />Limpar filtros
            </button>
          )}
        </section>

        {error && !report && (
          <div className="axq-alert" role="alert">
            <i className="ti ti-alert-circle" aria-hidden="true" />
            <span>{error}</span>
            <button type="button" onClick={() => { setLoading(true); void load(); }}>Tentar de novo</button>
          </div>
        )}

        {loading && !report ? (
          <div className="axq-ghosts" aria-busy="true">
            <div className="axq-ghost" style={{ height: 120 }} />
            <div className="axq-ghost" style={{ height: 320 }} />
          </div>
        ) : report && s && s.total === 0 ? (
          <div className="axq-empty">
            <span className="axq-empty__tag" aria-hidden="true"><i className="ti ti-calendar-off" /></span>
            <h2>Nenhum pedido neste período</h2>
            <p>Escolha um período maior{activeFilters > 0 ? ' ou limpe os filtros' : ''} para ver os números.</p>
            {activeFilters > 0 && <button type="button" className="axq-clear" onClick={clearFilters}>Limpar filtros</button>}
          </div>
        ) : report && s ? (
          <>
            {/* Números do período numa faixa só */}
            <dl className="axq-numbers">
              <div>
                <dt>Pedidos que chegaram</dt>
                <dd><CountUp value={s.total} /></dd>
                <small>{s.resolved} resolvidos</small>
              </div>
              <div>
                <dt>Já resolvidos</dt>
                <dd>{s.resolutionRate !== null ? <CountUp value={s.resolutionRate} format={(v) => `${v}%`} /> : '—'}</dd>
                <small>{s.perBusinessDay !== null ? `cerca de ${s.perBusinessDay} por dia útil` : ' '}</small>
              </div>
              <div>
                <dt>Em andamento</dt>
                <dd><CountUp value={s.inProgress} /></dd>
                <small>{s.waiting > 0 ? `${s.waiting} esperando alguém` : 'nenhum esperando'}</small>
              </div>
              <div className={s.pending > 0 ? 'is-alert' : undefined}>
                <dt>Ainda não começaram</dt>
                <dd><CountUp value={s.pending} /></dd>
                <small>{s.highPriorityOpen > 0 ? `${s.highPriorityOpen} com prioridade alta` : 'nenhum urgente'}</small>
              </div>
              <div>
                <dt>Tempo para resolver</dt>
                <dd>{s.avgResolutionMinutes !== null ? formatDuration(s.avgResolutionMinutes) : '—'}</dd>
                <small>{s.avgFirstResponseMinutes !== null ? `primeira resposta em ${formatDuration(s.avgFirstResponseMinutes)}` : 'em média'}</small>
              </div>
            </dl>

            {/* O quadro dos tipos: cada tipo é uma etiqueta pendurada, do tamanho da demanda */}
            <section className="axq-rack" aria-labelledby="axq-rack-title">
              <header>
                <h2 id="axq-rack-title">O que mais pediram</h2>
                <p>Cada etiqueta tem o tamanho da quantidade de pedidos daquele tipo.</p>
              </header>
              {report.categories.length > 0 ? (
                <ul className="axq-hang">
                  {report.categories.map((entry, i) => {
                    const kind = admKind(entry.label);
                    const share = s.total > 0 ? Math.round((entry.total / s.total) * 100) : 0;
                    return (
                      <li
                        key={entry.label}
                        className={`axq-hang__item adm-tone--${kind.tone}`}
                        style={{ '--h': `${Math.max(18, (entry.total / catPeak) * 100)}%`, '--i': i } as CSSProperties}
                      >
                        <button
                          type="button"
                          className="axq-hang__tag"
                          aria-pressed={category === entry.label}
                          onClick={() => setCategory(category === entry.label ? '' : entry.label)}
                          title={`Filtrar por ${categoryName(entry.label)}`}
                        >
                          <span className="axq-hang__eye" aria-hidden="true" />
                          <strong>{entry.total}</strong>
                          <span className="axq-hang__share">{share}%</span>
                        </button>
                        <span className="axq-hang__label"><i className={`ti ${kind.icon}`} aria-hidden="true" />{categoryName(entry.label)}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="axq-note">Nenhum pedido com tipo definido no período.</p>
              )}
            </section>

            <div className="axq-grid">
              <section className="axq-panel axq-panel--wide" aria-labelledby="axq-vol-title">
                <header className="axq-panel__head">
                  <h2 id="axq-vol-title">Chegaram e foram resolvidos, dia a dia</h2>
                  <span className="axq-keys">
                    <span><i className="axq-key axq-key--in" />Chegaram</span>
                    <span><i className="axq-key axq-key--out" />Resolvidos</span>
                  </span>
                </header>
                {hasVolume ? (
                  <div className="axq-chart" role="img" aria-label="Pedidos que chegaram e que foram resolvidos por dia">
                    {report.volume.map((day) => {
                      const date = new Date(`${day.day.slice(0, 10)}T12:00:00`);
                      return (
                        <div
                          key={day.day}
                          className="axq-chart__col"
                          title={`${date.toLocaleDateString('pt-BR')}: ${day.received} chegaram, ${day.resolved} resolvidos`}
                        >
                          <span className="axq-bar axq-bar--in" style={{ height: `${(day.received / volumePeak) * 100}%` }} />
                          <span className="axq-bar axq-bar--out" style={{ height: `${(day.resolved / volumePeak) * 100}%` }} />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="axq-note">Sem movimento neste período.</p>
                )}
              </section>

              <section className="axq-panel" aria-labelledby="axq-sec-title">
                <header className="axq-panel__head"><h2 id="axq-sec-title">Setores que mais pediram</h2></header>
                {report.requesterSectors.length > 0 ? (
                  <ol className="axq-rank">
                    {report.requesterSectors.slice(0, 8).map((entry) => (
                      <li key={entry.label}>
                        <button
                          type="button"
                          aria-pressed={sector === entry.label}
                          disabled={entry.label === 'Não informado'}
                          onClick={() => setSector(sector === entry.label ? '' : entry.label)}
                        >
                          <span className="axq-rank__label">{entry.label}</span>
                          <span className="axq-rank__track" aria-hidden="true">
                            <span style={{ width: `${(entry.total / sectorPeak) * 100}%` }} />
                          </span>
                          <strong>{entry.total}</strong>
                        </button>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="axq-note">Sem informação de setor.</p>
                )}
              </section>

              <section className="axq-panel" aria-labelledby="axq-st-title">
                <header className="axq-panel__head"><h2 id="axq-st-title">Onde os pedidos estão</h2></header>
                <div className="axq-stack" aria-hidden="true">
                  {report.byStatus.filter((e) => e.total > 0).map((entry) => (
                    <span key={entry.status} className={`axq-st--${STATUS_TONE[entry.status] ?? 'closed'}`} style={{ flexGrow: entry.total }} />
                  ))}
                </div>
                <ul className="axq-legend">
                  {report.byStatus.map((entry) => (
                    <li key={entry.status}>
                      <span className={`axq-dot axq-st--${STATUS_TONE[entry.status] ?? 'closed'}`} aria-hidden="true" />
                      {entry.label}
                      <strong>{entry.total}</strong>
                      <small>{statusTotal > 0 ? `${Math.round((entry.total / statusTotal) * 100)}%` : ''}</small>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <section className="axq-panel axq-attn" aria-labelledby="axq-attn-title">
              <header className="axq-panel__head">
                <h2 id="axq-attn-title">Merecem um olhar</h2>
                <span>urgentes, sem ninguém ou abertos há mais tempo</span>
              </header>
              {report.attention.length > 0 ? (
                <ul className="axq-attn__list">
                  {report.attention.map((item) => {
                    const kind = admKind(item.category);
                    const days = Math.floor(item.openHours / 24);
                    return (
                      <li key={item.id}>
                        <button type="button" className={`axq-attn__row adm-tone--${kind.tone}`} onClick={() => navigate(`/admin/chamados/${item.id}`)}>
                          <span className="axq-attn__stub" aria-hidden="true"><i className={`ti ${kind.icon}`} /></span>
                          <span className="axq-attn__main">
                            <strong>{item.title}</strong>
                            <small>{item.requesterName}{item.requesterDepartment ? `, ${item.requesterDepartment}` : ''}</small>
                          </span>
                          <span className="axq-attn__tags">
                            {ADM_URGENT.has(item.priority) && <span className="axq-flag">{PRIORITY_LABEL[item.priority] ?? 'Urgente'}</span>}
                            {!item.assignedToName && <span className="axq-flag axq-flag--nobody">Sem ninguém</span>}
                            <span className="axq-attn__state">{item.statusLabel}</span>
                          </span>
                          <span className="axq-attn__age">
                            {days >= 1 ? `${days} ${days === 1 ? 'dia' : 'dias'}` : `${item.openHours} h`}
                            <small>aberto</small>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="axq-note">Nada fora do normal neste período.</p>
              )}
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
