import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import MetricCard from '../components/tickets/MetricCard';
import MetricSkeleton from '../components/tickets/MetricSkeleton';
import EmptyState from '../components/tickets/EmptyState';
import type { MetricSpec } from '../components/tickets/sectorProfiles';
import '../styles/TicketsExperience.css';
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

const PRESETS: Array<{ key: PresetKey; label: string }> = [
  { key: '7d', label: 'Últimos 7 dias' },
  { key: '30d', label: 'Últimos 30 dias' },
  { key: 'month', label: 'Este mês' },
  { key: 'prev', label: 'Mês anterior' },
  { key: 'custom', label: 'Personalizado' },
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
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours % 60 ? `${hours}h ${minutes % 60}min` : `${hours}h`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
};

const PRIORITY_LABEL: Record<string, string> = {
  urgent: 'Urgente',
  critical: 'Crítica',
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

/**
 * Relatórios Administrativos.
 *
 * Página própria do Auxiliar Administrativo — não o relatório da TI com cards
 * escondidos. Ela responde quatro perguntas de coordenação: o que o setor
 * atende, quanto atende, de onde vem a demanda e o que continua pendente.
 *
 * Nada de infraestrutura, equipamento, inventário, técnico ou SLA operacional
 * de TI: esses conceitos não descrevem este trabalho, então não aparecem.
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

  const range = useMemo(() => {
    const preseted = presetRange(preset);
    return preseted ?? { from, to };
  }, [preset, from, to]);

  const load = useCallback(async () => {
    try {
      setError('');
      const params = new URLSearchParams();
      if (range.from) params.append('date_from', range.from);
      // O middleware do reports exige AAAA-MM-DD estrito; o fim do dia e
      // resolvido no servidor, que soma um dia na comparacao.
      if (range.to) params.append('date_to', range.to);
      if (status) params.append('status', status);
      if (priority) params.append('priority', priority);
      if (category) params.append('category', category);
      if (sector) params.append('requester_department', sector);

      const { data } = await api.get(`/reports/auxadmin?${params.toString()}`, { timeout: 20000 });
      setReport(data);
    } catch (err: any) {
      // O detalhe vem do backend quando o erro e do Postgres; mostra-lo evita
      // que "erro ao carregar" seja a unica informacao disponivel.
      const data = err?.response?.data;
      setError([data?.error || 'Não foi possível carregar o relatório', data?.detail]
        .filter(Boolean).join(' · '));
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to, status, priority, category, sector]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const activeFilters =
    (status ? 1 : 0) + (priority ? 1 : 0) + (category ? 1 : 0) + (sector ? 1 : 0);

  const clearFilters = () => {
    setStatus('');
    setPriority('');
    setCategory('');
    setSector('');
  };

  const metrics: MetricSpec[] = useMemo(() => {
    if (!report) return [];
    const s = report.summary;
    return [
      {
        key: 'total',
        icon: 'ti-clipboard-list',
        label: 'Solicitações no período',
        value: s.total,
        detail: s.total === 0 ? null : `${s.resolved} concluídas`,
        tone: 'neutral',
        hint: 'Solicitações administrativas abertas dentro do período filtrado.',
      },
      {
        key: 'rate',
        icon: 'ti-circle-check',
        label: 'Taxa de conclusão',
        value: s.resolutionRate,
        format: (v) => `${v}%`,
        // Media por dia UTIL: a leitura de volume. A media por dia com
        // conclusoes vive no tooltip, porque responde outra pergunta.
        detail: s.perBusinessDay !== null ? `${s.perBusinessDay}/dia útil` : null,
        tone: 'positive',
        hint: s.perDayWithResolutions !== null
          ? `Proporção das solicitações do período já concluídas. Média por dia útil do período (feriados contam como úteis: o sistema não tem calendário). Nos ${s.daysWithResolutions} dias em que houve conclusão, a média foi ${s.perDayWithResolutions}/dia.`
          : 'Proporção das solicitações do período que já foram concluídas.',
      },
      {
        key: 'in_progress',
        icon: 'ti-progress',
        label: 'Em andamento',
        value: s.inProgress,
        detail: s.waiting > 0 ? `${s.waiting} aguardando retorno` : null,
        tone: 'info',
        hint: 'Solicitações com atendimento já iniciado.',
      },
      {
        key: 'pending',
        icon: 'ti-inbox',
        label: 'Sem tratamento',
        value: s.pending,
        detail: s.highPriorityOpen > 0 ? `${s.highPriorityOpen} de prioridade alta` : null,
        tone: s.pending > 0 ? 'warning' : 'neutral',
        hint: 'Solicitações ainda abertas, sem atendimento iniciado.',
      },
      {
        key: 'avg',
        icon: 'ti-clock-hour-4',
        label: 'Tempo médio até concluir',
        value: s.avgResolutionMinutes,
        format: formatDuration,
        detail:
          s.avgFirstResponseMinutes !== null
            ? `1ª resposta em ${formatDuration(s.avgFirstResponseMinutes)}`
            : null,
        tone: 'neutral',
        hint: 'Média entre a abertura e a conclusão das solicitações concluídas no período.',
      },
    ];
  }, [report]);

  const volumePeak = useMemo(() => {
    if (!report) return 1;
    return Math.max(...report.volume.flatMap((d) => [d.received, d.resolved]), 1);
  }, [report]);

  const hasVolume = report?.volume.some((d) => d.received > 0 || d.resolved > 0) ?? false;

  return (
    <div className="axr-page admin-tickets-dashboard">
      <header className="tk-hero">
        <div className="tk-hero-context">
          <span className="tk-hero-scope">
            <i className="ti ti-building" aria-hidden="true" />
            Administrativo
          </span>
          <h1 className="tk-hero-title">Relatórios Administrativos</h1>
          <p className="tk-hero-tagline">
            Volume, desempenho e perfil das solicitações atendidas pelo setor administrativo.
          </p>
          {report?.scope.restrictedToOwn && (
            <span className="axr-scope-note">
              <i className="ti ti-info-circle" aria-hidden="true" />
              Mostrando as solicitações atribuídas a você ou ainda sem responsável.
            </span>
          )}
        </div>

        <div className="tk-hero-tools">
          <div className="axr-presets" role="group" aria-label="Período">
            {PRESETS.map((option) => (
              <button
                key={option.key}
                type="button"
                className={`axr-preset ${preset === option.key ? 'is-active' : ''}`}
                onClick={() => setPreset(option.key)}
              >
                {option.label}
              </button>
            ))}
          </div>

          {preset === 'custom' && (
            <div className="axr-custom-range">
              <label>
                <span>De</span>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </label>
              <label>
                <span>Até</span>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </label>
            </div>
          )}
        </div>
      </header>

      {/* Filtros — só os que efetivamente alteram a consulta. */}
      <section className="axr-filters" aria-label="Filtros">
        <label>
          <span>Situação</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todas</option>
            {(report?.byStatus ?? []).map((option) => (
              <option key={option.status} value={option.status}>{option.label}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Prioridade</span>
          <select value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="">Todas</option>
            {Object.entries(PRIORITY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Assunto</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Todos</option>
            {(report?.categories ?? []).map((option) => (
              <option key={option.label} value={option.label}>{option.label}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Setor solicitante</span>
          <select value={sector} onChange={(e) => setSector(e.target.value)}>
            <option value="">Todos</option>
            {(report?.requesterSectors ?? [])
              .filter((option) => option.label !== 'Não informado')
              .map((option) => (
                <option key={option.label} value={option.label}>{option.label}</option>
              ))}
          </select>
        </label>

        {activeFilters > 0 && (
          <button type="button" className="tk-chip-clear axr-clear" onClick={clearFilters}>
            <i className="ti ti-x" aria-hidden="true" />
            Limpar filtros
          </button>
        )}
      </section>

      {error && !report && (
        <div className="tk-panorama-error" role="alert">
          <i className="ti ti-alert-circle" aria-hidden="true" />
          <span>{error}</span>
          <button type="button" onClick={load}>Tentar novamente</button>
        </div>
      )}

      {loading && !report ? (
        <MetricSkeleton count={5} />
      ) : report && report.summary.total === 0 ? (
        <EmptyState
          tone="filtered"
          icon="ti-calendar-off"
          title="Nenhuma solicitação neste período"
          description="Não há solicitações administrativas na janela e nos filtros selecionados."
          actionLabel={activeFilters > 0 ? 'Limpar filtros' : undefined}
          onAction={activeFilters > 0 ? clearFilters : undefined}
        />
      ) : report ? (
        <>
          <div className="tk-metrics">
            {metrics.map((metric, index) => (
              <MetricCard key={metric.key} metric={metric} index={index} />
            ))}
          </div>

          <section className="axr-grid">
            {/* Recebidas x concluídas: a leitura de capacidade. */}
            <article className="tk-panel axr-panel--wide">
              <header className="tk-panel-head">
                <h3>Recebidas e concluídas</h3>
                <span className="axr-legend-inline">
                  <span><i className="axr-key axr-key--in" />Recebidas</span>
                  <span><i className="axr-key axr-key--out" />Concluídas</span>
                </span>
              </header>

              {hasVolume ? (
                <div className="axr-chart" role="img" aria-label="Solicitações recebidas e concluídas por dia">
                  {report.volume.map((day) => (
                    <div className="axr-chart-col" key={day.day} title={`${new Date(day.day).toLocaleDateString('pt-BR')}: ${day.received} recebidas, ${day.resolved} concluídas`}>
                      <span className="axr-bar axr-bar--in" style={{ height: `${(day.received / volumePeak) * 100}%` }} />
                      <span className="axr-bar axr-bar--out" style={{ height: `${(day.resolved / volumePeak) * 100}%` }} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="axr-empty-inline">Sem movimento registrado neste período.</p>
              )}
            </article>

            <article className="tk-panel">
              <header className="tk-panel-head"><h3>Solicitações mais frequentes</h3></header>
              {report.categories.length > 0 ? (
                <ul className="tk-bar-list">
                  {report.categories.map((entry, index) => (
                    <li key={entry.label} style={{ animationDelay: `${index * 45}ms` }}>
                      <div className="tk-bar-row tk-bar-row--static" title={`${entry.label}: ${entry.total}`}>
                        <span className="tk-bar-label">{entry.label}</span>
                        <span className="tk-bar-track" aria-hidden="true">
                          <span
                            className="tk-bar-fill tk-tone-administrativo"
                            style={{ width: `${(entry.total / report.categories[0].total) * 100}%` }}
                          />
                        </span>
                        <span className="tk-bar-value">{entry.total}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="axr-empty-inline">Nenhum assunto classificado no período.</p>
              )}
            </article>

            <article className="tk-panel">
              <header className="tk-panel-head"><h3>Setores que mais solicitaram</h3></header>
              {report.requesterSectors.length > 0 ? (
                <ul className="tk-bar-list">
                  {report.requesterSectors.map((entry, index) => (
                    <li key={entry.label} style={{ animationDelay: `${index * 45}ms` }}>
                      <div className="tk-bar-row tk-bar-row--static" title={`${entry.label}: ${entry.total}`}>
                        <span className="tk-bar-label">{entry.label}</span>
                        <span className="tk-bar-track" aria-hidden="true">
                          <span
                            className="tk-bar-fill tk-tone-neutral"
                            style={{ width: `${(entry.total / report.requesterSectors[0].total) * 100}%` }}
                          />
                        </span>
                        <span className="tk-bar-value">{entry.total}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="axr-empty-inline">Sem informação de setor solicitante.</p>
              )}
            </article>

            <article className="tk-panel">
              <header className="tk-panel-head"><h3>Situação das solicitações</h3></header>
              <div className="tk-stack" aria-hidden="true">
                {report.byStatus.map((entry) => (
                  <span
                    key={entry.status}
                    className={`tk-stack-seg axr-status-${entry.status}`}
                    style={{ flexGrow: entry.total }}
                    title={`${entry.label}: ${entry.total}`}
                  />
                ))}
              </div>
              <ul className="tk-legend">
                {report.byStatus.map((entry) => (
                  <li key={entry.status}>
                    <span className={`tk-dot axr-status-${entry.status}`} aria-hidden="true" />
                    {entry.label}
                    <strong>{entry.total}</strong>
                  </li>
                ))}
              </ul>
            </article>
          </section>

          {/* Exceções — não é uma segunda fila, são os casos que destoam. */}
          <section className="tk-panel axr-attention">
            <header className="tk-panel-head">
              <h3>Precisam de atenção</h3>
              <span>prioridade alta, sem responsável ou abertas há mais tempo</span>
            </header>

            {report.attention.length > 0 ? (
              <div className="axr-table-wrap">
                <table className="axr-table">
                  <thead>
                    <tr>
                      <th>Solicitação</th>
                      <th>Solicitante</th>
                      <th>Situação</th>
                      <th>Prioridade</th>
                      <th>Aberta há</th>
                      <th aria-label="Abrir" />
                    </tr>
                  </thead>
                  <tbody>
                    {report.attention.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <span className="axr-cell-title" title={item.title}>{item.title}</span>
                          {item.category && <span className="axr-cell-sub">{item.category}</span>}
                        </td>
                        <td>
                          <span className="axr-cell-title" title={item.requesterName}>{item.requesterName}</span>
                          <span className="axr-cell-sub">{item.requesterDepartment}</span>
                        </td>
                        <td><span className={`axr-pill axr-status-${item.status}`}>{item.statusLabel}</span></td>
                        <td>
                          <span className={`axr-pill axr-prio-${item.priority}`}>
                            {PRIORITY_LABEL[item.priority] ?? item.priority}
                          </span>
                        </td>
                        <td className="axr-num" title={new Date(item.createdAt).toLocaleString('pt-BR')}>
                          {item.openHours >= 24
                            ? `${Math.floor(item.openHours / 24)}d`
                            : `${item.openHours}h`}
                          {!item.assignedToName && <span className="axr-cell-sub">sem responsável</span>}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="axr-open"
                            onClick={() => navigate(`/admin/chamados/${item.id}`)}
                            aria-label={`Abrir solicitação ${item.title}`}
                          >
                            <i className="ti ti-arrow-up-right" aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="axr-empty-inline">
                Nenhuma solicitação exigindo atenção neste período.
              </p>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
