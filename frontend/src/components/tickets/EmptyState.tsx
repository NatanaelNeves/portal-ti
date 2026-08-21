interface Props {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'calm' | 'filtered';
}

/**
 * Estado vazio da Central.
 *
 * Duas situações que parecem iguais e não são: a fila acabou (bom, e vale
 * dizer isso) ou os filtros não acharam nada (frustrante, e o que a pessoa
 * precisa é do caminho de volta). O tom e a ação mudam conforme o caso.
 */
export default function EmptyState({
  icon = 'ti-inbox-off',
  title,
  description,
  actionLabel,
  onAction,
  tone = 'calm',
}: Props) {
  return (
    <div className={`tk-empty tk-empty--${tone}`} role="status">
      <span className="tk-empty-mark" aria-hidden="true">
        <i className={`ti ${icon}`} />
      </span>
      <p className="tk-empty-title">{title}</p>
      {description && <p className="tk-empty-text">{description}</p>}
      {actionLabel && onAction && (
        <button type="button" className="tk-empty-action" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
