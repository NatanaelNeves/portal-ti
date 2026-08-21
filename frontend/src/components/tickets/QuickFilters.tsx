export interface QuickFilterState {
  assignment: 'all' | 'mine' | 'unassigned';
  priority: 'high' | 'medium' | 'low' | null;
  today: boolean;
  overdue: boolean;
}

interface Props {
  state: QuickFilterState;
  counts?: { mine?: number; unassigned?: number; urgent?: number; overdue?: number };
  onChange: (next: Partial<QuickFilterState>) => void;
  onClear: () => void;
  activeCount: number;
  /**
   * O auxiliar administrativo nao tem escolha de atribuicao: o servidor sempre
   * lhe entrega os chamados dele ou sem responsavel. Oferecer os chips seria
   * prometer um recorte que nao existe para esse papel.
   */
  showAssignmentChips?: boolean;
}

/**
 * Recortes rápidos da fila.
 *
 * São as perguntas que quem tria faz dezenas de vezes por dia — "o que é
 * meu?", "o que ninguém pegou?", "o que estourou?" — e que hoje exigiam
 * abrir o painel de filtros avançados. Cada chip é um estado independente,
 * exceto os de atribuição, que são mutuamente exclusivos porque a fila só
 * tem um dono por vez.
 */
export default function QuickFilters({
  state,
  counts,
  onChange,
  onClear,
  activeCount,
  showAssignmentChips = true,
}: Props) {
  const chips = [
    {
      key: 'all',
      label: 'Todos',
      icon: 'ti-layout-grid',
      active: state.assignment === 'all' && !state.priority && !state.today && !state.overdue,
      onClick: onClear,
    },
    {
      key: 'mine',
      label: 'Meus chamados',
      icon: 'ti-user-check',
      count: counts?.mine,
      active: state.assignment === 'mine',
      onClick: () => onChange({ assignment: state.assignment === 'mine' ? 'all' : 'mine' }),
    },
    {
      key: 'unassigned',
      label: 'Sem responsável',
      icon: 'ti-user-question',
      count: counts?.unassigned,
      active: state.assignment === 'unassigned',
      onClick: () =>
        onChange({ assignment: state.assignment === 'unassigned' ? 'all' : 'unassigned' }),
    },
    {
      key: 'urgent',
      label: 'Urgentes',
      icon: 'ti-flame',
      count: counts?.urgent,
      active: state.priority === 'high',
      onClick: () => onChange({ priority: state.priority === 'high' ? null : 'high' }),
    },
    {
      key: 'today',
      label: 'Hoje',
      icon: 'ti-calendar-event',
      active: state.today,
      onClick: () => onChange({ today: !state.today }),
    },
    {
      key: 'overdue',
      label: 'Atrasados',
      icon: 'ti-alarm',
      count: counts?.overdue,
      active: state.overdue,
      onClick: () => onChange({ overdue: !state.overdue }),
    },
  ];

  const visible = showAssignmentChips
    ? chips
    : chips.filter((chip) => chip.key !== 'mine' && chip.key !== 'unassigned');

  return (
    <div className="tk-quick" role="group" aria-label="Recortes rápidos">
      {visible.map((chip) => (
        <button
          key={chip.key}
          type="button"
          className={`tk-chip ${chip.active ? 'is-active' : ''}`}
          onClick={chip.onClick}
          aria-pressed={chip.active}
        >
          <i className={`ti ${chip.icon}`} aria-hidden="true" />
          {chip.label}
          {chip.count !== undefined && chip.count > 0 && (
            <span className="tk-chip-count">{chip.count}</span>
          )}
        </button>
      ))}

      {activeCount > 0 && (
        <button type="button" className="tk-chip-clear" onClick={onClear}>
          <i className="ti ti-x" aria-hidden="true" />
          Limpar filtros
        </button>
      )}
    </div>
  );
}
