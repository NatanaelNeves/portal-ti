import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef, ReactNode } from 'react';
import toast from 'react-hot-toast';
import { BACKEND_URL } from '../services/api';

// ─── types ────────────────────────────────────────────────────────────────────
interface NewTicket {
  id: string;
  title: string;
  department?: string | null;
  created_at: string;
}

export type NotificationKind = 'new' | 'updated' | 'resolved' | 'reopened' | 'warning';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body?: string;
  ticketId?: string;
  createdAt: string;
  read: boolean;
}

interface NotificationContextValue {
  notifications: AppNotification[];
  unseenCount: number;
  markAllRead: () => void;
  markRead: (id: string) => void;
  dismiss: (id: string) => void;
  clearAll: () => void;
  /** Mantido por compatibilidade — equivale a markAllRead. */
  clearUnseen: () => void;
}

// ─── context ──────────────────────────────────────────────────────────────────
const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unseenCount: 0,
  markAllRead: () => {},
  markRead: () => {},
  dismiss: () => {},
  clearAll: () => {},
  clearUnseen: () => {},
});

export const useNotifications = () => useContext(NotificationContext);

// ─── Web Audio beep ───────────────────────────────────────────────────────────
// Reuse a single AudioContext — creating one per sound hit the autoplay policy.
let _audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  try {
    if (!_audioCtx) {
      _audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return _audioCtx;
  } catch {
    return null;
  }
}

// Call this on any user interaction so the context leaves "suspended" state.
function unlockAudioCtx() {
  const ctx = getAudioCtx();
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

async function playNotificationSound() {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    // Browsers suspend AudioContext until user interaction — resume before playing.
    if (ctx.state === 'suspended') await ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch (_) {
    // silent fail
  }
}

// ─── browser Notification ────────────────────────────────────────────────────
function sendBrowserNotification(title: string, body: string) {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico' });
  } else if (Notification.permission === 'default') {
    Notification.requestPermission().then((perm) => {
      if (perm === 'granted') new Notification(title, { body, icon: '/favicon.ico' });
    });
  }
}

// ─── localStorage key for seen IDs ────────────────────────────────────────────
const SEEN_KEY = 'notif_seen_ticket_ids';

function getSeenIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveSeenIds(ids: Set<string>) {
  // keep only the last 200 to avoid unbounded growth
  const arr = Array.from(ids).slice(-200);
  localStorage.setItem(SEEN_KEY, JSON.stringify(arr));
}

// ─── localStorage: histórico exibido no sino ──────────────────────────────────
const ITEMS_KEY = 'notif_items_v1';
const MAX_ITEMS = 40;

function loadStoredNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(ITEMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item: any): item is AppNotification => !!item && typeof item.id === 'string' && typeof item.title === 'string')
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

