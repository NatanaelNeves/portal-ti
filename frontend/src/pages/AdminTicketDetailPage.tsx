import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { showToast } from '../utils/toast';
import { aiService, type TicketSummary } from '../services/aiService';
import TicketTimeline, { type HistoryEvent } from '../components/tickets/TicketTimeline';
import TicketAttachments from '../components/TicketAttachments';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  canAssignToOthers,
  canAssume,
  canClose,
  canEditTicket,
  canResolve,
  canUseExternalWaitStatuses,
  isSlaPaused,
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
} from '../components/tickets/ticketPermissions';
import { statusPresentation } from '../utils/ticketStatus';
import { BACKEND_URL } from '../services/api';
import '../styles/AdminTicketDetailPage.css';

interface TicketDetail {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  type: string;
  department?: string;
  category?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  rating?: number | null;
  feedback?: string | null;
  requester_type: string;
  requester_name?: string;
  requester_email?: string;
  requester_department?: string;
  requester_unit?: string;
  requester_id?: string;
  assigned_to?: string;
  linked_equipment_id?: string | null;
  pause_reason?: string | null;
}

interface Equipment {
  id: string;
  internal_code: string;
  brand: string;
  model: string;
}

interface Message {
  id: string;
  message: string;
  author_type: string;
  author_name?: string;
  created_at: string;
  is_internal: boolean;
}

interface InternalUser {
  id: string;
  name: string;
}

type WaitKind = 'aguardando_aquisicao' | 'aguardando_terceiros';

const TEAM: Record<string, { label: string; tone: string }> = {
  ti: { label: 'TI', tone: 'ti' },
  administrativo: { label: 'Administrativo', tone: 'adm' },
  rh: { label: 'RH', tone: 'rh' },
};

const CATEGORY_LABEL: Record<string, string> = {
  computador: 'Computador', internet: 'Internet', impressora: 'Impressora', sistema: 'Sistema', outro: 'Outro assunto',
  copia_chave: 'Cópia de chave', apoio_evento: 'Apoio em evento', buscar_doacao: 'Buscar doação', solicitar_documento: 'Solicitar documento',
  RH_ATESTADO: 'Atestado médico', RH_PONTO: 'Ajuste de ponto', RH_FOLHA: 'Folha de pagamento', RH_DECLARACAO: 'Declaração',
  RH_BENEFICIOS: 'Benefícios', RH_OUTROS: 'Outro assunto', RH_CONFIDENCIAL: 'Confidencial',
};

const PRIORITY_LABEL: Record<string, string> = { urgent: 'Urgente', critical: 'Crítica', high: 'Alta', medium: 'Média', low: 'Baixa' };

