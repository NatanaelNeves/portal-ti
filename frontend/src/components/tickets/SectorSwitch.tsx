import { SECTOR_PROFILES, type SectorKey } from './sectorProfiles';

interface Props {
  value: string;
  onChange: (department: string) => void;
  /** Contagem por setor, quando o panorama já carregou. */
  counts?: Record<string, number>;
  disabled?: boolean;
}

const ORDER: SectorKey[] = ['todos', 'ti', 'rh', 'administrativo'];

/**
 * Seletor de setor do administrador geral.
 *
 * Só é renderizado quando o backend informa `canSelectDepartment` — para os
 * papéis operacionais o setor é imposto no servidor, e mostrar um seletor
 * inerte sugeriria um poder que o usuário não tem.
 */
export default function SectorSwitch({ value, onChange, counts, disabled }: Props) {
  const active = value || 'todos';

  return (
    <div className="tk-sector-switch" role="tablist" aria-label="Setor">
      {ORDER.map((key) => {
        const profile = SECTOR_PROFILES[key];
        const isActive = active === key;
        const count = key === 'todos' ? undefined : counts?.[key];

        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={disabled}
            className={`tk-sector-tab ${isActive ? 'is-active' : ''}`}
            onClick={() => onChange(key === 'todos' ? '' : key)}
          >
            <i className={`ti ${profile.icon}`} aria-hidden="true" />
            <span>{profile.label}</span>
            {count !== undefined && <span className="tk-sector-count">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
