interface ActionButtonProps {
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'warning' | 'success' | 'danger';
  title_attr?: string;
}

export default function ActionButton({
  icon,
  title,
  description,
  onClick,
  disabled = false,
  variant = 'primary',
  title_attr,
}: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title_attr}
      className={`action-button action-button-${variant}`}
    >
      {/* Icon */}
      <span className="action-button-icon" aria-hidden="true">
        {icon}
      </span>
      
      {/* Text Container */}
      <div className="action-button-text">
        <span className="action-button-title">
          {title}
        </span>
        <span className="action-button-description">
          {description}
        </span>
      </div>
    </button>
  );
}

