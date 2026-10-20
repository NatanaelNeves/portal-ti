import { useState } from 'react';
import api from '../../services/api';
import { showToast } from '../../utils/toast';
import {
  mentionsPonto,
  pontoCategory,
  TEAM_CATEGORIES,
  TEAM_DEFAULT_CATEGORY,
  type ServiceTeam,
} from '../../utils/ticketCategories';
import '../../styles/TicketForward.css';

const TEAMS: Array<{ value: ServiceTeam; label: string; icon: string; hint: string }> = [
  { value: 'ti', label: 'TI', icon: 'ti-device-laptop', hint: 'Computador, internet, acessos e sistemas' },
  { value: 'administrativo', label: 'Administrativo', icon: 'ti-building', hint: 'Chaves, eventos, doações e documentos' },
  { value: 'rh', label: 'RH', icon: 'ti-users', hint: 'Ponto e iPonto, atestado, folha e benefícios' },
];

// Já resolvido ou encerrado não muda de equipe. Mesma regra do backend.
const NOT_FORWARDABLE_STATUSES = ['resolved', 'aguardando_confirmacao', 'closed', 'cancelled'];

interface ForwardableTicket {
  id: string;
  title: string;
  description: string;
  status: string;
  department?: string | null;
  category?: string | null;
  assigned_to?: string | null;
}

/** Espelha a permissão do backend, só para decidir se o botão aparece. */
export const canForwardTicket = (ticket: ForwardableTicket, role: string, myId: string) => {
  if (NOT_FORWARDABLE_STATUSES.includes(ticket.status)) return false;
  if (ticket.category === 'RH_CONFIDENCIAL') return false;
  if (role === 'admin' || role === 'manager') return true;
  const department = ticket.department || 'ti';
  if (role === 'it_staff') return department === 'ti';
  if (role === 'rh_staff') return department === 'rh';
  if (role === 'admin_staff') return department === 'administrativo' && (!ticket.assigned_to || ticket.assigned_to === myId);
  return false;
};

const suggestedCategory = (team: ServiceTeam, ticket: ForwardableTicket) => {
  const text = `${ticket.title} ${ticket.description}`;
  if (team === 'rh' && mentionsPonto(text)) return pontoCategory(text);
  return TEAM_DEFAULT_CATEGORY[team];
};

interface Props {
  ticket: ForwardableTicket;
  /** Classe do cartão da página (`tkd-card`, `rh-card`...), para combinar com o resto da tela. */
  cardClassName: string;
  /** Chamado com a nova equipe: a tela atual deixa de ser o lugar dele. */
  onForwarded: (team: ServiceTeam) => void;
}

/**
 * "Equipe errada?" Passa o chamado para outra equipe, que o recebe como novo
 * na fila dela. Pensado para o caso do iPonto aberto para a TI.
 */
export default function TicketForward({ ticket, cardClassName, onForwarded }: Props) {
  const current = (ticket.department || 'ti') as ServiceTeam;
  const options = TEAMS.filter((team) => team.value !== current);
  const pontoHint = current !== 'rh' && mentionsPonto(`${ticket.title} ${ticket.description}`);

  const [open, setOpen] = useState(false);
  const [team, setTeam] = useState<ServiceTeam | null>(null);
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  const choose = (value: ServiceTeam) => {
    setTeam(value);
    setCategory(suggestedCategory(value, ticket));
  };

  const start = () => {
    setOpen(true);
    if (pontoHint) choose('rh');
  };

  const cancel = () => {
    setOpen(false);
    setTeam(null);
    setNote('');
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!team) return;
    try {
      setSending(true);
      await api.post(`/tickets/${ticket.id}/encaminhar`, {
        department: team,
        category,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      showToast.success(`Chamado encaminhado para ${TEAMS.find((t) => t.value === team)?.label}. Ele chega lá como novo.`);
      onForwarded(team);
    } catch (err: any) {
      showToast.error(err?.response?.data?.message || err?.response?.data?.error || 'Não foi possível encaminhar. Tente de novo.');
    } finally {
      setSending(false);
    }
  };

  return (
    <section className={`${cardClassName} tfw`} aria-labelledby={`tfw-title-${ticket.id}`}>
      <h2 id={`tfw-title-${ticket.id}`}>Equipe errada?</h2>

      {!open ? (
        <>
          {pontoHint ? (
            <p className="tfw-hint tfw-hint--ponto">
              <i className="ti ti-clock-edit" aria-hidden="true" />
              Fala de ponto ou iPonto: isso é com o RH.
            </p>
          ) : (
            <p className="tfw-hint">Se este pedido é de outra equipe, passe para ela. Ele chega lá como novo, sem responsável.</p>
          )}
          <button type="button" className="tfw-open" onClick={start}>
            <i className="ti ti-arrow-forward-up" aria-hidden="true" />
            Encaminhar para outra equipe
          </button>
        </>
      ) : (
        <form className="tfw-form" onSubmit={(e) => void submit(e)}>
          <fieldset>
            <legend>Para qual equipe?</legend>
            <div className="tfw-teams">
              {options.map((option) => (
                <label key={option.value} className={`tfw-team ${team === option.value ? 'is-on' : ''}`}>
                  <input
                    type="radio"
                    name={`tfw-team-${ticket.id}`}
                    value={option.value}
                    checked={team === option.value}
                    onChange={() => choose(option.value)}
                  />
                  <i className={`ti ${option.icon}`} aria-hidden="true" />
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.hint}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {team && (
            <>
              <label className="tfw-field">
                <span>Assunto</span>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  {TEAM_CATEGORIES[team].map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label className="tfw-field">
                <span>Recado para a equipe <small>(opcional)</small></span>
                <textarea
                  rows={2}
                  maxLength={500}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ex.: É a senha do iPonto, não do computador."
                />
                <small className="tfw-muted">Só a equipe vê. Quem pediu continua vendo o chamado, agora com a nova equipe.</small>
              </label>
            </>
          )}

          <div className="tfw-actions">
            <button type="button" className="tfw-btn" onClick={cancel} disabled={sending}>Cancelar</button>
            <button type="submit" className="tfw-btn tfw-btn--primary" disabled={!team || sending}>
              <i className="ti ti-arrow-forward-up" aria-hidden="true" />
              {sending ? 'Encaminhando…' : 'Encaminhar'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
