interface Props {
  selectedCount: number;
  totalCount: number;
  busy: boolean;
  onToggleAll: () => void;
  onAssign: () => void;
  onClose: () => void;
  onCancel: () => void;
}

export default function TicketBulkActions({ selectedCount, totalCount, busy, onToggleAll, onAssign, onClose, onCancel }: Props) {
  if (selectedCount === 0) return null;
  const allSelected = selectedCount === totalCount;

  return (
    <div className="tk-bulk-toolbar" role="group" aria-label="Ações dos chamados selecionados" aria-busy={busy}>
      <div className="tk-bulk-selection" role="status" aria-live="polite" aria-atomic="true">
        <span className="tk-bulk-number">{selectedCount}</span>
        <span>{busy ? 'Aplicando alterações…' : selectedCount === 1 ? 'chamado selecionado' : 'chamados selecionados'}</span>
      </div>
      <div className="tk-bulk-actions">
        <button type="button" className="tk-bulk-button tk-bulk-button--secondary" onClick={onToggleAll} disabled={busy}>
          <i className={`ti ${allSelected ? 'ti-square' : 'ti-checkbox'}`} aria-hidden="true" />
          <span>{allSelected ? 'Desmarcar todos' : 'Selecionar todos'}</span>
        </button>
        <button type="button" className="tk-bulk-button tk-bulk-button--primary" onClick={onAssign} disabled={busy}>
          <i className="ti ti-user-check" aria-hidden="true" />
          <span>Assumir selecionados</span>
        </button>
        <button type="button" className="tk-bulk-button tk-bulk-button--close" onClick={onClose} disabled={busy}>
          <i className="ti ti-lock" aria-hidden="true" />
          <span>Fechar selecionados</span>
        </button>
        <button type="button" className="tk-bulk-button tk-bulk-button--cancel" onClick={onCancel} disabled={busy}>
          <i className="ti ti-x" aria-hidden="true" />
          <span>Cancelar</span>
        </button>
      </div>
    </div>
  );
}
