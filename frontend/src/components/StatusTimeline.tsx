import '../styles/StatusTimeline.css';

interface StatusTimelineProps {
  currentStatus: string;
}

export default function StatusTimeline({ currentStatus }: StatusTimelineProps) {
  const statuses = [
    { key: 'open',                    label: 'Aberto' },
    { key: 'in_progress',             label: 'Em Atendimento' },
    { key: 'waiting_user',            label: 'Aguardando' },
    { key: 'aguardando_confirmacao',  label: 'Confirmação' },
    { key: 'closed',                  label: 'Concluído' },
  ];

  const resolvedAsClosed = currentStatus === 'resolved' ? 'closed' : currentStatus;

  const currentIndex = (() => {
    const idx = statuses.findIndex(s => s.key === resolvedAsClosed);
    return idx !== -1 ? idx : 0;
  })();

  return (
    <div className="status-timeline" role="list" aria-label="Progresso do chamado">
      {statuses.map((status, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent   = index === currentIndex;
        const stepState   = isCompleted ? 'completed' : isCurrent ? 'current' : 'pending';

        return (
          <div
            key={status.key}
            className={`timeline-step ${stepState}`}
            role="listitem"
            aria-current={isCurrent ? 'step' : undefined}
          >
            {/* Connector line to the right */}
            {index < statuses.length - 1 && (
              <div
                className={`step-connector ${isCompleted ? 'connector-done' : ''}`}
                aria-hidden="true"
              />
            )}

            {/* Circle indicator */}
            <div className="step-circle-wrap" aria-hidden="true">
              <div className="step-circle">
                {isCompleted ? (
                  /* Checkmark */
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <span className="step-number">{index + 1}</span>
                )}
              </div>
            </div>

            <span className="step-label">{status.label}</span>
          </div>
        );
      })}
    </div>
  );
}