const initialsOf = (name?: string | null) =>
  (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const ageLabel = (iso: string) => {
  const h = Math.max(0, (Date.now() - new Date(iso).getTime()) / 3600000);
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  if (h < 24) return `${Math.floor(h)} h`;
  const d = Math.floor(h / 24);
  return `${d} ${d === 1 ? 'dia' : 'dias'}`;
};

const firstName = (name?: string | null) => (name || '').trim().split(/\s+/)[0] || 'o solicitante';

export default function AdminTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const internalToken = localStorage.getItem('internal_token');
  const me = (() => {
    try { return JSON.parse(localStorage.getItem('internal_user') || 'null') as { id?: string; name?: string; role?: string } | null; } catch { return null; }
  })();
  const role = me?.role || '';
  const myId = me?.id || '';

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<InternalUser[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [timeline, setTimeline] = useState<HistoryEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState('');
  const [internalNote, setInternalNote] = useState(false);
  const [waitFor, setWaitFor] = useState<WaitKind | null>(null);
  const [waitReason, setWaitReason] = useState('');
  const [confirmClose, setConfirmClose] = useState(false);
  const [aiSummary, setAiSummary] = useState<TicketSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [requesterHistory, setRequesterHistory] = useState<Array<{ id: string; title: string; created_at: string; status: string }> | null>(null);
  const [copied, setCopied] = useState(false);
  const replyRef = useRef<HTMLTextAreaElement | null>(null);

  const authHeaders = useCallback((json = false): Record<string, string> => ({
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    Authorization: `Bearer ${internalToken}`,
  }), [internalToken]);

  const fetchTicket = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/tickets/${id}`, { headers: authHeaders(true) });
      if (!res.ok) throw new Error(res.status === 404 ? 'Este chamado não existe ou foi removido.' : 'Não foi possível carregar o chamado.');
      const data = await res.json();
      if (data.assigned_to_id) data.assigned_to = data.assigned_to_id;
      setTicket(data);
      setMessages(data.messages || []);
      setError('');
    } catch (err: any) {
      setError(err instanceof TypeError ? 'Sem conexão com o servidor. Tente de novo.' : err.message);
    } finally {
      setLoading(false);
    }
  }, [id, authHeaders]);

  const fetchHistory = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/tickets/${id}/history`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setTimeline(Array.isArray(data.history) ? data.history : []);
      }
    } catch {
      // O histórico é complementar: se falhar, o chamado continua utilizável.
    } finally {
      setTimelineLoading(false);
    }
  }, [id, authHeaders]);

  useEffect(() => {
    if (!internalToken) { navigate('/admin/login'); return; }
    void fetchTicket();
    void fetchHistory();
    fetch(`${BACKEND_URL}/api/internal-auth/users`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setUsers(Array.isArray(data) ? data : data.users || []))
      .catch(() => {});
    fetch(`${BACKEND_URL}/api/inventory/equipment?limit=200`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: { equipment?: Equipment[]; data?: Equipment[] }) => setEquipment(data.equipment || data.data || []))
      .catch(() => {});
  }, [internalToken, navigate, fetchTicket, fetchHistory, authHeaders]);

  // Atualiza sozinho quando alguém responde ou muda o chamado.
  useEffect(() => {
    const refresh = (event: Event) => {
      const ticketId = (event as CustomEvent<any>).detail?.ticketId;
      if (!ticketId || ticketId === id) { void fetchTicket(); void fetchHistory(); }
    };
    const names = ['ticket:updated', 'ticket:resolved', 'ticket:reopened'];
    names.forEach((n) => window.addEventListener(n, refresh));
    return () => names.forEach((n) => window.removeEventListener(n, refresh));
  }, [id, fetchTicket, fetchHistory]);

  const backRoute = role === 'rh_staff' ? '/rh/chamados' : '/admin/chamados';

  const update = async (payload: Record<string, unknown>, success: string) => {
    if (!id) return;
    try {
      setBusy(true);
      const res = await fetch(`${BACKEND_URL}/api/tickets/${id}`, {
        method: 'PATCH',
        headers: authHeaders(true),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || data.error || 'Não foi possível salvar a alteração.');
      }
      await Promise.all([fetchTicket(), fetchHistory()]);
      showToast.success(success);
    } catch (err: any) {
      showToast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const assumeMe = () => update({ status: 'in_progress', assigned_to_id: myId }, 'Chamado assumido. Agora está com você.');
  const resolve = () => update({ status: 'resolved' }, 'Chamado resolvido. O solicitante foi avisado.');
  const waitUser = () => update({ status: 'waiting_user' }, 'Aguardando resposta do solicitante.');
  const resume = () => update({ status: 'in_progress' }, 'Atendimento retomado.');
  const unassign = () => update({ status: 'open', assigned_to_id: null }, 'Chamado devolvido para a fila.');

  const submitWait = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!waitFor) return;
    await update({ status: waitFor, pause_reason: waitReason.trim() }, 'Chamado em espera. O prazo fica pausado.');
    setWaitFor(null);
    setWaitReason('');
  };

  const closeForGood = async () => {
    if (!id) return;
    try {
      setBusy(true);
      const res = await fetch(`${BACKEND_URL}/api/tickets/${id}/manual-close`, { method: 'POST', headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Não foi possível encerrar o chamado.');
      await Promise.all([fetchTicket(), fetchHistory()]);
      showToast.success('Chamado encerrado.');
    } catch (err: any) {
      showToast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!reply.trim() || !id) return;
    try {
      setBusy(true);
      const res = await fetch(`${BACKEND_URL}/api/tickets/${id}/messages`, {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({ message: reply.trim(), is_internal: internalNote }),
      });
      if (!res.ok) throw new Error('Não foi possível enviar. O texto continua na caixa.');
      setReply('');
      await fetchTicket();
      showToast.success(internalNote ? 'Nota interna salva.' : 'Resposta enviada.');
    } catch (err: any) {
      showToast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleSummary = async () => {
    if (!id) return;
    if (aiSummary) { setShowSummary((s) => !s); return; }
    setSummaryLoading(true);
    setShowSummary(true);
    const result = await aiService.summarizeTicket(id);
    if (result) setAiSummary(result);
    else { showToast.error('O resumo com IA não está disponível agora.'); setShowSummary(false); }
    setSummaryLoading(false);
  };

  const loadRequesterHistory = async () => {
    if (!ticket?.requester_id) return;
    if (requesterHistory) { setRequesterHistory(null); return; }
    try {
      const res = await fetch(`${BACKEND_URL}/api/tickets?requester_id=${ticket.requester_id}&limit=20&sort=created_at&order=desc`, { headers: authHeaders() });
      const data = res.ok ? await res.json() : { data: [] };
      setRequesterHistory((data.data || []).filter((h: { id: string }) => h.id !== ticket.id));
    } catch {
      setRequesterHistory([]);
    }
  };

  const copyLink = () => {
    void navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="tkd">
        <div className="tkd-wrap tkd-loading">
          <div className="tkd-skeleton" style={{ height: 150 }} />
          <div className="tkd-skeleton" style={{ height: 360 }} />
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="tkd">
        <div className="tkd-wrap tkd-missing">
          <i className="ti ti-file-off" aria-hidden="true" />
          <h1>Chamado não encontrado</h1>
          <p>{error || 'Este chamado não existe ou foi removido.'}</p>
          <button type="button" className="tkd-btn tkd-btn--primary" onClick={() => navigate(backRoute)}>Voltar para a fila</button>
        </div>
      </div>
    );
  }

  const policyTicket = { ...ticket, assigned_to: ticket.assigned_to || undefined };
  const editable = canEditTicket(policyTicket, role, myId);
  const mine = !!ticket.assigned_to && ticket.assigned_to === myId;
  const assigneeName = mine ? 'Você' : users.find((u) => u.id === ticket.assigned_to)?.name || (ticket.assigned_to ? 'Outra pessoa da equipe' : '');
  const status = statusPresentation(ticket.status);
  const paused = isSlaPaused(ticket.status);
  const finished = ['resolved', 'aguardando_confirmacao'].includes(ticket.status);
  const closed = ticket.status === 'closed';
  const team = TEAM[ticket.department || 'ti'] ?? TEAM.ti;
  const requester = firstName(ticket.requester_name);
  const staffReplied = messages.some((m) => m.author_type === 'it_staff' && !m.is_internal);
  const externalWaits = canUseExternalWaitStatuses(role) && (ticket.department || 'ti') === 'ti';
  const linkedEquipment = equipment.find((e) => e.id === ticket.linked_equipment_id);
  const meta = ticket.metadata || {};
  const adjustments: Array<{ date?: string; correctedTime?: string; notes?: string }> = Array.isArray(meta.adjustments) ? meta.adjustments : [];

  const steps = [
    { label: 'Assumir', done: !!ticket.assigned_to || ticket.status !== 'open' },
    { label: 'Responder', done: staffReplied || finished || closed },
    { label: 'Resolver', done: finished || closed },
  ];
  const currentStep = steps.findIndex((s) => !s.done);

  const focusReply = (note = false) => {
    setInternalNote(note);
    replyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => replyRef.current?.focus(), 300);
  };

  // O que fazer agora, conforme estado e responsável.
  const renderNext = () => {
    if (closed) {
      return { tone: 'done', title: 'Chamado encerrado', text: 'Nenhuma ação pendente. O histórico continua disponível.', actions: null };
    }
    if (!ticket.assigned_to && ticket.status === 'open') {
      return {
        tone: 'new',
        title: `Aberto há ${ageLabel(ticket.created_at)} e ninguém assumiu`,
        text: 'Assuma para começar o atendimento ou atribua a alguém da equipe.',
        actions: canAssume(policyTicket, role, myId) && (
          <button type="button" className="tkd-btn tkd-btn--sun" onClick={() => void assumeMe()} disabled={busy}>
            <i className="ti ti-hand-grab" aria-hidden="true" />Assumir chamado
          </button>
        ),
      };
    }
    if (!mine) {
      return {
        tone: 'other',
        title: `Com ${assigneeName}`,
        text: finished ? 'Resolvido, aguardando confirmação ou encerramento.' : `Status: ${status.label.toLowerCase()}.`,
        actions: canAssume(policyTicket, role, myId) && !finished && (
          <button type="button" className="tkd-btn" onClick={() => void assumeMe()} disabled={busy}>
            <i className="ti ti-arrows-exchange" aria-hidden="true" />Assumir no lugar
          </button>
        ),
      };
    }
    if (finished) {
      return {
        tone: 'done',
        title: 'Você marcou como resolvido',
        text: `${requester} foi avisado e pode confirmar. Encerre quando não houver mais nada a fazer.`,
        actions: (
          <>
            <button type="button" className="tkd-btn" onClick={() => void resume()} disabled={busy}>
              <i className="ti ti-arrow-back-up" aria-hidden="true" />Reabrir
            </button>
            {canClose(policyTicket, role, myId) && (
              <button type="button" className="tkd-btn tkd-btn--primary" onClick={() => setConfirmClose(true)} disabled={busy}>
                <i className="ti ti-lock" aria-hidden="true" />Encerrar
              </button>
            )}
          </>
        ),
      };
    }
    if (ticket.status === 'waiting_user' || paused) {
      return {
        tone: 'wait',
        title: ticket.status === 'waiting_user' ? `Aguardando ${requester} responder` : status.label,
        text: paused
          ? `Prazo pausado.${ticket.pause_reason ? ` Motivo: ${ticket.pause_reason}.` : ''}`
          : 'A resposta aparece na conversa. Você pode retomar sem esperar.',
        actions: (
          <>
            <button type="button" className="tkd-btn" onClick={() => void resume()} disabled={busy}>
              <i className="ti ti-player-play" aria-hidden="true" />Retomar
            </button>
            <button type="button" className="tkd-btn tkd-btn--primary" onClick={() => void resolve()} disabled={busy}>
              <i className="ti ti-circle-check" aria-hidden="true" />Resolver
            </button>
          </>
        ),
      };
    }
    return {
      tone: 'mine',
      title: staffReplied ? `Terminou com ${requester}?` : `Responda ${requester}`,
      text: staffReplied ? 'Resolva quando o problema estiver solucionado.' : 'A resposta chega por e-mail. Use nota interna para registrar o que só a equipe precisa ver.',
      actions: (
        <>
          <button type="button" className={`tkd-btn ${staffReplied ? '' : 'tkd-btn--primary'}`} onClick={() => focusReply(false)}>
            <i className="ti ti-message-reply" aria-hidden="true" />Responder
          </button>
          {canResolve(policyTicket, role, myId) && (
            <button type="button" className={`tkd-btn ${staffReplied ? 'tkd-btn--primary' : ''}`} onClick={() => void resolve()} disabled={busy}>
              <i className="ti ti-circle-check" aria-hidden="true" />Resolver
            </button>
          )}
        </>
      ),
    };
  };

  const next = renderNext();

  return (
    <div className="tkd">
      <header className="tkd-head pub-aurora">
        <div className="tkd-wrap">
          <div className="tkd-head__bar">
            <button type="button" className="tkd-back" onClick={() => navigate(backRoute)}>
              <i className="ti ti-arrow-left" aria-hidden="true" />Fila
            </button>
            <button type="button" className="tkd-code" onClick={copyLink} title="Copiar link do chamado">
              #{ticket.id.substring(0, 8).toUpperCase()}
              <i className={`ti ${copied ? 'ti-check' : 'ti-link'}`} aria-hidden="true" />
              <span className="pub-sr-only">{copied ? 'Link copiado' : 'Copiar link'}</span>
            </button>
            <button
              type="button"
              className={`tkd-ai ${showSummary ? 'is-on' : ''}`}
              onClick={() => void toggleSummary()}
              disabled={summaryLoading}
            >
              <i className="ti ti-sparkles" aria-hidden="true" />
              {summaryLoading ? 'Resumindo…' : showSummary ? 'Ocultar resumo' : 'Resumo com IA'}
            </button>
          </div>

          <h1>{ticket.title}</h1>

          <div className="tkd-tags">
            <span className={`tkd-status tkd-status--${ticket.status}`}>{status.label}</span>
            <span className={`tkd-prio tkd-prio--${ticket.priority}`}>Prioridade {(PRIORITY_LABEL[ticket.priority] || ticket.priority).toLowerCase()}</span>
            <span className={`tkd-team tkd-team--${team.tone}`}>{team.label}</span>
            {ticket.category && <span className="tkd-tag">{CATEGORY_LABEL[ticket.category] || ticket.category}</span>}
            <span className="tkd-age">Aberto há {ageLabel(ticket.created_at)}, em {formatDateTime(ticket.created_at)}</span>
          </div>

          <ol className="tkd-steps" aria-label="Etapas do atendimento">
            {steps.map((step, index) => (
              <li key={step.label} className={step.done ? 'is-done' : index === currentStep ? 'is-current' : ''} aria-current={index === currentStep ? 'step' : undefined}>
                <span className="tkd-steps__dot" aria-hidden="true">{step.done ? <i className="ti ti-check" /> : index + 1}</span>
                {step.label}
              </li>
            ))}
          </ol>
        </div>
      </header>

      {showSummary && (
        <div className="tkd-wrap">
          <section className="tkd-summary" aria-live="polite">
            {summaryLoading ? (
              <p className="tkd-summary__loading"><span className="tkd-spinner" aria-hidden="true" />Lendo o chamado e a conversa…</p>
            ) : aiSummary && (
              <>
                <h2><i className="ti ti-sparkles" aria-hidden="true" />Resumo com IA</h2>
                <p>{aiSummary.summary}</p>
                {aiSummary.keyPoints.length > 0 && <ul>{aiSummary.keyPoints.map((p, i) => <li key={i}>{p}</li>)}</ul>}
                <p className="tkd-summary__next"><strong>Próximo passo sugerido:</strong> {aiSummary.suggestedNextStep}</p>
              </>
            )}
          </section>
        </div>
      )}

      <div className="tkd-wrap tkd-body">
        <main className="tkd-main">
          <section className={`tkd-next tkd-next--${next.tone}`} aria-label="Próximo passo">
            <div>
              <h2>{next.title}</h2>
              <p>{next.text}</p>
            </div>
            {next.actions && <div className="tkd-next__actions">{next.actions}</div>}
          </section>

          <section className="tkd-card" aria-labelledby="tkd-desc-title">
            <h2 id="tkd-desc-title">O que foi pedido</h2>
            <p className="tkd-desc">{ticket.description}</p>

            {(meta.medicalLeaveDays || meta.payrollMonth || meta.notes || adjustments.length > 0) && (
              <dl className="tkd-facts">
                {meta.medicalLeaveDays && <div><dt>Dias de afastamento</dt><dd>{meta.medicalLeaveDays}</dd></div>}
                {meta.payrollMonth && <div><dt>Competência</dt><dd>{meta.payrollMonth}</dd></div>}
                {adjustments.map((a, i) => (
                  <div key={i}><dt>Ajuste de ponto {adjustments.length > 1 ? i + 1 : ''}</dt><dd>{a.date || 'sem data'}, {a.correctedTime || 'sem horário'}{a.notes ? `. ${a.notes}` : ''}</dd></div>
                ))}
                {meta.notes && <div className="is-wide"><dt>Observações</dt><dd>{meta.notes}</dd></div>}
              </dl>
            )}

            {ticket.rating != null && (
              <div className="tkd-rating">
                <span aria-label={`Avaliação ${ticket.rating} de 5`}>
                  {'★'.repeat(Math.max(0, Math.min(5, Number(ticket.rating))))}
                  <span className="is-off">{'★'.repeat(Math.max(0, 5 - Math.min(5, Number(ticket.rating))))}</span>
                </span>
                {ticket.feedback?.trim() && <q>{ticket.feedback}</q>}
              </div>
            )}

            <div className="tkd-attachments">
              <TicketAttachments ticketId={ticket.id} authToken={internalToken || ''} department={ticket.department} />
            </div>
          </section>

          <section className="tkd-card tkd-chat" aria-labelledby="tkd-chat-title">
            <h2 id="tkd-chat-title">Conversa</h2>
            {messages.length === 0 ? (
              <p className="tkd-muted">Nenhuma mensagem ainda.</p>
            ) : (
              <ol className="tkd-messages">
                {messages.map((m) => {
                  const team = m.author_type === 'it_staff';
                  const author = team ? m.author_name || 'Equipe' : m.author_name || ticket.requester_name || 'Solicitante';
                  return (
                    <li key={m.id} className={`tkd-msg ${team ? 'is-team' : 'is-person'} ${m.is_internal ? 'is-note' : ''}`}>
                      <span className="tkd-msg__avatar" aria-hidden="true">{initialsOf(author)}</span>
                      <div className="tkd-msg__bubble">
                        <div className="tkd-msg__head">
                          <strong>{author}</strong>
                          {m.is_internal && <span className="tkd-msg__note"><i className="ti ti-eye-off" aria-hidden="true" />Nota interna</span>}
                          <time dateTime={m.created_at}>{formatDateTime(m.created_at)}</time>
                        </div>
                        <p>{m.message}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}

            {!closed && (
              <form className={`tkd-reply ${internalNote ? 'is-note' : ''}`} onSubmit={(e) => void sendReply(e)}>
                <div className="tkd-reply__mode" role="radiogroup" aria-label="Tipo de mensagem">
                  <button type="button" role="radio" aria-checked={!internalNote} onClick={() => setInternalNote(false)}>
                    <i className="ti ti-send" aria-hidden="true" />Responder {requester}
                  </button>
                  <button type="button" role="radio" aria-checked={internalNote} onClick={() => setInternalNote(true)}>
                    <i className="ti ti-notes" aria-hidden="true" />Nota interna
                  </button>
                </div>
                <label htmlFor="tkd-reply" className="pub-sr-only">{internalNote ? 'Nota interna' : `Resposta para ${requester}`}</label>
                <textarea
                  id="tkd-reply"
                  ref={replyRef}
                  rows={4}
                  value={reply}
                  disabled={busy}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') void sendReply(); }}
                  placeholder={internalNote ? 'Anotação que só a equipe vê…' : `Resposta que ${requester} recebe por e-mail…`}
                />
                <div className="tkd-reply__foot">
                  <span className="tkd-muted">Ctrl+Enter envia</span>
                  <button type="submit" className="tkd-btn tkd-btn--primary" disabled={busy || !reply.trim()}>
                    <i className={`ti ${internalNote ? 'ti-device-floppy' : 'ti-send'}`} aria-hidden="true" />
                    {busy ? 'Enviando…' : internalNote ? 'Salvar nota' : 'Enviar resposta'}
                  </button>
                </div>
              </form>
            )}
          </section>
        </main>

        <aside className="tkd-side">
          <section className="tkd-card tkd-person" aria-labelledby="tkd-person-title">
            <h2 id="tkd-person-title">Solicitante</h2>
            <div className="tkd-person__id">
              <span className="tkd-avatar" aria-hidden="true">{initialsOf(ticket.requester_name)}</span>
              <div>
                <strong>{ticket.requester_name || 'Sem nome'}</strong>
                <span>{[ticket.requester_department, ticket.requester_unit].filter(Boolean).join(', ') || 'Setor não informado'}</span>
              </div>
            </div>
            {ticket.requester_email && (
              <a className="tkd-mail" href={`mailto:${ticket.requester_email}`}><i className="ti ti-mail" aria-hidden="true" />{ticket.requester_email}</a>
            )}
            {ticket.requester_id && (
              <button type="button" className="tkd-linkbtn" onClick={() => void loadRequesterHistory()} aria-expanded={!!requesterHistory}>
                {requesterHistory ? 'Ocultar chamados anteriores' : 'Ver chamados anteriores'}
              </button>
            )}
            {requesterHistory && (
              requesterHistory.length === 0
                ? <p className="tkd-muted">Nenhum outro chamado desta pessoa.</p>
                : (
                  <ul className="tkd-history">
                    {requesterHistory.slice(0, 8).map((h) => (
                      <li key={h.id}>
                        <button type="button" onClick={() => navigate(`/admin/chamados/${h.id}`)}>
                          <span>{h.title}</span>
                          <small>{new Date(h.created_at).toLocaleDateString('pt-BR')}, {statusPresentation(h.status).label.toLowerCase()}</small>
                        </button>
                      </li>
                    ))}
                  </ul>
                )
            )}
          </section>

          <section className="tkd-card tkd-fields" aria-labelledby="tkd-fields-title">
            <h2 id="tkd-fields-title">Atendimento</h2>
            <label>
              <span>Responsável</span>
              <select
                value={ticket.assigned_to || ''}
                disabled={busy || !editable || closed || (!canAssignToOthers(role) && !!ticket.assigned_to && !mine)}
                onChange={(e) => {
                  const value = e.target.value || null;
                  void update(
                    value ? { assigned_to_id: value, ...(ticket.status === 'open' ? { status: 'in_progress' } : {}) } : { assigned_to_id: null, status: 'open' },
                    value ? `Chamado atribuído a ${value === myId ? 'você' : users.find((u) => u.id === value)?.name || 'outra pessoa'}.` : 'Chamado devolvido para a fila.',
                  );
                }}
              >
                <option value="">Ninguém (na fila)</option>
                {(canAssignToOthers(role) ? users : users.filter((u) => u.id === myId)).map((u) => (
                  <option key={u.id} value={u.id}>{u.id === myId ? `${u.name} (você)` : u.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Status</span>
              <select
                value={ticket.status}
                disabled={busy || !editable || closed}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === 'aguardando_aquisicao' || value === 'aguardando_terceiros') { setWaitFor(value); return; }
                  void update({ status: value }, `Status alterado para ${statusPresentation(value).label.toLowerCase()}.`);
                }}
              >
                {!STATUS_OPTIONS.some((o) => o.value === ticket.status) && <option value={ticket.status}>{status.label}</option>}
                {STATUS_OPTIONS.filter((o) => externalWaits || !isSlaPaused(o.value)).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <label>
              <span>Prioridade</span>
              <select
                value={ticket.priority}
                disabled={busy || !editable || closed}
                onChange={(e) => void update({ priority: e.target.value }, `Prioridade alterada para ${(PRIORITY_LABEL[e.target.value] || e.target.value).toLowerCase()}.`)}
              >
                {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            {(ticket.department || 'ti') === 'ti' && (
              <label>
                <span>Equipamento</span>
                <select
                  value={ticket.linked_equipment_id || ''}
                  disabled={busy || !editable}
                  onChange={(e) => void update({ linked_equipment_id: e.target.value || null }, e.target.value ? 'Equipamento vinculado.' : 'Equipamento desvinculado.')}
                >
                  <option value="">Nenhum</option>
                  {equipment.map((eq) => <option key={eq.id} value={eq.id}>{eq.internal_code}, {eq.brand} {eq.model}</option>)}
                </select>
              </label>
            )}
            {linkedEquipment && (
              <button type="button" className="tkd-linkbtn" onClick={() => navigate(`/inventario/equipamento/${linkedEquipment.id}`)}>
                Abrir ficha de {linkedEquipment.internal_code}
              </button>
            )}

            {waitFor && (
              <form className="tkd-wait" onSubmit={(e) => void submitWait(e)}>
                <label htmlFor="tkd-wait-reason">
                  {waitFor === 'aguardando_aquisicao' ? 'O que precisa ser comprado?' : 'O que está sendo aguardado?'}
                </label>
                <input
                  id="tkd-wait-reason"
                  autoFocus
                  maxLength={280}
                  value={waitReason}
                  onChange={(e) => setWaitReason(e.target.value)}
                  placeholder={waitFor === 'aguardando_aquisicao' ? 'Ex.: fonte 500W' : 'Ex.: enviado à assistência'}
                />
                <p className="tkd-muted">O prazo fica pausado enquanto o chamado estiver em espera.</p>
                <div>
                  <button type="button" className="tkd-btn" onClick={() => setWaitFor(null)}>Cancelar</button>
                  <button type="submit" className="tkd-btn tkd-btn--primary" disabled={busy}>Colocar em espera</button>
                </div>
              </form>
            )}

            {mine && !finished && !closed && !waitFor && (
              <div className="tkd-more">
                {ticket.status !== 'waiting_user' && (
                  <button type="button" onClick={() => void waitUser()} disabled={busy}><i className="ti ti-hourglass" aria-hidden="true" />Aguardar solicitante</button>
                )}
                {externalWaits && !paused && (
                  <>
                    <button type="button" onClick={() => setWaitFor('aguardando_aquisicao')} disabled={busy}><i className="ti ti-shopping-cart" aria-hidden="true" />Aguardar compra</button>
                    <button type="button" onClick={() => setWaitFor('aguardando_terceiros')} disabled={busy}><i className="ti ti-building-store" aria-hidden="true" />Aguardar terceiros</button>
                  </>
                )}
                <button type="button" onClick={() => void unassign()} disabled={busy}><i className="ti ti-arrow-back-up" aria-hidden="true" />Devolver para a fila</button>
                <button type="button" onClick={() => focusReply(true)}><i className="ti ti-notes" aria-hidden="true" />Nota interna</button>
              </div>
            )}
          </section>

          <section className="tkd-card tkd-log" aria-labelledby="tkd-log-title">
            <h2 id="tkd-log-title">Linha do tempo</h2>
            <TicketTimeline events={timeline} loading={timelineLoading} />
          </section>
        </aside>
      </div>

      <ConfirmDialog
        isOpen={confirmClose}
        title="Encerrar este chamado?"
        message="O chamado sai da fila e não pode mais ser reaberto pelo solicitante."
        confirmText="Encerrar"
        cancelText="Cancelar"
        type="warning"
        onConfirm={() => { setConfirmClose(false); void closeForGood(); }}
        onCancel={() => setConfirmClose(false)}
      />
    </div>
  );
}
