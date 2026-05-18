import { ReactNode } from 'react';
import '../styles/ActionButtonGroup.css';

export interface ActionBtn {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  title?: string;
}

interface Props {
  actions: ActionBtn[];
}

export default function ActionButtonGroup({ actions }: Props) {
  return (
    <div className="abg-wrap">
      {actions.map((a, i) => (
        <button
          key={i}
          className={`abg-btn abg-${a.variant ?? 'default'}`}
          onClick={a.onClick}
          title={a.title ?? a.label}
          aria-label={a.label}
        >
          {a.icon}
        </button>
      ))}
    </div>
  );
}