function saveStoredNotifications(items: AppNotification[]) {
  try {
    localStorage.setItem(ITEMS_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    // cota cheia ou modo privado — ignorar
  }
}

let notificationSeq = 0;
function makeNotificationId(prefix: string) {
  notificationSeq += 1;
  return `${prefix}-${Date.now()}-${notificationSeq}`;
}

// ─── POLL_INTERVAL ────────────────────────────────────────────────────────────
// 30 s is enough for near-real-time notifications and stays well under rate limits.
const POLL_MS = 30_000;

// ─── Provider ────────────────────────────────────────────────────────────────
export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>(loadStoredNotifications);
  const sinceRef = useRef<string>(new Date().toISOString());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const unseenCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  useEffect(() => {
    saveStoredNotifications(notifications);
  }, [notifications]);

  const pushNotifications = useCallback((items: AppNotification[]) => {
    if (items.length === 0) return;
    setNotifications((prev) => {
      const existing = new Set(prev.map((n) => n.id));
      const fresh = items.filter((n) => !existing.has(n.id));
      if (fresh.length === 0) return prev;
      return [...fresh, ...prev].slice(0, MAX_ITEMS);
    });
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => (prev.some((n) => !n.read) ? prev.map((n) => ({ ...n, read: true })) : prev));
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const poll = useCallback(async () => {
    // Only poll when a staff user is logged in
    const token = localStorage.getItem('internal_token');
    if (!token) return;

    try {
      const resp = await fetch(
        `${BACKEND_URL}/api/tickets/new-since?since=${encodeURIComponent(sinceRef.current)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!resp.ok) return;

      const data: { tickets: NewTicket[] } = await resp.json();
      const newTickets = data.tickets ?? [];
      if (newTickets.length === 0) return;

      // advance the cursor so we don't re-announce the same tickets
      sinceRef.current = newTickets[newTickets.length - 1].created_at;

      const seen = getSeenIds();
      const unseen = newTickets.filter((t) => !seen.has(t.id));
      if (unseen.length === 0) return;

      // mark as seen
      unseen.forEach((t) => seen.add(t.id));
      saveSeenIds(seen);

      // ── sound ──
      await playNotificationSound();

      // ── toast(s) ──
      unseen.forEach((ticket) => {
        const deptLabel =
          ticket.department === 'administrativo' ? 'Administrativo' : 'TI';
        toast(
          (t) => (
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: 4, cursor: 'pointer' }}
              onClick={() => {
                toast.dismiss(t.id);
                window.location.href = `/admin/chamados/${ticket.id}`;
              }}
            >
              <strong style={{ fontSize: '0.95rem' }}>🔔 Novo chamado recebido</strong>
              <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>{ticket.title}</span>
              <span style={{ fontSize: '0.78rem', opacity: 0.7 }}>Dept: {deptLabel} · clique para abrir</span>
            </div>
          ),
          {
            duration: 8000,
            position: 'top-right',
            style: {
              background: '#1a365d',
              color: '#fff',
              borderLeft: '4px solid #4299e1',
              borderRadius: '8px',
              padding: '12px 16px',
              maxWidth: '340px',
            },
          }
        );

        // ── browser notification ──
        sendBrowserNotification('Novo chamado recebido', ticket.title);
      });

      // ── lista do sino ──
      pushNotifications(
        unseen.map((ticket) => ({
          id: `new-${ticket.id}`,
          kind: 'new' as const,
          title: 'Novo chamado recebido',
          body: ticket.title,
          ticketId: ticket.id,
          createdAt: ticket.created_at || new Date().toISOString(),
          read: false,
        }))
      );
    } catch (_) {
      // network error — silent fail, will retry
    }
  }, [pushNotifications]);

  useEffect(() => {
    // Request browser notification permission on mount (non-blocking)
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Unlock AudioContext as soon as the user first interacts with the page.
    document.addEventListener('click', unlockAudioCtx);
    document.addEventListener('keydown', unlockAudioCtx);

    const schedule = () => {
      timerRef.current = setTimeout(async () => {
        await poll();
        schedule();
      }, POLL_MS);
    };

    schedule();

    // ── eventos em tempo real (websocket) viram itens da lista do sino ──
    const describe = (kind: NotificationKind, detail: any): { title: string; body?: string } => {
      const ticketTitle = detail?.title
        || (detail?.ticketId ? `Chamado ${String(detail.ticketId).slice(0, 8)}` : undefined);

      switch (kind) {
        case 'resolved':
          return { title: 'Chamado marcado como resolvido', body: ticketTitle };
        case 'reopened':
          return { title: 'Chamado reaberto pelo solicitante', body: detail?.reopen_reason || ticketTitle };
        case 'warning':
          return { title: 'Chamado perto do encerramento automático', body: ticketTitle };
        default: {
          const action = detail?.action;
          if (action === 'reopened_by_requester') return { title: 'Chamado reaberto pelo usuário', body: ticketTitle };
          if (action === 'marked_resolved_pending_confirmation') return { title: 'Chamado aguardando confirmação do usuário', body: ticketTitle };
          if (action === 'auto_closed') return { title: 'Chamado encerrado automaticamente por prazo', body: ticketTitle };
          if (action === 'manual_closed') return { title: 'Chamado encerrado manualmente', body: ticketTitle };
          return { title: 'Um chamado foi atualizado', body: ticketTitle };
        }
      }
    };

    const makeHandler = (kind: NotificationKind) => (event: Event) => {
      const detail = (event as CustomEvent).detail ?? {};
      const { title, body } = describe(kind, detail);
      pushNotifications([
        {
          id: makeNotificationId(kind),
          kind,
          title,
          body,
          ticketId: detail?.ticketId ? String(detail.ticketId) : undefined,
          createdAt: detail?.timestamp || new Date().toISOString(),
          read: false,
        },
      ]);
    };

    const handlers: Array<[string, EventListener]> = [
      ['ticket:updated', makeHandler('updated')],
      ['ticket:resolved', makeHandler('resolved')],
      ['ticket:reopened', makeHandler('reopened')],
      ['ticket:auto_close_warning', makeHandler('warning')],
    ];

    handlers.forEach(([name, handler]) => window.addEventListener(name, handler));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      document.removeEventListener('click', unlockAudioCtx);
      document.removeEventListener('keydown', unlockAudioCtx);
      handlers.forEach(([name, handler]) => window.removeEventListener(name, handler));
    };
  }, [poll, pushNotifications]);

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unseenCount,
      markAllRead,
      markRead,
      dismiss,
      clearAll,
      clearUnseen: markAllRead,
    }),
    [notifications, unseenCount, markAllRead, markRead, dismiss, clearAll]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}
