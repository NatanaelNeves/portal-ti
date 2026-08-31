import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { canAssume, canChangeStatus, canResolve } from './ticketPermissions';

interface InlineTicket {
  id: string;
  title: string;
  description: string;
  status: string;
  department?: string;
  category?: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
  requester_name?: string;
  requester_email?: string;
  requester_department?: string;
  requester_unit?: string;
}

interface TicketMessage {
  id: string;
  message: string;
  author_type: string;
  author_name?: string;
  created_at: string;
  is_internal: boolean;
}

interface Props {
  ticket: InlineTicket;
  role: string;
  userId: string;
  ownerName: string;
  typeLabel: string;
  busy: boolean;
  onAssume: () => void;
  onStatus: (status: string) => void;
  onCollapse: () => void;
}

const formatDate = (value: string) => new Date(value).toLocaleString('pt-BR', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

export default function TicketInlineDetails({ ticket, role, userId, ownerName, typeLabel, busy, onAssume, onStatus, onCollapse }: Props) {
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    api.get(`/tickets/${ticket.id}`)
      .then(response => { if (!cancelled) setMessages(response.data?.messages || []); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [ticket.id, ticket.updated_at, ticket.message_count, attempt]);

  const isOwner = ticket.assigned_to === userId;
  const canAct = isOwner && canChangeStatus(ticket, role, userId);
  const canTake = !ticket.assigned_to && canAssume(ticket, role, userId);
  const isWaiting = ['waiting_user', 'aguardando_aquisicao', 'aguardando_terceiros'].includes(ticket.status);
  const location = [ticket.requester_department, ticket.requester_unit].filter(Boolean).join(' · ');

  return (
    <section
      id={`ticket-details-${ticket.id}`}
      className="tk-inline-details"
      aria-label={`Detalhes de ${ticket.title}`}
      onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); onCollapse(); } }}
    >
      <div className="tk-inline-toolbar">
        <div className="tk-inline-action-heading">
          <i className="ti ti-bolt" aria-hidden="true" />
          <h4>Ações rápidas</h4>
        </div>
        <div className="tk-inline-actions" role="group" aria-label="Ações rápidas do chamado" aria-busy={busy}>
          {canTake && <button type="button" className="tk-detail-button tk-detail-button--primary" disabled={busy} onClick={onAssume}><i className="ti ti-user-check" aria-hidden="true" />Assumir chamado</button>}
          {canAct && ticket.status !== 'open' && <button type="button" className="tk-detail-button" disabled={busy} onClick={() => onStatus(isWaiting ? 'in_progress' : 'waiting_user')}><i className={`ti ${isWaiting ? 'ti-player-play' : 'ti-message-pause'}`} aria-hidden="true" />{isWaiting ? 'Retomar atendimento' : 'Aguardar resposta'}</button>}
          {isOwner && canResolve(ticket, role, userId) && <button type="button" className="tk-detail-button tk-detail-button--resolve" disabled={busy} onClick={() => onStatus('resolved')}><i className="ti ti-circle-check" aria-hidden="true" />Resolver chamado</button>}
          <Link className={`tk-detail-button tk-detail-button--open ${canTake ? '' : 'tk-detail-button--primary'}`} to={`/admin/chamados/${ticket.id}`}>Abrir atendimento<i className="ti ti-arrow-up-right" aria-hidden="true" /></Link>
        </div>
        {busy && <span className="tk-inline-feedback" role="status">Salvando alteração…</span>}
      </div>

      <div className="tk-inline-body">
        <div className="tk-inline-content">
          <section className="tk-inline-description" aria-labelledby={`ticket-description-${ticket.id}`}>
            <h4 id={`ticket-description-${ticket.id}`}>Descrição do chamado</h4>
            <p>{ticket.description?.trim() || 'Este chamado não possui uma descrição.'}</p>
          </section>
          <section className="tk-inline-history" aria-labelledby={`ticket-history-${ticket.id}`}>
            <div className="tk-inline-section-heading"><h4 id={`ticket-history-${ticket.id}`}>Últimas interações</h4><Link to={`/admin/chamados/${ticket.id}`}>Ver conversa completa<i className="ti ti-arrow-right" aria-hidden="true" /></Link></div>
            {loading ? <p className="tk-inline-empty" role="status">Carregando histórico…</p>
              : error ? <div className="tk-inline-history-error" role="alert"><p>Não foi possível carregar o histórico.</p><button type="button" className="tk-detail-button" onClick={() => setAttempt(value => value + 1)}>Tentar novamente</button></div>
              : messages.length === 0 ? <p className="tk-inline-empty">As respostas e notas deste chamado aparecerão aqui.</p>
              : <ol className="tk-inline-messages">{messages.slice(-3).map(message => (
                <li key={message.id}>
                  <div className="tk-inline-message-meta"><strong>{message.author_name || (message.author_type === 'system' ? 'Sistema' : 'Solicitante')}</strong>{message.is_internal && <span className="tk-inline-note"><i className="ti ti-lock" aria-hidden="true" />Nota interna</span>}<time dateTime={message.created_at}>{formatDate(message.created_at)}</time></div>
                  <p>{message.message}</p>
                </li>
              ))}</ol>}
          </section>
        </div>

        <aside className="tk-inline-info" aria-label="Informações do chamado">
          <h4>Sobre este chamado</h4>
          <dl>
            <div><dt>Solicitante</dt><dd>{ticket.requester_name || 'Usuário interno'}{ticket.requester_email && <span className="tk-inline-email">{ticket.requester_email}</span>}</dd></div>
            {location && <div><dt>Localização</dt><dd>{location}</dd></div>}
            <div><dt>Responsável</dt><dd>{ownerName}</dd></div>
            <div><dt>Equipe / tipo</dt><dd>{ticket.department === 'administrativo' ? 'Administrativo' : ticket.department === 'rh' ? 'RH' : 'TI'} · {typeLabel}</dd></div>
            {ticket.category && <div><dt>Categoria</dt><dd>{ticket.category.replace(/_/g, ' ')}</dd></div>}
            <div><dt>Aberto em</dt><dd><time dateTime={ticket.created_at}>{formatDate(ticket.created_at)}</time></dd></div>
          </dl>
        </aside>
      </div>
      <div className="tk-inline-footer">
        <span><i className="ti ti-layout-list" aria-hidden="true" />Você continua na fila de chamados</span>
        <button type="button" onClick={onCollapse}>Recolher detalhes<i className="ti ti-chevron-up" aria-hidden="true" /></button>
      </div>
    </section>
  );
}
