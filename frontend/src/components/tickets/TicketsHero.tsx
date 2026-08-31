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
  hasUpdates?: boolean;
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
  hasUpdates,
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
        <div className="tk-heading-line"><h1 className="tk-hero-title">Central de Chamados</h1><span className="tk-hero-scope"><i className={`ti ${profile.icon}`} aria-hidden="true" />{scopeLabel}</span></div>
        <p className="tk-hero-tagline">Mais clareza para cuidar de cada solicitação.</p>
      </div>
      <button type="button" className="tk-btn tk-btn--primary tk-new-ticket" onClick={onNewTicket}><i className="ti ti-plus" aria-hidden="true" />Novo chamado</button>
      <div className="tk-hero-tools">
        <div className="tk-search">
          <i className="ti ti-search" aria-hidden="true" />
          <input
            ref={searchRef}
            type="search"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Encontre um chamado por assunto, pessoa ou descrição..."
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
            aria-controls="ticket-advanced-filters"
          >
            <i className="ti ti-adjustments-horizontal" aria-hidden="true" />
            Filtros
            {activeFilterCount > 0 && <span className="tk-btn-count">{activeFilterCount}</span>}
          </button>

          <button
            type="button"
            className={`tk-btn tk-btn--ghost ${refreshing ? 'is-spinning' : ''} ${hasUpdates ? 'tk-refresh-pending' : ''}`}
            onClick={onRefresh}
            disabled={refreshing}
            title="Atualizar fila"
            aria-label={hasUpdates ? 'Aplicar atualizações à fila' : 'Atualizar fila'}
          >
            <i className="ti ti-refresh" aria-hidden="true" />
            <span>{refreshing ? 'Atualizando' : hasUpdates ? 'Ver novidades' : 'Atualizar'}</span>
          </button>
        </div>
      </div>
      <div className="tk-sync-status" role="status" aria-live="polite">
        <i className={`ti ${hasUpdates ? 'ti-bell-ringing' : 'ti-circle-check'}`} aria-hidden="true" />
        <span>{hasUpdates ? 'Há novidades. Atualize quando estiver pronto; sua fila permanece no lugar.' : lastUpdate ? `Fila atualizada às ${formatClock(lastUpdate)}. Novidades chegam sem interromper sua leitura.` : 'Preparando sua fila de atendimento...'}</span>
      </div>
    </header>
  );
}
