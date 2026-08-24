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

  // Espera externa nao e uma etapa do fluxo: o chamado continua EM
  // ATENDIMENTO, so que parado por algo fora da equipe. Sem este mapeamento
  // o findIndex devolvia -1, caia no indice 0 e o stepper dizia ao usuario
  // que o chamado tinha voltado para "Aberto".
  const PAUSED = ['aguardando_aquisicao', 'aguardando_terceiros'];
  const isPaused = PAUSED.includes(currentStatus);

  const positional = currentStatus === 'resolved'
    ? 'closed'
    : isPaused
      ? 'in_progress'
      : currentStatus;

  const currentIndex = (() => {
    const idx = statuses.findIndex(s => s.key === positional);
    return idx !== -1 ? idx : 0;
  })();

  return (
    <div className="status-timeline" role="list" aria-label="Progresso do chamado">
      {statuses.map((status, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent   = index === currentIndex;
        const stepState   = isCompleted ? 'completed' : isCurrent ? 'current' : 'pending';
        // Na etapa atual, se houver espera externa, o rotulo diz isso.
        const label = isCurrent && isPaused
          ? (currentStatus === 'aguardando_aquisicao' ? 'Aguardando aquisição' : 'Aguardando terceiros')
          : status.label;

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

            <span className="step-label">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
