import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
  canAssignToOthers,
  canAssume,
  canClose,
  canChangePriority,
  canChangeStatus,
  type Role,
  type TicketLike,
} from './ticketPermissions';

interface Props {
  ticket: TicketLike;
  role: Role;
  userId: string;
  users: Array<{ id: string; name: string }>;
  onAssume: () => void;
  onStatus: (status: string) => void;
  onPriority: (priority: string) => void;
  onAssign: (userId: string | null) => void;
  onOpen: () => void;
  busy?: boolean;
}

type Panel = 'root' | 'status' | 'priority' | 'assign';

/**
 * Menu de ações rápidas da linha.
 *
 * Fica atrás de um "…" porque a fila é para varrer, não para operar botão a
 * botão — cinco ações visíveis em cada linha transformariam a lista num
 * painel de controle. O menu navega em painéis (status, prioridade,
 * responsável) em vez de abrir submenus flutuantes, que são difíceis de
 * acertar com o mouse e impossíveis no toque.
 *
 * Cada ação só aparece se o backend fosse aceitá-la para este papel.
 */
export default function TicketRowMenu({
  ticket,
  role,
  userId,
  users,
  onAssume,
  onStatus,
  onPriority,
  onAssign,
  onOpen,
  busy,
}: Props) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>('root');
  const [coords, setCoords] = useState({ top: 0, left: 0, drop: 'up' as 'up' | 'down' });
  const rootRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  /**
   * A linha e a lista recortam o que transborda (`overflow: hidden` / `auto`),
   * entao o menu nao pode viver dentro delas — ele seria cortado. Vai para o
   * body, posicionado a partir do gatilho, e escolhe abrir para cima ou para
   * baixo conforme o espaco disponivel na janela.
   */
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const trigger = rootRef.current?.getBoundingClientRect();
      if (!trigger) return;
      const height = popRef.current?.offsetHeight ?? 280;
      const spaceBelow = window.innerHeight - trigger.bottom;
      const drop: 'up' | 'down' = spaceBelow > height + 16 ? 'down' : 'up';
      setCoords({
        top: drop === 'down' ? trigger.bottom + 6 : trigger.top - 6,
        left: Math.min(trigger.right, window.innerWidth - 12),
        drop,
      });
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open, panel]);

  useEffect(() => {
    if (!open) return;
    const onAway = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (popRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // Esc volta um nível antes de fechar, para não perder o caminho.
      if (panel !== 'root') setPanel('root');
      else setOpen(false);
    };
    document.addEventListener('mousedown', onAway);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onAway);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, panel]);

  useEffect(() => {
    if (!open) setPanel('root');
  }, [open]);

  const stop = (event: React.MouseEvent) => event.stopPropagation();
  const run = (action: () => void) => (event: React.MouseEvent) => {
    event.stopPropagation();
    setOpen(false);
    action();
  };

  const mayStatus = canChangeStatus(ticket, role, userId);
  const mayClose = canClose(ticket, role, userId);
  const mayPriority = canChangePriority(ticket, role, userId);
  const mayAssume = canAssume(ticket, role, userId);
  const mayAssignOthers = canAssignToOthers(role) && mayStatus;

  return (
    <div className="tk-menu" ref={rootRef} onClick={stop}>
      <button
        type="button"
        className={`tk-menu-trigger ${open ? 'is-open' : ''}`}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(!open);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Ações do chamado"
        disabled={busy}
      >
        <i className={`ti ${busy ? 'ti-loader-2' : 'ti-dots'}`} aria-hidden="true" />
      </button>

      {open && createPortal(
        <div
          ref={popRef}
          className={`tk-menu-pop tk-menu-pop--${coords.drop}`}
          role="menu"
          style={{ top: coords.top, left: coords.left }}
          onClick={(event) => event.stopPropagation()}
        >
          {panel === 'root' && (
            <>
              <button type="button" className="tk-menu-item" onClick={run(onOpen)}>
                <i className="ti ti-arrow-up-right" aria-hidden="true" />
                Abrir detalhes
              </button>

              {mayAssume && (
                <button type="button" className="tk-menu-item" onClick={run(onAssume)}>
                  <i className="ti ti-user-check" aria-hidden="true" />
                  Assumir chamado
                </button>
              )}

              {(mayStatus || mayClose || mayPriority || mayAssignOthers) && <span className="tk-menu-sep" />}

              {mayStatus && (
                <button type="button" className="tk-menu-item" onClick={(e) => { e.stopPropagation(); setPanel('status'); }}>
                  <i className="ti ti-progress-check" aria-hidden="true" />
                  Alterar status
                  <i className="ti ti-chevron-right tk-menu-more" aria-hidden="true" />
                </button>
              )}

              {mayClose && (
                <button type="button" className="tk-menu-item" onClick={run(() => onStatus('closed'))}>
                  <i className="ti ti-lock" aria-hidden="true" />
                  Fechar chamado
                </button>
              )}

              {mayPriority && (
                <button type="button" className="tk-menu-item" onClick={(e) => { e.stopPropagation(); setPanel('priority'); }}>
                  <i className="ti ti-flag" aria-hidden="true" />
                  Alterar prioridade
                  <i className="ti ti-chevron-right tk-menu-more" aria-hidden="true" />
                </button>
              )}

              {mayAssignOthers && (
                <button type="button" className="tk-menu-item" onClick={(e) => { e.stopPropagation(); setPanel('assign'); }}>
                  <i className="ti ti-users" aria-hidden="true" />
                  Atribuir responsável
                  <i className="ti ti-chevron-right tk-menu-more" aria-hidden="true" />
                </button>
              )}

              {!mayStatus && (
                <p className="tk-menu-note">
                  Este chamado está fora do seu escopo de edição.
                </p>
              )}
            </>
          )}

          {panel !== 'root' && (
            <button type="button" className="tk-menu-back" onClick={(e) => { e.stopPropagation(); setPanel('root'); }}>
              <i className="ti ti-chevron-left" aria-hidden="true" />
              Voltar
            </button>
          )}

          {panel === 'status' &&
            STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`tk-menu-item ${ticket.status === option.value ? 'is-current' : ''}`}
                onClick={run(() => onStatus(option.value))}
                disabled={ticket.status === option.value}
              >
                <i className={`ti ${option.icon}`} aria-hidden="true" />
                {option.label}
                {ticket.status === option.value && <i className="ti ti-check tk-menu-more" aria-hidden="true" />}
              </button>
            ))}

          {panel === 'priority' &&
            PRIORITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`tk-menu-item ${ticket.priority === option.value ? 'is-current' : ''}`}
                onClick={run(() => onPriority(option.value))}
                disabled={ticket.priority === option.value}
              >
                <span className={`tk-menu-dot tk-tone-${option.tone}`} aria-hidden="true" />
                {option.label}
                {ticket.priority === option.value && <i className="ti ti-check tk-menu-more" aria-hidden="true" />}
              </button>
            ))}

          {panel === 'assign' && (
            <div className="tk-menu-scroll">
              <button type="button" className="tk-menu-item" onClick={run(() => onAssign(null))}>
                <i className="ti ti-user-off" aria-hidden="true" />
                Remover responsável
              </button>
              {users.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  className={`tk-menu-item ${ticket.assigned_to === person.id ? 'is-current' : ''}`}
                  onClick={run(() => onAssign(person.id))}
                  disabled={ticket.assigned_to === person.id}
                >
                  <span className="tk-menu-avatar" aria-hidden="true">
                    {person.name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase()}
                  </span>
                  {person.name}
                  {ticket.assigned_to === person.id && <i className="ti ti-check tk-menu-more" aria-hidden="true" />}
                </button>
              ))}
            </div>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}
