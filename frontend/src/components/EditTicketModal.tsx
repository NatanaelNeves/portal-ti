import React, { useState } from 'react';
import '../styles/EditTicketModal.css';
import { useToastStore } from '../stores/toastStore';

interface EditTicketModalProps {
  isOpen: boolean;
  ticketId: string;
  currentTitle: string;
  currentDescription: string;
  onClose: () => void;
  onSuccess: (updatedData: { title: string; description: string }) => void;
}

const EditTicketModal: React.FC<EditTicketModalProps> = ({
  isOpen,
  ticketId,
  currentTitle,
  currentDescription,
  onClose,
  onSuccess
}) => {
  const [title, setTitle] = useState(currentTitle);
  const [description, setDescription] = useState(currentDescription);
  const [submitting, setSubmitting] = useState(false);
  
  const { success, error } = useToastStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      error('O título não pode estar vazio');
      return;
    }

    if (!description.trim()) {
      error('A descrição não pode estar vazia');
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem('internal_token') || localStorage.getItem('user_token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };

      if (token?.startsWith('Bearer')) {
        headers['Authorization'] = token;
      } else if (token) {
        headers['x-user-token'] = token;
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/tickets/${ticketId}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim()
          })
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao atualizar chamado');
      }

      success('Chamado atualizado com sucesso!');
      onSuccess({ title, description });
      onClose();
    } catch (err: any) {
      error(err.message ||'Erro ao atualizar chamado');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="edit-ticket-modal-overlay" onClick={onClose}>
      <div className="edit-ticket-modal" onClick={(e) => e.stopPropagation()}>
        <div className="edit-ticket-modal-header">
          <h3>✏️ Editar Chamado</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <form className="edit-ticket-modal-body" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Título *</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Computador não liga"
              disabled={submitting}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Descrição *</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o problema em detalhes..."
              rows={6}
              disabled={submitting}
              required
            />
          </div>

          <div className="edit-ticket-modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Salvando...' : '💾 Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTicketModal;
