import '../styles/NextAction.css';

interface NextActionProps {
  status: string;
  department?: string;
  lastUpdate?: string;
  estimatedTime?: string;
  queueVisibility?: {
    state: 'waiting' | 'in_service';
    position: number | null;
    ahead: number;
    totalWaiting: number | null;
    priorityCanChangeOrder?: boolean;
    updatedAt: string;
  } | null;
}

const ActionIcon = ({ type }: { type: string }) => {
  const common = {
    width: 28,
    height: 28,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  if (type === 'working') return <svg {...common}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.3-3.3a6 6 0 0 1-7.7 7.7l-6.6 6.6a2.1 2.1 0 0 1-3-3l6.6-6.6A6 6 0 0 1 17 2.9z" /></svg>;
  if (type === 'success') return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></svg>;
  if (type === 'warning') return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v6" /><path d="M12 17h.01" /></svg>;
  return <svg {...common}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></svg>;
};

export default function NextAction({ status, department, lastUpdate, estimatedTime, queueVisibility }: NextActionProps) {
  const teamLabel =
    department === 'administrativo' ? 'equipe administrativa'
    : department === 'rh' ? 'equipe de RH'
    : 'equipe de TI';

  const getActionMessage = () => {
    switch (status) {
      case 'open':
        return {
          title: `Aguardando ${teamLabel}`,
          message: 'Seu chamado está na fila da equipe responsável.',
          type: 'info'
        };
      case 'in_progress':
        return {
          title: 'Em atendimento',
          message: `Um responsável da ${teamLabel} já está trabalhando na sua solicitação.`,
          type: 'working'
        };
      case 'waiting_user':
        return {
          title: 'Aguardando você',
          message: 'Precisamos de uma informação sua para continuar o atendimento.',
          type: 'warning'
        };
      case 'aguardando_aquisicao':
        return {
          title: 'Aguardando você',
          message: 'Precisamos de uma informação sua para continuar o atendimento.',
          type: 'warning'
        };
      case 'aguardando_terceiros':
        return {
          title: 'Aguardando você',
          message: 'Precisamos de uma informação sua para continuar o atendimento.',
          type: 'warning'
        };
      case 'aguardando_confirmacao':
        return {
          title: 'Confirme a resolução',
          message: 'Confirme se o problema foi resolvido para concluir o chamado. Sem resposta, ele será encerrado automaticamente.',
          type: 'warning'
        };
      case 'resolved':
        return {
          title: 'Finalizado',
          message: 'Se o problema persistir, você pode reabrir em até 3 dias.',
          type: 'success'
        };
      case 'closed':
        return {
          title: 'Concluído',
          message: 'Este chamado foi encerrado. Obrigado por usar nossa Central de Apoio!',
          type: 'success'
        };
      default:
        return {
          title: 'Processando',
          message: 'Estamos processando sua solicitação.',
          type: 'info'
        };
    }
  };

  const action = getActionMessage();

  return (
    <div className={`next-action next-action-${action.type}`}>
      <div className="action-icon"><ActionIcon type={action.type} /></div>
      <div className="action-content">
        <h3 className="action-title">{action.title}</h3>
        <p className="action-message">{action.message}</p>
        {queueVisibility?.state === 'waiting' && queueVisibility.position && (
          <section className="queue-visibility" aria-label="Sua posição estimada na fila" aria-live="polite">
            <div className="queue-visibility-metrics">
              <div>
                <span>Posição estimada</span>
                <strong>{queueVisibility.position}º</strong>
              </div>
              <div>
                <span>Na sua frente</span>
                <strong>{queueVisibility.ahead}</strong>
              </div>
              <div>
                <span>Nesta fila</span>
                <strong>{queueVisibility.totalWaiting ?? '—'}</strong>
              </div>
            </div>
            {queueVisibility.priorityCanChangeOrder && (
              <p>Referência por prioridade e horário de abertura. A equipe pode reorganizar a fila conforme o impacto.</p>
            )}
          </section>
        )}
        {queueVisibility?.state === 'in_service' && (
          <div className="queue-service-state" role="status">
            <strong>Atendimento iniciado</strong>
            <span>Você saiu da fila e a equipe já está atuando.</span>
          </div>
        )}
        {estimatedTime && (
          <div className="action-estimate">
            {estimatedTime}
          </div>
        )}
        {lastUpdate && status !== 'resolved' && status !== 'closed' && (
          <div className="action-update">
            Última atualização: {new Date(lastUpdate).toLocaleString('pt-BR')}
          </div>
        )}
      </div>
    </div>
  );
}
