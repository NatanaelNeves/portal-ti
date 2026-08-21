import { useEffect, useRef } from 'react';
import type { SectorProfile } from './sectorProfiles';

interface Props {
  profile: SectorProfile;
  scopeLabel: string;
  lastUpdate: Date | null;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  onNewTicket: () => void;
  onToggleFilters: () => void;
  filtersOpen: boolean;
  activeFilterCount: number;
  refreshing?: boolean;
}

const formatClock = (date: Date) =>
  date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

/**
 * Cabeçalho da Central: quem sou, o que estou vendo, e as quatro coisas que
 * faço aqui — buscar, filtrar, atualizar, abrir.
 *
 * A busca funciona como command bar: Ctrl+K (ou ⌘K) foca de qualquer lugar da
 * página, Esc devolve o foco. É o atalho que quem passa o dia na fila usa,
 * e ele não compete com nenhum atalho do navegador.
 */
export default function TicketsHero({
  profile,
  scopeLabel,
  lastUpdate,
  searchValue,
  onSearchChange,
  onRefresh,
  onNewTicket,
  onToggleFilters,
  filtersOpen,
  activeFilterCount,
  refreshing,
}: Props) {
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
      if (event.key === 'Escape' && document.activeElement === searchRef.current) {
        searchRef.current?.blur();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header className="tk-hero">
      <div className="tk-hero-context">
        <span className="tk-hero-scope">
          <i className={`ti ${profile.icon}`} aria-hidden="true" />
          {scopeLabel}
        </span>
        <h1 className="tk-hero-title">Central de Chamados</h1>
        <p className="tk-hero-tagline">{profile.tagline}</p>
        {lastUpdate && (
          <span className="tk-hero-pulse" title={lastUpdate.toLocaleString('pt-BR')}>
            <span className="tk-pulse-dot" aria-hidden="true" />
            Atualizado às {formatClock(lastUpdate)}
          </span>
        )}
      </div>

      <div className="tk-hero-tools">
        <div className="tk-search">
          <i className="ti ti-search" aria-hidden="true" />
          <input
            ref={searchRef}
            type="search"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar por título, solicitante ou descrição"
            aria-label="Buscar chamados"
          />
          {searchValue ? (
            <button
              type="button"
              className="tk-search-clear"
              onClick={() => onSearchChange('')}
              aria-label="Limpar busca"
            >
              <i className="ti ti-x" aria-hidden="true" />
            </button>
          ) : (
            <kbd className="tk-search-kbd" aria-hidden="true">Ctrl K</kbd>
          )}
        </div>

        <div className="tk-hero-actions">
          <button
            type="button"
            className={`tk-btn tk-btn--ghost ${filtersOpen ? 'is-on' : ''}`}
            onClick={onToggleFilters}
            aria-expanded={filtersOpen}
          >
            <i className="ti ti-adjustments-horizontal" aria-hidden="true" />
            Filtros
            {activeFilterCount > 0 && <span className="tk-btn-count">{activeFilterCount}</span>}
          </button>

          <button
            type="button"
            className={`tk-btn tk-btn--ghost tk-btn--icon ${refreshing ? 'is-spinning' : ''}`}
            onClick={onRefresh}
            title="Atualizar fila"
            aria-label="Atualizar fila"
          >
            <i className="ti ti-refresh" aria-hidden="true" />
          </button>

          <button type="button" className="tk-btn tk-btn--primary" onClick={onNewTicket}>
            <i className="ti ti-plus" aria-hidden="true" />
            Novo chamado
          </button>
        </div>
      </div>
    </header>
  );
}
