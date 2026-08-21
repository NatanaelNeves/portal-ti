export interface HistoryEvent {
  id: string;
  action: string;
  changed_by_name?: string | null;
  changed_by_type?: string | null;
  old_value?: string | null;
  new_value?: string | null;
  old_value_name?: string | null;
  new_value_name?: string | null;
  metadata?: Record<string, any> | null;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  open: 'Aberto',
  in_progress: 'Em atendimento',
  waiting_user: 'Aguardando usuário',
  aguardando_confirmacao: 'Aguardando confirmação',
  resolved: 'Resolvido',
  closed: 'Fechado',
};

const PRIORITY_LABEL: Record<string, string> = {
  urgent: 'Urgente',
  critical: 'Crítica',
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

interface Rendered {
  icon: string;
  tone: 'neutral' | 'info' | 'positive' | 'warning' | 'danger';
  text: string;
}

/**
 * Traduz um evento cru do histórico para uma linha legível.
 *
 * Só descreve o que a tabela `ticket_history` de fato guarda. Ações que o
 * backend nunca registrou não aparecem inventadas aqui — se chegar um
 * `action` desconhecido, ele é mostrado como está, o que é honesto e ainda
 * ajuda a diagnosticar.
 */
function describe(event: HistoryEvent): Rendered {
  const who = event.changed_by_name || 'Sistema';
  const from = event.old_value ? STATUS_LABEL[event.old_value] ?? event.old_value : null;
  const to = event.new_value ? STATUS_LABEL[event.new_value] ?? event.new_value : null;

  switch (event.action) {
    case 'created':
      return { icon: 'ti-circle-plus', tone: 'info', text: 'Chamado aberto' };

    case 'status_changed':
      return {
        icon: 'ti-arrow-right-circle',
        tone: to === 'Resolvido' || to === 'Fechado' ? 'positive' : 'neutral',
        text: from ? `Status: ${from} → ${to}` : `Status alterado para ${to}`,
      };

    case 'assigned':
      return {
        icon: 'ti-user-check',
        tone: 'info',
        text: `Atribuído a ${event.new_value_name || 'um responsável'}`,
      };

    case 'unassigned':
      return {
        icon: 'ti-user-off',
        tone: 'warning',
        text: event.old_value_name
          ? `Responsável removido (${event.old_value_name})`
          : 'Responsável removido',
      };

    case 'priority_changed': {
      const before = event.old_value ? PRIORITY_LABEL[event.old_value] ?? event.old_value : null;
      const after = event.new_value ? PRIORITY_LABEL[event.new_value] ?? event.new_value : null;
      return {
        icon: 'ti-flag',
        tone: 'warning',
        text: before ? `Prioridade: ${before} → ${after}` : `Prioridade definida como ${after}`,
      };
    }

    case 'message_added':
      return { icon: 'ti-message-2', tone: 'neutral', text: 'Mensagem adicionada' };

    case 'confirmed_by_requester':
      return { icon: 'ti-checks', tone: 'positive', text: 'Solicitante confirmou a resolução' };

    case 'reopened_by_requester':
      return { icon: 'ti-refresh-alert', tone: 'danger', text: 'Reaberto pelo solicitante' };

    case 'rating_submitted':
      return {
        icon: 'ti-star',
        tone: 'positive',
        text: event.new_value ? `Avaliação recebida: ${event.new_value}` : 'Avaliação recebida',
      };

    case 'manual_closed_by_staff':
      return { icon: 'ti-lock', tone: 'neutral', text: 'Fechado manualmente pela equipe' };

    case 'auto_close_warning_sent':
      return { icon: 'ti-bell', tone: 'warning', text: 'Aviso de fechamento automático enviado' };

    case 'auto_closed_after_confirmation_timeout':
      return { icon: 'ti-clock-off', tone: 'neutral', text: 'Fechado automaticamente por falta de resposta' };

    default:
      return { icon: 'ti-point', tone: 'neutral', text: `${who}: ${event.action}` };
  }
}

const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

const dayLabel = (iso: string) => {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Hoje';
  if (date.toDateString() === yesterday.toDateString()) return 'Ontem';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
};

interface Props {
  events: HistoryEvent[];
  loading?: boolean;
}

export default function TicketTimeline({ events, loading }: Props) {
  if (loading) {
    return (
      <ol className="tk-tl" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <li className="tk-tl-item" key={i}>
            <span className="tk-tl-mark tk-tl-mark--sk" />
            <div className="tk-tl-body">
              <span className="tk-sk" style={{ width: '46%', height: 10, display: 'block' }} />
              <span className="tk-sk" style={{ width: '28%', height: 8, display: 'block', marginTop: 6 }} />
            </div>
          </li>
        ))}
      </ol>
    );
  }

  if (events.length === 0) {
    return <p className="tk-tl-empty">Nenhum evento registrado para este chamado ainda.</p>;
  }

  // O backend devolve do mais recente para o mais antigo; a leitura de uma
  // história funciona no sentido contrário.
  const ordered = [...events].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  let lastDay = '';

  return (
    <ol className="tk-tl">
      {ordered.map((event, index) => {
        const rendered = describe(event);
        const day = dayLabel(event.created_at);
        const showDay = day !== lastDay;
        lastDay = day;

        return (
          <li
            className="tk-tl-item"
            key={event.id || `${event.action}-${index}`}
            style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
          >
            {showDay && <span className="tk-tl-day">{day}</span>}
            <span className={`tk-tl-mark tk-tl-mark--${rendered.tone}`} aria-hidden="true">
              <i className={`ti ${rendered.icon}`} />
            </span>
            <div className="tk-tl-body">
              <p className="tk-tl-text">{rendered.text}</p>
              <p className="tk-tl-meta">
                <time
                  dateTime={event.created_at}
                  title={new Date(event.created_at).toLocaleString('pt-BR')}
                >
                  {clock(event.created_at)}
                </time>
                {event.changed_by_name && event.changed_by_name !== 'Sistema' && (
                  <> · {event.changed_by_name}</>
                )}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export { describe as describeHistoryEvent };
