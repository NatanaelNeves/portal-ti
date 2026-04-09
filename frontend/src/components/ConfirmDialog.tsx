import React from 'react';
import '../styles/ConfirmDialog.css';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info';
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  type = 'danger'
}) => {
  if (!isOpen) return null;

  const getTypeConfig = () => {
    switch (type) {
      case 'danger':
        return {
          icon: '🗑️',
          iconBg: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
          iconBorder: '#fecaca',
          confirmBg: 'linear-gradient(135deg, #ef4444, #dc2626)',
          confirmHover: 'linear-gradient(135deg, #dc2626, #b91c1c)',
          confirmShadow: 'rgba(239, 68, 68, 0.3)'
        };
      case 'warning':
        return {
          icon: '⚠️',
          iconBg: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
          iconBorder: '#fde68a',
          confirmBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
          confirmHover: 'linear-gradient(135deg, #d97706, #b45309)',
          confirmShadow: 'rgba(245, 158, 11, 0.3)'
        };
      case 'info':
        return {
          icon: 'ℹ️',
          iconBg: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
          iconBorder: '#bfdbfe',
          confirmBg: 'linear-gradient(135deg, #3b82f6, #2563eb)',
          confirmHover: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
          confirmShadow: 'rgba(59, 130, 246, 0.3)'
        };
      default:
        return {
          icon: 'ℹ️',
          iconBg: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
          iconBorder: '#bfdbfe',
          confirmBg: 'linear-gradient(135deg, #3b82f6, #2563eb)',
          confirmHover: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
          confirmShadow: 'rgba(59, 130, 246, 0.3)'
        };
    }
  };

  const config = getTypeConfig();

  return (
    <div className="confirm-dialog-overlay" onClick={onCancel}>
      <div className="confirm-dialog-card" onClick={(e) => e.stopPropagation()}>
        <div 
          className="confirm-dialog-icon"
          style={{ 
            background: config.iconBg,
            border: `2px solid ${config.iconBorder}`
          }}
        >
          {config.icon}
        </div>

        <div className="confirm-dialog-content">
          <h3 className="confirm-dialog-title">{title}</h3>
          <p className="confirm-dialog-message">{message}</p>
        </div>

        <div className="confirm-dialog-actions">
          <button
            className="btn-confirm-cancel"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            className="btn-confirm-confirm"
            onClick={onConfirm}
            style={{
              background: config.confirmBg,
              boxShadow: `0 4px 12px ${config.confirmShadow}`
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.background = config.confirmHover;
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.background = config.confirmBg;
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
