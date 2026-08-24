import { useState } from 'react';
import ActionButton from './ActionButton';
import { isSlaPaused } from './tickets/ticketPermissions';

interface QuickActionsCardProps {
  status: 'open' | 'in_progress' | 'waiting_user' | 'aguardando_confirmacao'
    | 'aguardando_aquisicao' | 'aguardando_terceiros' | 'resolved' | 'closed';
  isSubmitting: boolean;
  onAssume: () => void;
  onWaitingUser: () => void;
  onResolve: () => void;
  onClose: () => void;
  onResume: () => void;
  /**
   * Espera por dependencia externa. Recebe o motivo, que vai para a timeline.
   * Ausente quando o perfil ou o setor do chamado nao permitem — a mesma regra
   * que o backend aplica em `PATCH /tickets/:id`.
   */
  onExternalWait?: (status: 'aguardando_aquisicao' | 'aguardando_terceiros', reason: string) => void;
}

export default function QuickActionsCard({
  status,
  isSubmitting,
  onAssume,
  onWaitingUser,
  onResolve,
  onClose,
  onResume,
  onExternalWait,
}: QuickActionsCardProps) {
  // Qual espera esta sendo justificada. Uma linha, no lugar do botao — pedir
  // o motivo num modal para 40 caracteres seria burocracia.
  const [waitFor, setWaitFor] = useState<'aguardando_aquisicao' | 'aguardando_terceiros' | null>(null);
  const [reason, setReason] = useState('');
  // Determinar se o chamado foi assumido
  const isAssumed = status !== 'open';
  // Espera externa tambem e um estado do qual se "retoma" o atendimento.
  const canResume = ['waiting_user', 'resolved', 'aguardando_confirmacao',
    'aguardando_aquisicao', 'aguardando_terceiros'].includes(status);
  const paused = isSlaPaused(status);
  // So faz sentido pausar um chamado que ja esta em atendimento.
  const canWaitExternally = Boolean(onExternalWait) && isAssumed && status !== 'closed' && !paused;

  const submitWait = () => {
    if (!waitFor || !onExternalWait) return;
    onExternalWait(waitFor, reason.trim());
    setWaitFor(null);
    setReason('');
  };

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

        {/* Botão Retomar Atendimento - Azul */}
        <ActionButton
          icon="🔄"
          title={paused ? 'Retomar atendimento' : 'Retomar'}
          description={paused ? 'Encerra a espera e volta a contar o SLA' : 'Voltar ao atendimento'}
          onClick={onResume}
          disabled={isSubmitting || !canResume}
          variant="primary"
          title_attr={
            canResume
              ? 'Retomar o atendimento deste chamado'
              : 'Disponível quando aguardando usuário, em espera externa ou resolvido'
          }
        />

        {/* Esperas por dependência externa — só para quem opera o fluxo de TI. */}
        {onExternalWait && (
          <>
            <ActionButton
              icon="🛒"
              title="Aguardar aquisição"
              description="Compra, orçamento ou material"
              onClick={() => { setWaitFor('aguardando_aquisicao'); setReason(''); }}
              disabled={isSubmitting || !canWaitExternally}
              variant="warning"
              title_attr={
                paused
                  ? 'Este chamado já está em espera'
                  : canWaitExternally
                    ? 'Pausar o SLA enquanto se aguarda uma compra ou material'
                    : 'Assuma o chamado primeiro para realizar esta ação'
              }
            />

            <ActionButton
              icon="🏢"
              title="Aguardar terceiros"
              description="Assistência, fornecedor ou externo"
              onClick={() => { setWaitFor('aguardando_terceiros'); setReason(''); }}
              disabled={isSubmitting || !canWaitExternally}
              variant="warning"
              title_attr={
                paused
                  ? 'Este chamado já está em espera'
                  : canWaitExternally
                    ? 'Pausar o SLA enquanto se aguarda um terceiro'
                    : 'Assuma o chamado primeiro para realizar esta ação'
              }
            />
          </>
        )}

        {waitFor && (
          <form
            className="qa-wait-form"
            onSubmit={(event) => { event.preventDefault(); submitWait(); }}
          >
            <label htmlFor="qa-wait-reason">
              {waitFor === 'aguardando_aquisicao'
                ? 'O que precisa ser adquirido?'
                : 'O que está sendo aguardado?'}
            </label>
            <input
              id="qa-wait-reason"
              type="text"
              autoFocus
              maxLength={280}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={waitFor === 'aguardando_aquisicao'
                ? 'Ex.: compra de fonte 500W'
                : 'Ex.: enviado à assistência autorizada'}
            />
            <p className="qa-wait-hint">O SLA fica pausado enquanto o chamado estiver nesse estado.</p>
            <div className="qa-wait-actions">
              <button type="button" onClick={() => setWaitFor(null)}>Cancelar</button>
              <button type="submit" disabled={isSubmitting}>Colocar em espera</button>
            </div>
          </form>
        )}

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
          disabled={isSubmitting || !['resolved', 'aguardando_confirmacao'].includes(status)}
          variant="danger"
          title_attr={
            isSubmitting
              ? 'Processando ação anterior...'
              : ['resolved', 'aguardando_confirmacao'].includes(status)
                ? 'Fechar este chamado definitivamente. Esta ação não pode ser desfeita.'
                : 'Resolva o chamado primeiro para poder fechá-lo'
          }
        />
      </div>
    </div>
  );
}
