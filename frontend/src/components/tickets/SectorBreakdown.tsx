import type { TicketsOverview } from '../../hooks/useTicketsOverview';

interface Props {
  overview: TicketsOverview;
  onPickDepartment?: (department: string) => void;
}

const STATUS_SEGMENTS = [
  { key: 'open', label: 'Novo', tone: 'info' },
  { key: 'inProgress', label: 'Em atendimento', tone: 'analysis' },
  { key: 'waitingUser', label: 'Aguardando', tone: 'warning' },
  { key: 'awaitingConfirmation', label: 'Confirmação', tone: 'neutral' },
] as const;

const PRIORITY_ROWS = [
  { key: 'urgent', label: 'Críticos', tone: 'danger' },
  { key: 'high', label: 'Altos', tone: 'warning' },
  { key: 'medium', label: 'Médios', tone: 'info' },
  { key: 'low', label: 'Baixos', tone: 'positive' },
] as const;

/**
 * Panorama de composição da fila: por setor, por status e por prioridade.
 *
 * São três leituras da MESMA fila em aberto, então elas somam o mesmo total —
 * o que permite comparar as três sem que o usuário precise reconciliar
 * números diferentes. A barra de status é segmentada porque a pergunta ali é
 * de proporção; prioridade vira lista porque a pergunta é de contagem.
 */
export default function SectorBreakdown({ overview, onPickDepartment }: Props) {
  const openTotal =
    overview.status.open +
    overview.status.inProgress +
    overview.status.waitingUser +
    overview.status.awaitingConfirmation;

  if (openTotal === 0) return null;

  const departmentPeak = Math.max(...overview.byDepartment.map((d) => d.open), 1);
  const categoryPeak = Math.max(...overview.topCategories.map((c) => c.total), 1);
  const priorityPeak = Math.max(
    overview.priority.urgent,
    overview.priority.high,
    overview.priority.medium,
    overview.priority.low,
    1,
  );

  return (
    <section className="tk-breakdown" aria-label="Composição da fila">
      {overview.byDepartment.length > 1 && (
        <article className="tk-panel">
          <header className="tk-panel-head">
            <h3>Chamados por setor</h3>
            <span>{openTotal} em aberto</span>
          </header>
          <ul className="tk-bar-list">
            {overview.byDepartment.map((dept, index) => (
              <li key={dept.department} style={{ animationDelay: `${index * 50}ms` }}>
                <button
                  type="button"
                  className="tk-bar-row"
                  onClick={() => onPickDepartment?.(dept.department)}
                  title={`Ver apenas ${dept.label}`}
                >
                  <span className="tk-bar-label">{dept.label}</span>
                  <span className="tk-bar-track" aria-hidden="true">
                    <span
                      className={`tk-bar-fill tk-tone-${dept.department}`}
                      style={{ width: `${Math.round((dept.open / departmentPeak) * 100)}%` }}
                    />
                  </span>
                  <span className="tk-bar-value">{dept.open}</span>
                </button>
              </li>
            ))}
          </ul>
        </article>
      )}

      <article className="tk-panel">
        <header className="tk-panel-head">
          <h3>Distribuição por status</h3>
        </header>
        <div className="tk-stack" aria-hidden="true">
          {STATUS_SEGMENTS.map((segment) => {
            const value = overview.status[segment.key];
            if (value === 0) return null;
            return (
              <span
                key={segment.key}
                className={`tk-stack-seg tk-tone-${segment.tone}`}
                style={{ flexGrow: value }}
                title={`${segment.label}: ${value}`}
              />
            );
          })}
        </div>
        <ul className="tk-legend">
          {STATUS_SEGMENTS.map((segment) => {
            const value = overview.status[segment.key];
            if (value === 0) return null;
            return (
              <li key={segment.key}>
                <span className={`tk-dot tk-tone-${segment.tone}`} aria-hidden="true" />
                {segment.label}
                <strong>{value}</strong>
              </li>
            );
          })}
        </ul>
      </article>

      {/* Assuntos recorrentes: o que muda de verdade entre TI, RH e
          Administrativo. Sai de `category`, que e texto livre — por isso
          mostramos o que o setor usa, e nao uma lista fixa de rotulos. */}
      {overview.topCategories.length > 0 && (
        <article className="tk-panel">
          <header className="tk-panel-head">
            <h3>Assuntos recorrentes</h3>
            <span>na fila em aberto</span>
          </header>
          <ul className="tk-bar-list">
            {overview.topCategories.map((entry, index) => (
              <li key={entry.category} style={{ animationDelay: `${index * 50}ms` }}>
                <div className="tk-bar-row tk-bar-row--static" title={`${entry.category}: ${entry.total} em aberto`}>
                  <span className="tk-bar-label">{entry.category}</span>
                  <span className="tk-bar-track" aria-hidden="true">
                    <span
                      className="tk-bar-fill tk-tone-neutral"
                      style={{ width: `${Math.round((entry.total / categoryPeak) * 100)}%` }}
                    />
                  </span>
                  <span className="tk-bar-value">{entry.total}</span>
                </div>
              </li>
            ))}
          </ul>
        </article>
      )}

      <article className="tk-panel">
        <header className="tk-panel-head">
          <h3>Prioridades</h3>
        </header>
        <ul className="tk-bar-list">
          {PRIORITY_ROWS.map((row, index) => (
            <li key={row.key} style={{ animationDelay: `${index * 50}ms` }}>
              <div className="tk-bar-row tk-bar-row--static">
                <span className="tk-bar-label">{row.label}</span>
                <span className="tk-bar-track" aria-hidden="true">
                  <span
                    className={`tk-bar-fill tk-tone-${row.tone}`}
                    style={{ width: `${Math.round((overview.priority[row.key] / priorityPeak) * 100)}%` }}
                  />
                </span>
                <span className="tk-bar-value">{overview.priority[row.key]}</span>
              </div>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}
