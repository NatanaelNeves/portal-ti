import '../styles/StatusProgressBar.css';

interface StatusProgressBarProps {
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
}

const statusSteps = [
  { key: 'open', label: 'Recebido', icon: '📥' },
  { key: 'in_progress', label: 'Em Análise', icon: '🔍' },
  { key: 'resolved', label: 'Resolvendo', icon: '⚙️' },
  { key: 'closed', label: 'Concluído', icon: '✅' }
];

export default function StatusProgressBar({ status }: StatusProgressBarProps) {
  const currentIndex = statusSteps.findIndex(step => step.key === status);

  return (
    <div className="status-progress-bar">
      {statusSteps.map((step, index) => (
        <div 
          key={step.key} 
          className={`progress-step ${index <= currentIndex ? 'active' : ''} ${index === currentIndex ? 'current' : ''}`}
        >
          <div className="step-icon">{step.icon}</div>
          <div className="step-label">{step.label}</div>
          {index < statusSteps.length - 1 && (
            <div className={`step-connector ${index < currentIndex ? 'active' : ''}`}></div>
          )}
        </div>
      ))}
    </div>
  );
}
