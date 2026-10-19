import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import TicketAttachments from '../components/TicketAttachments';
import '../styles/TicketDetailPage.css';
import { BACKEND_URL } from '../services/api';

interface TicketDetail {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  type: string;
  department?: string;
  category?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  confirmation_requested_at?: string;
  confirmation_response_at?: string;
  confirmed_resolved?: boolean;
  auto_closed?: boolean;
  closed_at?: string;
  rating?: number | null;
  feedback?: string | null;
  rated_at?: string | null;
  sla_due_at?: string | null;
  requester_closure?: 'self_resolved' | 'not_needed' | null;
  requester_closure_note?: string | null;
  pause_reason?: string | null;
  queue_visibility?: {
    state: 'waiting' | 'in_service';
    position: number | null;
    ahead: number;
    totalWaiting: number | null;
    priorityCanChangeOrder?: boolean;
    updatedAt: string;
  } | null;
}

/** Estados em que o solicitante pode encerrar sozinho (espelha o backend). */
const REQUESTER_CLOSABLE = ['open', 'in_progress', 'waiting_user', 'aguardando_aquisicao', 'aguardando_terceiros'];

interface Message {
  id: string;
  message: string;
  author_type: string;
  author_name?: string;
  created_at: string;
  is_internal: boolean;
}

interface HistoryItem {
  id: string;
  action: string;
  changed_by_type: string;
  changed_by_name?: string;
  old_value?: string | null;
  new_value?: string | null;
  metadata?: Record<string, any> | null;
  created_at: string;
}

/** Previsão de atendimento, em palavras de quem pediu. */
const formatEstimatedTime = (slaDueAt: string | null | undefined, nowMs: number): { text: string; late: boolean } | null => {
  if (!slaDueAt) return null;

  const diffMs = new Date(slaDueAt).getTime() - nowMs;
  if (diffMs <= 0) return { text: 'Passou do prazo previsto para o atendimento.', late: true };

  // Arredonda em minutos inteiros antes de separar, senão 4h59,6 vira "4h 60min".
  const totalMinutes = Math.max(1, Math.ceil(diffMs / 60000));
  if (totalMinutes < 24 * 60) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const parts = [hours > 0 ? `${hours}h` : '', minutes > 0 ? `${minutes}min` : ''].filter(Boolean);
    return { text: `Previsão de atendimento: em até ${parts.join(' ')}.`, late: false };
  }

  const dueDate = new Date(slaDueAt);
  const formattedDate = dueDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const formattedTime = dueDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return { text: `Previsão de atendimento: até ${formattedDate} às ${formattedTime}.`, late: false };
};

/** Cada equipe tem nome e cor próprios no portal (TI verde, Administrativo âmbar, RH violeta). */
const TEAM: Record<string, { tone: 'ti' | 'administrativo' | 'rh'; label: string; name: string; icon: string }> = {
  ti: { tone: 'ti', label: 'Suporte de TI', name: 'equipe de TI', icon: 'ti-device-laptop' },
  administrativo: { tone: 'administrativo', label: 'Administrativo', name: 'equipe do Administrativo', icon: 'ti-building' },
  rh: { tone: 'rh', label: 'Recursos Humanos', name: 'equipe de RH', icon: 'ti-users' },
};

const TYPE_LABEL: Record<string, string> = {
  incident: 'Incidente',
  request: 'Solicitação',
  change: 'Mudança',
  problem: 'Problema',
};

const PRIORITY_LABEL: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
  critical: 'Crítica',
};

const formatWhen = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '';

