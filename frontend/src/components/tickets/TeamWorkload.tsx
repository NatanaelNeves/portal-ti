import type { TicketsOverview } from '../../hooks/useTicketsOverview';

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

interface Props {
  workload: TicketsOverview['workload'];
  onSelect?: (userId: string) => void;
  activeUserId?: string;
}

/**
 * Carga da equipe — quantos chamados em aberto cada responsável carrega.
 *
 * A barra é relativa a quem tem mais, não a um teto arbitrário: o que
 * interessa aqui é a comparação entre pessoas, para achar quem está
 * sobrecarregado. Clicar filtra a fila por aquele responsável.
 */
export default function TeamWorkload({ workload, onSelect, activeUserId }: Props) {
  if (workload.length === 0) return null;
  const peak = Math.max(...workload.map((member) => member.open), 1);

  return (
    <section className="tk-workload" aria-label="Carga da equipe">
      <header className="tk-workload-head">
        <h3>Carga da equipe</h3>
        <span>{workload.length} com fila ativa</span>
      </header>

      <ul className="tk-workload-list">
        {workload.map((member, index) => {
          const share = Math.round((member.open / peak) * 100);
          const isActive = activeUserId === member.userId;
          return (
            <li key={member.userId} style={{ animationDelay: `${index * 40}ms` }}>
              <button
                type="button"
                className={`tk-workload-row ${isActive ? 'is-active' : ''}`}
                onClick={() => onSelect?.(member.userId)}
                title={`${member.name} — ${member.open} em aberto`}
              >
                <span className="tk-avatar" aria-hidden="true">{initials(member.name)}</span>
                <span className="tk-workload-name">{member.name}</span>
                <span className="tk-workload-track" aria-hidden="true">
                  <span className="tk-workload-fill" style={{ width: `${share}%` }} />
                </span>
                <span className="tk-workload-count">{member.open}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
