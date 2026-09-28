import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { showToast } from '../utils/toast';
import TicketTimeline, { type HistoryEvent } from '../components/tickets/TicketTimeline';
import TicketAttachments from '../components/TicketAttachments';
import ConfirmDialog from '../components/ConfirmDialog';
import { currentInternalUser, initialsOf, isUrgent, rhCategory, rhStatus, timeAgo } from '../components/rh/rhLabels';
import '../styles/RhTicketDetailPage.css';

interface TicketDetail {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  department?: string;
  category?: string;
  metadata?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  requester_name?: string;
  requester_email?: string;
  requester_department?: string;
  requester_unit?: string;
  assigned_to?: string | null;
  assigned_to_id?: string | null;
  assigned_to_name?: string | null;
  rating?: number | null;
  feedback?: string | null;
  messages?: Message[];
}

interface Message {
  id: string;
  message: string;
  author_type: string;
  author_name?: string;
  created_at: string;
  is_internal: boolean;
}

type Confirm = null | 'unassign' | 'close';

const formatDateTime = (date: string) =>
  new Date(date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const formatDay = (value?: string) => {
  if (!value) return 'Não informado';
  const [y, m, d] = value.split('-');
  return y && m && d ? `${d}/${m}/${y}` : value;
};

const formatMonth = (value?: string) => {
  if (!value) return 'Não informado';
  const [y, m] = value.split('-');
  if (!y || !m) return value;
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};

export default function RhTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = currentInternalUser();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState('');
  const [replyMode, setReplyMode] = useState<'public' | 'internal'>('public');
  const [confirm, setConfirm] = useState<Confirm>(null);
  const replyRef = useRef<HTMLTextAreaElement | null>(null);
  const conversationRef = useRef<HTMLElement | null>(null);

  const token = localStorage.getItem('internal_token');

  const loadTicket = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await api.get(`/tickets/${id}`);
      if (data.assigned_to_id && !data.assigned_to) data.assigned_to = data.assigned_to_id;
      setTicket(data);
      setError('');
    } catch (err: any) {
      setError(err?.response?.status === 404
        ? 'Este chamado não existe mais ou você não tem acesso a ele.'
        : 'Não foi possível abrir o chamado. Confira a internet e tente de novo.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadHistory = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await api.get(`/tickets/${id}/history`);
      setHistory(Array.isArray(data.history) ? data.history : []);
    } catch {
      // O histórico é complementar: se falhar, o chamado continua utilizável.
    } finally {
      setHistoryLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!token) { navigate('/admin/login'); return; }
    void loadTicket();
    void loadHistory();
    api.get('/internal-auth/users')
      .then(({ data }) => setUsers(Array.isArray(data) ? data : data?.users || []))
      .catch(() => { /* só serve para mostrar nomes */ });
  }, [token, navigate, loadTicket, loadHistory]);

  // Atualiza sozinho quando a pessoa responde.
  useEffect(() => {
    const refresh = (event: Event) => {
      const ticketId = (event as CustomEvent<any>).detail?.ticketId;
      if (!ticketId || ticketId === id) { void loadTicket(); void loadHistory(); }
    };
    const events = ['ticket:updated', 'ticket:resolved', 'ticket:reopened'];
    events.forEach((name) => window.addEventListener(name, refresh));
    return () => events.forEach((name) => window.removeEventListener(name, refresh));
  }, [id, loadTicket, loadHistory]);

  const update = async (payload: Record<string, unknown>, success: string) => {
    if (!id) return false;
    try {
      setBusy(true);
      await api.patch(`/tickets/${id}`, payload);
      await Promise.all([loadTicket(), loadHistory()]);
      showToast.success(success);
      return true;
    } catch (err: any) {
      showToast.error(err?.response?.data?.error || err?.response?.data?.message || 'Não foi possível salvar. Tente de novo.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const assumeMe = () => update({ status: 'in_progress', assigned_to_id: user?.id }, 'Chamado assumido. Agora ele está com você.');
  const resolve = () => update({ status: 'resolved' }, 'Chamado marcado como resolvido. A pessoa foi avisada.');
  const waitRequester = () => update({ status: 'waiting_user' }, 'Pronto. O chamado fica aguardando a resposta da pessoa.');
  const resume = () => update({ status: 'in_progress' }, 'Atendimento retomado.');
  const unassign = () => update({ status: 'open', assigned_to_id: null }, 'Chamado devolvido para a fila de novos.');

  const closeForGood = async () => {
    if (!id) return;
    try {
      setBusy(true);
      await api.post(`/tickets/${id}/manual-close`);
      await Promise.all([loadTicket(), loadHistory()]);
      showToast.success('Chamado encerrado.');
    } catch (err: any) {
      showToast.error(err?.response?.data?.error || 'Não foi possível encerrar o chamado.');
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reply.trim() || !id) return;
    const internal = replyMode === 'internal';
    try {
      setBusy(true);
      await api.post(`/tickets/${id}/messages`, { message: reply.trim(), is_internal: internal });
      setReply('');
      await loadTicket();
      showToast.success(internal ? 'Anotação salva. Só a equipe do RH vê.' : `Resposta enviada para ${firstNameOf(ticket?.requester_name) || 'a pessoa'}.`);
    } catch (err: any) {
      showToast.error(err?.response?.data?.error || 'Não foi possível enviar. Seu texto continua na caixa; tente de novo.');
    } finally {
      setBusy(false);
    }
  };

  const focusReply = () => {
    setReplyMode('public');
    replyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => replyRef.current?.focus(), 350);
  };

  if (loading) {
    return (
      <div className="pub-page rh-page rhdt">
        <div className="rh-wrap rhdt-loading">
          <div className="rh-skeleton" style={{ height: 180 }} />
          <div className="rh-skeleton" style={{ height: 320 }} />
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="pub-page rh-page rhdt">
        <div className="rh-wrap rhdt-missing">
          <div className="rh-card rh-empty">
            <span className="pub-gicon pub-gicon--neutral" aria-hidden="true"><i className="ti ti-file-off" /></span>
            <h3>Chamado não encontrado</h3>
            <p>{error || 'Este chamado não existe mais.'}</p>
            <button type="button" className="pub-btn pub-btn--primary" onClick={() => navigate('/rh/chamados')}>
              Voltar para os chamados
            </button>
          </div>
        </div>
      </div>
    );
  }

  const messages = ticket.messages || [];
  const category = rhCategory(ticket.category);
  const assignedId = ticket.assigned_to || null;
  const status = rhStatus(ticket.status, assignedId);
  const mine = !!assignedId && assignedId === user?.id;
  const assigneeName = mine
    ? 'você'
    : ticket.assigned_to_name || users.find((u) => u.id === assignedId)?.name || 'outra pessoa da equipe';
  const requesterFirst = firstNameOf(ticket.requester_name) || 'a pessoa';
  const finished = ['resolved', 'closed', 'aguardando_confirmacao'].includes(ticket.status);
  const closed = ticket.status === 'closed';
  const staffReplied = messages.some((m) => m.author_type === 'it_staff' && !m.is_internal);

  // Trilha: assumir, responder, resolver.
  const steps = [
    { label: 'Assumir', done: !!assignedId || ticket.status !== 'open' },
    { label: 'Responder', done: staffReplied || finished },
    { label: 'Resolver', done: finished },
  ];
  const currentStep = steps.findIndex((s) => !s.done);

  const meta = ticket.metadata || {};
  const adjustments: Array<{ date?: string; correctedTime?: string; notes?: string }> = Array.isArray(meta.adjustments)
    ? meta.adjustments
    : meta.adjustmentDate || meta.correctedTime
      ? [{ date: meta.adjustmentDate, correctedTime: meta.correctedTime }]
      : [];
  const place = [ticket.requester_department, ticket.requester_unit].filter(Boolean).join(', ');

  const renderNextStep = () => {
    if (closed) {
      return (
        <div className="rhdt-next rhdt-next--done">
          <i className="ti ti-circle-check" aria-hidden="true" />
          <div>
            <h2>Chamado encerrado</h2>
            <p>Nada mais a fazer aqui. O histórico continua disponível abaixo.</p>
          </div>
        </div>
      );
    }
    if (!assignedId && ticket.status === 'open') {
      return (
        <div className="rhdt-next rhdt-next--new">
          <div>
            <h2>Ninguém assumiu este chamado ainda</h2>
            <p>Ao assumir, a equipe sabe que ele está com você e {requesterFirst} vê que o atendimento começou.</p>
          </div>
          <button type="button" className="pub-btn pub-btn--sun rhdt-next__btn" onClick={() => void assumeMe()} disabled={busy}>
            <i className="ti ti-hand-grab" aria-hidden="true" />
            {busy ? 'Assumindo…' : 'Assumir este chamado'}
          </button>
        </div>
      );
    }
    if (!mine) {
      return (
        <div className="rhdt-next">
          <div>
            <h2>Este chamado está com {assigneeName}</h2>
            <p>Se precisar cuidar dele no lugar dessa pessoa, você pode passá-lo para você.</p>
          </div>
          <button type="button" className="pub-btn pub-btn--ghost rhdt-next__btn" onClick={() => void assumeMe()} disabled={busy}>
            <i className="ti ti-arrows-exchange" aria-hidden="true" />
            Passar para mim
          </button>
        </div>
      );
    }
    if (finished) {
      return (
        <div className="rhdt-next rhdt-next--done">
          <i className="ti ti-circle-check" aria-hidden="true" />
          <div>
            <h2>Você marcou como resolvido</h2>
            <p>{requesterFirst} recebeu um aviso. Se ainda faltar algo, reabra o atendimento.</p>
            <div className="rhdt-next__row">
              <button type="button" className="pub-btn pub-btn--ghost" onClick={() => void resume()} disabled={busy}>
                <i className="ti ti-arrow-back-up" aria-hidden="true" />
                Reabrir atendimento
              </button>
              <button type="button" className="pub-btn pub-btn--ghost" onClick={() => setConfirm('close')} disabled={busy}>
                <i className="ti ti-lock" aria-hidden="true" />
                Encerrar de vez
              </button>
            </div>
          </div>
        </div>
      );
    }
    if (ticket.status === 'waiting_user') {
      return (
        <div className="rhdt-next rhdt-next--waiting">
          <div>
            <h2>Aguardando {requesterFirst} responder</h2>
            <p>Quando a resposta chegar, ela aparece na conversa. Você também pode continuar sem esperar.</p>
          </div>
          <div className="rhdt-next__row">
            <button type="button" className="pub-btn pub-btn--ghost" onClick={() => void resume()} disabled={busy}>
              <i className="ti ti-player-play" aria-hidden="true" />
              Voltar ao atendimento
            </button>
            <button type="button" className="pub-btn pub-btn--primary" onClick={() => void resolve()} disabled={busy}>
              <i className="ti ti-circle-check" aria-hidden="true" />
              Marcar como resolvido
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="rhdt-next rhdt-next--mine">
        <div>
          <h2>{staffReplied ? `Terminou de ajudar ${requesterFirst}?` : `Responda ${requesterFirst}`}</h2>
          <p>
            {staffReplied
              ? 'Quando o pedido estiver resolvido, marque aqui. A pessoa recebe um aviso.'
              : 'Escreva pela conversa abaixo. A pessoa recebe sua resposta por e-mail.'}
          </p>
        </div>
        <div className="rhdt-next__row">
          <button
            type="button"
            className={`pub-btn ${staffReplied ? 'pub-btn--ghost' : 'pub-btn--primary'}`}
            onClick={focusReply}
          >
            <i className="ti ti-message-reply" aria-hidden="true" />
            Escrever resposta
          </button>
          <button
            type="button"
            className={`pub-btn ${staffReplied ? 'pub-btn--primary' : 'pub-btn--ghost'}`}
            onClick={() => void resolve()}
            disabled={busy}
          >
            <i className="ti ti-circle-check" aria-hidden="true" />
            Marcar como resolvido
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="pub-page rh-page rhdt">
      <header className="rhdt-head">
        <div className="rh-wrap">
          <button type="button" className="rhdt-back" onClick={() => navigate('/rh/chamados')}>
            <i className="ti ti-arrow-left" aria-hidden="true" />
            Voltar para os chamados
          </button>

          <div className="rhdt-head__tags">
            <span className="rhc__cat">
              <i className={`ti ${category.icon}`} aria-hidden="true" />
              {category.label}
            </span>
            <span className={`rh-status rh-status--${status.tone}`}>{status.label}</span>
            {isUrgent(ticket.priority) && <span className="rh-tag rh-tag--urgent">Prioridade alta</span>}
          </div>
          <h1>{ticket.title}</h1>
          <p className="rhdt-head__meta">
            Protocolo #{ticket.id.substring(0, 8).toUpperCase()}. Aberto {timeAgo(ticket.created_at)}, em {formatDateTime(ticket.created_at)}.
          </p>

          <ol className="rhdt-steps" aria-label="Etapas do atendimento">
            {steps.map((step, index) => (
              <li
                key={step.label}
                className={step.done ? 'is-done' : index === currentStep ? 'is-current' : ''}
                aria-current={index === currentStep ? 'step' : undefined}
              >
                <span className="rhdt-steps__dot" aria-hidden="true">
                  {step.done ? <i className="ti ti-check" /> : index + 1}
                </span>
                <span>{step.label}</span>
              </li>
            ))}
          </ol>
        </div>
      </header>

      <div className="rh-wrap rhdt-body">
        <div className="rhdt-main">
          {renderNextStep()}

          <section className="rh-card rhdt-request" aria-labelledby="rhdt-request-title">
            <h2 id="rhdt-request-title">O que {requesterFirst} pediu</h2>
            <p className="rhdt-request__text">{ticket.description}</p>

            {(adjustments.length > 0 || meta.medicalLeaveDays || meta.payrollMonth || meta.notes || (meta.adjustmentDate && ticket.category === 'RH_ATESTADO')) && (
              <div className="rhdt-details">
                {meta.medicalLeaveDays && (
                  <div className="rhdt-fact">
                    <span>Dias de afastamento</span>
                    <strong>{meta.medicalLeaveDays} {Number(meta.medicalLeaveDays) === 1 ? 'dia' : 'dias'}</strong>
                  </div>
                )}
                {ticket.category === 'RH_ATESTADO' && meta.adjustmentDate && (
                  <div className="rhdt-fact">
                    <span>Data do atestado</span>
                    <strong>{formatDay(meta.adjustmentDate)}</strong>
                  </div>
                )}
                {meta.payrollMonth && (
                  <div className="rhdt-fact">
                    <span>Mês de referência</span>
                    <strong>{formatMonth(meta.payrollMonth)}</strong>
                  </div>
                )}
                {adjustments.length > 0 && ticket.category !== 'RH_ATESTADO' && (
                  <div className="rhdt-adjust">
                    <h3>{adjustments.length === 1 ? 'Data para corrigir no ponto' : `${adjustments.length} datas para corrigir no ponto`}</h3>
                    <ul>
                      {adjustments.map((item, index) => (
                        <li key={`${item.date}-${index}`}>
                          <span className="rhdt-adjust__day">
                            <i className="ti ti-calendar" aria-hidden="true" />
                            {formatDay(item.date)}
                          </span>
                          <span className="rhdt-adjust__time">
                            <i className="ti ti-clock" aria-hidden="true" />
                            {item.correctedTime || 'Horário não informado'}
                          </span>
                          {item.notes && <span className="rhdt-adjust__note">{item.notes}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {meta.notes && (
                  <div className="rhdt-fact rhdt-fact--wide">
                    <span>Observações</span>
                    <strong>{meta.notes}</strong>
                  </div>
                )}
              </div>
            )}

            <div className="rhdt-attachments">
              <TicketAttachments ticketId={ticket.id} authToken={token || ''} department={ticket.department} />
            </div>
          </section>

          <section className="rh-card rhdt-chat" ref={conversationRef} aria-labelledby="rhdt-chat-title">
            <h2 id="rhdt-chat-title">Conversa</h2>

            {messages.length === 0 ? (
              <p className="rhdt-chat__empty">Ainda não há mensagens. A primeira resposta é sua.</p>
            ) : (
              <ol className="rhdt-messages">
                {messages.map((msg) => {
                  const fromTeam = msg.author_type === 'it_staff';
                  const author = fromTeam ? msg.author_name || 'Equipe do RH' : msg.author_name || ticket.requester_name || 'Solicitante';
                  return (
                    <li
                      key={msg.id}
                      className={`rhdt-msg ${fromTeam ? 'rhdt-msg--team' : 'rhdt-msg--person'} ${msg.is_internal ? 'rhdt-msg--internal' : ''}`}
                    >
                      <span className="rhdt-msg__avatar" aria-hidden="true">{initialsOf(author)}</span>
                      <div className="rhdt-msg__bubble">
                        <div className="rhdt-msg__head">
                          <strong>{author}</strong>
                          <span>{formatDateTime(msg.created_at)}</span>
                        </div>
                        {msg.is_internal && (
                          <span className="rhdt-msg__internal">
                            <i className="ti ti-eye-off" aria-hidden="true" />
                            Anotação só para o RH. {requesterFirst} não vê.
                          </span>
                        )}
                        <p>{msg.message}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}

            {!closed && (
              <form className="rhdt-reply" onSubmit={sendReply}>
                <fieldset className="rhdt-reply__mode">
                  <legend className="pub-sr-only">Tipo de mensagem</legend>
                  <label className={replyMode === 'public' ? 'is-on' : ''}>
                    <input
                      type="radio"
                      name="reply-mode"
                      value="public"
                      checked={replyMode === 'public'}
                      onChange={() => setReplyMode('public')}
                    />
                    <i className="ti ti-send" aria-hidden="true" />
                    <span>
                      <strong>Responder {requesterFirst}</strong>
                      <small>A pessoa recebe por e-mail</small>
                    </span>
                  </label>
                  <label className={replyMode === 'internal' ? 'is-on is-internal' : ''}>
                    <input
                      type="radio"
                      name="reply-mode"
                      value="internal"
                      checked={replyMode === 'internal'}
                      onChange={() => setReplyMode('internal')}
                    />
                    <i className="ti ti-notes" aria-hidden="true" />
                    <span>
                      <strong>Anotação para o RH</strong>
                      <small>Só a equipe vê</small>
                    </span>
                  </label>
                </fieldset>

                <label htmlFor="rhdt-reply-text" className="pub-sr-only">
                  {replyMode === 'public' ? `Resposta para ${requesterFirst}` : 'Anotação interna'}
                </label>
                <textarea
                  id="rhdt-reply-text"
                  ref={replyRef}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={4}
                  disabled={busy}
                  className={replyMode === 'internal' ? 'is-internal' : ''}
                  placeholder={replyMode === 'public'
                    ? `Escreva aqui a resposta para ${requesterFirst}…`
                    : 'Escreva aqui uma anotação para a equipe (a pessoa não vê)…'}
                />
                <div className="rhdt-reply__foot">
                  <button type="submit" className="pub-btn pub-btn--primary" disabled={busy || !reply.trim()}>
                    <i className={`ti ${replyMode === 'public' ? 'ti-send' : 'ti-device-floppy'}`} aria-hidden="true" />
                    {busy ? 'Enviando…' : replyMode === 'public' ? 'Enviar resposta' : 'Salvar anotação'}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>

        <aside className="rhdt-aside">
          <section className="rh-card rhdt-person" aria-labelledby="rhdt-person-title">
            <h2 id="rhdt-person-title">Quem pediu</h2>
            <div className="rhdt-person__id">
              <span className="rh-avatar" aria-hidden="true">{initialsOf(ticket.requester_name)}</span>
              <div>
                <strong>{ticket.requester_name || 'Sem nome'}</strong>
                {place && <span>{place}</span>}
              </div>
            </div>
            {ticket.requester_email && (
              <a className="rhdt-person__mail" href={`mailto:${ticket.requester_email}`}>
                <i className="ti ti-mail" aria-hidden="true" />
                {ticket.requester_email}
              </a>
            )}
          </section>

          <section className="rh-card rhdt-owner">
            <h2>Responsável</h2>
            <p>{assignedId ? (mine ? 'Você' : assigneeName) : 'Ninguém ainda'}</p>
            {mine && !finished && !closed && (
              <div className="rhdt-owner__actions">
                {ticket.status !== 'waiting_user' && (
                  <button type="button" onClick={() => void waitRequester()} disabled={busy}>
                    <i className="ti ti-hourglass" aria-hidden="true" />
                    Aguardar resposta de {requesterFirst}
                  </button>
                )}
                <button type="button" onClick={() => setConfirm('unassign')} disabled={busy}>
                  <i className="ti ti-arrow-back-up" aria-hidden="true" />
                  Devolver para a fila
                </button>
              </div>
            )}
          </section>

          {ticket.rating != null && (
            <section className="rh-card rhdt-rating">
              <h2>Avaliação de {requesterFirst}</h2>
              <p className="rhdt-rating__stars" aria-label={`${ticket.rating} de 5`}>
                {'★'.repeat(Math.max(0, Math.min(5, Number(ticket.rating))))}
                <span>{'★'.repeat(Math.max(0, 5 - Math.min(5, Number(ticket.rating))))}</span>
              </p>
              {ticket.feedback && <p className="rhdt-rating__text">{ticket.feedback}</p>}
            </section>
          )}

          <details className="rh-card rhdt-history">
            <summary>
              <i className="ti ti-history" aria-hidden="true" />
              Ver histórico do chamado
            </summary>
            <div className="rhdt-history__body">
              <TicketTimeline events={history} loading={historyLoading} />
            </div>
          </details>
        </aside>
      </div>

      <ConfirmDialog
        isOpen={confirm !== null}
        title={confirm === 'close' ? 'Encerrar este chamado de vez?' : 'Devolver para a fila?'}
        message={confirm === 'close'
          ? 'Depois de encerrado, o chamado não pode mais ser reaberto por aqui.'
          : 'O chamado volta para a aba Novos, sem responsável, para outra pessoa do RH assumir.'}
        confirmText={confirm === 'close' ? 'Encerrar de vez' : 'Devolver para a fila'}
        cancelText="Cancelar"
        type="warning"
        onConfirm={() => {
          const action = confirm;
          setConfirm(null);
          if (action === 'close') void closeForGood();
          if (action === 'unassign') void unassign();
        }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

function firstNameOf(name?: string | null) {
  return (name || '').trim().split(/\s+/)[0] || '';
}
