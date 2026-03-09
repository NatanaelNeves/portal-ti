import ActionButton from './ActionButton';

interface QuickActionsCardProps {
  status: 'open' | 'in_progress' | 'waiting_user' | 'resolved' | 'closed';
  isSubmitting: boolean;
  onAssume: () => void;
  onWaitingUser: () => void;
  onResolve: () => void;
  onClose: () => void;
}

export default function QuickActionsCard({
  status,
  isSubmitting,
  onAssume,
  onWaitingUser,
  onResolve,
  onClose,
}: QuickActionsCardProps) {
  // Determinar se o chamado foi assumido
  const isAssumed = status !== 'open';

  return (
    <div className="quick-actions-card">
      {/* Header */}
      <h2 className="quick-actions-title">
        <span className="quick-actions-icon" aria-hidden="true">⚡</span>
        Ações Rápidas
      </h2>

      {/* Actions Grid */}
      <div className="quick-actions-grid">
        {/* Botão Assumir - Verde Primário */}
        <ActionButton
          icon="🎯"
          title="Assumir"
          description="Iniciar atendimento"
          onClick={onAssume}
          disabled={isSubmitting || status !== 'open'}
          variant="primary"
          title_attr={
            status === 'open'
              ? 'Assumir este chamado e iniciar atendimento'
              : 'Chamado já foi assumido'
          }
        />

        {/* Botão Aguardar Usuário - Amarelo/Aviso */}
        <ActionButton
          icon="⏳"
          title="Aguardar Usuário"
          description="Pendente de resposta"
          onClick={onWaitingUser}
          disabled={isSubmitting || !isAssumed || status === 'closed'}
          variant="warning"
          title_attr={
            !isAssumed
              ? 'Assuma o chamado primeiro para realizar esta ação'
              : 'Marcar como aguardando resposta do usuário'
          }
        />

        {/* Botão Resolver - Verde Sucesso */}
        <ActionButton
          icon="✅"
          title="Resolver"
          description="Marcar como resolvido"
          onClick={onResolve}
          disabled={isSubmitting || !isAssumed || status === 'closed'}
          variant="success"
          title_attr={
            !isAssumed
              ? 'Assuma o chamado primeiro para realizar esta ação'
              : 'Marcar como resolvido'
          }
        />

        {/* Botão Fechar - Vermelho Destruidor */}
        <ActionButton
          icon="🔒"
          title="Fechar"
          description="Encerrar definitivamente"
          onClick={onClose}
          disabled={isSubmitting}
          variant="danger"
          title_attr={
            isSubmitting
              ? 'Processando ação anterior...'
              : 'Fechar este chamado definitivamente. Esta ação não pode ser desfeita.'
          }
        />
      </div>
    </div>
  );
}
