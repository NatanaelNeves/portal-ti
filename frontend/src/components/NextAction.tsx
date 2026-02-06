import '../styles/NextAction.css';

interface NextActionProps {
  status: string;
  lastUpdate?: string;
  estimatedTime?: string;
}

export default function NextAction({ status, lastUpdate, estimatedTime }: NextActionProps) {
  const getActionMessage = () => {
    switch (status) {
      case 'open':
        return {
          icon: '🔔',
          title: 'Aguardando equipe de TI',
          message: 'Seu chamado já está na fila e será atendido em breve.',
          type: 'info'
        };
      case 'in_progress':
        return {
          icon: '🔧',
          title: 'Em atendimento',
          message: 'Um técnico já está trabalhando na sua solicitação.',
          type: 'working'
        };
      case 'waiting_user':
        return {
          icon: '⏳',
          title: 'Aguardando você',
          message: 'Precisamos de uma informação sua para continuar o atendimento.',
          type: 'warning'
        };
      case 'resolved':
        return {
          icon: '✅',
          title: 'Finalizado',
          message: 'Se o problema persistir, você pode reabrir em até 3 dias.',
          type: 'success'
        };
      case 'closed':
        return {
          icon: '🔒',
          title: 'Concluído',
          message: 'Este chamado foi encerrado. Obrigado por usar nossa Central de Apoio!',
          type: 'success'
        };
      default:
        return {
          icon: '📋',
          title: 'Processando',
          message: 'Estamos processando sua solicitação.',
          type: 'info'
        };
    }
  };

  const action = getActionMessage();

  return (
    <div className={`next-action next-action-${action.type}`}>
      <div className="action-icon">{action.icon}</div>
      <div className="action-content">
        <h3 className="action-title">{action.title}</h3>
        <p className="action-message">{action.message}</p>
        {estimatedTime && (
          <div className="action-estimate">
            ⏱️ Prazo estimado: {estimatedTime}
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
