import '../styles/StatusTimeline.css';

interface StatusTimelineProps {
  currentStatus: string;
}

export default function StatusTimeline({ currentStatus }: StatusTimelineProps) {
  const statuses = [
    { key: 'open', label: 'Aberto', icon: '📝' },
    { key: 'in_progress', label: 'Em Atendimento', icon: '🔧' },
    { key: 'waiting_user', label: 'Aguardando Você', icon: '⏳' },
    { key: 'aguardando_confirmacao', label: 'Aguardando Confirmação', icon: '🔎' },
    { key: 'closed', label: 'Concluído', icon: '✅' },
  ];

  const getCurrentIndex = () => {
    const index = statuses.findIndex(s => s.key === currentStatus);
    return index !== -1 ? index : 0;
  };

  const currentIndex = getCurrentIndex();

  return (
    <div className="status-timeline">
      {statuses.map((status, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <div 
            key={status.key} 
            className={`timeline-step ${
              isCompleted ? 'completed' : 
              isCurrent ? 'current' : 
              'pending'
            }`}
          >
            <div className="step-icon">
              <span>{status.icon}</span>
            </div>
            <div className="step-label">{status.label}</div>
            {index < statuses.length - 1 && (
              <div className="step-connector"></div>
            )}
          </div>
        );
      })}
    </div>
  );
}