const initialsOf = (name?: string | null) => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
};

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Erro de uma ação (enviar, confirmar, avaliar) aparece no lugar dela,
  // sem tirar a pessoa da página.
  const [actionError, setActionError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittingConfirmation, setSubmittingConfirmation] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [showReopenForm, setShowReopenForm] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [nowMs, setNowMs] = useState<number>(Date.now());
  // Encerrar pelo próprio solicitante ("já resolvi" / "não preciso mais").
  const [closeOpen, setCloseOpen] = useState(false);
  const [closeReason, setCloseReason] = useState<'self_resolved' | 'not_needed' | null>(null);
  const [closeNote, setCloseNote] = useState('');
  const [submittingClose, setSubmittingClose] = useState(false);
  const [closeError, setCloseError] = useState('');

  const token = searchParams.get('token');
  const internalToken = localStorage.getItem('internal_token');
  // Alguém da equipe logado também pode ser o solicitante: quando abriu este
  // chamado por este navegador (ticket_token_<id>) ou é do RH, que só atende
  // chamados do RH e usa esta tela para acompanhar o que pediu a outras
  // equipes. Nesses casos ele age como solicitante, com o acesso público.
  const ownTicketToken = id ? localStorage.getItem(`ticket_token_${id}`) : null;
  const internalRole = (() => {
    try {
      return JSON.parse(localStorage.getItem('internal_user') || 'null')?.role ?? null;
    } catch {
      return null;
    }
  })();
  const actsAsRequester = !!internalToken && (internalRole === 'rh_staff' || !!ownTicketToken);
  const isInternalUser = !!internalToken && !actsAsRequester;
  const userToken = ownTicketToken || localStorage.getItem('user_token');

  useEffect(() => {
    if (id) {
      fetchTicket(id);
    }
  }, [id]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!id) return;
    const interval = window.setInterval(() => {
      silentRefresh(id, true);
    }, 30000);
    return () => window.clearInterval(interval);
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const handleRealtimeUpdate = (event: Event) => {
      const custom = event as CustomEvent<any>;
      if (custom.detail?.ticketId === id) {
        silentRefresh(id, true);
      }
    };

    window.addEventListener('ticket:updated', handleRealtimeUpdate);
    window.addEventListener('ticket:resolved', handleRealtimeUpdate);
    window.addEventListener('ticket:reopened', handleRealtimeUpdate);

    return () => {
      window.removeEventListener('ticket:updated', handleRealtimeUpdate);
      window.removeEventListener('ticket:resolved', handleRealtimeUpdate);
      window.removeEventListener('ticket:reopened', handleRealtimeUpdate);
    };
  }, [id]);

  const buildHeaders = () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (isInternalUser && internalToken) {
      headers['Authorization'] = `Bearer ${internalToken}`;
    } else if (token) {
      headers['X-User-Token'] = token;
    } else if (userToken) {
      headers['X-User-Token'] = userToken;
    }

    return headers;
  };

  const buildAccessErrorMessage = (status: number) => {
    const hasPublicToken = Boolean(token || userToken);

    if (status === 401) {
      if (isInternalUser) {
        return 'Sua sessao expirou. Faca login novamente para acessar o chamado.';
      }
      if (!hasPublicToken) {
        return 'Este link precisa do token de acesso. Abra o chamado pelo link do email ou solicite um novo.';
      }
      return 'Token invalido ou expirado. Abra o link mais recente do email ou solicite um novo.';
    }

    if (status === 403) {
      return 'Voce nao tem permissao para acessar este chamado.';
    }

    if (status === 404) {
      return 'Chamado nao encontrado.';
    }

    return 'Erro ao carregar chamado.';
  };

  const fetchTicket = async (ticketId: string) => {
    try {
      setLoading(true);
      setError('');
      const headers = buildHeaders();

      const [ticketRes, messagesRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/tickets/${ticketId}`, { headers }),
        fetch(`${BACKEND_URL}/api/tickets/${ticketId}/messages`, { headers }),
      ]);

      if (!ticketRes.ok) {
        throw new Error(buildAccessErrorMessage(ticketRes.status));
      }

      const ticketData = await ticketRes.json();
      setTicket(ticketData);

      if (messagesRes.ok) {
        const messagesData = await messagesRes.json();
        setMessages(messagesData.messages || []);
      }

      const historyRes = await fetch(`${BACKEND_URL}/api/tickets/${ticketId}/history`, { headers });
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setHistory(historyData.history || []);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar chamado');
    } finally {
      setLoading(false);
    }
  };

  const silentRefresh = async (ticketId: string, updateStatus = true) => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      Object.assign(headers, buildHeaders());
      const [ticketRes, messagesRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/tickets/${ticketId}`, { headers }),
        fetch(`${BACKEND_URL}/api/tickets/${ticketId}/messages`, { headers }),
      ]);
      if (ticketRes.ok && updateStatus) {
        const ticketData = await ticketRes.json();
        setTicket(ticketData);
      }
      if (messagesRes.ok) {
        const messagesData = await messagesRes.json();
        setMessages(messagesData.messages || []);
      }

      const historyRes = await fetch(`${BACKEND_URL}/api/tickets/${ticketId}/history`, { headers });
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setHistory(historyData.history || []);
      }
    } catch (err) {
      console.error('Silent refresh error:', err);
    }
  };

  const handleAddMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !id) return;
    
    // Usuário interno pode enviar sem token público
    if (!isInternalUser && !token && !userToken) return;

    try {
      setSubmitting(true);
      const headers = buildHeaders();

      const response = await fetch(`${BACKEND_URL}/api/tickets/${id}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: newMessage,
          is_internal: isInternalUser,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao adicionar mensagem');
      }

      const responseData = await response.json();
      setNewMessage('');

      // Aplica imediatamente o status retornado pelo backend (garantia visual rápida)
      if (responseData.ticket_status) {
        setTicket(prev => prev ? { ...prev, status: responseData.ticket_status } : prev);
      } else if (!isInternalUser && ticket?.status === 'waiting_user') {
        // Fallback otimista: usuário público respondeu ticket em aguardando
        setTicket(prev => prev ? { ...prev, status: 'in_progress' } : prev);
      }

      // Confirma status do banco e atualiza mensagens.
      // O backend só envia a resposta APÓS gravar o UPDATE no DB,
      // então ao chegar aqui o status correto já está persistido.
      await silentRefresh(id, true);
      setSuccessMessage('Mensagem enviada com sucesso.');
    } catch (err: any) {
      setActionError(err.message || 'Erro ao adicionar mensagem');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseByRequester = async () => {
    if (!id || isInternalUser || !closeReason) return;
    try {
      setSubmittingClose(true);
      setCloseError('');
      const response = await fetch(`${BACKEND_URL}/api/tickets/${id}/close-by-requester`, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({ reason: closeReason, note: closeNote.trim() || undefined }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível encerrar o chamado');

      await fetchTicket(id);
      setCloseOpen(false);
      setCloseReason(null);
      setCloseNote('');
      setSuccessMessage('Chamado encerrado. A equipe foi avisada.');
    } catch (err: any) {
      setCloseError(err.message || 'Não foi possível encerrar o chamado');
    } finally {
      setSubmittingClose(false);
    }
  };

  const handleReopenByRequester = async () => {
    if (!id || isInternalUser) return;
    try {
      setSubmittingClose(true);
      setCloseError('');
      const response = await fetch(`${BACKEND_URL}/api/tickets/${id}/reopen-by-requester`, {
        method: 'POST',
        headers: buildHeaders(),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível reabrir o chamado');

      await fetchTicket(id);
      setSuccessMessage('Chamado reaberto. Ele voltou para a fila da equipe.');
    } catch (err: any) {
      setCloseError(err.message || 'Não foi possível reabrir o chamado');
    } finally {
      setSubmittingClose(false);
    }
  };

  const handleConfirmResolution = async (resolved: boolean, reason?: string) => {
    if (!id || isInternalUser) return;

    try {
      setSubmittingConfirmation(true);
      setActionError('');

      const response = await fetch(`${BACKEND_URL}/api/tickets/${id}/confirm-resolution`, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({ resolved, reopen_reason: reason }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Falha ao confirmar resolução');
      }

      await fetchTicket(id);

      if (resolved) {
        setShowRatingModal(true);
        setSuccessMessage('Obrigado! Sua confirmação foi registrada.');
      } else {
        setShowReopenForm(false);
        setReopenReason('');
        setSuccessMessage('Chamado reaberto. A equipe foi notificada para continuar o atendimento.');
      }
    } catch (err: any) {
      setActionError(err.message || 'Falha ao confirmar resolução');
    } finally {
      setSubmittingConfirmation(false);
    }
  };

  const handleSubmitRating = async () => {
    if (!id || isInternalUser) return;

    try {
      setSubmittingRating(true);
      setActionError('');

      const response = await fetch(`${BACKEND_URL}/api/tickets/${id}/rating`, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({ rating: ratingValue, feedback: ratingFeedback || undefined }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Falha ao registrar avaliação');
      }

      setShowRatingModal(false);
      setRatingFeedback('');
      setSuccessMessage('Avaliação enviada. Obrigado pelo feedback!');
      await fetchTicket(id);
    } catch (err: any) {
      setActionError(err.message || 'Falha ao registrar avaliação');
    } finally {
      setSubmittingRating(false);
    }
  };

  const getInternalRole = () => {
    try {
      const userData = localStorage.getItem('internal_user');
      if (!userData) return null;
      const parsed = JSON.parse(userData);
      return parsed?.role || null;
    } catch {
      return null;
    }
  };

  const canManualClose = () => {
    const role = getInternalRole();
    return role === 'it_staff' || role === 'admin_staff' || role === 'admin' || role === 'manager' || role === 'gestor';
  };

  const handleManualClose = async () => {
    if (!id || !isInternalUser || !canManualClose()) return;

    try {
      setSubmittingConfirmation(true);
      setActionError('');

      const response = await fetch(`${BACKEND_URL}/api/tickets/${id}/manual-close`, {
        method: 'POST',
        headers: buildHeaders(),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Falha ao encerrar chamado');
      }

      setSuccessMessage('Chamado encerrado manualmente pelo atendente.');
      await fetchTicket(id);
    } catch (err: any) {
      setActionError(err.message || 'Falha ao encerrar chamado');
    } finally {
      setSubmittingConfirmation(false);
    }
  };

  const getAutoCloseTimeText = () => {
    if (!ticket?.confirmation_requested_at) return null;

    const requestedAt = new Date(ticket.confirmation_requested_at).getTime();
    const deadline = requestedAt + 48 * 60 * 60 * 1000;
    const remainingMs = deadline - nowMs;

    if (remainingMs <= 0) {
      return 'O prazo de confirmação já expirou.';
    }

    const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
    if (remainingHours < 24) {
      return `Faltam aproximadamente ${remainingHours}h para o encerramento automático.`;
    }

    const remainingDays = Math.floor(remainingHours / 24);
    const hoursRemainder = remainingHours % 24;
    return `Faltam aproximadamente ${remainingDays}d e ${hoursRemainder}h para o encerramento automático.`;
  };

  const getTimelineLabel = (action: string) => {
    const labels: Record<string, string> = {
      created: 'Abertura do chamado',
      assigned: 'Chamado atribuído',
      unassigned: 'Responsável removido',
      status_changed: 'Status alterado',
      marked_resolved_pending_confirmation: 'Resolvido e aguardando confirmação',
      confirmed_by_requester: 'Confirmado pelo usuário',
      reopened_by_requester: 'Reaberto pelo usuário',
      reopened_by_message: 'Reaberto por mensagem',
      rating_submitted: 'Avaliação registrada',
      manual_closed_by_staff: 'Encerrado manualmente',
      auto_close_warning_sent: 'Aviso de encerramento automático enviado',
      auto_closed_after_confirmation_timeout: 'Encerrado automaticamente',
      message_added: 'Nova mensagem',
      priority_changed: 'Prioridade alterada',
      pause_reason_added: 'Motivo da espera registrado',
      closed_by_requester: 'Encerrado por você',
    };
    return labels[action] || action;
  };

  if (loading) {
    return (
      <div className="pub-page tkp">
        <header className="tkp-hero pub-aurora">
          <div className="pub-wrap tkp-wrap tkp-hero__inner">
            <span className="tkp-ghost tkp-ghost--line" />
            <span className="tkp-ghost tkp-ghost--title" />
          </div>
        </header>
        <div className="pub-wrap tkp-wrap tkp-body" aria-busy="true" aria-label="Carregando chamado">
          <div className="tkp-ghost tkp-ghost--card" />
          <div className="tkp-ghost tkp-ghost--card" />
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="pub-page tkp">
        <header className="tkp-hero pub-aurora">
          <div className="pub-wrap tkp-wrap tkp-hero__inner">
            <a className="tkp-back" href="/meus-chamados">
              <i className="ti ti-chevron-left" aria-hidden="true" />
              Meus chamados
            </a>
            <h1 className="tkp-title">Não foi possível abrir este chamado</h1>
          </div>
        </header>
        <div className="pub-wrap tkp-wrap tkp-body">
          <section className="tkp-now tkp-now--blocked">
            <p className="pub-alert" role="alert">
              <i className="ti ti-alert-circle" aria-hidden="true" />
              <span>{error || 'Chamado não encontrado.'}</span>
            </p>
            <a href="/meus-chamados" className="pub-btn pub-btn--primary">Ver meus chamados</a>
          </section>
        </div>
      </div>
    );
  }

  const team = TEAM[ticket.department || 'ti'] ?? TEAM.ti;
  const isAdm = ticket.department === 'administrativo';
  const protocol = ticket.id.substring(0, 8).toUpperCase();
  const status = ticket.status;
  const finishedStates = ['resolved', 'closed', 'cancelled'];
  const canReply = !['closed', 'resolved', 'aguardando_confirmacao', 'cancelled'].includes(status);
  const visibleMessages = messages.filter((m) => !m.is_internal);
  const estimate = ['open', 'in_progress'].includes(status) ? formatEstimatedTime(ticket.sla_due_at, nowMs) : null;
  const queue = ticket.queue_visibility;
  const normalizedRating = ticket.rating !== null && ticket.rating !== undefined ? Number(ticket.rating) : null;
  // Mesma janela que o backend aplica em /reopen-by-requester.
  const canReopenRequesterClosure = status === 'cancelled'
    && !!ticket.requester_closure
    && !!ticket.closed_at
    && nowMs - new Date(ticket.closed_at).getTime() <= 7 * 86400000;

  // Em que trecho da jornada o chamado está — as mesmas três etapas da trilha
  // de "Meus chamados", para a pessoa reconhecer o desenho.
  const stage = status === 'open' ? 1 : finishedStates.includes(status) || status === 'aguardando_confirmacao' ? 3 : 2;
  const stageDone = finishedStates.includes(status);
  const steps = ['Recebido', 'Em atendimento', status === 'cancelled' ? 'Encerrado' : 'Concluído'];

  const focusReply = () => {
    replyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => replyRef.current?.focus(), 350);
  };

  // O que está acontecendo agora, e de quem é a vez.
  const now = ((): { tone: 'team' | 'you' | 'paused' | 'done'; icon: string; title: string; text: string } => {
    switch (status) {
      case 'open':
        return {
          tone: 'team',
          icon: 'ti-inbox',
          title: `Na fila da ${team.name}`,
          text: queue?.state === 'waiting' && typeof queue.ahead === 'number'
            ? queue.ahead === 0
              ? 'Seu pedido é o próximo da fila.'
              : `${queue.ahead === 1 ? 'Há 1 pedido' : `Há ${queue.ahead} pedidos`} na frente do seu.`
            : 'Seu pedido chegou. Alguém da equipe vai assumir em breve.',
        };
      case 'in_progress':
        return {
          tone: 'team',
          icon: 'ti-tool',
          title: 'Em atendimento',
          text: `A ${team.name} já está cuidando do seu pedido.`,
        };
      case 'waiting_user':
        return {
          tone: 'you',
          icon: 'ti-message-question',
          title: 'A equipe precisa de você',
          text: 'Responda na conversa abaixo para o atendimento continuar.',
        };
      case 'aguardando_aquisicao':
        return {
          tone: 'paused',
          icon: 'ti-shopping-cart',
          title: 'Aguardando compra',
          text: 'A equipe espera a compra ou a chegada do material. Você não precisa fazer nada; avisamos quando o atendimento voltar.',
        };
      case 'aguardando_terceiros':
        return {
          tone: 'paused',
          icon: 'ti-building-store',
          title: isAdm ? 'Aguardando serviço externo' : 'Aguardando terceiros',
          text: isAdm
            ? 'A equipe espera um técnico ou prestador de fora. Você não precisa fazer nada; avisamos quando o atendimento voltar.'
            : 'A equipe espera o retorno de um fornecedor ou assistência. Você não precisa fazer nada; avisamos quando o atendimento voltar.',
        };
      case 'aguardando_confirmacao':
        return {
          tone: 'you',
          icon: 'ti-circle-check',
          title: 'Seu problema foi resolvido?',
          text: 'A equipe marcou o pedido como resolvido. Confirme para encerrar, ou diga o que ainda falta.',
        };
      case 'resolved':
        return { tone: 'done', icon: 'ti-circle-check', title: 'Resolvido', text: 'A equipe concluiu o atendimento.' };
      case 'closed':
        return {
          tone: 'done',
          icon: 'ti-circle-check',
          title: 'Concluído',
          text: ticket.auto_closed
            ? 'O chamado foi encerrado automaticamente depois de dois dias sem confirmação.'
            : 'Atendimento encerrado. Obrigado por avisar a equipe.',
        };
      case 'cancelled':
        return ticket.requester_closure === 'not_needed'
          ? { tone: 'done', icon: 'ti-circle-minus', title: 'Você não precisa mais deste atendimento', text: 'O chamado foi encerrado e a equipe foi avisada.' }
          : { tone: 'done', icon: 'ti-circle-check', title: 'Você resolveu por conta própria', text: 'O chamado foi encerrado e a equipe foi avisada.' };
      default:
        return { tone: 'team', icon: 'ti-progress', title: 'Em andamento', text: 'Seu pedido está com a equipe.' };
    }
  })();

  const canRate = !isInternalUser && status === 'closed' && ticket.confirmed_resolved && normalizedRating === null;

  return (
    <div className={`pub-page tkp tkp--${team.tone}`}>
      <header className="tkp-hero pub-aurora">
        <div className="pub-wrap tkp-wrap tkp-hero__inner">
          <a className="tkp-back" href="/meus-chamados">
            <i className="ti ti-chevron-left" aria-hidden="true" />
            Meus chamados
          </a>
          <div className="tkp-team">
            <span className={`pub-gicon pub-gicon--${team.tone} tkp-team__icon`} aria-hidden="true">
              <i className={`ti ${team.icon}`} />
            </span>
            <span>{team.label}</span>
            <span className="tkp-protocol">Protocolo {protocol}</span>
          </div>
          <h1 className="tkp-title">{ticket.title}</h1>
          <p className="tkp-opened">
            Aberto em {new Date(ticket.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
            {' às '}
            {new Date(ticket.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </header>

      <div className="pub-wrap tkp-wrap tkp-body">
        {successMessage && (
          <p className="tkp-ok" role="status">
            <i className="ti ti-circle-check" aria-hidden="true" />
            <span>{successMessage}</span>
          </p>
        )}

        {/* Agora: onde o pedido está e o que (se algo) depende da pessoa. */}
        <section className={`tkp-now tkp-now--${now.tone}`} aria-labelledby="tkp-now-title">
          <ol className="tkp-rail" aria-label="Etapas do atendimento">
            {steps.map((label, index) => {
              const n = index + 1;
              const done = n < stage || (n === stage && stageDone);
              const current = n === stage && !stageDone;
              return (
                <li
                  key={label}
                  className={`${done ? 'is-done' : ''} ${current ? 'is-current' : ''}`}
                  aria-current={current ? 'step' : undefined}
                >
                  <span className="tkp-rail__bar" />
                  <span className="tkp-rail__label">{label}</span>
                </li>
              );
            })}
          </ol>

          <div className="tkp-now__head">
            <span className="tkp-now__icon" aria-hidden="true"><i className={`ti ${now.icon}`} /></span>
            <div>
              <h2 id="tkp-now-title">{now.title}</h2>
              <p>{now.text}</p>
              {(status === 'aguardando_aquisicao' || status === 'aguardando_terceiros') && ticket.pause_reason && (
                <p className="tkp-now__detail">Aguardando: {ticket.pause_reason}</p>
              )}
              {status === 'cancelled' && ticket.requester_closure_note && (
                <p className="tkp-now__detail">“{ticket.requester_closure_note}”</p>
              )}
              {estimate && (
                <p className={`tkp-now__eta ${estimate.late ? 'is-late' : ''}`}>
                  <i className="ti ti-clock" aria-hidden="true" />
                  {estimate.text}
                </p>
              )}
              {status === 'aguardando_confirmacao' && getAutoCloseTimeText() && (
                <p className="tkp-now__eta">
                  <i className="ti ti-clock" aria-hidden="true" />
                  {getAutoCloseTimeText()}
                </p>
              )}
            </div>
          </div>

          {actionError && (
            <p className="pub-alert tkp-now__error" role="alert">
              <i className="ti ti-alert-circle" aria-hidden="true" />
              <span>{actionError}</span>
            </p>
          )}

          {!isInternalUser && status === 'waiting_user' && (
            <div className="tkp-now__actions">
              <button type="button" className="pub-btn pub-btn--sun" onClick={focusReply}>
                <i className="ti ti-message-reply" aria-hidden="true" />
                Responder agora
              </button>
            </div>
          )}

          {!isInternalUser && status === 'aguardando_confirmacao' && !showReopenForm && (
            <div className="tkp-now__actions">
              <button
                type="button"
                className="pub-btn pub-btn--primary"
                disabled={submittingConfirmation}
                onClick={() => handleConfirmResolution(true)}
              >
                <i className="ti ti-check" aria-hidden="true" />
                {submittingConfirmation ? 'Confirmando…' : 'Sim, foi resolvido'}
              </button>
              <button
                type="button"
                className="pub-btn pub-btn--ghost"
                disabled={submittingConfirmation}
                onClick={() => setShowReopenForm(true)}
              >
                Ainda preciso de ajuda
              </button>
            </div>
          )}

          {!isInternalUser && status === 'aguardando_confirmacao' && showReopenForm && (
            <form
              className="tkp-reopen"
              onSubmit={(e) => { e.preventDefault(); void handleConfirmResolution(false, reopenReason.trim()); }}
            >
              <div className="pub-field">
                <label htmlFor="tkp-reopen-reason">O que ainda não foi resolvido?</label>
                <textarea
                  id="tkp-reopen-reason"
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  rows={3}
                  autoFocus
                  placeholder="Ex.: a impressora voltou a travar depois de algumas folhas"
                />
                <span className="pub-field__hint">Escreva pelo menos 10 letras para a equipe entender.</span>
              </div>
              <div className="tkp-now__actions">
                <button
                  type="submit"
                  className="pub-btn pub-btn--primary"
                  disabled={submittingConfirmation || reopenReason.trim().length < 10}
                >
                  {submittingConfirmation ? 'Reabrindo…' : 'Reabrir chamado'}
                </button>
                <button
                  type="button"
                  className="pub-btn pub-btn--ghost"
                  onClick={() => { setShowReopenForm(false); setReopenReason(''); }}
                  disabled={submittingConfirmation}
                >
                  Voltar
                </button>
              </div>
            </form>
          )}

          {isInternalUser && status === 'aguardando_confirmacao' && canManualClose() && (
            <div className="tkp-now__actions">
              <button type="button" className="pub-btn pub-btn--ghost" disabled={submittingConfirmation} onClick={handleManualClose}>
                {submittingConfirmation ? 'Encerrando…' : 'Encerrar chamado'}
              </button>
            </div>
          )}

          {canRate && (
            <div className="tkp-now__actions">
              <button type="button" className="pub-btn pub-btn--sun" onClick={() => setShowRatingModal(true)}>
                <i className="ti ti-star" aria-hidden="true" />
                Avaliar o atendimento
              </button>
            </div>
          )}

          {normalizedRating !== null && (
            <p className="tkp-rated" aria-label={`Sua avaliação: ${normalizedRating} de 5`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <i key={n} className={`ti ${n <= normalizedRating ? 'ti-star-filled' : 'ti-star'}`} aria-hidden="true" />
              ))}
              <span>Sua avaliação</span>
            </p>
          )}

          {!isInternalUser && status === 'cancelled' && canReopenRequesterClosure && (
            <div className="tkp-now__actions">
              <button type="button" className="pub-btn pub-btn--ghost" onClick={() => void handleReopenByRequester()} disabled={submittingClose}>
                <i className="ti ti-arrow-back-up" aria-hidden="true" />
                {submittingClose ? 'Reabrindo…' : 'Reabrir chamado'}
              </button>
            </div>
          )}
          {status === 'cancelled' && closeError && (
            <p className="pub-alert tkp-now__error" role="alert">
              <i className="ti ti-alert-circle" aria-hidden="true" />
              <span>{closeError}</span>
            </p>
          )}
        </section>

        {/* Encerrar pelo próprio solicitante. Discreto até a pessoa escolher:
            a maioria dos chamados ainda precisa da equipe. */}
        {!isInternalUser && REQUESTER_CLOSABLE.includes(status) && (
          <section className={`rq-close ${closeOpen ? 'is-open' : ''}`} aria-labelledby="rq-close-title">
            {!closeOpen ? (
              <div className="rq-close__bar">
                <div className="rq-close__copy">
                  <h2 id="rq-close-title">Já resolveu ou não precisa mais?</h2>
                  <p>Encerre o chamado para a equipe não continuar trabalhando nele à toa.</p>
                </div>
                <button type="button" className="rq-close__open" onClick={() => { setCloseOpen(true); setCloseError(''); }}>
                  Encerrar chamado
                </button>
              </div>
            ) : (
              <form className="rq-close__form" onSubmit={(e) => { e.preventDefault(); void handleCloseByRequester(); }}>
                <h2 id="rq-close-title">Por que você quer encerrar?</h2>
                <div className="rq-close__choices" role="radiogroup" aria-label="Motivo do encerramento">
                  {([
                    { value: 'self_resolved', icon: 'ti-circle-check', title: 'Já resolvi', text: 'Consegui resolver por conta própria.' },
                    { value: 'not_needed', icon: 'ti-circle-minus', title: 'Não preciso mais', text: 'O pedido deixou de ser necessário.' },
                  ] as const).map((choice) => (
                    <label key={choice.value} className={`rq-close__choice ${closeReason === choice.value ? 'is-picked' : ''}`}>
                      <input
                        type="radio"
                        name="rq-close-reason"
                        value={choice.value}
                        checked={closeReason === choice.value}
                        onChange={() => setCloseReason(choice.value)}
                      />
                      <i className={`ti ${choice.icon}`} aria-hidden="true" />
                      <span>
                        <strong>{choice.title}</strong>
                        <small>{choice.text}</small>
                      </span>
                    </label>
                  ))}
                </div>

                {closeReason && (
                  <div className="pub-field rq-close__note">
                    <label htmlFor="rq-close-note">
                      {closeReason === 'self_resolved' ? 'Quer contar o que você fez?' : 'Quer contar o motivo?'}
                      {' '}<span className="pub-field__optional">(opcional)</span>
                    </label>
                    <textarea
                      id="rq-close-note"
                      rows={2}
                      maxLength={500}
                      value={closeNote}
                      onChange={(e) => setCloseNote(e.target.value)}
                      placeholder={closeReason === 'self_resolved'
                        ? 'Ex.: reiniciei o computador e voltou a funcionar'
                        : 'Ex.: a reunião foi cancelada'}
                    />
                    {closeReason === 'self_resolved' && (
                      <span className="pub-field__hint">Isso ajuda a equipe a orientar outras pessoas com o mesmo problema.</span>
                    )}
                  </div>
                )}

                {closeError && (
                  <p className="pub-alert" role="alert">
                    <i className="ti ti-alert-circle" aria-hidden="true" />
                    <span>{closeError}</span>
                  </p>
                )}

                <div className="rq-close__actions">
                  <button type="submit" className="pub-btn pub-btn--primary" disabled={!closeReason || submittingClose}>
                    {submittingClose ? 'Encerrando…' : 'Encerrar chamado'}
                  </button>
                  <button
                    type="button"
                    className="pub-btn pub-btn--ghost"
                    onClick={() => { setCloseOpen(false); setCloseReason(null); setCloseNote(''); setCloseError(''); }}
                    disabled={submittingClose}
                  >
                    Voltar
                  </button>
                </div>
                <p className="rq-close__fine">A equipe é avisada. Se mudar de ideia, dá para reabrir por 7 dias.</p>
              </form>
            )}
          </section>
        )}

        {/* Conversa: o pedido original abre o fio, como a primeira mensagem. */}
        <section className="tkp-talk" aria-labelledby="tkp-talk-title">
          <h2 id="tkp-talk-title" className="tkp-h2">Conversa com a {team.name}</h2>
          <ol className="tkp-thread">
            <li className="tkp-msg tkp-msg--me">
              <div className="tkp-msg__bubble">
                <span className="tkp-msg__who">
                  Seu pedido
                  <time dateTime={ticket.created_at}>{formatWhen(ticket.created_at)}</time>
                </span>
                <p>{ticket.description}</p>
              </div>
            </li>
            {visibleMessages.map((msg) => {
              const isStaff = msg.author_type !== 'public';
              const name = isStaff ? msg.author_name || team.label : 'Você';
              return (
                <li key={msg.id} className={`tkp-msg ${isStaff ? 'tkp-msg--team' : 'tkp-msg--me'}`}>
                  {isStaff && (
                    <span className="tkp-msg__avatar" aria-hidden="true">
                      {initialsOf(msg.author_name) || <i className={`ti ${team.icon}`} />}
                    </span>
                  )}
                  <div className="tkp-msg__bubble">
                    <span className="tkp-msg__who">
                      {name}
                      <time dateTime={msg.created_at}>{formatWhen(msg.created_at)}</time>
                    </span>
                    <p>{msg.message}</p>
                  </div>
                </li>
              );
            })}
          </ol>

          {visibleMessages.length === 0 && canReply && (
            <p className="tkp-quiet">A resposta da equipe aparece aqui. Você também recebe um aviso por e-mail.</p>
          )}

          {canReply && (
            <form onSubmit={handleAddMessage} className={`tkp-compose ${status === 'waiting_user' ? 'is-asked' : ''}`}>
              <label htmlFor="tkp-reply">
                {status === 'waiting_user' ? 'A equipe espera sua resposta' : 'Escrever para a equipe'}
              </label>
              <textarea
                id="tkp-reply"
                ref={replyRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Escreva sua mensagem"
                rows={3}
              />
              <div className="tkp-compose__bar">
                <button type="submit" className="pub-btn pub-btn--primary" disabled={submitting || !newMessage.trim()}>
                  <i className="ti ti-send" aria-hidden="true" />
                  {submitting ? 'Enviando…' : 'Enviar mensagem'}
                </button>
              </div>
            </form>
          )}
        </section>

        <section className="tkp-attach" aria-label="Anexos">
          <TicketAttachments
            ticketId={id!}
            userToken={token || userToken || undefined}
            authToken={isInternalUser && internalToken ? internalToken : undefined}
            department={ticket.department}
          />
        </section>

        {/* Histórico e dados de referência: úteis às vezes, nunca no caminho. */}
        <details className="tkp-more">
          <summary>
            <span>Histórico e detalhes</span>
            <i className="ti ti-chevron-down" aria-hidden="true" />
          </summary>

          <div className="tkp-more__body">
            {history.length === 0 ? (
              <p className="tkp-quiet">Ainda não há eventos registrados.</p>
            ) : (
              <ol className="tkp-log">
                {history.map((item) => (
                  <li key={item.id}>
                    <strong>{getTimelineLabel(item.action)}</strong>
                    <span>
                      {item.changed_by_type === 'public' ? 'Você' : item.changed_by_name || 'Sistema'}, {formatWhen(item.created_at)}
                    </span>
                    {item.action === 'pause_reason_added' && item.new_value && (
                      <em>Aguardando: {String(item.new_value)}</em>
                    )}
                    {item.metadata?.reopen_reason && <em>Motivo: {String(item.metadata.reopen_reason)}</em>}
                    {item.action === 'closed_by_requester' && item.metadata?.note && <em>“{String(item.metadata.note)}”</em>}
                  </li>
                ))}
              </ol>
            )}

            <dl className="tkp-facts">
              <div><dt>Protocolo completo</dt><dd className="tkp-facts__id">{ticket.id}</dd></div>
              <div><dt>Tipo</dt><dd>{TYPE_LABEL[ticket.type] || ticket.type || 'Não informado'}</dd></div>
              <div><dt>Prioridade</dt><dd>{PRIORITY_LABEL[ticket.priority] || ticket.priority || 'Não informada'}</dd></div>
              <div><dt>Última atualização</dt><dd>{formatWhen(ticket.updated_at)}</dd></div>
              {ticket.resolved_at && <div><dt>Resolvido em</dt><dd>{formatWhen(ticket.resolved_at)}</dd></div>}
              {ticket.feedback?.trim() && <div><dt>Seu comentário na avaliação</dt><dd>{ticket.feedback}</dd></div>}
            </dl>
          </div>
        </details>
      </div>

      {showRatingModal && (
        <div className="tkp-modal" role="dialog" aria-modal="true" aria-labelledby="tkp-rate-title">
          <div className="tkp-modal__card">
            <h2 id="tkp-rate-title">Como foi o atendimento?</h2>
            <p>Sua nota ajuda a {team.name} a melhorar.</p>

            <div className="tkp-stars" role="radiogroup" aria-label="Nota de 1 a 5">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={ratingValue === value}
                  aria-label={`${value} de 5`}
                  className={ratingValue >= value ? 'is-on' : ''}
                  onClick={() => setRatingValue(value)}
                >
                  <i className={`ti ${ratingValue >= value ? 'ti-star-filled' : 'ti-star'}`} aria-hidden="true" />
                </button>
              ))}
            </div>

            <div className="pub-field">
              <label htmlFor="tkp-rate-note">
                Quer deixar um comentário? <span className="pub-field__optional">(opcional)</span>
              </label>
              <textarea
                id="tkp-rate-note"
                value={ratingFeedback}
                onChange={(e) => setRatingFeedback(e.target.value)}
                rows={3}
              />
            </div>

            {actionError && (
              <p className="pub-alert" role="alert">
                <i className="ti ti-alert-circle" aria-hidden="true" />
                <span>{actionError}</span>
              </p>
            )}

            <div className="tkp-modal__actions">
              <button type="button" className="pub-btn pub-btn--primary" onClick={handleSubmitRating} disabled={submittingRating}>
                {submittingRating ? 'Enviando…' : 'Enviar avaliação'}
              </button>
              <button type="button" className="pub-btn pub-btn--ghost" onClick={() => setShowRatingModal(false)} disabled={submittingRating}>
                Agora não
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
