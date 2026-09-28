import { initialsOf, isUrgent, isWaitingLong, rhCategory, rhStatus, timeAgo } from './rhLabels';

export interface RhTicket {
  id: string;
  title: string;
  status: string;
  priority: string;
  category?: string;
  created_at: string;
  updated_at?: string;
  assigned_to?: string | null;
  assigned_to_name?: string | null;
  requester_name?: string;
  requester_department?: string;
  requester_unit?: string;
  message_count?: number | string;
}

interface Props {
  ticket: RhTicket;
  currentUserId: string;
  onOpen: (ticket: RhTicket) => void;
  /** Presente quando o chamado pode ser assumido direto da lista. */
  onAssume?: (ticket: RhTicket) => void;
  assuming?: boolean;
}

/**
 * Um chamado na lista do RH: quem pediu, sobre o quê, há quanto tempo e
 * uma ação principal escrita por extenso.
 */
export default function RhTicketCard({ ticket, currentUserId, onOpen, onAssume, assuming }: Props) {
  const category = rhCategory(ticket.category);
  const status = rhStatus(ticket.status, ticket.assigned_to);
  const unassigned = !ticket.assigned_to && ticket.status === 'open';
  const mine = !!ticket.assigned_to && ticket.assigned_to === currentUserId;
  const long = unassigned && isWaitingLong(ticket.created_at);
  const place = [ticket.requester_department, ticket.requester_unit].filter(Boolean).join(', ');

  return (
    <article className={`rhc ${unassigned ? 'rhc--new' : ''}`}>
      <div className="rhc__top">
        <span className="rhc__cat">
          <i className={`ti ${category.icon}`} aria-hidden="true" />
          {category.label}
        </span>
        <span className={`rh-status rh-status--${status.tone}`}>{status.label}</span>
      </div>

      <h3 className="rhc__title">
        <button type="button" onClick={() => onOpen(ticket)}>{ticket.title}</button>
      </h3>

      <div className="rhc__person">
        <span className="rh-avatar" aria-hidden="true">{initialsOf(ticket.requester_name)}</span>
        <span className="rhc__person-copy">
          <strong>{ticket.requester_name || 'Solicitante sem nome'}</strong>
          {place && <span>{place}</span>}
        </span>
      </div>

      <div className="rhc__meta">
        <span className={long ? 'is-late' : ''}>
          <i className="ti ti-clock" aria-hidden="true" />
          {long ? `Esperando ${timeAgo(ticket.created_at)}` : `Aberto ${timeAgo(ticket.created_at)}`}
        </span>
        {isUrgent(ticket.priority) && <span className="rh-tag rh-tag--urgent">Prioridade alta</span>}
        {!unassigned && (
          <span>
            <i className="ti ti-user" aria-hidden="true" />
            {mine ? 'Com você' : `Com ${ticket.assigned_to_name || 'outra pessoa'}`}
          </span>
        )}
      </div>

      <div className="rhc__actions">
        {unassigned && onAssume ? (
          <>
            <button
              type="button"
              className="pub-btn pub-btn--primary rhc__main"
              onClick={() => onAssume(ticket)}
              disabled={assuming}
            >
              <i className="ti ti-hand-grab" aria-hidden="true" />
              {assuming ? 'Assumindo…' : 'Assumir este chamado'}
            </button>
            <button type="button" className="pub-btn pub-btn--ghost" onClick={() => onOpen(ticket)}>
              Ver detalhes
            </button>
          </>
        ) : (
          <button
            type="button"
            className={`pub-btn ${mine ? 'pub-btn--primary' : 'pub-btn--ghost'} rhc__main`}
            onClick={() => onOpen(ticket)}
          >
            <i className={`ti ${mine ? 'ti-message-reply' : 'ti-eye'}`} aria-hidden="true" />
            {mine ? 'Abrir e responder' : 'Ver chamado'}
          </button>
        )}
      </div>
    </article>
  );
}
